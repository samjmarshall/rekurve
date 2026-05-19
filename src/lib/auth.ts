import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { env } from "~/env";
import {
  emailLimiter,
  firstForwardedIp,
  ipLimiter,
  normalizeEmail,
} from "~/lib/rate-limit";
import { db } from "~/server/db";
import * as authSchema from "~/server/db/schema/auth";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  // trustedOrigins: [env.BETTER_AUTH_URL],
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // extend expiry once per day on active use
    cookieCache: {
      enabled: true,
      // 5-minute stale window: a revoked session may remain valid on cached
      // clients for up to 5 minutes. Acceptable for this app; reduce or
      // disable if immediate revocation becomes a requirement.
      maxAge: 5 * 60,
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3, // invalidate OTP after 3 failed attempts
      async sendVerificationOTP({ email, otp }) {
        await resend.emails.send({
          from: "Rekurve <noreply@rekurve.ai>",
          to: email,
          subject: `Your verification code: ${otp}`,
          html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
        });
      },
    }),
    nextCookies(), // must be last
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;

      const email = normalizeEmail(ctx.body?.email as string | undefined);
      if (!email) return;

      const ip = firstForwardedIp(ctx.headers?.get("x-forwarded-for"));

      let e: Awaited<ReturnType<typeof emailLimiter.limit>>;
      let i: Awaited<ReturnType<typeof ipLimiter.limit>>;
      try {
        [e, i] = await Promise.all([
          emailLimiter.limit(email),
          ipLimiter.limit(ip),
        ]);
      } catch (err) {
        console.error(
          "[otp-rate-limit] limiter unavailable, failing open",
          err,
        );
        return;
      }

      if (!e.success || !i.success) {
        const reset = Math.max(e.reset ?? 0, i.reset ?? 0);
        const retryAfter = reset
          ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
          : undefined;
        throw new APIError(
          "TOO_MANY_REQUESTS",
          { message: "Too many requests. Please try again later." },
          retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
        );
      }
    }),
  },
});
