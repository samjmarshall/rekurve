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
- [x] No `dangerouslySetInnerHTML` in any component — 3 usages exist (`(website)/layout.tsx:118`, `FAQ.tsx:156`, `Pricing.tsx:175`), all for `application/ld+json` schema markup using `JSON.stringify()` of static hardcoded data objects. No user input flows into any of these. Standard JSON-LD pattern; safe. ✅
- [x] No `innerHTML` assignments in any script — zero matches found anywhere in `src/`. ✅
- [x] User-generated content (if any) is escaped before rendering — all user-supplied state values rendered in JSX use React's auto-escaping: `{email}` at `login/page.tsx:206`, `{session?.user.email}` at `settings/page.tsx:14`, `{leadName}` (derived from `form.getValues()`) at `success-screen.tsx:24`, `{submitError}` (tRPC error message, not user content) at `form-navigation.tsx:26`. No raw HTML injection paths. ✅
- [x] CSP `script-src` prevents inline script injection — `'unsafe-inline'` in `script-src-elem` is a known accepted risk documented in Task 4 (required for Next.js App Router hydration scripts and JSON-LD tags; nonce replacement requires Edge Middleware). ⚠️
- [x] No URL parameters rendered directly into the page without sanitization — no `useSearchParams()` or `router.query` usage in `src/app/` or `src/components/`. URL search params are consumed only in `posthog.ts` for analytics (not rendered to the DOM). No URL parameters are rendered to the page. ✅
- [x] `href` attributes don't accept `javascript:` protocol from user input — all dynamic `href` values come from hardcoded static config arrays (`navbar.tsx` navItems, `footer.tsx` pages/socials/legals, `nav-config.ts` navItems). The only non-literal dynamic href is `stat.citation.url` in `StatCard.tsx`, sourced from `stats-data.ts` which contains only hardcoded `https://` URLs. No user input flows into any `href` attribute. ✅

**Files**:
- All files in `src/app/`, `src/components/`

---

## Task 10: CSRF Protection

**Scope**: State-mutating endpoints

**Review checklist**:
- [x] better-auth's built-in CSRF protection — enabled by default, no opt-out in `auth.ts`. `originCheckMiddleware` (at `node_modules/better-auth/dist/api/middlewares/origin-check.mjs`) fires on all non-GET/OPTIONS/HEAD requests that include a `Cookie` header. It checks the `Origin` or `Referer` header against `trustedOrigins`. `formCsrfMiddleware` additionally validates `Sec-Fetch-Site/Mode/Dest` for first-login scenarios. Neither `advanced.disableCSRFCheck` nor `advanced.disableOriginCheck` is set in `src/lib/auth.ts`. Protection is active. ✅
- [x] tRPC mutations — `x-trpc-source: nextjs-react` set at `src/trpc/react.tsx:44` is a client-set hint for observability, **not a server-side CSRF check** (the tRPC server does not validate it). Actual CSRF protection for tRPC comes from `SameSite=Lax` on the session cookie: cross-site POST requests from foreign origins cannot include the cookie, so all `protectedProcedure` mutations will return `UNAUTHORIZED` if called cross-site. This is architecturally sound — `SameSite=Lax` is the established CSRF defence for cookie-authenticated JSON APIs. No additional tRPC-layer enforcement is needed. ✅
- [x] Booking form submission — `onSubmit` handler at `BookingForm.tsx:256` fires PostHog analytics and `console.log()` only; there is no server-side submission endpoint. CSRF is not applicable here (no state mutation server-side). ✅ Note: this is consistent with the Task 8 finding; if a server endpoint is added, CSRF protection will be inherited via `SameSite=Lax` cookies automatically.
- [x] `SameSite` cookie attribute — better-auth defaults `sameSite: "lax"` for all session cookies (`node_modules/better-auth/dist/cookies/index.mjs:33`). The `nextCookies()` plugin adds the `__Secure-` prefix for HTTPS deployments but does not alter `sameSite`. `Lax` correctly blocks cross-site subresource POST requests while allowing same-site navigation. ✅
- [x] No state-mutating GET requests — all state-mutating operations across all 5 tRPC routers (`leads.ts`: `create`, `update`, `delete`; `ai.ts`, `lots.ts`, `messages.ts`, `nurture.ts`: read-only queries only) use `.mutation()`. Every `.query()` is read-only. Zero state-mutating GET paths exist. ✅

