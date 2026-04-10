import { describe, expect, test } from "@rstest/core";
import {
  buildPipelineSearchParams,
  parseFiltersFromSearchParams,
  parseVisibleStages,
} from "../filters";
import { STAGE_ORDER } from "../stage-meta";

describe("parseFiltersFromSearchParams", () => {
  test("returns null for empty params", () => {
    expect(parseFiltersFromSearchParams({})).toBeNull();
  });

  test("parses preferredEstate", () => {
    const result = parseFiltersFromSearchParams({ estate: "Springfield Rise" });
    expect(result?.preferredEstate).toBe("Springfield Rise");
  });

  test("parses fhog=true as fhogEligible", () => {
    const result = parseFiltersFromSearchParams({ fhog: "true" });
    expect(result?.fhogEligible).toBe(true);
  });

  test("ignores fhog=false (null, not false)", () => {
    const result = parseFiltersFromSearchParams({ fhog: "false" });
    expect(result?.fhogEligible ?? null).toBeNull();
  });

  test("parses constructionTimeline=ready_now", () => {
    const result = parseFiltersFromSearchParams({ timeline: "ready_now" });
    expect(result?.constructionTimeline).toBe("ready_now");
  });

  test("returns null when timeline is invalid", () => {
    const result = parseFiltersFromSearchParams({ timeline: "nope" });
    expect(result).toBeNull();
  });

  test("accepts URLSearchParams as input", () => {
    const params = new URLSearchParams();
    params.set("estate", "Springfield Rise");
    params.set("fhog", "true");
    const result = parseFiltersFromSearchParams(params);
    expect(result?.preferredEstate).toBe("Springfield Rise");
    expect(result?.fhogEligible).toBe(true);
  });

  test("uses first value when param is an array", () => {
    const result = parseFiltersFromSearchParams({
      estate: ["Springfield Rise", "Brookwater"],
    });
    expect(result?.preferredEstate).toBe("Springfield Rise");
  });
});

describe("parseVisibleStages", () => {
  test("returns all stages when no param", () => {
    const result = parseVisibleStages({});
    expect(result.size).toBe(4);
    for (const s of STAGE_ORDER) expect(result.has(s)).toBe(true);
  });

  test("parses a comma-separated list", () => {
    const result = parseVisibleStages({ stages: "warm,hot" });
    expect(result.size).toBe(2);
    expect(result.has("warm")).toBe(true);
    expect(result.has("hot")).toBe(true);
  });

  test("falls back to all stages when value is entirely invalid", () => {
    const result = parseVisibleStages({ stages: "bogus" });
    expect(result.size).toBe(4);
  });

  test("filters out invalid entries", () => {
    const result = parseVisibleStages({ stages: "warm,bogus" });
    expect(result.size).toBe(1);
    expect(result.has("warm")).toBe(true);
  });
});

describe("buildPipelineSearchParams", () => {
  test("omits unset filters", () => {
    const result = buildPipelineSearchParams({
      filters: {
        constructionTimeline: null,
        preferredEstate: null,
        fhogEligible: null,
      },
      visibleStages: new Set(STAGE_ORDER),
    });
    expect(result).toBe("");
  });

  test("serialises all filters", () => {
    const result = buildPipelineSearchParams({
      filters: {
        constructionTimeline: "ready_now",
        preferredEstate: "Springfield Rise",
        fhogEligible: true,
      },
      visibleStages: new Set(STAGE_ORDER),
    });
    const params = new URLSearchParams(result);
    expect(params.get("timeline")).toBe("ready_now");
    expect(params.get("estate")).toBe("Springfield Rise");
    expect(params.get("fhog")).toBe("true");
    expect(params.get("stages")).toBeNull();
  });

  test("serialises visible stages only when user has hidden at least one", () => {
    const result = buildPipelineSearchParams({
      filters: {
        constructionTimeline: null,
        preferredEstate: null,
        fhogEligible: null,
      },
      visibleStages: new Set(["warm", "hot"]),
    });
    const params = new URLSearchParams(result);
    expect(params.get("stages")).toBe("warm,hot");
  });

  test("round-trips via parse → build → parse", () => {
    const initial = {
      filters: {
        constructionTimeline: "3_6_months" as const,
        preferredEstate: "Brookwater",
        fhogEligible: true,
      },
      visibleStages: new Set<"unqualified" | "nurture" | "warm" | "hot">([
        "nurture",
        "warm",
      ]),
    };
    const qs = buildPipelineSearchParams(initial);
    const parsedFilters = parseFiltersFromSearchParams(new URLSearchParams(qs));
    const parsedStages = parseVisibleStages(new URLSearchParams(qs));
    expect(parsedFilters?.constructionTimeline).toBe("3_6_months");
    expect(parsedFilters?.preferredEstate).toBe("Brookwater");
    expect(parsedFilters?.fhogEligible).toBe(true);
    expect(parsedStages.size).toBe(2);
    expect(parsedStages.has("nurture")).toBe(true);
    expect(parsedStages.has("warm")).toBe(true);
  });
});
