import type { BadgeProps } from "~/components/ui/Badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;
type LeadStage = "unqualified" | "nurture" | "warm" | "hot";
type FactorKey =
  | "land"
  | "finance"
  | "timeline"
  | "budget"
  | "propertyType"
  | "engagement";
type Impact = "high" | "medium" | "low";

/** Canonical order for rendering the six scoring factors. */
export const FACTOR_ORDER: readonly FactorKey[] = [
  "land",
  "finance",
  "timeline",
  "budget",
  "propertyType",
  "engagement",
] as const;

const STAGE_LABELS: Record<LeadStage, string> = {
  unqualified: "Unqualified",
  nurture: "Nurture",
  warm: "Warm",
  hot: "Hot",
};

export function stageLabel(stage: LeadStage): string {
  return STAGE_LABELS[stage];
}

const STAGE_BADGE_VARIANTS: Record<LeadStage, BadgeVariant> = {
  unqualified: "outline",
  nurture: "amber",
  warm: "brand",
  hot: "coral",
};

export function stageTone(stage: LeadStage): BadgeVariant {
  return STAGE_BADGE_VARIANTS[stage];
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  land: "Land",
  finance: "Finance",
  timeline: "Timeline",
  budget: "Budget",
  propertyType: "Property type",
  engagement: "Engagement",
};

export function factorLabel(key: FactorKey): string {
  return FACTOR_LABELS[key];
}

const IMPACT_VARIANTS: Record<Impact, BadgeVariant> = {
  high: "coral",
  medium: "amber",
  low: "outline",
};

export function impactTone(impact: Impact): BadgeVariant {
  return IMPACT_VARIANTS[impact];
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  first_home_buyer: "First home buyer",
  single_storey: "Single storey",
  double_storey: "Double storey",
  investment: "Investment",
  upsize: "Upsize",
  downsize: "Downsize",
};

export function formatPropertyType(value: string | null | undefined): string {
  if (!value) return "Not provided";
  return PROPERTY_TYPE_LABELS[value] ?? humanise(value);
}

const TIMELINE_LABELS: Record<string, string> = {
  ready_now: "Ready now",
  "3_6_months": "3–6 months",
  "12_months_plus": "12+ months",
};

export function formatTimeline(value: string | null | undefined): string {
  if (!value) return "Not provided";
  return TIMELINE_LABELS[value] ?? humanise(value);
}

const CONTACT_TIME_LABELS: Record<string, string> = {
  weekdays: "Weekdays",
  weekends: "Weekends",
  anytime: "Anytime",
};

export function formatContactTime(value: string | null | undefined): string {
  if (!value) return "Not provided";
  return CONTACT_TIME_LABELS[value] ?? humanise(value);
}

const LEAD_SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  referral: "Referral",
  social: "Social",
  web: "Web",
  other: "Other",
};

export function formatLeadSource(value: string | null | undefined): string {
  if (!value) return "Not provided";
  return LEAD_SOURCE_LABELS[value] ?? humanise(value);
}

function humanise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

/**
 * Short human-readable "last contacted" string. `now` is injectable for tests.
 */
export function formatLastContacted(
  date: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Never";

  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  ).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / msPerDay);

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff}d ago`;
  if (dayDiff < 30) return `${Math.floor(dayDiff / 7)}w ago`;
  if (dayDiff < 365) return `${Math.floor(dayDiff / 30)}mo ago`;
  return `${Math.floor(dayDiff / 365)}y ago`;
}
