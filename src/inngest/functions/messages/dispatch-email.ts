import { eq } from "drizzle-orm";
import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { conversations, leads, messageQueue } from "~/server/db/schema";
import { resolveLeadOwnerUserId } from "~/server/leads/owner";
import { sendEmail } from "~/server/ms-graph";
import { HUBSPOT_EMAIL_EVENTS, MESSAGE_EVENTS } from "~/server/outbox";

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
  waitForEvent: (
    id: string,
    opts: { event: string; match: string; timeout: string },
  ) => Promise<unknown>;
};

type DispatchEmailEvent = {
  data: {
    messageId: string;
    correlationId: string;
    channel: string;
    leadId: string;
    body?: string;
  };
};

type EngagementCreated = {
  data: { correlationId: string; hubspotActivityId: string };
};

/**
 * Owns the async email send: Graph send (with the correlation header + BCC),
 * the conversation write, the `sentAt` stamp, and the wait-for-engagement
 * reconciliation. Triggered by `message.approval-requested` once the consultant
 * approves (#261). Each step is memoised by Inngest, so the function is
 * re-entry safe; the `sentAt` / `dispatchingAt` guards make a re-run a no-op.
 */
export async function runDispatchEmail(
  event: DispatchEmailEvent,
  step: Step,
): Promise<void> {
  const { messageId, leadId } = event.data;

  // 1. Re-read the row. Exit unless it's still an approved, unsent email —
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
  const { subject, body } = message;

  // 2. Stamp the dispatching_at fence, then send via Graph with the correlation
  // header. The worker has no session, so it resolves the sending mailbox via
  // the #289 ownership seam. A completed step won't re-run; the residual
  // double-send window (death after Graph 202, before the step returns) is
  // bounded by the sentAt/dispatchingAt guards.
  await step.run("send-via-graph", async () => {
    const userId = await resolveLeadOwnerUserId(db);
    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
      columns: { email: true },
    });
    if (!lead?.email) {
      throw new Error(`dispatch-email: lead ${leadId} has no email`);
    }
    await db
      .update(messageQueue)
      .set({ dispatchingAt: new Date() })
      .where(eq(messageQueue.id, messageId));
    await sendEmail({
      userId,
      to: lead.email,
      subject: subject ?? "",
      body,
      correlationId: messageId,
    });
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
      channel: "email",
      direction: "outbound",
      deliveryMethod: "email",
      subject,
      body,
      hubspotActivityId: null,
    });
  });

  // 4. Stamp sentAt — the send is now durably recorded.
  await step.run("update-message-status", () =>
    db
      .update(messageQueue)
      .set({ sentAt: new Date() })
      .where(eq(messageQueue.id, messageId)),
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
      db
        .update(conversations)
        .set({ hubspotActivityId: engagement.data.hubspotActivityId })
        .where(eq(conversations.messageQueueId, messageId)),
    );
  } else {
    // 7. Timeout: hand off to the one-shot reconciler.
    await step.run("emit-engagement-missed", () =>
      inngest.send({
        name: HUBSPOT_EMAIL_EVENTS.ENGAGEMENT_MISSED,
        data: { messageId, leadId, correlationId: messageId },
      }),
    );
  }
}

export const dispatchEmailWorker = inngest.createFunction(
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
  ({ event, step }) =>
    runDispatchEmail(event as unknown as DispatchEmailEvent, step),
);
