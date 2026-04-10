import {
  afterEach,
  beforeEach,
  describe,
  expect,
  rs,
  test,
} from "@rstest/core";
import { formatLastContact } from "../format-last-contact";

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

  test("formats 2 days ago", () => {
    const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(formatLastContact(twoDaysAgo)).toBe("2 days ago");
  });

  test("formats 3 hours ago", () => {
    const threeHoursAgo = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    expect(formatLastContact(threeHoursAgo)).toBe("3 hours ago");
  });

  test("formats a date passed as an ISO string", () => {
    const fiveMinutesAgo = new Date(
      NOW.getTime() - 5 * 60 * 1000,
    ).toISOString();
    expect(formatLastContact(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  test("formats a near-future date", () => {
    const inFiveMinutes = new Date(NOW.getTime() + 5 * 60 * 1000);
    expect(formatLastContact(inFiveMinutes)).toBe("in 5 minutes");
  });
});