**Files**:
- `src/lib/auth.ts`
- `src/trpc/react.tsx`
- `src/server/api/trpc.ts`

---

## Task 11: Rate Limiting

**Scope**: All public-facing endpoints

**Review checklist**:
- [x] **No rate limiting exists** — confirmed. Zero matches for `rateLimit`, `rateLimiting`, `upstash`, `redis`, or any rate-limiting library across all of `src/` and `package.json`. No `middleware.ts` exists at the app level. This is a gap across all endpoints. ⚠️
- [x] OTP send endpoint (`POST /api/auth/sign-in/email-otp`) — no rate limiting. An attacker can call this endpoint in a tight loop with any email address, triggering Resend API calls on each request. Each OTP dispatch costs money; at scale this enables cost amplification (Resend billing) and email inbox flooding for the target address. No IP-level or email-level throttle is in place. ⚠️ **High risk.**
- [x] OTP verify endpoint (`POST /api/auth/email-otp/verify`) — partially mitigated. `auth.ts:31` sets `allowedAttempts: 3`, which invalidates a specific OTP after 3 failed guesses, preventing brute-force of any single 6-digit code. However, there is no rate limit on how many fresh OTPs can be requested: an attacker can request a new OTP, exhaust its 3 attempts, request another, and repeat indefinitely. This cycles through the search space at 3 guesses per OTP issuance round-trip rather than 10^6 sequential guesses, but it still represents an unconstrained verification attempt loop. ⚠️ **Medium risk** (mitigated by per-OTP attempt cap, not eliminated).
- [x] tRPC endpoints (`/api/trpc/*`) — no rate limiting on authenticated requests. All 5 routers are protected by `protectedProcedure` so unauthenticated callers are rejected, but a valid session can make unlimited requests. Relevant for AI-backed procedures (`ai.ts`) where each call may trigger an LLM inference cost. ⚠️ **Low-medium risk** (requires a valid session; mainly a cost protection concern).
- [x] Health check endpoint (`GET /api/health`) — no rate limiting. Returns only `{ status: "ok", timestamp }` with no internal detail (Task 3 confirmed this). An attacker can poll it to infer uptime/availability patterns. Low-severity; no sensitive data exposed. ⚠️ **Low risk.**
- [x] Booking form — no server-side submission endpoint exists (`onSubmit` at `BookingForm.tsx:256` calls PostHog analytics and `console.log()` only). No rate limiting is applicable. ✅ (consistent with Task 8 and Task 10 findings).
- [x] Recommend: Two viable mitigations — (1) **Vercel Edge Middleware** with the `@vercel/functions` `waitUntil` + IP-keyed in-memory or KV store; best for `/api/auth/*` and `/api/health`; requires no new dependencies if using Vercel KV. (2) **better-auth `rateLimit` plugin** (`import { rateLimit } from "better-auth/plugins"`) for auth-layer throttling of OTP send/verify specifically; this is the most targeted fix for the highest-risk endpoints. Either approach addresses the OTP bombing vector. At current pre-PMF scale, implementing better-auth's `rateLimit` plugin for the auth routes is the recommended first step.

**Files**:
- No rate limiting files exist (gap to flag)
- `src/lib/auth.ts` — `allowedAttempts: 3` is the only existing throttle (per-OTP attempt cap only)

---

## Task 12: Error Handling & Information Leakage

**Scope**: Error boundaries, tRPC error formatter, server instrumentation

