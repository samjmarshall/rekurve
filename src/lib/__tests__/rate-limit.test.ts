import { describe, expect, test } from "@rstest/core";
import {
  AI_RATE_LIMIT_REQUESTS,
  AI_RATE_LIMIT_WINDOW,
  firstForwardedIp,
  normalizeEmail,
} from "../rate-limit";

describe("aiLimiter constants", () => {
  test("requests and window match documented defaults", () => {
    expect(AI_RATE_LIMIT_REQUESTS).toBe(10);
    expect(AI_RATE_LIMIT_WINDOW).toBe("15 m");
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases a padded mixed-case address", () => {
    expect(normalizeEmail(" Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  test("passes through an already-normalised address unchanged", () => {
    expect(normalizeEmail("foo@bar.com")).toBe("foo@bar.com");
  });

  test("returns undefined for empty string", () => {
    expect(normalizeEmail("")).toBeUndefined();
  });

  test("returns undefined for whitespace-only string", () => {
    expect(normalizeEmail("   ")).toBeUndefined();
  });

  test("returns undefined for undefined", () => {
    expect(normalizeEmail(undefined)).toBeUndefined();
  });

  test("returns undefined for null", () => {
    expect(normalizeEmail(null)).toBeUndefined();
  });
});

describe("firstForwardedIp", () => {
  test("returns the first IP from a comma-separated list", () => {
    expect(firstForwardedIp("1.2.3.4, 5.6.7.8")).toBe("1.2.3.4");
  });

  test("trims whitespace around a single IP", () => {
    expect(firstForwardedIp(" 1.2.3.4 ")).toBe("1.2.3.4");
  });

  test("returns a single IP unchanged", () => {
    expect(firstForwardedIp("1.2.3.4")).toBe("1.2.3.4");
  });

  test("returns 'unknown' for undefined", () => {
    expect(firstForwardedIp(undefined)).toBe("unknown");
  });

  test("returns 'unknown' for null", () => {
    expect(firstForwardedIp(null)).toBe("unknown");
  });

  test("returns 'unknown' for empty string", () => {
    expect(firstForwardedIp("")).toBe("unknown");
  });
});
