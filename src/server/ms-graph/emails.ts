import { randomUUID } from "node:crypto";
import { env } from "~/env";
import { graphClientForUser } from "./client";

export interface SendEmailArgs {
  userId: string;
  to: string;
  subject: string;
  body: string;
  bcc?: string[];
}

export interface SendEmailResult {
  internetMessageId: string;
  sentAt: Date;
}

export async function sendEmail({
  userId,
  to,
  subject,
  body,
  bcc = [],
}: SendEmailArgs): Promise<SendEmailResult> {
  const client = await graphClientForUser(userId);
  const internetMessageId = `<${randomUUID()}@rekurve.com>`;
  const sentAt = new Date();

  const allBcc = [env.HUBSPOT_BCC_ADDRESS, ...bcc];

  await client.api("/me/sendMail").post({
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
      bccRecipients: allBcc.map((address) => ({ emailAddress: { address } })),
    },
    saveToSentItems: true,
  });

  return { internetMessageId, sentAt };
}
