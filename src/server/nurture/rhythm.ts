import "server-only";

import type { z } from "zod";

import type { leadStageSchema } from "~/domain/leads/schemas";

// Stage authority is the kernel enum (adr019 clause 7 types the
// lead.stage-changed payload off it) — deriving here makes the RHYTHM_DAYS
// Record exhaustiveness check force the cadence decision in this file when a
// stage is added.
export type LeadStage = z.infer<typeof leadStageSchema>;

export const RHYTHM_DAYS: Record<LeadStage, number | null> = {
  unqualified: 3,
  nurture: 14,
  warm: 7,
  hot: null,
};

export function rhythmForStage(stage: LeadStage): { duration: string } | null {
  if (RHYTHM_DAYS[stage] === null) return null;

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NURTURE_TEST_RHYTHM
  ) {
    return { duration: process.env.NURTURE_TEST_RHYTHM };
  }

  return { duration: `${RHYTHM_DAYS[stage]}d` };
}
