import type { Duration } from "@upstash/ratelimit";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "~/env";

const OTP_SEND_EMAIL_MAX = 3;
const OTP_SEND_IP_MAX = 50;
const OTP_SEND_WINDOW: Duration = "15 m";

const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});

export const emailLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(OTP_SEND_EMAIL_MAX, OTP_SEND_WINDOW),
  ephemeralCache: new Map(),
  timeout: 1000,
  analytics: false,
  prefix: "otp-send:email",
});

export const ipLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(OTP_SEND_IP_MAX, OTP_SEND_WINDOW),
  ephemeralCache: new Map(),
  timeout: 1000,
  analytics: false,
  prefix: "otp-send:ip",
});

export function normalizeEmail(
  raw: string | null | undefined,
): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function firstForwardedIp(
  headerValue: string | null | undefined,
): string {
  if (!headerValue) return "unknown";
  const first = headerValue.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : "unknown";
}
