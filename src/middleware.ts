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
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  // When NODE_ENV is "development", allow additional sources for development tools e.g. Google Tag Manager Preview and Debug Tag Assistant
  const cspHeader = `
    default-src 'none';
    base-uri 'none';
    connect-src 'self' https://www.google-analytics.com/g/collect;
    font-src 'self' ${env.NODE_ENV === "development" ? "https://fonts.gstatic.com" : ""};
    form-action 'none';
    frame-ancestors 'none';
    img-src 'self' data: https://lh3.googleusercontent.com ${env.NODE_ENV === "development" ? "https://www.googletagmanager.com https://fonts.gstatic.com" : ""};
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${env.NODE_ENV === "development" ? "'unsafe-eval' https://www.googletagmanager.com" : ""};
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline' ${env.NODE_ENV === "development" ? "https://www.googletagmanager.com https://fonts.googleapis.com" : ""};
    upgrade-insecure-requests;
    report-uri /api/csp-reports;
`

  /*
  "frame-src 'self' https://www.google.com/recaptcha/ https://www.googletagmanager.com/ns.html;"
  "script-src 'self' 'unsafe-eval';",
  `script-src-elem 'self' 'unsafe-inline' https://www.google.com/recaptcha/enterprise.js https://www.gstatic.com/recaptcha/releases/ ${env.NODE_ENV === "development" ? "https://www.googletagmanager.com" : "https://www.googletagmanager.com/gtm.js https://www.googletagmanager.com/gtag/js"};`,
  `style-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "https://www.googletagmanager.com https://fonts.googleapis.com" : ""};`,
  "report-uri /api/csp-reports;",
*/

  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, " ")
    .trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
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
