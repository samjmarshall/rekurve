import { describe, expect, rs, test } from "@rstest/core";

describe("hubspot client module", () => {
  test("exports are defined", async () => {
    // Verify the module shape without hitting HubSpot API.
    // The actual client instantiation reads env at import time,
    // so we mock the env module.
    rs.mock("~/env", () => ({
      env: {
        HUBSPOT_ACCESS_TOKEN: "test-token",
        HUBSPOT_CLIENT_SECRET: "test-secret",
      },
    }));

    const { hubspot } = await import("../client");
    expect(hubspot).toBeDefined();
  });
});
