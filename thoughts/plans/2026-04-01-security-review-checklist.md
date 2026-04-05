# Security Review Checklist

## Overview

A comprehensive security review of the Rekurve codebase, broken into small, independently actionable tasks. Each task is scoped to be completable in a single pass and targets a specific security concern area.

The codebase is a Next.js 16 application with better-auth (email OTP), tRPC, Drizzle ORM over Neon PostgreSQL, deployed on Vercel.

## What We're NOT Doing

- Penetration testing or active exploitation
- Third-party dependency source code audits (covered by `make audit`)
- Infrastructure-level review (Vercel, Neon platform security)
- Compliance audits (SOC2, GDPR — separate workstreams)

---

## Task 1: Authentication Configuration

**Scope**: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`

**Review checklist**:
- [ ] `BETTER_AUTH_SECRET` entropy — confirm min 32 chars enforced at runtime via `src/env.js`
- [ ] OTP length and expiry — verify `emailOTP` plugin config uses secure defaults (6+ digits, short TTL)
- [ ] OTP brute-force protection — check if better-auth rate-limits OTP verification attempts
- [ ] Session token generation — confirm cryptographically random tokens (delegated to better-auth)
- [ ] Session expiry — verify `expiresAt` is set to a reasonable duration
- [ ] Cookie cache TTL (`cookieCache.maxAge: 300`) — assess risk of stale session data during that 5-minute window (e.g., can a revoked session still be used?)
- [ ] `nextCookies()` plugin — confirm it sets `httpOnly`, `secure`, `sameSite=lax` (or stricter)
- [ ] Session fixation — verify token rotates on sign-in

**Files**:
- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/lib/session.ts`
- `src/server/db/schema/auth.ts`

---

## Task 2: Authorization Gates

**Scope**: Layout-level auth checks, tRPC procedure middleware

**Review checklist**:
- [x] `(application)/layout.tsx` — `async` server component, no `"use client"`, `getSession()` reads from `next/headers`, `redirect("/login")` is server-side. Cannot be bypassed client-side. ✅
- [x] `(login)/layout.tsx` — `async` server component, `if (session) redirect("/dashboard")` on every render. ✅
- [x] No Next.js `middleware.ts` exists — layout gates are sufficient for the current single-tenant model. Direct `/api/trpc/*` calls bypass the layout but are independently gated by `protectedProcedure` (throws UNAUTHORIZED). No unprotected API surface identified. ✅ (acceptable; middleware would add defense-in-depth but is not required here)
- [x] All tRPC routers use `protectedProcedure` — all 5 routers (ai, leads, lots, messages, nurture) use only `protectedProcedure`. No `publicProcedure` used for any data procedure. ✅
- [x] `protectedProcedure` middleware — throws `new TRPCError({ code: "UNAUTHORIZED" })` at `trpc.ts:57`. No redirect; correct API behavior. ✅
- [x] No user-role or tenant-scoping logic — leads table has no `userId`/`tenantId` column; all authenticated users share a flat lead pool. No IDOR risk at current single-tenant scale. ⚠️ Flag for future: if multi-tenancy is added, all `leads` queries must add a tenant filter or ownership check (`getById`, `update`, `delete` all operate on any UUID without ownership verification).

**Files**:
- `src/app/(application)/layout.tsx`
- `src/app/(login)/layout.tsx`
- `src/server/api/trpc.ts` (lines 53-64)
- `src/server/api/routers/*.ts` (all 5 routers)

---

## Task 3: API Route Security

**Scope**: All `src/app/api/` routes

**Review checklist**:
- [x] `api/auth/[...all]/route.ts` — only `GET` and `POST` are exported via `toNextJsHandler(auth)`; no other methods. ✅
- [x] `api/trpc/[trpc]/route.ts` — `onError` is `undefined` in production (no console leak); tRPC's internal error formatter omits `stack` from `shape.data` outside dev; custom `errorFormatter` only adds `zodError` field. No stack traces leaked. ✅
- [x] `api/health/route.ts` — returns only `{ status: "ok", timestamp: Date.now() }`; no DB version, env, or internal details. ✅
- [x] `api/dev/session/route.ts` — `NODE_ENV !== "development"` guard is on both POST and DELETE handlers; returns `{}` with 404 in production. ✅
- [x] `api/dev/session/route.ts` — `X-Dev-Session: true` header check is applied on both POST and DELETE before any DB access; provides defense-in-depth. ✅
- [x] No unrestricted API routes — HubSpot webhook validates HMAC-SHA256 signature + 5-minute timestamp before parsing body; tRPC input validated via Zod; auth delegated to better-auth. ✅