**Review checklist**:
- [x] `global-error.tsx` — renders only `<NextError statusCode={0} />` (Next.js generic error page). The `error` object is forwarded exclusively to `posthog.captureException(error)` in a `useEffect` (client-side PostHog SDK). No stack trace, message, or internal detail is rendered into the DOM. ✅
- [x] tRPC `onError` — `env.NODE_ENV === "development"` guard in `src/app/api/trpc/[trpc]/route.ts:20-27`; the handler is `undefined` in production. Nothing is logged to the console or returned to the client in production. ✅ (consistent with Task 3 finding)
- [x] tRPC error formatter — `error.cause.flatten()` at `src/server/api/trpc.ts:26` produces only `{ formErrors: string[], fieldErrors: Record<string, string[]> }` — field paths and message strings from Zod, no schema internals or full `ZodIssue` arrays. The `shape` spread preserves tRPC's default behaviour: `stack` is stripped from `shape.data` in production by tRPC's own serializer; only `code`, `httpStatus`, `path`, and `zodError` reach the client. ✅
- [x] PostHog error tracking — `global-error.tsx` sends errors via the client-side PostHog JS SDK (browser → PostHog servers, never into the HTTP response). `instrumentation.ts:onRequestError` calls the server-side PostHog SDK (`posthog.captureException`) which sends a fire-and-forget HTTP request to PostHog's ingest API; this call is not awaited in a way that affects the Next.js response, and its result is never included in any response body. ✅
- [x] `instrumentation.ts` — `console.error("Error parsing PostHog cookie:", e)` at line 34 is server-side only (guarded by `NEXT_RUNTIME === "nodejs"`). `onRequestError` is a Next.js instrumentation hook; it runs after the response is already committed and has no return value that could modify the HTTP response. No leakage path to the client. ✅
- [x] API routes — no `try/catch` blocks exist in any of the four API routes (`auth`, `trpc`, `health`, `dev/session`, `hubspot/webhook`). Uncaught exceptions in Next.js route handlers return a generic HTTP 500 with no stack trace or error detail in production (`NODE_ENV=production`). The `hubspot/webhook/route.ts` has one unguarded `JSON.parse(body)` at line 37 — this is post-signature-validation so the body is trusted, but a malformed body would produce a generic 500 (no leakage). No information-leaking catch blocks found. ✅
- [x] Server component errors — no nested `error.tsx` files exist (`src/app/**/error.tsx` — zero results). Root-level `global-error.tsx` covers the outermost boundary. For nested route segments, Next.js production mode automatically returns a generic error page without stack traces for all unhandled server component exceptions. No stack traces or internal details are exposed. ✅

**Files**:
- `src/app/global-error.tsx`
- `src/app/api/trpc/[trpc]/route.ts`
- `src/server/api/trpc.ts` (error formatter)
- `src/instrumentation.ts`

---

## Task 13: Dependency Security

**Scope**: `package.json`, lock file, CI audit

**Review checklist**:
- [x] Run `make audit` — `yarn npm audit --environment production` returned "No audit suggestions" (exit 0). Zero known CVEs across all production dependencies. ✅
- [x] Review `yarn.lock` for pinned versions — all production dependencies in `package.json` use exact versions (no `^` or `~` ranges). `yarn.lock` pins every transitive dependency to exact resolved versions: `better-auth@1.5.6`, `next@16.2.1`, `drizzle-orm@0.45.2`. `shadcn: "latest"` in devDependencies is floating but devDependency-only and resolves to `4.1.1` in the lock file; not a production concern. ✅
- [x] better-auth version (1.5.6) — no known security advisories; confirmed clean by `yarn npm audit`. ✅
- [x] Next.js version (16.2.1) — no known CVEs; confirmed clean by `yarn npm audit`. ✅
- [x] Drizzle ORM version (0.45.2) — no known issues; confirmed clean by `yarn npm audit`. ✅
- [x] CI pipeline runs `make audit` — `quality-control.yml` has a dedicated `audit` job (lines 36-81) that runs `make audit` on every push/PR to `main`. `yarn npm audit` exits non-zero on any vulnerability, failing the CI job and blocking the merge. Scoped to `--environment production` to ignore devDependency CVEs. ✅
- [x] No unnecessary dependencies with broad system access — all 27 production dependencies are application-level packages (UI framework, DB client, auth, email, analytics, tRPC, Zod). No shell-execution libraries, no raw `child_process` wrappers, no broad filesystem utilities. DevDependencies include `tsx` (TS execution for scripts) and `husky` (git hooks), both standard tooling with no unexpected system access. ✅

**Files**:
- `package.json`
- `yarn.lock`
- `.github/workflows/quality-control.yml`

