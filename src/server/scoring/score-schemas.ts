import { z } from "zod";

const factorBreakdownSchema = z.object({
  score: z.number().int().min(0),
  maxScore: z.number().int(),
  reasoning: z.string(),
});

export const scoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    land: factorBreakdownSchema,
    finance: factorBreakdownSchema,
    timeline: factorBreakdownSchema,
    budget: factorBreakdownSchema,
    propertyType: factorBreakdownSchema,
    engagement: factorBreakdownSchema,
  }),
  gaps: z.array(
    z.object({
      field: z.string(),
      impact: z.enum(["high", "medium", "low"]),
      description: z.string(),
    }),
  ),
  nextQuestion: z.string(),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

export type ScoreMetadata = ScoreResult & { scoredAt: string };
