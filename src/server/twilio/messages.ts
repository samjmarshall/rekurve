import { env } from "~/env";
import { twilioClient } from "./client";

export async function sendSmsToConsultant(
  body: string,
  opts?: { statusCallback?: string },
): Promise<{ sid: string; status: string; sentAt: Date }> {
  const message = await twilioClient.messages.create({
    to: env.TWILIO_CONSULTANT_NUMBER,
    from: env.TWILIO_FROM_NUMBER,
    body,
    ...(opts?.statusCallback ? { statusCallback: opts.statusCallback } : {}),
  });
  return { sid: message.sid, status: message.status, sentAt: new Date() };
}
