import { describe, expect, test } from "@rstest/core";
import {
  pauseSequenceSchema,
  resumeSequenceSchema,
  sequenceStatusSchema,
  sequenceTypeSchema,
  startSequenceSchema,
} from "../nurture";

describe("sequenceTypeSchema", () => {
  test("accepts all four sequence types", () => {
    for (const value of [
      "discovery",
      "nurture",
      "warm_progression",
      "lot_alert",
    ]) {
      expect(sequenceTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  test("rejects invalid sequence type", () => {
    expect(sequenceTypeSchema.safeParse("hot").success).toBe(false);
    expect(sequenceTypeSchema.safeParse("invalid").success).toBe(false);
  });
});

describe("sequenceStatusSchema", () => {
  test("accepts all three statuses", () => {
    for (const value of ["active", "paused", "completed"]) {
      expect(sequenceStatusSchema.safeParse(value).success).toBe(true);
    }
  });

  test("rejects invalid status", () => {
    expect(sequenceStatusSchema.safeParse("inactive").success).toBe(false);
  });
});

describe("startSequenceSchema", () => {
  test("accepts valid uuid and sequenceType", () => {
    expect(
      startSequenceSchema.safeParse({
        leadId: "550e8400-e29b-41d4-a716-446655440000",
        sequenceType: "nurture",
      }).success,
    ).toBe(true);
  });

  test("rejects non-uuid leadId", () => {
    expect(
      startSequenceSchema.safeParse({
        leadId: "not-a-uuid",
        sequenceType: "nurture",
      }).success,
    ).toBe(false);
  });

  test("rejects invalid sequenceType", () => {
    expect(
      startSequenceSchema.safeParse({
        leadId: "550e8400-e29b-41d4-a716-446655440000",
        sequenceType: "invalid",
      }).success,
    ).toBe(false);
  });
});

describe("pauseSequenceSchema", () => {
  test("accepts valid uuid", () => {
    expect(
      pauseSequenceSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
  });

  test("rejects non-uuid id", () => {
    expect(pauseSequenceSchema.safeParse({ id: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});

describe("resumeSequenceSchema", () => {
  test("accepts valid uuid", () => {
    expect(
      resumeSequenceSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
  });

  test("rejects non-uuid id", () => {
    expect(resumeSequenceSchema.safeParse({ id: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});