**Files**:
- `src/app/api/auth/[...all]/route.ts`
- `src/app/api/trpc/[trpc]/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/dev/session/route.ts`

---

## Task 4: Content Security Policy

**Scope**: `next.config.ts` CSP headers

**Review checklist**:
- [x] `default-src 'none'` — deny-by-default baseline confirmed. ✅
- [x] `script-src 'unsafe-eval'` — removed. `'unsafe-eval'` is only needed by webpack HMR in dev mode; Next.js production builds do not require it. Removing it eliminates `eval()`/`Function()` execution vectors. ✅
- [x] `script-src-elem 'unsafe-inline'` — retained (required). Next.js App Router injects inline hydration scripts, and three `<script type="application/ld+json">` tags in `(website)/layout.tsx`, `Pricing.tsx`, and `FAQ.tsx` require it. Replacing with nonces would require Edge Middleware to inject a per-request nonce and thread it through all inline scripts — significant infrastructure change. Accepted risk for now. ⚠️
- [x] `connect-src 'self'` — confirmed sufficient. PostHog is fully proxied through `/rk/` rewrites in `next.config.ts`; no direct external `connect-src` hosts needed. ✅
- [x] `frame-ancestors 'none'` — confirmed. Matches `X-Frame-Options: DENY`. Redundant but correct (belt-and-suspenders for older browsers). ✅
- [x] `style-src 'unsafe-inline'` — retained. `'unsafe-inline'` is required by Tailwind/Radix for inline styles. Tightening would require auditing all inline style usage across the app. Removed dead `https://fonts.googleapis.com` entry (self-hosted via `next/font/google`). ⚠️
- [x] `img-src` — tightened. Removed dead `https://fonts.gstatic.com` entry; `next/font/google` self-hosts all font files at build time with no runtime external requests. `img-src 'self'` is now the correct minimal policy. ✅
- [x] `upgrade-insecure-requests` — confirmed. HTTPS enforcement is present. ✅
- [x] Google reCAPTCHA enterprise script — **removed**. Grepped all of `src/` for `recaptcha`/`reCAPTCHA`/`google.com/recaptcha` — zero matches. The `https://www.google.com/recaptcha/enterprise.js` entry in `script-src-elem` was dead configuration widening the allowed script surface. ✅
- [ ] CSP reporting — no `report-uri` or `report-to` directive present. Adding a reporting endpoint (e.g., via Sentry or a lightweight `/api/csp-report` route) would provide visibility into violations in the wild. Low urgency but recommended for future hardening.

**Files**:
- `next.config.ts` (lines 42-56)

---

## Task 5: Security Headers

**Scope**: Non-CSP security headers in `next.config.ts`

**Review checklist**:
- [x] `X-Frame-Options: DENY` — present and correct. ✅
- [x] `X-Content-Type-Options: nosniff` — present and correct. ✅
- [x] `Referrer-Policy` — upgraded from `origin-when-cross-origin` to `strict-origin-when-cross-origin`. The stricter variant additionally suppresses the `Referer` header when navigating from HTTPS to HTTP, preventing accidental URL leakage on protocol downgrades. It is the browser default since Chrome 85 / Firefox 87 and the recommended value per MDN. ✅
- [x] `Permissions-Policy` — expanded from `geolocation=()` to `camera=(), geolocation=(), microphone=(), payment=(), usb=()`. Explicitly denies APIs the app has no business using; reduces attack surface if a malicious script is injected. ✅
- [x] `poweredByHeader: false` — confirmed. `X-Powered-By: Next.js` is suppressed; Next.js version is not leaked in response headers. ✅
- [x] `Strict-Transport-Security` (HSTS) — Vercel automatically injects `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` at the edge for all production deployments on custom domains. Adding it explicitly in `next.config.ts` would create duplicate `Strict-Transport-Security` headers (Vercel edge + Next.js), which is harmless but redundant. No config change needed. ✅
- [x] `X-Permitted-Cross-Domain-Policies` — added with value `none`. Adobe Flash is EOL (2020) and no browser supports it, but the header is a free hardening win that prevents any future Adobe/PDF cross-domain policy file from being honoured. ✅

