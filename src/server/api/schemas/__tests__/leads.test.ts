import { describe, expect, test } from "@rstest/core";
import {
  leadCreateSchema,
  leadFilterSchema,
  leadQuickCaptureSchema,
  leadUpdateSchema,
} from "../leads";

describe("leadCreateSchema", () => {
  test("accepts valid full form input", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "0412345678",
      hasLand: true,
      propertyType: "first_home_buyer",
    });
    expect(result.success).toBe(true);
  });

  test("accepts minimal input (name only)", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing firstName", () => {
    const result = leadCreateSchema.safeParse({ lastName: "Smith" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid propertyType enum value", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      propertyType: "mansion",
    });
    expect(result.success).toBe(false);
  });
});

describe("leadQuickCaptureSchema", () => {
  test("accepts valid quick capture", () => {
    const result = leadQuickCaptureSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "0498765432",
      notes: "Met at BBQ",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing phone", () => {
    const result = leadQuickCaptureSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });
});

describe("leadUpdateSchema", () => {
  test("requires id", () => {
    const result = leadUpdateSchema.safeParse({ firstName: "Updated" });
    expect(result.success).toBe(false);
  });

  test("accepts id with partial fields", () => {
    const result = leadUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      budget: "$700K",
    });
    expect(result.success).toBe(true);
  });

  test("accepts scoring fields", () => {
    const result = leadUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      leadScore: 75,
      leadStage: "warm",
    });
    expect(result.success).toBe(true);
  });

  test("rejects score out of range", () => {
    const result = leadUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      leadScore: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe("leadFilterSchema", () => {
  test("applies defaults for empty input", () => {
    const result = leadFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("createdAt");
    expect(result.sortOrder).toBe("desc");
  });

  test("accepts valid filters", () => {
    const result = leadFilterSchema.safeParse({
      stage: "hot",
      fhogEligible: true,
      page: 2,
      limit: 50,
    });
    expect(result.success).toBe(true);
  });
});
