import { type NextRequest, NextResponse } from "next/server"

import { env } from "~/env"

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

  /* Docs:
    - img-src https://lh3.googleusercontent.com - Google auth user profile images
    - Figtree font - TODO: Figure out why this is loaded so you can remove it from the CSP header.
      - font-src https://fonts.gstatic.com/s/figtree/v5/
      - style-src-elem https://fonts.googleapis.com/css2
    - HubSpot sources:
      - connect-src https://forms.hscollectedforms.net
      - img-src https://track.hubspot.com, https://forms.hsforms.com
      - script-src-elem https://js.hs-scripts.com https://js.hs-banner.com https://js.hs-analytics.net https://js.hscollectedforms.net
  */

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
        connect-src 'self' https://www.google-analytics.com/g/collect https://forms.hscollectedforms.net/collected-forms/submit/form https://forms.hscollectedforms.net/collected-forms/v1/config/json;
        font-src 'self' https://fonts.gstatic.com/s/figtree/v5/ ${gtmPreviewAndDebugSources ? "https://fonts.gstatic.com" : ""};
        frame-src https://www.google.com/recaptcha/;
        img-src 'self' data: https://track.hubspot.com/__ptq.gif https://forms.hsforms.com/embed/v3/counters.gif https://forms.hscollectedforms.net/collected-forms/submit/form/submit.gif ${gtmPreviewAndDebugSources ? "https://www.googletagmanager.com https://fonts.gstatic.com" : ""};
        script-src 'self' ${env.NODE_ENV === "development" ? "'unsafe-eval'" : ""};
        script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com/gtm.js https://www.googletagmanager.com/gtag/js https://www.google.com/recaptcha/enterprise.js https://www.gstatic.com/recaptcha/releases/ https://js.hs-scripts.com/46219156.js https://js.hs-banner.com/v2/46219156/banner.js https://js.hs-analytics.net/analytics/ https://js.hscollectedforms.net/collectedforms.js;
        style-src 'self';
        style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com/css2 ${gtmPreviewAndDebugSources ? "https://www.googletagmanager.com https://fonts.googleapis.com" : ""};
        upgrade-insecure-requests;
        report-uri /api/csp-reports;
      `
      break
    default:
      // Protected application pages with a nonce-based CSP header, where security is critical.
      // WARNING: Using CSP header 'nonce' will prevent index/page caching as each request will have a unique nonce.
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

  // Set the 'x-pathname' header to the current request pathname for the <CanonicalLink /> tag
  requestHeaders.set("x-pathname", request.nextUrl.pathname)

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
