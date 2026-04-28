import { describe, expect, test } from "@rstest/core";
import { shouldShowGlobalEmpty } from "../empty-state";
import { STAGE_ORDER } from "../stage-meta";

const allStages = new Set(STAGE_ORDER);

describe("shouldShowGlobalEmpty", () => {
  test("returns false before data has loaded", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: null,
        visibleStages: allStages,
        dataLoaded: false,
      }),
    ).toBe(false);
  });

  test("returns true when data loaded, no leads, no filters, all stages visible", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: null,
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(true);
  });

  test("returns false when leads exist", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 3,
        filters: null,
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when an estate filter is active", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: "Sovereign",
          constructionTimeline: null,
          fhogEligible: null,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when fhogEligible filter is active", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: null,
          constructionTimeline: null,
          fhogEligible: true,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when timeline filter is active", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: null,
          constructionTimeline: "ready_now",
          fhogEligible: null,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when at least one stage is hidden", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: null,
        visibleStages: new Set(["unqualified", "nurture", "warm"]),
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when filters object exists but all properties are null", () => {
    // safety check — empty filter object shouldn't suppress the global empty
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: null,
          constructionTimeline: null,
          fhogEligible: null,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(true);
  });
});