**Files**:
- `next.config.ts` (lines 11-40, line 74)

---

## Task 6: Environment Variable Security

**Scope**: `src/env.js`, `.env.example`, `.gitignore`

**Review checklist**:
- [x] All secrets are validated with Zod schemas of appropriate strictness — `POSTHOG_ERROR_TRACKING_API_KEY` and `RESEND_API_KEY` upgraded from `z.string()` to `z.string().min(1)` for explicit strictness; all other secrets have appropriate constraints. ✅
- [x] `BETTER_AUTH_SECRET` has `z.string().min(32)` — 32 bytes of entropy (`openssl rand -base64 32` = 32 random bytes = 256 bits) exceeds the 128-bit security threshold; min(32) is sufficient. ✅
- [x] `SKIP_ENV_VALIDATION` flag — used only in CI (`post-deploy.yml` lines 83 and 90) for DB check/migrate steps that need only `DATABASE_URL_UNPOOLED`. Not set in any production deployment path (Vercel handles those with real env vars). Risk is contained. ✅
- [x] `.env` is in `.gitignore` (line 47: `.env` and `.env*.local`) — secrets are never committed. ✅
- [x] `.env.example` contains no real secrets — `POSTHOG_PROJECT_ID=254485` is a non-sensitive numeric identifier (not a secret); all API keys/tokens are empty with comments. Added missing vars (`POSTHOG_ERROR_TRACKING_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`) to keep example in sync with schema. ✅
- [x] Raw `process.env` outside `src/env.js` — 3 files access Vercel/Next.js platform variables only (`VERCEL_URL`, `PORT`, `NEXT_RUNTIME`). These are not secrets; they are optional platform-injected variables unsuitable for the Zod schema. No application secrets accessed via raw `process.env`. ✅
- [x] Client-side env vars (`NEXT_PUBLIC_*`) — only `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are exposed; both are PostHog analytics identifiers, public by design. No secrets in client vars. ✅
- [x] Database URLs — `src/server/db/index.ts` uses `env.DATABASE_URL` (pooled Neon HTTP connection); `drizzle.config.ts` uses `env.DATABASE_URL_UNPOOLED` (direct connection for migrations only). Correct separation. ✅

**Files**:
- `src/env.js`
- `.env.example`
- `.gitignore`

---

## Task 7: Database Security

**Scope**: `src/server/db/`, schema files, Drizzle config

**Review checklist**:
- [x] All queries use Drizzle ORM query builder (parameterized) — no raw SQL string concatenation. Two `sql` tagged template usages in `leads.ts` (`sql\`${preferredEstate} = ANY(${leads.preferredEstates})\`` at line 62 and `sql<number>\`count(*)\`` at line 76) use Drizzle's `sql` helper, which auto-parameterizes interpolated values as bind parameters; no string concatenation anywhere. ✅
- [x] E2E auth helper uses Neon tagged template literals (auto-parameterized) — all three queries in `e2e/utils/auth-helper.ts` (`INSERT user`, `INSERT session`, `DELETE user`) use the `neon` tagged template literal; interpolated values (`${userId}`, `${email}`, `${token}`, `${sessionId}`, `${expiresAt}`) are sent as bind parameters, never concatenated into the SQL string. ✅
- [x] Session table has `onDelete: "cascade"` on userId FK — confirmed at `auth.ts:29-31`; `account` table also cascades on userId (`auth.ts:43-45`). Deleting a user atomically removes all their sessions and accounts via DB-level cascade. ✅
- [x] No sensitive data stored in plaintext that should be encrypted — PII fields (`firstName`, `lastName`, `email`, `phone`) in the leads table are stored plaintext; Neon provides encryption at rest covering the storage risk. `account.password` is hashed by better-auth (argon2) — not plaintext. No credit card numbers, SSNs, or government IDs present in any schema. Application-level field encryption not warranted at current pre-PMF scale. ✅
- [x] Database connection string uses SSL/TLS — `@neondatabase/serverless` neon-http driver communicates exclusively via HTTPS; TLS is inherent to the transport and cannot be disabled client-side. Neon also rejects non-SSL connections at the platform level. ✅
- [x] `drizzle.config.ts` uses `DATABASE_URL_UNPOOLED` — confirmed. `drizzle.config.ts` is consumed only by the Drizzle Kit CLI for migrations; `DATABASE_URL_UNPOOLED` is not imported by any runtime module. Runtime queries use the pooled `DATABASE_URL` via `env.DATABASE_URL` in `src/server/db/index.ts`. Correct separation confirmed. ✅
- [x] Schema enums prevent arbitrary string injection into enum columns — 15 `pgEnum` definitions in `schema/enums.ts` cover all enum-typed columns across all tables; PostgreSQL enforces valid enum values at the DB level, rejecting arbitrary strings with a type error before any row is written. ✅

