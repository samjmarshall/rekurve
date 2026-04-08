import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { env } from "~/env";
import { db } from "~/server/db";
import * as authSchema from "~/server/db/schema/auth";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  // trustedOrigins: [env.BETTER_AUTH_URL],
  // baseURL: env.BETTER_AUTH_URL,
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
});
