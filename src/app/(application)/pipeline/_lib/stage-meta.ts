import type { BadgeProps } from "~/components/ui/Badge";

export type LeadStage = "unqualified" | "nurture" | "warm" | "hot";

export const STAGE_ORDER: readonly LeadStage[] = [
  "unqualified",
  "nurture",
  "warm",
  "hot",
] as const;

export const STAGE_META: Record<
  LeadStage,
  { label: string; badgeVariant: BadgeProps["variant"] }
> = {
  unqualified: { label: "Unqualified", badgeVariant: "outline" },
  nurture: { label: "Nurture", badgeVariant: "brand" },
  warm: { label: "Warm", badgeVariant: "amber" },
  hot: { label: "Hot", badgeVariant: "coral" },
};