---

## Task 14: Third-Party Integration Security

**Scope**: PostHog, Resend, Google reCAPTCHA

**Review checklist**:
- [x] PostHog — `NEXT_PUBLIC_POSTHOG_KEY` is declared in the `client` block of `src/env.js` (browser-side project key; public by design, used in `posthog.init()` at `instrumentation-client.ts:4`). `POSTHOG_ERROR_TRACKING_API_KEY` (personal API key for sourcemap upload) is declared in the `server` block with no `NEXT_PUBLIC_` prefix, used only in `next.config.ts` via `withPostHogConfig`. `POSTHOG_PROJECT_ID` is also server-side only. Correct key separation: public project key on client, personal key server-only. ✅
- [x] PostHog proxy (`/rk/` rewrite) — all three rewrite rules hardcode the destination host (`https://us-assets.i.posthog.com/static/:path*` and `https://us.i.posthog.com/:path*`). The `:path*` wildcard captures only the path segment of the incoming URL; the destination host is a compile-time constant and cannot be overridden by manipulating the source path. Not an open proxy. ✅
- [x] Resend — `RESEND_API_KEY` is declared in the `server` block of `src/env.js` with no `NEXT_PUBLIC_` prefix. Consumed only in `src/lib/auth.ts` (server-side module, not imported by any client component or `NEXT_PUBLIC_` path). Never included in client bundles. ✅
- [x] Google reCAPTCHA enterprise script in CSP — already removed in Task 4. Zero matches for `recaptcha`/`reCAPTCHA` in `src/` or `next.config.ts`. Current `script-src-elem` is `'self' 'unsafe-inline'` with no external hosts. No dead CSP entries remain. ✅
- [x] No third-party scripts loaded outside of CSP-allowed sources — PostHog JS initialises with `api_host: "/rk"` (`instrumentation-client.ts:5`), routing all SDK requests through the same-origin `/rk/` proxy. No `<Script src>` tags reference external domains. `withPostHogConfig` in `next.config.ts` handles sourcemap upload at build time only (not a runtime script load). `script-src-elem 'self' 'unsafe-inline'` is accurate and sufficient. ✅
- [x] Analytics provider — **PII is intentionally sent to PostHog**. `formTracking.identifyLead()` (`posthog.ts:370`) calls `posthog.identify(email, { $set: { email, name, phone } })` after step 1. `formTracking.submitted()` (`posthog.ts:467-493`) sends a `booking_form_submitted` event containing `lead_email`, `lead_phone`, and `lead_name`, then calls `posthog.identify` with the same PII. This is a deliberate CRM-style lead tracking design, not accidental leakage. `person_profiles: "identified_only"` (`instrumentation-client.ts:7`) limits profile creation to explicitly identified users (no anonymous profiles persist). **Risk**: email, full name, and phone number are stored in PostHog and subject to PostHog's data retention. This must be accurately disclosed in the privacy policy. No code change required at this stage; flagged for Task 18 (Data Privacy) review. ⚠️

**Files**:
- `next.config.ts` (PostHog rewrites)
- `src/lib/posthog.ts`
- `src/lib/posthog-server.ts`
- `src/instrumentation-client.ts`
- `src/providers/AnalyticsProvider.tsx`
- `src/lib/auth.ts` (Resend integration)

---

## Task 15: Cookie Security

**Scope**: Session cookies, analytics cookies

