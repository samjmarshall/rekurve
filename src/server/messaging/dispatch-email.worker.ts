import "server-only";

import { inngest } from "~/inngest/client";
import type { EventPayload } from "~/server/inngest/events";
import { HUBSPOT_EMAIL_EVENTS, MESSAGE_EVENTS } from "~/server/outbox";

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
  waitForEvent: (
    id: string,
    opts: { event: string; match: string; timeout: string },
  ) => Promise<unknown>;
};

// Payload types come from the EVENT_REGISTRY (adr019 clause 7) — the single
// payload authority; the wire strings stay the frozen ~/server/outbox consts.
type DispatchEmailEvent = { data: EventPayload<"message.approval-requested"> };

type EngagementCreated = {
  data: EventPayload<"hubspot.email.engagement-created">;
};

// Worker port surface (adr020): messaging ops come from
// messagingModule.service, lead ops from leadsModule.service; sendEmail is the
// ms-graph adapter and sendEvent wraps inngest.send. All injected through the
// factory so #329 (hubspot domain) only rewires the composition, not the core.
export type DispatchEmailWorkerDeps = {
  /** Re-read + dispatchability guards (approved/edited_and_approved, unsent). Null → not dispatchable. */
  loadDispatchable: (
    messageId: string,
  ) => Promise<{ subject: string | null; body: string } | null>;
  /** Stamps the dispatching_at fence. */
  markDispatching: (messageId: string) => Promise<void>;
  /** Idempotent conversation insert + sentAt stamp in ONE batch (same write
   * shape/order as the pre-adr020 steps — subject rides along because the
   * conversation row records it, exactly as the inline insert did). */
  recordEmailSend: (args: {
    messageId: string;
    leadId: string;
    subject: string | null;
    body: string;
    sentAt: Date;
  }) => Promise<void>;
  /** Idempotent stamp-only port: re-stamps sentAt without re-running the
   * conversation check-then-insert. */
  stampSent: (args: { messageId: string; sentAt: Date }) => Promise<void>;
  /** Stamps the HubSpot engagement id onto the conversation row. */
  stampEngagement: (args: {
    messageId: string;
    hubspotActivityId: string;
  }) => Promise<void>;
  resolveOwnerUserId: () => Promise<string>;
  getLeadContact: (
    leadId: string,
  ) => Promise<{ email: string | null } | null | undefined>;
  sendEmail: (args: {
    userId: string;
    to: string;
    subject: string;
    body: string;
    correlationId: string;
  }) => Promise<unknown>;
  sendEvent: (event: {
    name: string;
    data: EventPayload<"hubspot.engagement-missed">;
  }) => Promise<unknown>;
};

/**
 * Owns the async email send: Graph send (with the correlation header + BCC),
 * the conversation write, the `sentAt` stamp, and the wait-for-engagement
 * reconciliation. Triggered by `message.approval-requested` once the consultant
 * approves (#261). Each step is memoised by Inngest, so the function is
 * re-entry safe; the `sentAt` / `dispatchingAt` guards make a re-run a no-op.
 *
 * Step ids are FROZEN (Inngest memoisation keys — in-flight runs replay
 * against them): verify-still-approved, send-via-graph, write-conversation,
 * update-message-status, wait-engagement-created, stamp-activity-id,
 * emit-engagement-missed.
 */
