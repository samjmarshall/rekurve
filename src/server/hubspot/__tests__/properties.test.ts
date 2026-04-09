import { describe, expect, test } from "@rstest/core";
import {
  coerceFromHubSpot,
  fromHubSpotProperties,
  PROPERTY_MAP,
  toAppField,
  toHubSpotProperties,
} from "../properties";

describe("toHubSpotProperties", () => {
  test("maps app fields to HubSpot property names", () => {
    const result = toHubSpotProperties({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      hasLand: true,
    });
    expect(result).toEqual({
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
      has_land: "true",
    });
  });

  test("skips null and undefined values", () => {
    const result = toHubSpotProperties({
      firstName: "Jane",
      email: null,
    });
    expect(result).toEqual({ firstname: "Jane" });
  });
});

describe("fromHubSpotProperties", () => {
  test("maps HubSpot properties back to app fields", () => {
    const result = fromHubSpotProperties({
      firstname: "Jane",
      lastname: "Doe",
      has_land: "true",
    });
    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: "true",
    });
  });

  test("skips null values", () => {
    const result = fromHubSpotProperties({
      firstname: "Jane",
      lastname: null,
    });
    expect(result).toEqual({ firstName: "Jane" });
  });

  test("ignores unknown HubSpot properties", () => {
    const result = fromHubSpotProperties({
      firstname: "Jane",
      unknown_prop: "value",
    });
    expect(result).toEqual({ firstName: "Jane" });
  });
});

describe("leadScore and leadStage mapping", () => {
  test("maps leadScore and leadStage to HubSpot properties", () => {
    const result = toHubSpotProperties({ leadScore: "85", leadStage: "hot" });
    expect(result).toEqual({ lead_score: "85", lead_stage: "hot" });
  });

  test("maps HubSpot lead_score and lead_stage back to app fields", () => {
    const result = fromHubSpotProperties({
      lead_score: "85",
      lead_stage: "hot",
    });
    expect(result).toEqual({ leadScore: "85", leadStage: "hot" });
  });
});

describe("PROPERTY_MAP", () => {
  test("has 20 entries", () => {
    expect(Object.keys(PROPERTY_MAP)).toHaveLength(20);
  });

  test("round-trips all fields", () => {
    const input: Record<string, string> = {};
    for (const key of Object.keys(PROPERTY_MAP)) {
      input[key] = "test";
    }
    const hubspotProps = toHubSpotProperties(input as Record<string, string>);
    const roundTripped = fromHubSpotProperties(hubspotProps);
    expect(Object.keys(roundTripped).sort()).toEqual(
      Object.keys(PROPERTY_MAP).sort(),
    );
  });
});

describe("toAppField", () => {
  test("maps known HubSpot property to app field", () => {
    expect(toAppField("lead_score")).toBe("leadScore");
    expect(toAppField("preferred_contact_time")).toBe("preferredContactTime");
  });

  test("returns undefined for unknown property", () => {
    expect(toAppField("hs_analytics_source")).toBeUndefined();
  });
});

describe("coerceFromHubSpot", () => {
  test("coerces boolean fields from string", () => {
    expect(coerceFromHubSpot("hasLand", "true")).toBe(true);
    expect(coerceFromHubSpot("hasLand", "false")).toBe(false);
    expect(coerceFromHubSpot("seenBroker", "true")).toBe(true);
    expect(coerceFromHubSpot("resolveFinanceOptedIn", "false")).toBe(false);
  });

  test("coerces integer fields from string", () => {
    expect(coerceFromHubSpot("leadScore", "85")).toBe(85);
    expect(coerceFromHubSpot("leadScore", "0")).toBe(0);
  });

  test("passes string fields through unchanged", () => {
    expect(coerceFromHubSpot("firstName", "Jane")).toBe("Jane");
    expect(coerceFromHubSpot("leadStage", "hot")).toBe("hot");
  });
});