**Review checklist**:
- [x] Session cookie has `HttpOnly` flag — `httpOnly: true` at `node_modules/better-auth/dist/cookies/index.mjs:35`. The session cookie is never accessible via `document.cookie`; JS-based XSS attacks cannot exfiltrate it. ✅
- [x] Session cookie has `Secure` flag on HTTPS deployments — `secure: !!secureCookiePrefix` at `cookies/index.mjs:32`. When the base URL is HTTPS (or `NODE_ENV=production`), the `__Secure-` prefix is applied and `Secure=true` is set. Confirmed by `e2e/utils/session-cookie.ts:11-18` which derives `secure: isSecure` from the base URL protocol. On HTTP (localhost dev), no prefix and `Secure=false` — correct behaviour. ✅
- [x] Session cookie has `SameSite=Lax` — `sameSite: "lax"` at `cookies/index.mjs:33`. Confirmed in Task 10 (CSRF). Blocks cross-site subresource POST requests while allowing top-level navigations. ✅
- [x] Session cookie `Path=/` — `path: "/"` at `cookies/index.mjs:34`. Appropriate for this app; the cookie is scoped to the entire domain and sent on all requests, which is required for both the app routes and the tRPC API at `/api/trpc/*`. ✅
- [x] Cookie token is HMAC-SHA256 signed — `createHMAC("SHA-256", "base64urlnopad").sign(ctx.context.secret, JSON.stringify({...}))` at `cookies/index.mjs:101`. The payload is signed with `BETTER_AUTH_SECRET` (min 32 chars, validated in `src/env.js`). Verification uses `createHMAC("SHA-256", "base64urlnopad").verify(...)` at line 242 — tampered tokens are rejected before any DB lookup. ✅
- [x] No sensitive data stored in cookies beyond the session token — better-auth sets three cookies: `[__Secure-]better-auth.session_token` (7-day expiry, signed opaque token referencing a DB session row), `session_data` (5-minute cache of session/user metadata, `cookieCache.maxAge: 300` per `auth.ts`), `account_data` (5-minute cache). All three carry only IDs and expiry timestamps — no passwords, raw secrets, or PII. ✅
- [x] PostHog cookie — PostHog sets `ph_<project_key>_posthog` as a regular (non-HttpOnly) cookie with a 365-day default expiry (`cookie_expiration: 365` in type definitions). Non-HttpOnly is expected and required for a client-side analytics SDK that reads its own persistence via JS. Contents: anonymous `distinct_id`, `$device_id`, `$user_state`, `$ses_id` (session ID), feature flag values. No auth tokens, session secrets, or user PII stored here. With `person_profiles: "identified_only"` (`instrumentation-client.ts:7`), no profile data persists in the cookie beyond PostHog's own analytics identifiers. 365-day expiry is standard for analytics SDKs and acceptable. ✅

**Files**:
- `e2e/utils/session-cookie.ts`
- `src/lib/auth.ts`
- `src/lib/posthog.ts`
- `src/instrumentation-client.ts`
- `node_modules/better-auth/dist/cookies/index.mjs` (lines 21–35, 101, 242)

---

## Task 16: Secrets Management

**Scope**: All files that reference secrets

**Review checklist**:
- [x] `BETTER_AUTH_SECRET` — declared in the `server` block of `src/env.js` (no `NEXT_PUBLIC_` prefix; never bundled client-side). Only two usages: `env.js:49` (runtime env binding) and `api/dev/session/route.ts:16` (HMAC key for dev-only endpoint, guarded by `NODE_ENV !== "development"` check). The three `console.log()` calls in `src/env.js` (lines 4–8) only log `VERCEL_URL`, `VERCEL_BRANCH_URL`, and `VERCEL_PROJECT_PRODUCTION_URL` — non-secret Vercel platform variables. No logging of `BETTER_AUTH_SECRET` anywhere in `src/`. ✅
- [x] `DATABASE_URL` — declared in the `server` block of `src/env.js`. Used exclusively by `src/server/db/index.ts:8` to initialise the Neon HTTP client. Never imported by any file in the `client` render path. Test files use `"postgres://mock"` placeholder (not a real credential). No error response handler reads or echoes `DATABASE_URL`. ✅
- [x] `RESEND_API_KEY` — declared in the `server` block of `src/env.js` with no `NEXT_PUBLIC_` prefix. Only usage: `src/lib/auth.ts:10` (`new Resend(env.RESEND_API_KEY)`). `auth.ts` is a server-only module; it is never imported by any client component or `"use client"` file. Key never reaches the browser. ✅
- [x] `POSTHOG_ERROR_TRACKING_API_KEY` — declared in the `server` block of `src/env.js`. Only usage: `next.config.ts:91` (`personalApiKey: env.POSTHOG_ERROR_TRACKING_API_KEY`) inside `withPostHogConfig`, consumed exclusively at build time for sourcemap upload to PostHog. Not included in any runtime bundle, not accessible in the browser. ✅
- [x] `VERCEL_AUTOMATION_BYPASS_SECRET` — zero matches in `src/`. Appears only in `playwright.config.ts:31,34` (test runner headers) and `.github/workflows/post-deploy.yml:113` (CI env injection via `${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}`). Never imported by any app module. Correct CI/test-only usage. ✅
- [x] No hardcoded secrets in source code — grepped `src/**/*.{ts,tsx,js}` for patterns matching API key formats (`phc_*`, `re_*`, `postgres://…`, inline `secret/token/password = "…long string"`). Zero matches. The `"postgres://mock"` strings in two test files (`leads-router.test.ts:45`, `router.test.ts:13`) are intentional fake URLs used for env schema mocking in unit tests, not real credentials. ✅
- [x] Git history — `git log --all --diff-filter=A --name-only -- '.env*'` shows the only `.env*` file ever added to the repo is `.env.example`; the `.env` file itself was never committed. `.env.example` contains placeholder values with no real secrets (confirmed in Task 6). No secrets were previously committed; no rotation is needed. ✅