export function makeRunDispatchEmail(deps: DispatchEmailWorkerDeps) {
  return async function runDispatchEmail(
    event: DispatchEmailEvent,
    step: Step,
  ): Promise<void> {
    const { messageId, leadId } = event.data;

    // 1. Re-read the row. Exit unless it's still an approved, unsent email —
    // this is the cancellation (dismiss-during-dispatch) and re-entry fence.
    // The status/sentAt guards live inside loadDispatchable; null means "not
    // dispatchable" and maps to the same early return as before the port.
    const message = await step.run("verify-still-approved", () =>
      deps.loadDispatchable(messageId),
    );
    if (!message) {
      return;
    }
    const { subject, body } = message;

    // 2. Stamp the dispatching_at fence, then send via Graph with the correlation
    // header. The worker has no session, so it resolves the sending mailbox via
    // the #289 ownership seam. A completed step won't re-run; the residual
    // double-send window (death after Graph 202, before the step returns) is
    // bounded by the sentAt/dispatchingAt guards. Owner + contact lookups are
    // independent reads, so they run concurrently (PR-2 review follow-up).
    // Accepted deviation (review): when BOTH reads fail, Promise.all surfaces
    // whichever rejection settles first, whereas HEAD's sequential reads made
    // the owner-resolution error the deterministic one — diagnostics-only
    // (run-history error identity); no side-effect or ordering change.
    await step.run("send-via-graph", async () => {
      const [userId, lead] = await Promise.all([
        deps.resolveOwnerUserId(),
        deps.getLeadContact(leadId),
      ]);
      if (!lead?.email) {
        throw new Error(`dispatch-email: lead ${leadId} has no email`);
      }
      await deps.markDispatching(messageId);
      await deps.sendEmail({
        userId,
        to: lead.email,
        subject: subject ?? "",
        body,
        correlationId: messageId,
      });
    });

    // 3.+4. Idempotent conversation write (insert-if-missing + sentAt stamp in
    // one batch), then a stamp-only follow-up. BOTH legacy step ids are kept
    // because they are Inngest memoisation keys: a run that recorded the old
    // insert-only "write-conversation" resumes at "update-message-status",
    // where the stamp-only port applies the sentAt it is still missing. On a
    // fresh run the second step is a harmless sentAt re-stamp.
    await step.run("write-conversation", () =>
      deps.recordEmailSend({
        messageId,
        leadId,
        subject,
        body,
        sentAt: new Date(),
      }),
    );
    await step.run("update-message-status", () =>
      deps.stampSent({ messageId, sentAt: new Date() }),
    );

    // 5. Wait for the BCC-driven engagement webhook, keyed by correlation id.
    const engagement = (await step.waitForEvent("wait-engagement-created", {
      event: HUBSPOT_EMAIL_EVENTS.ENGAGEMENT_CREATED,
      match: "data.correlationId",
      timeout: "1h",
    })) as EngagementCreated | null;

    if (engagement) {
      // 6. Match: stamp the HubSpot engagement id onto the conversation.
      await step.run("stamp-activity-id", () =>
        deps.stampEngagement({
          messageId,
          hubspotActivityId: engagement.data.hubspotActivityId,
        }),
      );
    } else {
      // 7. Timeout: hand off to the one-shot reconciler.
      await step.run("emit-engagement-missed", () =>
        deps.sendEvent({
          name: HUBSPOT_EMAIL_EVENTS.ENGAGEMENT_MISSED,
          data: { messageId, leadId, correlationId: messageId },
        }),
      );
    }
  };
}

// Thin Inngest adapter factory: real deps are wired by the workers composition
// root (messaging.workers.ts), which exposes the built function as
// messagingWorkers.dispatchEmail. Config is byte-stable — id, trigger +
// if-expression, concurrency key/limit, and retries are pinned by the registry
// golden test.
export function makeDispatchEmailWorker(deps: DispatchEmailWorkerDeps) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunDispatchEmail(deps);
  return inngest.createFunction(
    {
      id: "dispatch-email",
      triggers: [
        {
          event: MESSAGE_EVENTS.APPROVAL_REQUESTED,
          if: "event.data.channel == 'email'",
        },
      ],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 4,
    },
    // The shared Inngest client is untyped (typed schemas are a PR-6 concern);
    // the trigger config pins the event name, so narrow `data` to the registry
    // payload once at the boundary — no `as unknown as` double-cast.
    ({ event, step }) =>
      run({ data: event.data as DispatchEmailEvent["data"] }, step),
  );
}
