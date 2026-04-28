import {
  afterEach,
  beforeEach,
  describe,
  expect,
  rs,
  test,
} from "@rstest/core";
import { formatLastContact } from "../format-relative-time";

// Freeze "now" so relative calculations are deterministic.
const NOW = new Date("2026-04-09T12:00:00.000Z");

beforeEach(() => {
  rs.useFakeTimers();
  rs.setSystemTime(NOW);
});

afterEach(() => {
  rs.useRealTimers();
});

describe("formatLastContact", () => {
  test("returns 'Never contacted' for null", () => {
    expect(formatLastContact(null)).toBe("Never contacted");
  });

  test("returns 'Never contacted' for undefined", () => {
    expect(formatLastContact(undefined)).toBe("Never contacted");
  });

  test("formats seconds ago", () => {
    const thirtySecondsAgo = new Date(NOW.getTime() - 30 * 1000);
    expect(formatLastContact(thirtySecondsAgo)).toBe("30 seconds ago");
  });

  test("formats minutes ago", () => {
    const fiveMinutesAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatLastContact(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  test("formats hours ago", () => {
    const threeHoursAgo = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    expect(formatLastContact(threeHoursAgo)).toBe("3 hours ago");
  });

  test("formats days ago", () => {
    const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(formatLastContact(twoDaysAgo)).toBe("2 days ago");
  });

  test("formats weeks ago", () => {
    const twoWeeksAgo = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(formatLastContact(twoWeeksAgo)).toBe("2 weeks ago");
  });

  test("formats months ago", () => {
    const twoMonthsAgo = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(formatLastContact(twoMonthsAgo)).toBe("2 months ago");
  });

  test("formats years ago", () => {
    const twoYearsAgo = new Date(NOW.getTime() - 730 * 24 * 60 * 60 * 1000);
    expect(formatLastContact(twoYearsAgo)).toBe("2 years ago");
  });

  test("accepts ISO string input", () => {
    const fiveMinutesAgo = new Date(
      NOW.getTime() - 5 * 60 * 1000,
    ).toISOString();
    expect(formatLastContact(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  test("formats a near-future date (in N minutes)", () => {
    const inFiveMinutes = new Date(NOW.getTime() + 5 * 60 * 1000);
    expect(formatLastContact(inFiveMinutes)).toBe("in 5 minutes");
  });
});