**Files**:
- `src/env.js`
- All files referencing `env.*` imports
- `.gitignore`

---

## Task 17: Build & Deploy Security

**Scope**: CI/CD pipeline, Vercel deployment

**Review checklist**:
- [x] Source maps — `next.config.ts:94-99` sets `sourcemaps: { enabled: process.env.CI === "true", deleteAfterUpload: true }` in the `withPostHogConfig` wrapper. Source maps are generated only when `CI=true` (GitHub Actions), uploaded to PostHog for error tracking, then deleted from the build output. `deleteAfterUpload: true` ensures no `.map` files persist in `.next/` and are never served publicly. ✅
- [x] `.next/` output — no `output: "export"` or custom `distDir` in `next.config.ts`. Default Next.js App Router behaviour: server code (API routes, server components, tRPC handlers) compiles to Node.js functions deployed as Vercel Serverless Functions — not accessible as static files. `.next/static/` contains only client bundles, CSS chunks, and media. No server-side code is exposed via the static asset path. ✅
- [x] CI environment — all 4 workflow files use `${{ secrets.* }}` references exclusively: `NEON_API_KEY`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `BETTER_AUTH_SECRET` in `post-deploy.yml`; `NEON_API_KEY` in `neon.yml`; `GITHUB_TOKEN` (auto-provided) in `quality-control.yml` and `release.yml`. Non-sensitive config (project IDs, region) uses `${{ vars.* }}`. No secrets are hardcoded or logged in any workflow file. ✅
- [x] Vercel deployment — `post-deploy.yml:113` passes `VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}` to Playwright E2E tests. This confirms preview deployments are protected by Vercel Deployment Protection and require the bypass secret to access — unauthenticated public access to preview URLs is blocked. E2E tests use the secret to bypass protection within CI only. Real production data is isolated to the production Neon branch; preview deployments connect to per-PR Neon branches (created/deleted by `neon.yml`). ✅
- [x] `ROBOTS_TXT` env var — `robots.ts` checks `env.ROBOTS_TXT === "Allow"` to return either `allow: "/"` or `disallow: "/"`. Production Vercel env should set `ROBOTS_TXT=Allow`; all other environments (preview, development) omit it, defaulting to disallow all. Auth-protected routes (`/dashboard`, `/settings`) are not indexed by crawlers in practice because they redirect unauthenticated requests to `/login` — even under `allow: "/"` no private content is exposed. The coarse `allow: "/"` rule is acceptable at this stage; a future improvement would be to add `disallow: ["/dashboard", "/settings"]` explicitly for belt-and-suspenders. ✅ (minor future hardening only)
- [x] Husky pre-commit hooks — `.husky/pre-commit` contains only `make check` (ESLint + TypeScript typecheck). This is a developer quality gate, not a security control. Bypassing with `git commit --no-verify` skips linting/formatting only — no security-critical checks (secrets scanning, SAST) run in the hook. Security controls are enforced in CI (`quality-control.yml`) which cannot be bypassed. Correct architecture: pre-commit for DX, CI for enforcement. ✅

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
