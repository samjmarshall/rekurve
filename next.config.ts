import type { NextConfig } from "next";
import { env } from "~/env";
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { withPostHogConfig } from "@posthog/nextjs-config";

const config: NextConfig = {
  headers: async () => [
    {
      // Apply these headers to all routes in your application.
      source: '/:path*',
      headers: [
        {
          key: 'Document-Policy',
          value: 'js-profiling',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=()',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'none';",
            "base-uri 'none';",
            "connect-src 'self' https://*.posthog.com;",
            "font-src 'self' https://fonts.gstatic.com;",
            "frame-ancestors 'none';",
            "frame-src 'self';",
            "img-src 'self' https://fonts.gstatic.com;",
            "manifest-src 'self';",
            "script-src 'self' 'unsafe-eval';",
            "script-src-elem 'self' 'unsafe-inline' https://www.google.com/recaptcha/enterprise.js https://us-assets.i.posthog.com;",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
            "upgrade-insecure-requests;",
          ].join(' '),
        },
      ],
    },
  ],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default withPostHogConfig(config, {
  personalApiKey: env.POSTHOG_ERROR_TRACKING_API_KEY,
  envId: env.POSTHOG_PROJECT_ID,
  host: env.NEXT_PUBLIC_POSTHOG_HOST, // (optional)
  sourcemaps: { // (optional)
    enabled: process.env.CI === "true", // (optional) Enable sourcemaps generation and upload, default to true on production builds
    project: "Rekurve", // (optional) Project name, defaults to repository name
    deleteAfterUpload: true, // (optional) Delete sourcemaps after upload, defaults to true
  },
});
