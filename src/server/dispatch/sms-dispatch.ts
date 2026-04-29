import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { conversations, messageQueue } from "~/server/db/schema";
import { sendSmsToConsultant } from "~/server/twilio";

type Db = typeof import("~/server/db").db;
type Message = Pick<
  typeof messageQueue.$inferSelect,
  "id" | "leadId" | "channel" | "body"
>;

export async function dispatchSms({
  db,
  message,
}: {
  db: Db;
  message: Message;
}): Promise<{ conversationId: string }> {
  const statusCallback = `${env.BETTER_AUTH_URL}/api/twilio/status`;

  let sid: string;
  let status: string;
  let sentAt: Date;

  try {
    const result = await sendSmsToConsultant(message.body, { statusCallback });
    sid = result.sid;
    status = result.status;
    sentAt = result.sentAt;
  } catch (err) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send SMS. Please try again.",
      cause: err,
    });
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      leadId: message.leadId,
      messageQueueId: message.id,
      channel: "sms",
      direction: "outbound",
      deliveryMethod: "sms",
      body: message.body,
      twilioMessageSid: sid,
      deliveryStatus: status,
      subject: null,
      hubspotActivityId: null,
    })
    .returning();

  await db
    .update(messageQueue)
    .set({ sentAt })
    .where(eq(messageQueue.id, message.id));

  return { conversationId: conversation!.id };
}