**Files**:
- `src/server/db/index.ts`
- `src/server/db/schema/*.ts`
- `drizzle.config.ts`
- `e2e/utils/auth-helper.ts` (SQL usage)

---

## Task 8: Input Validation

**Scope**: All user-facing input handling

**Review checklist**:
- [x] Booking form (`BookingForm.tsx`) — client-side Zod validation via `zodResolver` covers all fields. The `onSubmit` handler only fires PostHog analytics and a `console.log`; **there is no server-side submission endpoint**. No server-side Zod validation is needed because there is no server to validate against. ⚠️ If a backend submission endpoint (tRPC or API route) is added in the future, server-side Zod validation must be included at that point.
- [x] Login form — `type="email"` + `required` attributes provide UX-level gating; better-auth validates the email format server-side before dispatching an OTP via Resend. Server-side validation is delegated to the auth library. ✅
- [x] OTP input — `auth.ts` configures `emailOTP({ otpLength: 6, expiresIn: 300, allowedAttempts: 3 })`. Better-auth enforces the 6-digit length, 5-minute TTL, and 3-attempt limit entirely server-side; the client `maxLength={6}` on `InputOTP` is UI-only. ✅
- [x] tRPC procedures — all 5 input-accepting procedures in `leads.ts` have `.input()` schemas (`leadCreateSchema`, `z.object({ id: z.string().uuid() })`, `leadFilterSchema`, `leadUpdateSchema`). Remaining procedures across all 5 routers (`ai.healthCheck`, `lots.getAll`, `messages.getPending`, `nurture.getActive`, `leads.getByStage`) accept no input. No unvalidated input paths exist. ✅ Rule for future: any new procedure that accepts parameters must use `.input(zodSchema)` — never use bare `.query()` or `.mutation()` with `ctx.input` or manual parsing.
- [x] `dangerouslySetInnerHTML` — 3 usages found, all for `application/ld+json` schema markup: `(website)/layout.tsx:118`, `FAQ.tsx:156`, `Pricing.tsx:175`. All three use `JSON.stringify()` of static, hardcoded data objects (no user input flows into these). Standard pattern for JSON-LD; safe. ✅
- [x] User input rendered without React's auto-escaping — one user-supplied state value rendered in JSX: `{email}` at `login/page.tsx:206` inside a `<span>`. React auto-escapes this. Validation error messages in both forms are static Zod schema strings or better-auth library strings, not user content. No raw HTML injection paths. ✅

**Files**:
- `src/app/(website)/_components/sections/BookingForm.tsx`
- `src/app/(login)/login/page.tsx`
- `src/server/api/routers/*.ts`

---

## Task 9: XSS Prevention

**Scope**: All client-rendered content

**Review checklist**:
- [ ] No `dangerouslySetInnerHTML` in any component
- [ ] No `innerHTML` assignments in any script
- [ ] User-generated content (if any) is escaped before rendering
- [ ] CSP `script-src` prevents inline script injection (but `'unsafe-inline'` in `script-src-elem` weakens this)
- [ ] No URL parameters rendered directly into the page without sanitization
- [ ] `href` attributes don't accept `javascript:` protocol from user input

**Files**:
- All files in `src/app/`, `src/components/`

---

## Task 10: CSRF Protection

**Scope**: State-mutating endpoints

