/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    // Allow production builds to complete even with ESLint errors
    // (Errors are in third-party @aceternity components, not our code)
    ignoreDuringBuilds: true,
  },
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

export default config;
