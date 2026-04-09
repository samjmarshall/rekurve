import { describe, expect, test } from "@rstest/core";
import { scoreResultSchema } from "../schema";

const validResult = {
  score: 62,
  breakdown: {
    land: { score: 22, maxScore: 30, reasoning: "Land under contract" },
    finance: {
      score: 15,
      maxScore: 25,
      reasoning: "Seen broker, not approved",
    },
    timeline: { score: 12, maxScore: 20, reasoning: "3-6 months" },
    budget: { score: 5, maxScore: 10, reasoning: "Vague budget" },
    propertyType: { score: 8, maxScore: 10, reasoning: "First home buyer" },
    engagement: { score: 0, maxScore: 5, reasoning: "New lead" },
  },
  gaps: [
    {
      field: "finance",
      impact: "high" as const,
      description: "Not yet pre-approved",
    },
  ],
  nextQuestion:
    "Have you had a chance to get pre-approval from your broker yet?",
};

describe("scoreResultSchema", () => {
  test("accepts a valid score result", () => {
    const result = scoreResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  test("rejects score above 100", () => {
    const result = scoreResultSchema.safeParse({ ...validResult, score: 101 });
    expect(result.success).toBe(false);
  });

  test("rejects score below 0", () => {
    const result = scoreResultSchema.safeParse({ ...validResult, score: -1 });
    expect(result.success).toBe(false);
  });

  test("rejects invalid gap impact", () => {
    const result = scoreResultSchema.safeParse({
      ...validResult,
      gaps: [{ field: "land", impact: "critical", description: "No land" }],
    });
    expect(result.success).toBe(false);
  });
});
