import { env } from "~/env";
import { hubspot } from "./client";

const EMAIL_PROPERTIES = [
  "hs_email_subject",
  "hs_email_direction",
  "hs_timestamp",
  "hs_email_to_email",
];

export interface EmailEngagement {
  id: string;
  subject: string | null;
  direction: string | null;
  timestamp: Date | null;
  toEmail: string | null;
}

export async function getEmailEngagement(
  emailId: string,
): Promise<EmailEngagement | null> {
  if (env.HUBSPOT_MOCK === "true") {
    console.log("[hubspot-mock] getEmailEngagement");
    return null;
  }
  try {
    const response = await hubspot.crm.objects.emails.basicApi.getById(
      emailId,
      EMAIL_PROPERTIES,
    );
    const props = response.properties;
    return {
      id: response.id,
      subject: props.hs_email_subject ?? null,
      direction: props.hs_email_direction ?? null,
      timestamp: props.hs_timestamp
        ? new Date(Number(props.hs_timestamp))
        : null,
      toEmail: props.hs_email_to_email ?? null,
    };
  } catch (err) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

export async function findContactIdForEmail(
  emailId: string,
): Promise<string | null> {
  if (env.HUBSPOT_MOCK === "true") {
    console.log("[hubspot-mock] findContactIdForEmail");
    return null;
  }
  try {
    const response = await hubspot.crm.associations.v4.basicApi.getPage(
      "emails",
      emailId,
      "contacts",
    );
    const results = response.results ?? [];
    return results.length > 0 ? String(results[0]!.toObjectId) : null;
  } catch {
    return null;
  }
}

function isNotFoundError(err: unknown): boolean {
  if (err instanceof Error) {
    const code = (err as { code?: number }).code;
    return code === 404;
  }
  return false;
}
