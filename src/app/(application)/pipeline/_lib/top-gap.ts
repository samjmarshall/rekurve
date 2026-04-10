import type { ScoreMetadata } from "~/server/scoring";

/**
 * The single most-impactful missing qualification field. ScoreMetadata.gaps
 * is already sorted weight-high → weight-low by the scorer.
 */
export function extractTopGap(
  metadata: ScoreMetadata | null | undefined,
): string {
  if (!metadata) return "Score pending";
  const [top] = metadata.gaps;
  if (!top) return "Fully qualified";
  return top.description;
}
