import { describe, expect, test } from "@rstest/core";
import type { ScoreMetadata } from "~/server/scoring";
import { extractTopGap } from "../top-gap";

const baseMetadata: ScoreMetadata = {
  score: 45,
  breakdown: {
    land: { score: 10, maxScore: 30, reasoning: "" },
    finance: { score: 5, maxScore: 25, reasoning: "" },
    timeline: { score: 10, maxScore: 20, reasoning: "" },
    budget: { score: 5, maxScore: 10, reasoning: "" },
    propertyType: { score: 10, maxScore: 10, reasoning: "" },
    engagement: { score: 5, maxScore: 5, reasoning: "" },
  },
  gaps: [],
  nextQuestion: "",
  scoredAt: "2026-04-09T00:00:00.000Z",
};

describe("extractTopGap", () => {
  test("returns 'Score pending' for null metadata", () => {
    expect(extractTopGap(null)).toBe("Score pending");
  });

  test("returns 'Score pending' for undefined metadata", () => {
    expect(extractTopGap(undefined)).toBe("Score pending");
  });

  test("returns 'Fully qualified' when gaps is empty", () => {
    expect(extractTopGap(baseMetadata)).toBe("Fully qualified");
  });

  test("returns the first gap's description (highest weight)", () => {
    const metadata: ScoreMetadata = {
      ...baseMetadata,
      gaps: [
        { field: "land", impact: "high", description: "No land info" },
        {
          field: "finance",
          impact: "medium",
          description: "Not yet pre-approved",
        },
      ],
    };
    expect(extractTopGap(metadata)).toBe("No land info");
  });

  test("does not re-sort gaps when impacts are mixed", () => {
    const metadata: ScoreMetadata = {
      ...baseMetadata,
      gaps: [
        {
          field: "finance",
          impact: "medium",
          description: "Not yet pre-approved",
        },
        { field: "land", impact: "high", description: "No land info" },
      ],
    };
    // First element wins, even though its impact is lower.
    expect(extractTopGap(metadata)).toBe("Not yet pre-approved");
  });
});
