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

  // Allow Google Tag Manager preview and debug sources in development
  const gtmPreviewAndDebugSources = env.NODE_ENV === "development"

  // When NODE_ENV is "development", allow 'unsafe-eval' for webpack HMR
  const cspHeader = `
    default-src 'none';
    base-uri 'none';
    connect-src 'self' https://www.google-analytics.com/g/collect;
    font-src 'self' ${gtmPreviewAndDebugSources ? "https://fonts.gstatic.com" : ""};
    form-action 'none';
    frame-src https://www.google.com/recaptcha/;
    frame-ancestors 'none';
    img-src 'self' data: https://lh3.googleusercontent.com ${gtmPreviewAndDebugSources ? "https://www.googletagmanager.com https://fonts.gstatic.com" : ""};
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${env.NODE_ENV === "development" ? "'unsafe-eval'" : ""};
    script-src-elem 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
    style-src-elem 'self' 'unsafe-inline' ${gtmPreviewAndDebugSources ? "https://www.googletagmanager.com https://fonts.googleapis.com" : ""};
    upgrade-insecure-requests;
    report-uri /api/csp-reports;
`

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
