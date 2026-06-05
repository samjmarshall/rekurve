import { eq } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { messageQueue } from "~/server/db/schema";
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

type DispatchImessageEvent = {
  data: {
    messageId: string;
    correlationId: string;
    channel: string;
    leadId: string;
  };
};

export async function runDispatchImessage(
  event: DispatchImessageEvent,
  step: Step,
): Promise<void> {
  const { messageId } = event.data;

  const message = await step.run("verify-still-approved", () =>
    db.query.messageQueue.findFirst({ where: eq(messageQueue.id, messageId) }),
  );
  if (
    !message ||
    (message.status !== "approved" &&
      message.status !== "edited_and_approved") ||
    message.sentAt !== null
  ) {
    return;
  }

  await step.run("send-via-device-bridge", () => {
    throw new Error(
      "dispatch-imessage: device-bridge not implemented (ADR-001)",
    );
  });
}

// retries:0 — every run is a guaranteed failure until ADR-001 is implemented.
// The trigger is also unreachable: no code path produces channel:"imessage".
export const dispatchImessageWorker = inngest.createFunction(
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
  ({ event, step }) =>
    runDispatchImessage(event as unknown as DispatchImessageEvent, step),
);
