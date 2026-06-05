import { env } from "~/env";
import { hubspot } from "./client";

const EMAIL_PROPERTIES = [
  "hs_email_subject",
  "hs_email_direction",
  "hs_timestamp",
  "hs_email_to_email",
  // Carries our X-Rekurve-Correlation-Id back for deterministic reconciliation
  // (#261). SWAP POINT: the exact property is unverified until deploy — if the
  // round-trip uses a different property, change it here + the mapping below.
  "hs_email_headers",
];

export interface EmailEngagement {
  id: string;
  subject: string | null;
  direction: string | null;
  timestamp: Date | null;
  toEmail: string | null;
  headers: string | null;
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
      headers: props.hs_email_headers ?? null,
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

/**
 * List a contact's email engagements (newest-relevant first), each fetched with
 * the header property so the reconciler can match by correlation id (#261).
 * `since` filters out engagements older than the conversation that triggered
 * the miss. Best-effort: association/fetch failures yield an empty list.
 */
export async function listEmailEngagementsForContact(
  contactId: string,
  since?: Date,
): Promise<EmailEngagement[]> {
  if (env.HUBSPOT_MOCK === "true") {
    console.log("[hubspot-mock] listEmailEngagementsForContact");
    return [];
  }
  let ids: string[];
  try {
    const response = await hubspot.crm.associations.v4.basicApi.getPage(
      "contacts",
      contactId,
      "emails",
    );
    ids = (response.results ?? []).map((r) => String(r.toObjectId));
  } catch {
    return [];
  }
  const engagements = await Promise.all(
    ids.map((id) => getEmailEngagement(id)),
  );
  return engagements.filter(
    (e): e is EmailEngagement =>
      e !== null && (!since || (e.timestamp !== null && e.timestamp >= since)),
  );
}

function isNotFoundError(err: unknown): boolean {
  if (err instanceof Error) {
    const code = (err as { code?: number }).code;
    return code === 404;
  }
  return false;
}
