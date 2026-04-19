import { describe, expect, test } from "@rstest/core";
import {
  messageApproveSchema,
  messageDismissSchema,
  messageEditAndApproveSchema,
  messageSnoozeSchema,
} from "../messages";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("messageApproveSchema", () => {
  test("accepts valid uuid", () => {
    expect(messageApproveSchema.safeParse({ id: VALID_UUID }).success).toBe(
      true,
    );
  });

  test("rejects non-uuid id", () => {
    expect(messageApproveSchema.safeParse({ id: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  test("rejects missing id", () => {
    expect(messageApproveSchema.safeParse({}).success).toBe(false);
  });
});

describe("messageDismissSchema", () => {
  test("accepts valid uuid", () => {
    expect(messageDismissSchema.safeParse({ id: VALID_UUID }).success).toBe(
      true,
    );
  });

  test("rejects non-uuid id", () => {
    expect(messageDismissSchema.safeParse({ id: "x" }).success).toBe(false);
  });
});

describe("messageEditAndApproveSchema", () => {
  test("accepts valid body", () => {
    const result = messageEditAndApproveSchema.safeParse({
      id: VALID_UUID,
      body: "Hey John, still looking at Springfield Rise?",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty body", () => {
    expect(
      messageEditAndApproveSchema.safeParse({ id: VALID_UUID, body: "" })
        .success,
    ).toBe(false);
  });

  test("rejects whitespace-only body after trim", () => {
    expect(
      messageEditAndApproveSchema.safeParse({ id: VALID_UUID, body: "   " })
        .success,
    ).toBe(false);
  });

  test("accepts body at exactly 1600 chars", () => {
    expect(
      messageEditAndApproveSchema.safeParse({
        id: VALID_UUID,
        body: "x".repeat(1600),
      }).success,
    ).toBe(true);
  });

  test("rejects body over 1600 chars", () => {
    expect(
      messageEditAndApproveSchema.safeParse({
        id: VALID_UUID,
        body: "x".repeat(1601),
      }).success,
    ).toBe(false);
  });
});

describe("messageSnoozeSchema", () => {
  test("accepts a future Date", () => {
    const future = new Date(Date.now() + 3600_000); // +1h
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: future })
        .success,
    ).toBe(true);
  });

  test("coerces an ISO string to Date", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: future })
        .success,
    ).toBe(true);
  });

  test("rejects a past date", () => {
    const past = new Date(Date.now() - 1000);
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: past })
        .success,
    ).toBe(false);
  });

  test("rejects a time inside the 15-minute buffer", () => {
    const tooSoon = new Date(Date.now() + 14 * 60 * 1000);
    const result = messageSnoozeSchema.safeParse({
      id: VALID_UUID,
      snoozedUntil: tooSoon,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/15 minutes/i);
    }
  });

  test("accepts a time at the 15-minute boundary", () => {
    // +15 min + 1 s cushion to avoid clock drift in the refine call
    const atBoundary = new Date(Date.now() + 15 * 60 * 1000 + 1000);
    expect(
      messageSnoozeSchema.safeParse({
        id: VALID_UUID,
        snoozedUntil: atBoundary,
      }).success,
    ).toBe(true);
  });

  test("rejects unparseable input", () => {
    expect(
      messageSnoozeSchema.safeParse({
        id: VALID_UUID,
        snoozedUntil: "not-a-date",
      }).success,
    ).toBe(false);
  });
});
