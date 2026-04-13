import type { LeadRow } from "./schema";

export type Channel = "sms" | "email";

/**
 * Channel selection rules (per #127):
 * - hot + email on file → email (richer detail appropriate at this stage)
 * - otherwise → SMS (requires phone)
 * - email as last resort for non-hot stages without phone
 * - throws if neither contact method is available
 */
export function selectChannel(lead: LeadRow): Channel {
  if (lead.leadStage === "hot" && lead.email) return "email";
  if (lead.phone) return "sms";
  if (lead.email) return "email";
  throw new Error(
    `Lead ${lead.id} has no phone or email — cannot draft message`,
  );
}
