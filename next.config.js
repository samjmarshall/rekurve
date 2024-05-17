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
  },
  swcMinify: true,
  outputFileTracing: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true, // This is enabled by default, but we'd like to disable it we migrate to AWS Lambda with the Web Adapter.
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  headers: async () => [
    {
      // Apply these headers to all routes in your application.
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self';",
            "base-uri 'none';",
            "form-action 'none';",
            "frame-src 'self' https://www.google.com;",
            "img-src 'self' data: https://lh3.googleusercontent.com;",
            "object-src 'none';",
            "script-src 'self' 'unsafe-eval';",
            "script-src-elem 'self' 'unsafe-inline' https://www.google.com/recaptcha/enterprise.js https://www.gstatic.com/recaptcha/releases/;",
            "style-src 'self' 'unsafe-inline';",
            "report-uri /api/csp-reports;",
          ].join(" "),
        },
      ],
    },
  ],
}

export default config
