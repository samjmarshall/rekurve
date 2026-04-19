import { describe, expect, test } from "@rstest/core";
import {
  MIN_BUFFER_MS,
  nextMonday9am,
  toLocalInputValue,
  validateSnoozeTime,
} from "~/app/(application)/dashboard/_lib/snooze";

describe("validateSnoozeTime", () => {
  const now = new Date("2026-04-13T10:00:00");

  test("rejects an unparseable input", () => {
    const result = validateSnoozeTime("not-a-date", now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid date/i);
  });

  test("rejects a past datetime", () => {
    const past = toLocalInputValue(new Date(now.getTime() - 60 * 1000));
    const result = validateSnoozeTime(past, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/15 minutes/i);
  });

  test("rejects exactly-now", () => {
    const result = validateSnoozeTime(toLocalInputValue(now), now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/15 minutes/i);
  });

  test("rejects a time inside the 15-minute buffer", () => {
    const tooSoon = toLocalInputValue(new Date(now.getTime() + 5 * 60 * 1000));
    const result = validateSnoozeTime(tooSoon, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/15 minutes/i);
  });

  test("accepts a time exactly at the buffer boundary", () => {
    const atBoundary = new Date(now.getTime() + MIN_BUFFER_MS);
    const result = validateSnoozeTime(toLocalInputValue(atBoundary), now);
    expect(result.ok).toBe(true);
  });

  test("accepts a future datetime and returns the parsed Date", () => {
    const future = new Date(now.getTime() + 60 * 60 * 1000);
    const result = validateSnoozeTime(toLocalInputValue(future), now);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.date.getTime()).toBe(future.getTime());
  });
});

describe("nextMonday9am", () => {
  test("from a Wednesday returns the following Monday at 09:00", () => {
    // 2026-04-15 is a Wednesday (day === 3)
    const wed = new Date("2026-04-15T14:30:00");
    const result = nextMonday9am(wed);
    expect(result.getDay()).toBe(1);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
    // Wed + 5 days → Monday
    expect(result.getDate()).toBe(20);
  });

  test("from a Sunday returns the next day (Monday) at 09:00", () => {
    // 2026-04-19 is a Sunday (day === 0)
    const sun = new Date("2026-04-19T08:00:00");
    const result = nextMonday9am(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(9);
  });

  test("from a Monday jumps a full week ahead", () => {
    // 2026-04-13 is a Monday (day === 1)
    const mon = new Date("2026-04-13T10:00:00");
    const result = nextMonday9am(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(20);
  });
});
