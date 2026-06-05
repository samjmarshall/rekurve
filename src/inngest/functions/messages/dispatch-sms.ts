import { eq } from "drizzle-orm";

import { env } from "~/env";
import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { conversations, messageQueue } from "~/server/db/schema";
import { MESSAGE_EVENTS } from "~/server/outbox";
import { sendSmsToConsultant } from "~/server/twilio";

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

type DispatchSmsEvent = {
  data: {
    messageId: string;
    correlationId: string;
    channel: string;
    leadId: string;
    body?: string;
  };
};

/**
 * Owns the async SMS send: Twilio send (with the correlation ID),
 * the conversation write, and the `sentAt` stamp. Triggered by
 * `message.approval-requested` once the consultant approves. Each step is
 * memoised by Inngest, so the function is re-entry safe; the `sentAt` /
 * `dispatchingAt` guards make a re-run a no-op.
 */
export async function runDispatchSms(
  event: DispatchSmsEvent,
  step: Step,
): Promise<void> {
  const { messageId } = event.data;

  // 1. Re-read the row. Exit unless it's still an approved, unsent SMS —
  // this is the cancellation (dismiss-during-dispatch) and re-entry fence.
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
  const { body, leadId, subject } = message;

  // 2. Stamp the dispatching_at fence, then send via Twilio with status callback.
  const smsResult = await step.run("send-sms", async () => {
    await db
      .update(messageQueue)
      .set({ dispatchingAt: new Date() })
      .where(eq(messageQueue.id, messageId));
    const result = await sendSmsToConsultant(body ?? "", {
      statusCallback: `${env.BETTER_AUTH_URL}/api/twilio/status`,
    });
    return result;
  });

  // 3. Idempotent conversation write — check-then-insert (no unique index yet).
  await step.run("write-conversation", async () => {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.messageQueueId, messageId))
      .limit(1);
    if (existing.length > 0) return;
    await db.insert(conversations).values({
      leadId,
      messageQueueId: messageId,
      channel: "sms",
      direction: "outbound",
      deliveryMethod: "sms",
      subject,
      body,
      twilioMessageSid: smsResult.sid,
      deliveryStatus: smsResult.status,
      hubspotActivityId: null,
    });
  });

  // 5. Stamp sentAt — the send is now durably recorded.
  await step.run("update-message-status", () =>
    db
      .update(messageQueue)
      .set({ sentAt: new Date() })
      .where(eq(messageQueue.id, messageId)),
  );
}

export const dispatchSmsWorker = inngest.createFunction(
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
  ({ event, step }) =>
    runDispatchSms(event as unknown as DispatchSmsEvent, step),
);
