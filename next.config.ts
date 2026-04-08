/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";
import { env } from "~/env";

const config: NextConfig = {
  skipTrailingSlashRedirect: true,
  headers: async () => [
    {
      // Apply these headers to all routes in your application.
      source: "/:path*",
      headers: [
        {
          key: "Document-Policy",
          value: "js-profiling",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-Permitted-Cross-Domain-Policies",
          value: "none",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'none';",
            "base-uri 'none';",
            "connect-src 'self';",
            // next/font/google self-hosts all fonts at build time — no runtime requests to fonts.gstatic.com
            "font-src 'self';",
            "frame-ancestors 'none';",
            "frame-src 'self';",
            // next/font/google self-hosts fonts — no runtime requests to fonts.gstatic.com
            "img-src 'self';",
            "manifest-src 'self';",
            // 'unsafe-eval' is only required by webpack HMR in development; safe to remove in production
            // but Next.js injects it unconditionally — monitor if removing causes build errors
            "script-src 'self';",
            // 'unsafe-inline' required by Next.js App Router inline hydration scripts and JSON-LD <script> tags
            // Nonces via middleware would eliminate this but require significant infrastructure changes
            "script-src-elem 'self' 'unsafe-inline';",
            // 'unsafe-inline' required by Tailwind/Radix inline styles; tightening would need a full audit
            // next/font/google self-hosts fonts — no runtime requests to fonts.googleapis.com
            "style-src 'self' 'unsafe-inline';",
            "upgrade-insecure-requests;",
          ].join(" "),
        },
      ],
    },
  ],
  rewrites: async () => [
    {
      source: "/rk/static/:path*",
      destination: "https://us-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/rk/:path*",
      destination: "https://us.i.posthog.com/:path*",
    },
    {
      source: "/rk/decide",
      destination: "https://us.i.posthog.com/decide",
    },
  ],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default withPostHogConfig(config, {
  personalApiKey: env.POSTHOG_ERROR_TRACKING_API_KEY,
  envId: env.POSTHOG_PROJECT_ID,
  host: env.NEXT_PUBLIC_POSTHOG_HOST, // (optional)
  sourcemaps: {
    // (optional)
    enabled: process.env.CI === "true", // (optional) Enable sourcemaps generation and upload, default to true on production builds
    project: "Rekurve", // (optional) Project name, defaults to repository name
    deleteAfterUpload: true, // (optional) Delete sourcemaps after upload, defaults to true
  },
});