**Review checklist**:
- [ ] better-auth's built-in CSRF protection — verify it's enabled and uses origin/referer checking
- [ ] tRPC mutations — verify `x-trpc-source` header or other CSRF mechanism is enforced server-side (not just set client-side)
- [ ] Booking form submission — verify it goes through tRPC or has CSRF protection
- [ ] `SameSite` cookie attribute — confirm it's set to `Lax` or `Strict` on session cookies
- [ ] No state-mutating GET requests

**Files**:
- `src/lib/auth.ts`
- `src/trpc/react.tsx`
- `src/server/api/trpc.ts`

---

## Task 11: Rate Limiting

**Scope**: All public-facing endpoints

**Review checklist**:
- [ ] **No rate limiting exists** — flag this as a gap
- [ ] OTP send endpoint — vulnerable to abuse (email bombing, cost amplification via Resend)
- [ ] OTP verify endpoint — vulnerable to brute-force (10^6 combinations for 6-digit code)
- [ ] tRPC endpoints — no rate limiting on authenticated requests
- [ ] Health check endpoint — could be used for availability probing
- [ ] Booking form — no rate limiting on submissions
- [ ] Recommend: Vercel Edge Middleware rate limiting or better-auth rate limit plugin

**Files**:
- No rate limiting files exist (gap to flag)

---

## Task 12: Error Handling & Information Leakage

**Scope**: Error boundaries, tRPC error formatter, server instrumentation

**Review checklist**:
- [ ] `global-error.tsx` — confirm no stack traces or internal details rendered to user
- [ ] tRPC `onError` — confirm only logs in development, silent in production
- [ ] tRPC error formatter — confirm `zodError` field only exposes field-level validation (not internal schema details)
- [ ] PostHog error tracking — confirm raw exceptions sent to PostHog don't leak to client responses
- [ ] `instrumentation.ts` — confirm `console.error` in cookie parse failure doesn't leak to response
- [ ] API routes — confirm all catch blocks return generic error messages
- [ ] Server component errors — confirm Next.js error boundaries catch and genericize

**Files**:
- `src/app/global-error.tsx`
- `src/app/api/trpc/[trpc]/route.ts`
- `src/server/api/trpc.ts` (error formatter)
- `src/instrumentation.ts`

---

## Task 13: Dependency Security

**Scope**: `package.json`, lock file, CI audit

**Review checklist**:
- [ ] Run `make audit` — check for known CVEs in production dependencies
- [ ] Review `yarn.lock` for pinned versions — confirm no floating version ranges for critical packages
- [ ] better-auth version — check for known security advisories
- [ ] Next.js version (16.2.1) — check for known CVEs
- [ ] Drizzle ORM version — check for known issues
- [ ] CI pipeline runs `npm audit` — verify it fails the build on high/critical CVEs
- [ ] No unnecessary dependencies with broad system access

**Files**:
- `package.json`
- `yarn.lock`
- `.github/workflows/quality-control.yml`

---

## Task 14: Third-Party Integration Security

**Scope**: PostHog, Resend, Google reCAPTCHA

**Review checklist**:
- [ ] PostHog — confirm API key is non-secret (project key, not personal API key)
- [ ] PostHog proxy (`/rk/` rewrite) — confirm it doesn't create an open proxy to arbitrary hosts
- [ ] Resend — confirm API key is server-side only, never exposed to client
- [ ] Google reCAPTCHA enterprise script in CSP — confirm it's actually used; dead CSP entries widen attack surface
- [ ] No third-party scripts loaded outside of CSP-allowed sources
- [ ] Analytics provider — confirm no PII is sent to PostHog (email, phone from booking form)

**Files**:
- `next.config.ts` (PostHog rewrites)
- `src/lib/posthog.ts`
- `src/lib/posthog-server.ts`
- `src/providers/AnalyticsProvider.tsx`
- `src/lib/auth.ts` (Resend integration)

---

## Task 15: Cookie Security

**Scope**: Session cookies, analytics cookies

**Review checklist**:
- [ ] Session cookie has `HttpOnly` flag — verify via better-auth docs or runtime inspection
- [ ] Session cookie has `Secure` flag on HTTPS deployments — confirmed by `__Secure-` prefix
- [ ] Session cookie has `SameSite=Lax` or `Strict` — verify
- [ ] Session cookie `Path=/` — appropriate for this app
- [ ] Cookie token is HMAC-SHA256 signed — confirmed in auth helper
- [ ] No sensitive data stored in cookies beyond the session token
- [ ] PostHog cookie — confirm no sensitive data, appropriate expiry

