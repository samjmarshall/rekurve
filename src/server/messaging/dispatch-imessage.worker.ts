import "server-only";

import { inngest } from "~/inngest/client";
import type { EventPayload } from "~/server/inngest/events";
import { MESSAGE_EVENTS } from "~/server/outbox";

// TODO(ADR-001): Real implementation requires all four Open Questions to be
// resolved before this step can be filled in:
//   1. Validate Texting Blue API: webhook event types, delivery status callbacks
//   2. Confirm AU phone number / iPhone setup compatibility
//   3. Twilio fallback decision for device-offline scenarios
//   4. Texting Blue vendor stability / uptime history
//
// When ADR-001 is Accepted, replace the throw in "send-via-device-bridge" with:
//   - Device-bridge send call (Texting Blue client)
//   - step.waitForEvent for the delivery ack (with timeout)
//   - write-conversation (channel: "imessage", deliveryMethod: "imessage")
//   - update-message-status (stamp sentAt)
// See: docs/adr/adr001-imessage-integration-for-sales-automation.md:136-141

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

// Payload type comes from the EVENT_REGISTRY (adr019 clause 7) — the single
// payload authority; the wire string stays the frozen ~/server/outbox const.
type DispatchImessageEvent = {
  data: EventPayload<"message.approval-requested">;
};

export type DispatchImessageWorkerDeps = {
  /** Re-read + dispatchability guards (approved/edited_and_approved, unsent). Null → not dispatchable. */
  loadDispatchable: (messageId: string) => Promise<{ body: string } | null>;
};

/**
 * Step ids are FROZEN (Inngest memoisation keys): verify-still-approved,
 * send-via-device-bridge.
 */
export function makeRunDispatchImessage(deps: DispatchImessageWorkerDeps) {
  return async function runDispatchImessage(
    event: DispatchImessageEvent,
    step: Step,
  ): Promise<void> {
    const { messageId } = event.data;

    // Re-read + dispatchability guards live inside loadDispatchable; null maps
    // to the same early return as before the port.
    const message = await step.run("verify-still-approved", () =>
      deps.loadDispatchable(messageId),
    );
    if (!message) {
      return;
    }

    await step.run("send-via-device-bridge", () => {
      throw new Error(
        "dispatch-imessage: device-bridge not implemented (ADR-001)",
      );
    });
  };
}

// retries:0 — every run is a guaranteed failure until ADR-001 is implemented.
// The trigger is also unreachable: no code path produces channel:"imessage".
// Thin Inngest adapter factory: real deps are wired by the workers composition
// root (messaging.workers.ts), which exposes the built function as
// messagingWorkers.dispatchImessage. Config is byte-stable — pinned by the
// registry golden test.
export function makeDispatchImessageWorker(deps: DispatchImessageWorkerDeps) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunDispatchImessage(deps);
  return inngest.createFunction(
    {
      id: "dispatch-imessage",
      triggers: [
        {
          event: MESSAGE_EVENTS.APPROVAL_REQUESTED,
          if: "event.data.channel == 'imessage'",
        },
      ],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 0,
    },
    // The shared Inngest client is untyped (typed schemas are a PR-6 concern);
    // the trigger config pins the event name, so narrow `data` to the registry
    // payload once at the boundary — no `as unknown as` double-cast.
    ({ event, step }) =>
      run({ data: event.data as DispatchImessageEvent["data"] }, step),
  );
}
