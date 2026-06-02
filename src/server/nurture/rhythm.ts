export type LeadStage = "unqualified" | "nurture" | "warm" | "hot";

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