**Files**:
- `e2e/utils/session-cookie.ts`
- `src/lib/auth.ts`
- `src/lib/posthog.ts`

---

## Task 16: Secrets Management

**Scope**: All files that reference secrets

**Review checklist**:
- [ ] `BETTER_AUTH_SECRET` — not logged, not included in error messages, not sent to client
- [ ] `DATABASE_URL` — not exposed in client bundles or error responses
- [ ] `RESEND_API_KEY` — server-side only
- [ ] `POSTHOG_ERROR_TRACKING_API_KEY` — server-side only
- [ ] `VERCEL_AUTOMATION_BYPASS_SECRET` — only used in CI/test config, not in app code
- [ ] No hardcoded secrets in source code — grep for API keys, tokens, passwords
- [ ] Git history — confirm no secrets were previously committed and need rotation

**Files**:
- `src/env.js`
- All files referencing `env.*` imports
- `.gitignore`

---

## Task 17: Build & Deploy Security

**Scope**: CI/CD pipeline, Vercel deployment

**Review checklist**:
- [ ] Source maps — confirm they're uploaded to PostHog but NOT served publicly
- [ ] `.next/` output — confirm no server-side code is exposed as static assets
- [ ] CI environment — confirm secrets are stored as GitHub Actions secrets, not in workflow files
- [ ] Vercel deployment — confirm preview deployments are protected (not publicly accessible with real data)
- [ ] `ROBOTS_TXT` env var — confirm production allows indexing of public pages only
- [ ] Husky pre-commit hooks — confirm they run linting/formatting (not bypassable security checks)

**Files**:
- `.github/workflows/*.yml`
- `next.config.ts`
- `.husky/`
- `src/app/robots.ts`

---

## Task 18: Data Privacy & PII Handling

**Scope**: Lead data, user data, form submissions

**Review checklist**:
- [ ] Leads table — identify all PII fields (email, phone, name, company) and their access patterns
- [ ] Conversation storage — assess if message content contains PII and how it's protected
- [ ] Booking form submissions — trace where form data is sent (tRPC? Direct API? HubSpot?)
- [ ] PostHog analytics — confirm no PII (email, phone) is included in tracked events
- [ ] Privacy page (`/privacy`) — confirm it accurately describes data collection practices
- [ ] Data retention — check if old sessions/leads are purged
- [ ] User deletion — confirm cascade deletes remove all associated data

**Files**:
- `src/server/db/schema/leads.ts`
- `src/server/db/schema/conversations.ts`
- `src/server/db/schema/auth.ts`
- `src/app/(website)/privacy/page.tsx`
- `src/providers/AnalyticsProvider.tsx`

---

## Execution Order

Start with the highest-impact tasks first:

1. **Task 11: Rate Limiting** — Known gap, highest risk (OTP brute-force, email bombing)
2. **Task 1: Authentication Configuration** — Foundation of security
3. **Task 2: Authorization Gates** — IDOR and bypass risks
4. **Task 3: API Route Security** — Dev endpoint in production
5. **Task 10: CSRF Protection** — State-mutation safety
6. **Task 8: Input Validation** — Injection prevention
7. **Task 9: XSS Prevention** — Client-side safety
8. **Task 6: Environment Variable Security** — Secret exposure
9. **Task 16: Secrets Management** — Credential leakage
10. **Task 7: Database Security** — Data layer safety
11. **Task 4: Content Security Policy** — Browser-enforced controls
12. **Task 5: Security Headers** — Defense-in-depth headers
13. **Task 12: Error Handling** — Information leakage
14. **Task 15: Cookie Security** — Session hijacking prevention
15. **Task 13: Dependency Security** — Supply chain
16. **Task 14: Third-Party Integrations** — External service risks
17. **Task 17: Build & Deploy Security** — CI/CD hardening
18. **Task 18: Data Privacy** — PII compliance

---

## References

- Codebase: Next.js 16 + better-auth + tRPC + Drizzle + Neon + Vercel
- Auth: better-auth with email OTP via Resend
- Testing: Playwright E2E only (no unit tests)
- CI: GitHub Actions (`quality-control.yml`)
