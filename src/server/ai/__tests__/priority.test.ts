import { describe, expect, test } from "@rstest/core";

import { computePriority, isOverdue } from "../priority";
import { makeLead } from "./fixtures";

const NOW = new Date("2026-04-13T00:00:00Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

describe("computePriority (base rates)", () => {
  test("hot base is 80", () => {
    const lead = makeLead({ leadStage: "hot" });
    expect(computePriority(lead, NOW)).toBe(80);
  });

  test("warm base is 50", () => {
    const lead = makeLead({ leadStage: "warm" });
    expect(computePriority(lead, NOW)).toBe(50);
  });

  test("nurture base is 25", () => {
    const lead = makeLead({ leadStage: "nurture" });
    expect(computePriority(lead, NOW)).toBe(25);
  });

  test("unqualified base is 10", () => {
    const lead = makeLead({ leadStage: "unqualified" });
    expect(computePriority(lead, NOW)).toBe(10);
  });
});

describe("isOverdue", () => {
  test("null lastContactedAt → not overdue", () => {
    const lead = makeLead({ leadStage: "hot", lastContactedAt: null });
    expect(isOverdue(lead, NOW)).toBe(false);
  });

  test("hot + 3 days ago → overdue (threshold 2)", () => {
    const lead = makeLead({ leadStage: "hot", lastContactedAt: daysAgo(3) });
    expect(isOverdue(lead, NOW)).toBe(true);
  });

  test("hot + 1 day ago → not overdue", () => {
    const lead = makeLead({ leadStage: "hot", lastContactedAt: daysAgo(1) });
    expect(isOverdue(lead, NOW)).toBe(false);
  });

  test("warm + 8 days ago → overdue (threshold 7)", () => {
    const lead = makeLead({ leadStage: "warm", lastContactedAt: daysAgo(8) });
    expect(isOverdue(lead, NOW)).toBe(true);
  });

  test("nurture + 15 days ago → not overdue (threshold 20)", () => {
    const lead = makeLead({
      leadStage: "nurture",
      lastContactedAt: daysAgo(15),
    });
    expect(isOverdue(lead, NOW)).toBe(false);
  });

  test("unqualified + 10 days ago → overdue (threshold 5)", () => {
    const lead = makeLead({
      leadStage: "unqualified",
      lastContactedAt: daysAgo(10),
    });
    expect(isOverdue(lead, NOW)).toBe(true);
  });
});

describe("computePriority (overdue bump)", () => {
  test("hot + overdue → 90", () => {
    const lead = makeLead({ leadStage: "hot", lastContactedAt: daysAgo(3) });
    expect(computePriority(lead, NOW)).toBe(90);
  });

  test("warm + overdue → 60", () => {
    const lead = makeLead({ leadStage: "warm", lastContactedAt: daysAgo(8) });
    expect(computePriority(lead, NOW)).toBe(60);
  });

  test("unqualified + overdue → 20", () => {
    const lead = makeLead({
      leadStage: "unqualified",
      lastContactedAt: daysAgo(10),
    });
    expect(computePriority(lead, NOW)).toBe(20);
  });

  test("never exceeds 100", () => {
    const lead = makeLead({ leadStage: "hot", lastContactedAt: daysAgo(100) });
    expect(computePriority(lead, NOW)).toBeLessThanOrEqual(100);
  });
});
