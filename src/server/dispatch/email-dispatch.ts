import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { conversations, messageQueue } from "~/server/db/schema";
import { MsGraphNotConnectedError, sendEmail } from "~/server/ms-graph";

type Db = typeof import("~/server/db").db;
type Ctx = { session: { user: { id: string } } };
type Message = Pick<
  typeof messageQueue.$inferSelect,
  "id" | "leadId" | "channel" | "subject" | "body"
>;
type Lead = Pick<
  typeof import("~/server/db/schema").leads.$inferSelect,
  "id" | "email" | "hubspotContactId"
>;

export async function dispatchEmail({
  db,
  ctx,
  message,
  lead,
}: {
  db: Db;
  ctx: Ctx;
  message: Message;
  lead: Lead;
}): Promise<{ conversationId: string }> {
  let sentAt: Date;

  try {
    const result = await sendEmail({
      userId: ctx.session.user.id,
      to: lead.email!,
      subject: message.subject ?? "",
      body: message.body,
    });
    sentAt = result.sentAt;
  } catch (err) {
    if (err instanceof MsGraphNotConnectedError) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Connect your Microsoft account to send emails.",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send email. Please try again.",
      cause: err,
    });
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      leadId: lead.id,
      messageQueueId: message.id,
      channel: "email",
      direction: "outbound",
      deliveryMethod: "email",
      subject: message.subject,
      body: message.body,
      hubspotActivityId: null,
    })
    .returning();

  await db
    .update(messageQueue)
    .set({ sentAt })
    .where(eq(messageQueue.id, message.id));

  return { conversationId: conversation!.id };
}
