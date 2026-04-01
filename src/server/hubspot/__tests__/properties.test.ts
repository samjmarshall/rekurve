import { describe, expect, test } from "@rstest/core";
import {
  fromHubSpotProperties,
  PROPERTY_MAP,
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

describe("PROPERTY_MAP", () => {
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
