import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
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
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url(),
    POSTHOG_ERROR_TRACKING_API_KEY: z.string().min(1),
    POSTHOG_PROJECT_ID: z.string().regex(/^\d+$/, "Must be a numeric string"),
    RESEND_API_KEY: z.string().min(1),
    HUBSPOT_ACCESS_TOKEN: z.string().min(1),
    HUBSPOT_CLIENT_SECRET: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    ROBOTS_TXT: z.string().default("Disallow"),
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
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    POSTHOG_ERROR_TRACKING_API_KEY: process.env.POSTHOG_ERROR_TRACKING_API_KEY,
    POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
    HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ROBOTS_TXT: process.env.ROBOTS_TXT,
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
