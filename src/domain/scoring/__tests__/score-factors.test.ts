import { describe, expect, test } from "@rstest/core";
import {
  detectGaps,
  parseBudgetAmount,
  pickNextQuestion,
  scoreBudget,
  scoreFinance,
  scoreLand,
  scorePropertyType,
  scoreTimeline,
} from "../score-factors";

describe("scoreLand", () => {
  test("registered land with dimensions → 30", () => {
    expect(
      scoreLand({ hasLand: true, landRegistered: true, landSizeSqm: "450" })
        .score,
    ).toBe(30);
  });
  test("registered land with width+depth → 30", () => {
    expect(
      scoreLand({
        hasLand: true,
        landRegistered: true,
        landWidth: "15",
        landDepth: "30",
      }).score,
    ).toBe(30);
  });
  test("registered land without dimensions → 22", () => {
    expect(scoreLand({ hasLand: true, landRegistered: true }).score).toBe(22);
  });
  test("has land not registered → 15", () => {
    expect(scoreLand({ hasLand: true }).score).toBe(15);
  });
  test("searching specific estates → 15", () => {
    expect(scoreLand({ preferredEstates: ["Springfield Rise"] }).score).toBe(
      15,
    );
  });
  test("exploring suburbs → 5", () => {
    expect(scoreLand({ preferredSuburbs: ["Springfield"] }).score).toBe(5);
  });
  test("no land info → 0", () => {
    expect(scoreLand({}).score).toBe(0);
  });
});

describe("scoreFinance", () => {
  test("seen broker → 15", () => {
    expect(scoreFinance({ seenBroker: true }).score).toBe(15);
  });
  test("not seen broker → 0", () => {
    expect(scoreFinance({ seenBroker: false }).score).toBe(0);
  });
  test("null → 0", () => {
    expect(scoreFinance({ seenBroker: null }).score).toBe(0);
  });
});

describe("scoreTimeline", () => {
  test("ready_now → 20", () => {
    expect(scoreTimeline({ constructionTimeline: "ready_now" }).score).toBe(20);
  });
  test("3_6_months → 12", () => {
    expect(scoreTimeline({ constructionTimeline: "3_6_months" }).score).toBe(
      12,
    );
  });
  test("12_months_plus → 4", () => {
    expect(
      scoreTimeline({ constructionTimeline: "12_months_plus" }).score,
    ).toBe(4);
  });
  test("null → 0", () => {
    expect(scoreTimeline({}).score).toBe(0);
  });
});

describe("parseBudgetAmount", () => {
  test("$650,000 → 650000", () => {
    expect(parseBudgetAmount("$650,000")).toBe(650_000);
  });
  test("650k → 650000", () => {
    expect(parseBudgetAmount("650k")).toBe(650_000);
  });
  test("$700K → 700000", () => {
    expect(parseBudgetAmount("$700K")).toBe(700_000);
  });
  test("1.2M → 1200000", () => {
    expect(parseBudgetAmount("1.2M")).toBe(1_200_000);
  });
  test("not sure → null", () => {
    expect(parseBudgetAmount("not sure")).toBeNull();
  });
});

describe("scoreBudget", () => {
  test("$650K in range → 10", () => {
    expect(scoreBudget({ budget: "$650K" }).score).toBe(10);
  });
  test("$1.2M outside range → 5", () => {
    expect(scoreBudget({ budget: "$1.2M" }).score).toBe(5);
  });
  test("not sure → 2", () => {
    expect(scoreBudget({ budget: "not sure" }).score).toBe(2);
  });
  test("null → 0", () => {
    expect(scoreBudget({}).score).toBe(0);
  });
});

describe("scorePropertyType", () => {
  test("first_home_buyer → 10", () => {
    expect(scorePropertyType({ propertyType: "first_home_buyer" }).score).toBe(
      10,
    );
  });
  test("single_storey → 10", () => {
    expect(scorePropertyType({ propertyType: "single_storey" }).score).toBe(10);
  });
  test("investment → 6", () => {
    expect(scorePropertyType({ propertyType: "investment" }).score).toBe(6);
  });
  test("null → 0", () => {
    expect(scorePropertyType({}).score).toBe(0);
  });
});

describe("detectGaps", () => {
  test("all fields null → 5 gaps", () => {
    expect(detectGaps({})).toHaveLength(5);
  });
  test("all fields present → 0 gaps", () => {
    const lead = {
      hasLand: true,
      seenBroker: true,
      constructionTimeline: "ready_now",
      budget: "$600K",
      propertyType: "first_home_buyer",
    };
    expect(detectGaps(lead)).toHaveLength(0);
  });
  test("gaps sorted by weight (high first)", () => {
    const gaps = detectGaps({});
    expect(gaps[0]!.impact).toBe("high");
    expect(gaps[0]!.field).toBe("land");
  });
});

describe("pickNextQuestion", () => {
  test("returns land question for highest-impact gap", () => {
    const gaps = detectGaps({});
    expect(pickNextQuestion(gaps)).toContain("land");
  });
  test("returns fallback when no gaps", () => {
    expect(pickNextQuestion([])).toContain("anything else");
  });
});
