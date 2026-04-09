import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockGroupCreate: ReturnType<typeof rs.fn>;
let mockPropertyCreate: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockGroupCreate = rs.fn().mockResolvedValue({});
  mockPropertyCreate = rs.fn().mockResolvedValue({});

  rs.doMock("../client", () => ({
    hubspot: {
      crm: {
        properties: {
          groupsApi: { create: mockGroupCreate },
          coreApi: { create: mockPropertyCreate },
        },
      },
    },
  }));
});

const EXPECTED_PROPERTY_NAMES = [
  "preferred_contact_time",
  "has_land",
  "land_registered",
  "land_address",
  "land_size_sqm",
  "land_width",
  "land_depth",
  "property_type",
  "budget",
  "seen_broker",
  "construction_timeline",
  "resolve_finance_opted_in",
  "lead_score",
  "lead_stage",
  "notes",
  "lead_source",
];

describe("ensureAllProperties", () => {
  test("creates property group and all custom properties", async () => {
    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    expect(mockGroupCreate).toHaveBeenCalledTimes(1);
    expect(mockGroupCreate).toHaveBeenCalledWith("contacts", {
      name: "rekurve",
      label: "Rekurve",
    });

    expect(mockPropertyCreate).toHaveBeenCalledTimes(
      EXPECTED_PROPERTY_NAMES.length,
    );
    // Verify each property name was created
    const names = mockPropertyCreate.mock.calls.map(
      (call: unknown[]) => (call[1] as { name: string }).name,
    );
    expect(names).toEqual(EXPECTED_PROPERTY_NAMES);
  });

  test("swallows 409 conflicts for group", async () => {
    mockGroupCreate.mockRejectedValue({ code: 409 });

    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    // Should not throw — continues to create properties
    expect(mockPropertyCreate).toHaveBeenCalledTimes(
      EXPECTED_PROPERTY_NAMES.length,
    );
  });

  test("swallows 409 conflicts for properties", async () => {
    mockPropertyCreate.mockRejectedValue({ code: 409 });

    const { ensureAllProperties } = await import("../setup");
    // Should not throw
    await ensureAllProperties();
  });

  test("throws non-409 errors", async () => {
    mockGroupCreate.mockRejectedValue({ code: 500, message: "Server error" });

    const { ensureAllProperties } = await import("../setup");
    await expect(ensureAllProperties()).rejects.toEqual(
      expect.objectContaining({ code: 500 }),
    );
  });

  test("creates enumeration properties with options", async () => {
    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    // lead_stage should have options
    const leadStageCall = mockPropertyCreate.mock.calls.find(
      (call: unknown[]) => (call[1] as { name: string }).name === "lead_stage",
    );
    expect(leadStageCall![1]).toEqual(
      expect.objectContaining({
        type: "enumeration",
        fieldType: "select",
        options: expect.arrayContaining([
          expect.objectContaining({ value: "hot", label: "Hot" }),
        ]),
      }),
    );
  });

  test("creates boolean properties as booleancheckbox with true/false options", async () => {
    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    const hasLandCall = mockPropertyCreate.mock.calls.find(
      (call: unknown[]) => (call[1] as { name: string }).name === "has_land",
    );
    expect(hasLandCall![1]).toEqual(
      expect.objectContaining({
        type: "enumeration",
        fieldType: "booleancheckbox",
        options: expect.arrayContaining([
          expect.objectContaining({ value: "true", label: "Yes" }),
          expect.objectContaining({ value: "false", label: "No" }),
        ]),
      }),
    );
  });
});
