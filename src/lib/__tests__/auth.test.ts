import { describe, expect, rs, test } from "@rstest/core";

// Hoisted before module loads — prevents real Redis/DB/Resend connections.
rs.mock("resend", () => ({
  Resend: class {
    emails = { send: rs.fn() };
  },
}));
rs.mock("../rate-limit", () => ({
  emailLimiter: { limit: rs.fn() },
  ipLimiter: { limit: rs.fn() },
  normalizeEmail: (raw: string | null | undefined): string | undefined => {
    if (raw == null) return undefined;
    const trimmed = raw.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  firstForwardedIp: (headerValue: string | null | undefined): string => {
    if (!headerValue) return "unknown";
    const first = headerValue.split(",")[0]?.trim() ?? "";
    return first.length > 0 ? first : "unknown";
  },
}));
rs.mock("../../server/db", () => ({ db: {} }));

import { auth } from "../auth";
import { emailLimiter, ipLimiter } from "../rate-limit";

type LimitResult = Awaited<ReturnType<typeof emailLimiter.limit>>;

const OTP_SEND = "http://localhost/api/auth/email-otp/send-verification-otp";

function makeOtpRequest() {
  return new Request(OTP_SEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", type: "sign-in" }),
  });
}

describe("OTP rate-limit before hook — Retry-After header", () => {
  test("case 1: email-only fires — Retry-After reflects email reset, not IP reset", async () => {
    const emailReset = Date.now() + 30_000;
    rs.mocked(emailLimiter.limit).mockResolvedValue({
      success: false,
      reset: emailReset,
      limit: 3,
      remaining: 0,
      pending: Promise.resolve(),
    } satisfies LimitResult);
    rs.mocked(ipLimiter.limit).mockResolvedValue({
      success: true,
      reset: Date.now() + 600_000,
      limit: 10,
      remaining: 9,
      pending: Promise.resolve(),
    } satisfies LimitResult);

    const res = await auth.handler(makeOtpRequest());
    expect(res.status).toBe(429);

    const retryAfterStr = res.headers.get("retry-after");
    expect(retryAfterStr).toMatch(/^\d+$/);
    const retryAfter = parseInt(retryAfterStr!, 10);
    // email window is ~30 s; must not be the IP window (~600 s)
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(35);
    expect(res.headers.get("x-retry-after")).toBe(retryAfterStr);
  });

  test("case 2: ip-only fires — Retry-After reflects IP reset, not email reset", async () => {
    const ipReset = Date.now() + 60_000;
    rs.mocked(emailLimiter.limit).mockResolvedValue({
      success: true,
      reset: Date.now() + 600_000,
      limit: 3,
      remaining: 2,
      pending: Promise.resolve(),
    } satisfies LimitResult);
    rs.mocked(ipLimiter.limit).mockResolvedValue({
      success: false,
      reset: ipReset,
      limit: 10,
      remaining: 0,
      pending: Promise.resolve(),
    } satisfies LimitResult);

    const res = await auth.handler(makeOtpRequest());
    expect(res.status).toBe(429);

    const retryAfterStr = res.headers.get("retry-after");
    expect(retryAfterStr).toMatch(/^\d+$/);
    const retryAfter = parseInt(retryAfterStr!, 10);
    // IP window is ~60 s; must not be the email window (~600 s)
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(65);
    expect(res.headers.get("x-retry-after")).toBe(retryAfterStr);
  });

  test("case 3: both fire — Retry-After reflects email reset (email preferred over IP)", async () => {
    const emailReset = Date.now() + 30_000;
    const ipReset = Date.now() + 60_000;
    rs.mocked(emailLimiter.limit).mockResolvedValue({
      success: false,
      reset: emailReset,
      limit: 3,
      remaining: 0,
      pending: Promise.resolve(),
    } satisfies LimitResult);
    rs.mocked(ipLimiter.limit).mockResolvedValue({
      success: false,
      reset: ipReset,
      limit: 10,
      remaining: 0,
      pending: Promise.resolve(),
    } satisfies LimitResult);

    const res = await auth.handler(makeOtpRequest());
    expect(res.status).toBe(429);

    const retryAfterStr = res.headers.get("retry-after");
    expect(retryAfterStr).toMatch(/^\d+$/);
    const retryAfter = parseInt(retryAfterStr!, 10);
    // email reset ~30 s; ip reset ~60 s — must pick email
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(35);
    expect(res.headers.get("x-retry-after")).toBe(retryAfterStr);
  });

  test("case 4: neither fires — no Retry-After or X-Retry-After on response", async () => {
    rs.mocked(emailLimiter.limit).mockResolvedValue({
      success: true,
      reset: Date.now() + 600_000,
      limit: 3,
      remaining: 2,
      pending: Promise.resolve(),
    } satisfies LimitResult);
    rs.mocked(ipLimiter.limit).mockResolvedValue({
      success: true,
      reset: Date.now() + 600_000,
      limit: 10,
      remaining: 9,
      pending: Promise.resolve(),
    } satisfies LimitResult);

    const res = await auth.handler(makeOtpRequest());
    // Endpoint may 4xx/5xx since DB is mocked as {}; only assert header absence
    expect(res.headers.get("retry-after")).toBeNull();
    expect(res.headers.get("x-retry-after")).toBeNull();
  });

  test("case 5: reset=0 — Retry-After absent (guards against bad limiter data)", async () => {
    rs.mocked(emailLimiter.limit).mockResolvedValue({
      success: false,
      reset: 0,
      limit: 3,
      remaining: 0,
      pending: Promise.resolve(),
    } satisfies LimitResult);
    rs.mocked(ipLimiter.limit).mockResolvedValue({
      success: true,
      reset: 0,
      limit: 10,
      remaining: 9,
      pending: Promise.resolve(),
    } satisfies LimitResult);

    const res = await auth.handler(makeOtpRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeNull();
    expect(res.headers.get("x-retry-after")).toBeNull();
  });
});
