import { describe, expect, test } from "@rstest/core";
import {
  FACTOR_ORDER,
  factorLabel,
  formatContactTime,
  formatDate,
  formatLastContacted,
  formatLeadSource,
  formatPropertyType,
  formatTimeline,
  impactTone,
  stageLabel,
  stageRingClasses,
  stageTone,
} from "../display";

describe("stageLabel", () => {
  test("maps each stage to a human label", () => {
    expect(stageLabel("unqualified")).toBe("Unqualified");
    expect(stageLabel("nurture")).toBe("Nurture");
    expect(stageLabel("warm")).toBe("Warm");
    expect(stageLabel("hot")).toBe("Hot");
  });
});

describe("stageTone", () => {
  test("assigns a distinct Badge variant to every stage", () => {
    const tones = new Set([
      stageTone("unqualified"),
      stageTone("nurture"),
      stageTone("warm"),
      stageTone("hot"),
    ]);
    expect(tones.size).toBe(4);
  });
});

describe("factorLabel", () => {
  test("returns a label for each of the six factors", () => {
    expect(factorLabel("land")).toBe("Land");
    expect(factorLabel("finance")).toBe("Finance");
    expect(factorLabel("timeline")).toBe("Timeline");
    expect(factorLabel("budget")).toBe("Budget");
    expect(factorLabel("propertyType")).toBe("Property type");
    expect(factorLabel("engagement")).toBe("Engagement");
  });
});

describe("FACTOR_ORDER", () => {
  test("has all six factors in the canonical order", () => {
    expect(FACTOR_ORDER).toEqual([
      "land",
      "finance",
      "timeline",
      "budget",
      "propertyType",
      "engagement",
    ]);
  });
});

describe("impactTone", () => {
  test("maps high, medium, and low to distinct variants", () => {
    const tones = new Set([
      impactTone("high"),
      impactTone("medium"),
      impactTone("low"),
    ]);
    expect(tones.size).toBe(3);
  });
});

describe("enum formatters", () => {
  test("formatPropertyType maps known values", () => {
    expect(formatPropertyType("first_home_buyer")).toBe("First home buyer");
    expect(formatPropertyType("single_storey")).toBe("Single storey");
    expect(formatPropertyType("investment")).toBe("Investment");
  });

  test("formatPropertyType falls back to Not provided on nullish input", () => {
    expect(formatPropertyType(null)).toBe("Not provided");
    expect(formatPropertyType(undefined)).toBe("Not provided");
  });

  test("formatTimeline maps known values", () => {
    expect(formatTimeline("ready_now")).toBe("Ready now");
    expect(formatTimeline("3_6_months")).toBe("3–6 months");
    expect(formatTimeline("12_months_plus")).toBe("12+ months");
  });

  test("formatTimeline returns Not provided when missing", () => {
    expect(formatTimeline(null)).toBe("Not provided");
  });

  test("formatContactTime maps known values", () => {
    expect(formatContactTime("weekdays")).toBe("Weekdays");
    expect(formatContactTime("anytime")).toBe("Anytime");
  });

  test("formatLeadSource maps known values and humanises unknowns", () => {
    expect(formatLeadSource("walk_in")).toBe("Walk-in");
    expect(formatLeadSource("referral")).toBe("Referral");
    expect(formatLeadSource("unknown_source")).toBe("Unknown source");
  });
});

describe("stageRingClasses", () => {
  test("returns distinct classes for each stage", () => {
    const classes = new Set([
      stageRingClasses("unqualified"),
      stageRingClasses("nurture"),
      stageRingClasses("warm"),
      stageRingClasses("hot"),
    ]);
    expect(classes.size).toBe(4);
  });
});

describe("formatDate", () => {
  test("formats a Date object in en-AU short format", () => {
    expect(formatDate(new Date("2026-04-10T00:00:00Z"))).toBe("10 Apr 2026");
  });

  test("formats a string date", () => {
    expect(formatDate("2026-01-15T12:00:00Z")).toBe("15 Jan 2026");
  });
});

describe("formatLastContacted", () => {
  test("returns 'Never' for null/undefined", () => {
    expect(formatLastContacted(null)).toBe("Never");
    expect(formatLastContacted(undefined)).toBe("Never");
  });

  test("returns 'Today' for a date earlier today", () => {
    const now = new Date("2026-04-10T12:00:00Z");
    const earlier = new Date("2026-04-10T06:00:00Z");
    expect(formatLastContacted(earlier, now)).toBe("Today");
  });

  test("returns 'Yesterday' for one day ago", () => {
    const now = new Date("2026-04-10T12:00:00");
    const yesterday = new Date("2026-04-09T12:00:00");
    expect(formatLastContacted(yesterday, now)).toBe("Yesterday");
  });

  test("returns days, weeks, months for older dates", () => {
    const now = new Date("2026-04-10T12:00:00");
    expect(formatLastContacted(new Date("2026-04-07T12:00:00"), now)).toBe(
      "3d ago",
    );
    expect(formatLastContacted(new Date("2026-03-30T12:00:00"), now)).toBe(
      "1w ago",
    );
    expect(formatLastContacted(new Date("2026-02-10T12:00:00"), now)).toBe(
      "1mo ago",
    );
  });
});
