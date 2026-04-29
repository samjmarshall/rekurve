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
  {
    label: string;
    badgeVariant: BadgeProps["variant"];
    /** Tailwind class for the column header's left-border accent. */
    accentBorderClass: string;
  }
> = {
  unqualified: {
    label: "Unqualified",
    badgeVariant: "outline",
    accentBorderClass: "border-l-muted-foreground/40",
  },
  nurture: {
    label: "Nurture",
    badgeVariant: "brand",
    accentBorderClass: "border-l-primary",
  },
  warm: {
    label: "Warm",
    badgeVariant: "amber",
    accentBorderClass: "border-l-accent-amber",
  },
  hot: {
    label: "Hot",
    badgeVariant: "coral",
    accentBorderClass: "border-l-accent-coral",
  },
};
