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
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    emailOTP({
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
