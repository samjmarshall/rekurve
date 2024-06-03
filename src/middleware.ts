import { type NextRequest, NextResponse } from "next/server"

import { env } from "~/env"
import logger from "./server/logger"

export const config = {
  matcher: [
    /*
     Vercel recommend ignoring matching prefetches (from next/link) and static assets that don't need the CSP header.
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  let cspHeader: string

  switch (request.nextUrl.pathname) {
    // Public whitelist for cached SEO crawlable pages.
    case "/":
    case "/privacy":
    case "/login":
    case "/signup":
      // Allow Google Tag Manager preview and debug sources in development
      const gtmPreviewAndDebugSources = env.NODE_ENV === "development"

      // When NODE_ENV is "development", allow 'unsafe-eval' for webpack HMR
      cspHeader = `
        default-src 'none';
        base-uri 'none';
        connect-src 'self' https://www.google-analytics.com/g/collect;
        font-src 'self' https://fonts.gstatic.com/s/figtree/v5/ ${gtmPreviewAndDebugSources ? "https://fonts.gstatic.com" : ""};
        frame-src https://www.google.com/recaptcha/;
        img-src 'self' data: ${gtmPreviewAndDebugSources ? "https://www.googletagmanager.com https://fonts.gstatic.com" : ""};
        script-src 'self' ${env.NODE_ENV === "development" ? "'unsafe-eval'" : ""};
        script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com/gtm.js https://www.googletagmanager.com/gtag/js https://www.google.com/recaptcha/enterprise.js https://www.gstatic.com/recaptcha/releases/;
        style-src 'self';
        style-src-elem 'self' 'unsafe-inline' ${gtmPreviewAndDebugSources ? "https://www.googletagmanager.com https://fonts.googleapis.com" : ""};
        upgrade-insecure-requests;
        report-uri /api/csp-reports;
      `
      break
    default:
      // Protected application pages with a nonce-based CSP header, where security is critical.
      // WARNING: Using CSP header 'nonce' will prevent index/page caching as each request will have a unique nonce.
      /* Docs:
        - https://lh3.googleusercontent.com - Google auth user profile images
        - https://fonts.gstatic.com/s/figtree/v5/ - TODO: Figure out why this is loaded so you can remove it from the CSP header.
      */
      const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
      cspHeader = `
        default-src 'none';
        base-uri 'none';
        connect-src 'self';
        font-src 'self' https://fonts.gstatic.com/s/figtree/v5/;
        img-src 'self' data: https://lh3.googleusercontent.com;
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${env.NODE_ENV === "development" ? "'unsafe-eval'" : ""};
        style-src 'self' 'nonce-${nonce}';
        style-src-elem 'self' 'unsafe-inline';
        upgrade-insecure-requests;
        report-uri /api/csp-reports;
      `
      requestHeaders.set("x-nonce", nonce)
      break
  }

  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, " ")
    .trim()

  requestHeaders.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  )

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  )

  return response
}
