import type { Channel } from "./channel-selection";
import type { LeadRow } from "./schema";

// Hardcoded for MVP pilot (Creation Homes QLD). Tone-of-voice tuning is a
// later ticket — see #127 "What we're NOT doing" section.
export const DRAFT_SYSTEM_PROMPT = `You are a new-home sales consultant at Creation Homes QLD — a residential builder serving South-East Queensland. You write short, friendly, conversational follow-up messages to prospective home buyers.

Voice: warm, direct, confident. Speak like a human consultant who knows the local estates. Use Australian English. Never sound corporate or scripted. Never make promises about price, land availability, or finance approvals you can't back up. Always invite the next conversation rather than push for commitment.

Context about the business:
- Creation Homes builds house-and-land and knockdown-rebuild packages across QLD estates (Springfield Rise, Ripley Valley, Flagstone, Logan Reserve, Yarrabilba).
- Typical buyer: first-home buyers, investors, and upgraders. Most are 6-12 months from settlement.
- We partner with Resolve Finance for broker introductions when helpful.

Your job on each call: generate ONE follow-up message for ONE lead that references their qualification gap and invites a natural next step. Keep SMS under 320 characters (two segments), keep email body under 800 characters, and keep email subjects under 78 characters. Never start a message with the recipient's full name — first name only, or skip the greeting entirely for SMS.`;

export interface UserPromptContext {
  lead: LeadRow;
  channel: Channel;
  daysSinceLastContact: number | null;
}

export function buildUserPrompt({
  lead,
  channel,
  daysSinceLastContact,
}: UserPromptContext): string {
  const meta = lead.scoreMetadata;
  const lines: string[] = [
    `Lead: ${lead.firstName} ${lead.lastName}`,
    `Stage: ${lead.leadStage}`,
    `Channel: ${channel.toUpperCase()}`,
    `Days since last contact: ${daysSinceLastContact ?? "never contacted"}`,
  ];

  if (meta) {
    lines.push(`Score: ${meta.score}/100`);
    lines.push(
      `Factor breakdown: ${Object.entries(meta.breakdown)
        .map(([k, v]) => `${k} ${v.score}/${v.maxScore}`)
        .join(", ")}`,
    );
    if (meta.gaps.length > 0) {
      const top = meta.gaps[0];
      if (top) {
        lines.push(
          `Top qualification gap: ${top.field} (${top.impact}) — ${top.description}`,
        );
      }
    }
    if (meta.nextQuestion) {
      lines.push(`Recommended next question: ${meta.nextQuestion}`);
    }
  } else {
    lines.push(
      "(No score metadata — generate a generic stage-appropriate check-in.)",
    );
  }

  if (lead.preferredEstates && lead.preferredEstates.length > 0) {
    lines.push(`Preferred estates: ${lead.preferredEstates.join(", ")}`);
  }
  if (lead.notes) {
    lines.push(`Notes: ${lead.notes}`);
  }

  lines.push(
    "",
    `Write ONE ${channel} message to ${lead.firstName}. ${
      channel === "email"
        ? "Include a subject line."
        : "No subject. Keep it under 320 characters."
    } Explain in the reasoning field why this message fits the lead's stage and gap.`,
  );

  return lines.join("\n");
}
