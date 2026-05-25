import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    ANTHROPIC_API_KEY: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.preprocess(
      (str) =>
        process.env.VERCEL
          ? process.env.VERCEL_ENV === "production"
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : `https://${process.env.VERCEL_BRANCH_URL}`
          : process.env.PORTLESS_URL
            ? process.env.PORTLESS_URL
            : str,
      z.url(),
    ),
    CRON_SECRET: z.string().min(16),
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url(),
    HUBSPOT_ACCESS_TOKEN: z.string().min(1),
    HUBSPOT_CLIENT_SECRET: z.string().min(1),
    HUBSPOT_BCC_ADDRESS: z.string().min(1),
    HUBSPOT_MOCK: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
    KV_REST_API_URL: z.url(),
    KV_REST_API_TOKEN: z.string().min(1),
    MS_GRAPH_CLIENT_ID: z.string().min(1),
    MS_GRAPH_CLIENT_SECRET: z.string().min(1),
    MS_GRAPH_REDIRECT_URI: z.url(),
    NEON_PROJECT_ID: z.string().optional(),
    POSTHOG_ERROR_TRACKING_API_KEY: z.string().min(1),
    POSTHOG_PROJECT_ID: z.string().regex(/^\d+$/, "Must be a numeric string"),
    RESEND_API_KEY: z.string().min(1),
    ROBOTS_TXT: z.string().default("Disallow"),
    TWILIO_ACCOUNT_SID: z
      .string()
      .regex(/^AC[a-f0-9]{32}$/, "Must be an AC-prefixed Twilio Account SID")
      .optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_FROM_NUMBER: z
      .string()
      .regex(/^\+\d{8,15}$/, "Must be E.164 (e.g. +14155551234)")
      .optional(),
    TWILIO_CONSULTANT_NUMBER: z
      .string()
      .regex(/^\+\d{8,15}$/, "Must be E.164")
      .optional(),
    VERCEL_DEPLOYMENT_URL: z.url(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
    HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
    HUBSPOT_BCC_ADDRESS: process.env.HUBSPOT_BCC_ADDRESS,
    HUBSPOT_MOCK: process.env.HUBSPOT_MOCK,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    MS_GRAPH_CLIENT_ID: process.env.MS_GRAPH_CLIENT_ID,
    MS_GRAPH_CLIENT_SECRET: process.env.MS_GRAPH_CLIENT_SECRET,
    MS_GRAPH_REDIRECT_URI: process.env.MS_GRAPH_REDIRECT_URI,
    NEON_PROJECT_ID: process.env.NEON_PROJECT_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    POSTHOG_ERROR_TRACKING_API_KEY: process.env.POSTHOG_ERROR_TRACKING_API_KEY,
    POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ROBOTS_TXT: process.env.ROBOTS_TXT,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    TWILIO_CONSULTANT_NUMBER: process.env.TWILIO_CONSULTANT_NUMBER,
    VERCEL_DEPLOYMENT_URL: process.env.VERCEL_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
