import { describe, expect, test } from "@rstest/core";
import { qualifyAndScore } from "../qualify-and-score";

describe("qualifyAndScore", () => {
  test("empty lead scores 0 / unqualified", () => {
    const result = qualifyAndScore({ firstName: "Test", lastName: "User" });
    expect(result.score).toBe(0);
    expect(result.stage).toBe("unqualified");
    expect(result.gaps).toHaveLength(5);
  });

  test("fully qualified lead scores high", () => {
    const result = qualifyAndScore({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: true,
      landRegistered: true,
      landSizeSqm: "450",
      seenBroker: true,
      constructionTimeline: "ready_now",
      budget: "$650,000",
      propertyType: "first_home_buyer",
    });
    // 30 + 15 + 20 + 10 + 10 + 0 = 85
    expect(result.score).toBe(85);
    expect(result.stage).toBe("hot");
    expect(result.gaps).toHaveLength(0);
  });

  test("partial lead scores as nurture", () => {
    const result = qualifyAndScore({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: false,
      preferredEstates: ["Springfield Rise"],
      seenBroker: true,
      constructionTimeline: "3_6_months",
    });
    // 15 + 15 + 12 + 0 + 0 + 0 = 42
    expect(result.score).toBe(42);
    expect(result.stage).toBe("nurture");
  });

  test("score equals sum of breakdown factors", () => {
    const result = qualifyAndScore({
      firstName: "Test",
      lastName: "User",
      hasLand: true,
      budget: "$500K",
    });
    const sum = Object.values(result.breakdown).reduce(
      (s, f) => s + f.score,
      0,
    );
    expect(result.score).toBe(sum);
  });
});

describe("deriveStage (via qualifyAndScore)", () => {
  // Stage thresholds: 0-25 unqualified, 26-50 nurture, 51-75 warm, 76-100 hot
  test("score 0 → unqualified", () => {
    const { stage } = qualifyAndScore({ firstName: "T", lastName: "U" });
    expect(stage).toBe("unqualified");
  });
});
