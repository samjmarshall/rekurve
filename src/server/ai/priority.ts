import type { LeadRow } from "./schema";

const BASE_BY_STAGE = {
  hot: 80,
  warm: 50,
  nurture: 25,
  unqualified: 10,
} as const;

// Overdue thresholds (days since lastContactedAt). Null lastContactedAt
// means the lead has never been contacted and is NOT considered overdue —
// the nurture scheduler handles first-touch separately.
const OVERDUE_DAYS = {
  hot: 2,
  warm: 7,
  nurture: 20,
  unqualified: 5,
} as const;

const MS_PER_DAY = 86_400_000;

export function isOverdue(lead: LeadRow, now: Date = new Date()): boolean {
  if (!lead.lastContactedAt) return false;
  const daysSince =
    (now.getTime() - lead.lastContactedAt.getTime()) / MS_PER_DAY;
  return daysSince > OVERDUE_DAYS[lead.leadStage];
}

export function computePriority(lead: LeadRow, now: Date = new Date()): number {
  const base = BASE_BY_STAGE[lead.leadStage];
  const bump = isOverdue(lead, now) ? 10 : 0;
  return Math.min(100, base + bump);
}
