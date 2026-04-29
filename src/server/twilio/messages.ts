import { env } from "~/env";
import { twilioClient } from "./client";

export async function sendSmsToConsultant(
  body: string,
  opts?: { statusCallback?: string },
): Promise<{ sid: string; status: string; sentAt: Date }> {
  if (!twilioClient) throw new Error("Twilio is not configured.");
  if (!env.TWILIO_FROM_NUMBER || !env.TWILIO_CONSULTANT_NUMBER)
    throw new Error("Twilio phone numbers are not configured.");
  const message = await twilioClient.messages.create({
    to: env.TWILIO_CONSULTANT_NUMBER,
    from: env.TWILIO_FROM_NUMBER,
    body,
    ...(opts?.statusCallback ? { statusCallback: opts.statusCallback } : {}),
  });
  return { sid: message.sid, status: message.status, sentAt: new Date() };
}
