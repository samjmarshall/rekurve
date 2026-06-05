import { env } from "~/env";
import { formatCorrelationHeader } from "~/server/dispatch/correlation";
import { graphClientForUser } from "./client";

export interface SendEmailArgs {
  userId: string;
  to: string;
  subject: string;
  body: string;
  bcc?: string[];
  /**
   * When set, stamps `X-Rekurve-Correlation-Id: <correlationId>` onto the
   * outgoing message so the BCC-driven HubSpot engagement can be matched back
   * deterministically (#261). Graph makes `internetMessageId` read-only on
   * send, so a custom `x-` header is the only settable carrier.
   */
  correlationId?: string;
}

export interface SendEmailResult {
  sentAt: Date;
}

export async function sendEmail({
  userId,
  to,
  subject,
  body,
  bcc = [],
  correlationId,
}: SendEmailArgs): Promise<SendEmailResult> {
  const client = await graphClientForUser(userId);
  const sentAt = new Date();

  const allBcc = [env.HUBSPOT_BCC_ADDRESS, ...bcc];

  await client.api("/me/sendMail").post({
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
      bccRecipients: allBcc.map((address) => ({ emailAddress: { address } })),
      ...(correlationId
        ? { internetMessageHeaders: [formatCorrelationHeader(correlationId)] }
        : {}),
    },
    saveToSentItems: true,
  });

  return { sentAt };
}
