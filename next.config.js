/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js")

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    typedRoutes: true,
    optimizeCss: true,
    nextScriptWorkers: true,
  },
  swcMinify: true,
  outputFileTracing: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true, // This is enabled by default, but we'd like to disable it if we migrate to AWS Lambda with the Web Adapter.
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  headers: async () => [
    {
      // Apply these headers to all routes in your application.
      // NODE_ENV values for local development only e.g. Google Tag Manager - Preview Debug Tag Assistant
      source: "/:path*",
      headers: [
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
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
          key: "X-Xss-Protection",
          value: "1; mode=block",
        },
      ],
    },
  ],
}

export default config
