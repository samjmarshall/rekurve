import "server-only";

import { inngest } from "~/server/inngest/client";
import type { EventName, EventPayload } from "~/server/inngest/events";

// `satisfies` pins the name to an EVENT_REGISTRY key (adr019 clause 7) —
// type-only, so no runtime dep on the registry module. Module-private: the
// only consumer is this file's trigger config (the registry golden pins the
// raw wire string).
const MESSAGE_EVENTS = {
  APPROVAL_REQUESTED: "message.approval-requested",
} as const satisfies Record<string, EventName>;

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

// Payload type comes from the EVENT_REGISTRY (adr019 clause 7) — the single
// payload authority; the wire string stays the frozen module-private const.
type DispatchSmsEvent = { data: EventPayload<"message.approval-requested"> };

// Worker port surface (adr020): messaging ops come from
// messagingModule.service; sendSmsToConsultant is the twilio adapter, injected
// with its full signature so the statusCallback wiring stays observable.
export type DispatchSmsWorkerDeps = {
  /** Re-read + dispatchability guards (approved/edited_and_approved, unsent). Null → not dispatchable. */
  loadDispatchable: (
    messageId: string,
  ) => Promise<{ leadId: string; subject: string | null; body: string } | null>;
  /** Stamps the dispatching_at fence. */
  markDispatching: (messageId: string) => Promise<void>;
  /** Idempotent conversation insert (sid + delivery status) + sentAt stamp in ONE batch. */
  recordSmsSend: (args: {
    messageId: string;
    leadId: string;
    subject: string | null;
    body: string;
    sid: string;
    status: string;
    sentAt: Date;
  }) => Promise<void>;
  /** Idempotent stamp-only port: re-stamps sentAt without re-running the
   * conversation check-then-insert. */
  stampSent: (args: { messageId: string; sentAt: Date }) => Promise<void>;
  sendSmsToConsultant: (
    body: string,
    opts: { statusCallback: string },
  ) => Promise<{ sid: string; status: string }>;
  statusCallbackUrl: string;
};

/**
 * Owns the async SMS send: Twilio send (with the correlation ID),
 * the conversation write, and the `sentAt` stamp. Triggered by
 * `message.approval-requested` once the consultant approves. Each step is
 * memoised by Inngest, so the function is re-entry safe; the `sentAt` /
 * `dispatchingAt` guards make a re-run a no-op.
 *
 * Step ids are FROZEN (Inngest memoisation keys — in-flight runs replay
 * against them): verify-still-approved, send-sms, write-conversation,
 * update-message-status.
 */
export function makeRunDispatchSms(deps: DispatchSmsWorkerDeps) {
  return async function runDispatchSms(
    event: DispatchSmsEvent,
    step: Step,
  ): Promise<void> {
    const { messageId } = event.data;

    // 1. Re-read the row. Exit unless it's still an approved, unsent SMS —
    // this is the cancellation (dismiss-during-dispatch) and re-entry fence.
    // The status/sentAt guards live inside loadDispatchable; null means "not
    // dispatchable" and maps to the same early return as before the port.
    const message = await step.run("verify-still-approved", () =>
      deps.loadDispatchable(messageId),
    );
    if (!message) {
      return;
    }
    const { body, leadId, subject } = message;

    // 2. Stamp the dispatching_at fence, then send via Twilio with status callback.
    const smsResult = await step.run("send-sms", async () => {
      await deps.markDispatching(messageId);
      const result = await deps.sendSmsToConsultant(body ?? "", {
        statusCallback: deps.statusCallbackUrl,
      });
      return result;
    });

    // 3.+4. Idempotent conversation write (insert-if-missing + sentAt stamp in
    // one batch), then a stamp-only follow-up. BOTH legacy step ids are kept
    // because they are Inngest memoisation keys: a run that recorded the old
    // insert-only "write-conversation" resumes at "update-message-status",
    // where the stamp-only port applies the sentAt it is still missing. On a
    // fresh run the second step is a harmless sentAt re-stamp.
    await step.run("write-conversation", () =>
      deps.recordSmsSend({
        messageId,
        leadId,
        subject,
        body,
        sid: smsResult.sid,
        status: smsResult.status,
        sentAt: new Date(),
      }),
    );
    await step.run("update-message-status", () =>
      deps.stampSent({ messageId, sentAt: new Date() }),
    );
  };
}

// Thin Inngest adapter factory: real deps are wired by the workers composition
// root (messaging.workers.ts), which exposes the built function as
// messagingWorkers.dispatchSms. Config is byte-stable — id, trigger +
// if-expression, concurrency key/limit, and retries are pinned by the registry
// golden test.
export function makeDispatchSmsWorker(deps: DispatchSmsWorkerDeps) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunDispatchSms(deps);
  return inngest.createFunction(
    {
      id: "dispatch-sms",
      triggers: [
        {
          event: MESSAGE_EVENTS.APPROVAL_REQUESTED,
          if: "event.data.channel == 'sms'",
        },
      ],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 4,
    },
    // The shared Inngest client is untyped (typed schemas deliberately deferred);
    // the trigger config pins the event name, so narrow `data` to the registry
    // payload once at the boundary — no `as unknown as` double-cast.
    ({ event, step }) =>
      run({ data: event.data as DispatchSmsEvent["data"] }, step),
  );
}
