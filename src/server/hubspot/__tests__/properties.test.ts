import { describe, expect, test } from "@rstest/core";
import { fromContactProperties, toContactProperties } from "../properties";

describe("toContactProperties", () => {
  test("maps app keys to HubSpot property names with stringified values", () => {
    const result = toContactProperties({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
    expect(result).toEqual({
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
    });
  });

  test("stringifies booleans", () => {
    expect(toContactProperties({ hasLand: true })).toEqual({
      has_land: "true",
    });
    expect(toContactProperties({ seenBroker: false })).toEqual({
      seen_broker: "false",
    });
  });

  test("stringifies numbers", () => {
    expect(toContactProperties({ leadScore: 85 })).toEqual({
      lead_score: "85",
    });
  });

  test("drops null and undefined values", () => {
    const result = toContactProperties({
      firstName: "Jane",
      email: null,
      phone: undefined,
    });
    expect(result).toEqual({ firstname: "Jane" });
  });

  test("drops keys not in PROPERTY_MAP", () => {
    const input = {
      firstName: "Jane",
      referrerName: "Alice",
      id: "some-uuid",
      scoreMetadata: { score: 85 },
    } as Record<string, unknown>;
    const result = toContactProperties(
      input as Parameters<typeof toContactProperties>[0],
    );
    expect(result).toEqual({ firstname: "Jane" });
  });

  test("empty input returns empty output", () => {
    expect(toContactProperties({})).toEqual({});
  });
});

describe("fromContactProperties", () => {
  test("maps HubSpot keys to app keys with coerced types", () => {
    const result = fromContactProperties({
      firstname: "Jane",
      lastname: "Doe",
      has_land: "true",
      lead_score: "85",
    });
    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: true,
      leadScore: 85,
    });
  });

  test("skips unknown HubSpot keys", () => {
    const result = fromContactProperties({
      firstname: "Jane",
      hs_analytics_source: "ORGANIC_SEARCH",
    });
    expect(result).toEqual({ firstName: "Jane" });
  });

  test("skips null values", () => {
    const result = fromContactProperties({
      firstname: "Jane",
      lastname: null,
    });
    expect(result).toEqual({ firstName: "Jane" });
  });

  test("handles single-key input (webhook handlePropertyChange shape)", () => {
    expect(fromContactProperties({ lead_stage: "hot" })).toEqual({
      leadStage: "hot",
    });
    expect(fromContactProperties({ has_land: "false" })).toEqual({
      hasLand: false,
    });
  });

  test("empty input returns empty output", () => {
    expect(fromContactProperties({})).toEqual({});
  });
});

describe("round-trip", () => {
  test("to → from preserves all PROPERTY_MAP fields with correct types", () => {
    const input = {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "0400000000",
      hasLand: true,
      landRegistered: false,
      landAddress: "1 Main St",
      landSizeSqm: "500",
      propertyType: "house_and_land",
      budget: "$700K",
      seenBroker: true,
      constructionTimeline: "6_12_months",
      resolveFinanceOptedIn: false,
      preferredContactTime: "morning",
      landWidth: "20",
      landDepth: "25",
      leadScore: 85,
      leadStage: "hot",
      notes: "Interested in acreage",
      leadSource: "direct",
    } satisfies Parameters<typeof toContactProperties>[0];

    const hubspotProps = toContactProperties(input);
    const result = fromContactProperties(hubspotProps);

    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.email).toBe("jane@example.com");
    expect(result.phone).toBe("0400000000");
    expect(result.hasLand).toBe(true);
    expect(result.landRegistered).toBe(false);
    expect(result.landAddress).toBe("1 Main St");
    expect(result.landSizeSqm).toBe("500");
    expect(result.propertyType).toBe("house_and_land");
    expect(result.budget).toBe("$700K");
    expect(result.seenBroker).toBe(true);
    expect(result.constructionTimeline).toBe("6_12_months");
    expect(result.resolveFinanceOptedIn).toBe(false);
    expect(result.preferredContactTime).toBe("morning");
    expect(result.landWidth).toBe("20");
    expect(result.landDepth).toBe("25");
    expect(result.leadScore).toBe(85);
    expect(result.leadStage).toBe("hot");
    expect(result.notes).toBe("Interested in acreage");
    expect(result.leadSource).toBe("direct");

    // Non-mapped fields are absent
    expect((result as Record<string, unknown>).referrerName).toBeUndefined();
    expect((result as Record<string, unknown>).id).toBeUndefined();
    // 20 mapped fields survive the round-trip
    expect(Object.keys(result)).toHaveLength(20);
  });
});
