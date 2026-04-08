import { beforeEach, describe, expect, rs, test } from "@rstest/core";

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: { ANTHROPIC_API_KEY: "test-key" },
  }));
});

describe("deriveStage", () => {
  test.each([
    [0, "unqualified"],
    [25, "unqualified"],
    [26, "nurture"],
    [50, "nurture"],
    [51, "warm"],
    [75, "warm"],
    [76, "hot"],
    [100, "hot"],
  ])("score %d → stage %s", async (score, expectedStage) => {
    const mockResult = {
      score,
      breakdown: {
        land: { score: 0, maxScore: 30, reasoning: "test" },
        finance: { score: 0, maxScore: 25, reasoning: "test" },
        timeline: { score: 0, maxScore: 20, reasoning: "test" },
        budget: { score: 0, maxScore: 10, reasoning: "test" },
        propertyType: { score: 0, maxScore: 10, reasoning: "test" },
        engagement: { score: 0, maxScore: 5, reasoning: "test" },
      },
      gaps: [],
      nextQuestion: "test question",
    };

    rs.doMock("~/server/ai/client", () => ({
      anthropic: {
        messages: {
          parse: rs.fn().mockResolvedValue({ parsed_output: mockResult }),
        },
      },
    }));

    const { qualifyAndScore } = await import("../qualify-and-score");
    const result = await qualifyAndScore({
      firstName: "Test",
      lastName: "User",
    });

    expect(result.stage).toBe(expectedStage);
  });
});

describe("qualifyAndScore", () => {
  test("returns structured result from Claude API", async () => {
    const mockResult = {
      score: 45,
      breakdown: {
        land: { score: 15, maxScore: 30, reasoning: "Searching estates" },
        finance: { score: 15, maxScore: 25, reasoning: "Seen broker" },
        timeline: { score: 12, maxScore: 20, reasoning: "3-6 months" },
        budget: { score: 0, maxScore: 10, reasoning: "No budget given" },
        propertyType: { score: 3, maxScore: 10, reasoning: "Vague intent" },
        engagement: { score: 0, maxScore: 5, reasoning: "New lead" },
      },
      gaps: [
        {
          field: "budget",
          impact: "medium" as const,
          description: "No budget provided",
        },
      ],
      nextQuestion: "Do you have a rough budget in mind for the build?",
    };

    rs.doMock("~/server/ai/client", () => ({
      anthropic: {
        messages: {
          parse: rs.fn().mockResolvedValue({ parsed_output: mockResult }),
        },
      },
    }));

    const { qualifyAndScore } = await import("../qualify-and-score");
    const result = await qualifyAndScore({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: false,
      seenBroker: true,
      constructionTimeline: "3_6_months",
    });

    expect(result.score).toBe(45);
    expect(result.stage).toBe("nurture");
    expect(result.breakdown.land.score).toBe(15);
    expect(result.gaps).toHaveLength(1);
    expect(result.nextQuestion).toContain("budget");
  });
});
