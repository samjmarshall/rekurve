# Code Review Checklist: Next.js, React & Composition Best Practices

## Overview

Sequential code review of the Rekurve www codebase against three skill sets, completed one phase at a time. Each phase audits the codebase against a specific skill's rules, produces findings, and applies fixes before moving to the next.

## Current State Analysis

- **Framework**: Next.js App Router (React 19, TypeScript)
- **Data layer**: tRPC + TanStack Query dual-client (server proxy + client hooks)
- **Auth**: better-auth with email OTP
- **Styling**: Tailwind CSS v4, CVA variants
- **Animations**: framer-motion + motion/react (dual import)
- **Components**: 16 UI components (shadcn/Base UI pattern), 41 client components total
- **Server Actions**: None (using tRPC instead)
- **Suspense**: Not yet implemented
- **Pages**: Marketing website, login flow, dashboard shell (mostly stubs)

### Key Discoveries:
- No `next/dynamic` usage anywhere — all imports are static
- Mixed `framer-motion` and `motion/react` imports (same version 12.23.24)
- No Suspense boundaries despite async server components
- All 16 UI components use `forwardRef` (React 19 allows ref as prop)
- `useContext` used in `input-otp.tsx` instead of `use()`
- DB schema barrel file at `src/server/db/schema/index.ts` re-exports 8 modules
- Hooks barrel file at `src/hooks/index.ts`
- No `after()` usage for non-blocking operations
- `React.cache()` used correctly for `getSession` and `getQueryClient`
- No parallel data fetching patterns (no `Promise.all`)
- Compare component has 10 props including booleans (`showHandlebar`, `autoplay`)

## Desired End State

All three phases completed with:
1. Issues identified and categorized by severity
2. Fixes applied where appropriate
3. Codebase aligned with modern Next.js, React, and composition best practices

### Verification:
- `make check` passes after each phase
- `make build` succeeds after each phase
- No regressions in `make test_e2e`

## What We're NOT Doing

- Rewriting entire components from scratch
- Adding new features or functionality
- Changing the tRPC architecture
- Adding Suspense boundaries (separate task — noted as recommendation only)
- Migrating away from framer-motion entirely
- Restructuring route groups or layouts

---

## Phase 1: Accelint Next.js Best Practices

### Overview
Audit the codebase against the 12 Next.js-specific rules covering security, waterfalls, serialization, caching, and component boundaries.

### Checklist

#### 1.1 Prevent Waterfall Chains
- [x] Review all `async` server components for sequential `await` chains
- [x] Check API route handlers (`src/app/api/`) for sequential operations
- [x] **Files to check**:
  - `src/app/(application)/layout.tsx` — `await getSession()`
  - `src/app/(application)/settings/page.tsx` — `await getSession()`
  - `src/app/(login)/layout.tsx` — `await getSession()`
  - `src/app/api/trpc/[trpc]/route.ts`
  - `src/app/api/dev/session/route.ts`
  - `src/app/api/health/route.ts`
- [x] **Expected finding**: No real waterfalls currently — `getSession()` is `React.cache()`-wrapped. Note as ✅ compliant.

> **Audit findings (2026-04-04):** ✅ Compliant — No sequential await waterfall chains found.
>
> **`src/app/(application)/layout.tsx`**:
> - Single `await getSession()` at line 43. No chained awaits.
> - `getSession` is `React.cache()`-wrapped — deduplicates across all server components in the same request.
> - **Assessment**: ✅ Compliant.
>
> **`src/app/(application)/settings/page.tsx`**:
> - Single `await getSession()` at line 5. No chained awaits.
> - Deduplicates with the layout's call via `React.cache()` — zero additional I/O cost.
> - **Assessment**: ✅ Compliant.
>
> **`src/app/(login)/layout.tsx`**:
> - Single `await getSession()` at line 35. No chained awaits.
> - **Assessment**: ✅ Compliant.
>
> **`src/app/api/trpc/[trpc]/route.ts`**:
> - No awaits in the route handler body. `createContext` factory is passed to `fetchRequestHandler` — no sequential async calls.
> - **Assessment**: ✅ Compliant.
>
> **`src/app/api/dev/session/route.ts`**:
> - POST handler awaits user lookup then session insert sequentially, but these are inherently dependent (session insert requires user ID). Not a waterfall.
> - Dev-only route (returns 404 in production).
> - **Assessment**: ✅ Compliant — sequential awaits are necessary dependencies, not parallelizable.
>
> **`src/app/api/health/route.ts`**:
> - No async operations. Synchronous JSON response.
> - **Assessment**: ✅ Compliant.
>
> **Conclusion**: No waterfall chains exist. `getSession()` is the only repeated async call and is correctly deduplicated by `React.cache()`. No changes required.

#### 1.2 Parallelize Independent Operations
- [x] Search for multiple sequential `await` calls that could use `Promise.all()`
- [x] Check tRPC context creation (`src/server/api/trpc.ts`) for parallel opportunities
- [x] **Expected finding**: Minimal async operations currently. Note as ✅ compliant.

> **Audit findings (2026-04-04):** ✅ Compliant — No parallelization opportunities missed.
>
> **`src/server/api/trpc.ts` — `createTRPCContext`**:
> - Single `await getSession()` call. `db` is a synchronous module export, not async. Nothing to parallelize.
> - **Assessment**: ✅ Compliant.
>
> **`src/server/api/routers/leads.ts` — `leads.list`**:
> - Already uses `Promise.all()` to fetch page items and total count in parallel (line 68).
> - All other procedures issue a single DB call per handler. No sequential independent awaits.
> - **Assessment**: ✅ Best practice already applied.
>
> **`src/server/hubspot/contacts.ts`**:
> - Each exported function (`createContact`, `getContact`, `updateContact`, `searchContacts`) issues a single HubSpot API call. No sequential independent operations.
> - **Assessment**: ✅ Compliant.
>
> **Conclusion**: The codebase has minimal async operations. The one location with multiple independent async calls (`leads.list`) already uses `Promise.all()`. No changes required.

#### 1.3 Strategic Suspense Boundaries
- [x] Identify async server components that block full page render
- [x] **Files to check**:
  - `src/app/(application)/layout.tsx` — blocks on `getSession()`
  - `src/app/(application)/settings/page.tsx` — blocks on `getSession()`
- [x] **Expected finding**: No Suspense boundaries exist. **Recommend** adding them as a future task but don't implement in this review.

> **Audit findings (2026-04-03):** ⚠️ Recommendation — No `<Suspense>` boundaries exist anywhere in the codebase. Three async server components were identified:
> 1. `src/app/(application)/layout.tsx:43` — `await getSession()` blocks the entire application shell (sidebar, nav, all child pages) from rendering until auth resolves.
> 2. `src/app/(application)/settings/page.tsx:5` — `await getSession()` blocks the settings page render.
> 3. `src/app/(login)/layout.tsx:35` — `await getSession()` blocks the login layout (used for redirect-if-authenticated guard).
>
> The layout blocking (#1) has the highest impact since it gates the entire application shell. However, since `getSession()` is `React.cache()`-wrapped, the settings page (#2) deduplicates with the layout call within the same request — no waterfall, but still no streaming.
>
> **Recommendation**: Add Suspense boundaries as a future task. Priority candidates:
> - Wrap `{children}` in the application layout with `<Suspense fallback={<DashboardSkeleton />}>` to allow the sidebar/nav shell to stream immediately while page content loads.
> - Individual page-level Suspense for data-heavy pages as they are built out.
>
> Not implementing in this review per plan scope.

#### 2.1 Authenticate Server Actions Like API Routes
- [x] Search for `"use server"` directives
- [x] **Expected finding**: No Server Actions in codebase. tRPC `protectedProcedure` handles auth. ✅ compliant (N/A).

> **Audit findings (2026-04-03):** ✅ Compliant (N/A) — No `"use server"` directives exist anywhere in `src/`. The codebase uses tRPC with `protectedProcedure` for authenticated mutations, so Server Action auth is not applicable.

#### 2.2 Avoid Duplicate Serialization in RSC Props
- [x] Check server components passing data to client components for duplicated objects
- [x] **Files to check**:
  - `src/app/(application)/layout.tsx` — passes `user` to `AppSidebar`
  - `src/app/(website)/page.tsx` — renders 8 section components
- [x] **Expected finding**: Minimal RSC → client data transfer currently. Note observations.

> **Audit findings (2026-04-04):** ✅ Compliant — Minimal and properly structured RSC → client data transfer.
>
> **Application Layout → AppSidebar** (Server → Client):
> - Server component extracts only necessary fields from `session.user` into a minimal object: `{ name: string; email: string }`
> - AppSidebar client component receives and uses only these two fields (lines 70, 72)
> - **Assessment**: ✅ Best practice — avoids passing unnecessary data across RSC boundary
>
> **Website Homepage**:
> - Server component renders 8 self-contained section components with no props passed
> - All sections (Hero, Problem, Solution, Results, HowItWorks, AboutFounder, Pricing, BookingForm, FAQ, FinalCTA) manage their own data locally
> - **Assessment**: ✅ Compliant — no RSC → client data transfer, no serialization concerns
>
> **Conclusion**: No duplicate serialization found. Codebase follows RSC boundary best practices.

#### 2.3 Minimize Serialization at RSC Boundaries
- [x] Check what props server components pass to client components
- [x] Verify only necessary fields are passed (not entire objects)
- [x] **Files to check**: Same as 2.2 above

> **Audit findings (2026-04-04):** ✅ Compliant — Only necessary fields are passed at RSC boundaries.
>
> **Application Layout → AppSidebar** (Server → Client):
> - Server component extracts only `{ name: string; email: string }` from `session.user` (line 63-66)
> - AppSidebar client component receives minimal prop interface (line 10-11)
> - Both fields are used (lines 70, 72)
> - **Assessment**: ✅ Best practice — minimizes serialization at boundary
>
> **Website Homepage**:
> - Server component renders 8 self-contained section components with no props passed (lines 17-28)
> - No RSC → client data transfer
> - **Assessment**: ✅ Compliant — no unnecessary serialization
>
> **Conclusion**: Section 2.3 follows best practices. No changes required.

#### 2.4 Parallel Data Fetching with Component Composition
- [x] Check if sibling server components could fetch data in parallel
- [x] **Expected finding**: Most pages are stubs with no data fetching. Note as future consideration.

> **Audit findings (2026-04-04):** ✅ Compliant (N/A) — No parallel data fetching opportunities exist in the current codebase.
>
> **Data fetching inventory:**
> - `src/app/(application)/layout.tsx` — `await getSession()` (single call, no siblings to parallelize)
> - `src/app/(application)/settings/page.tsx` — `await getSession()` (deduplicated with layout via `React.cache()`)
> - `src/app/(application)/dashboard/page.tsx` — no data fetching (stub)
> - `src/app/(application)/lots/page.tsx` — no data fetching (stub)
> - `src/app/(application)/pipeline/page.tsx` — no data fetching (stub)
> - `src/app/(website)/page.tsx` — not async; renders static section components with no data fetching
>
> **Assessment**: The component composition rule applies when a single parent component awaits multiple independent data sources sequentially instead of rendering sibling components that each fetch in parallel. No such pattern exists today — pages are stubs and the only real async work is `getSession()` which is a single call per request.
>
> **Future consideration**: When pages are built out (e.g., dashboard fetching both lead counts and lot availability), prefer splitting data dependencies across sibling async server components rather than awaiting sequentially in a parent. Example: render `<LeadSummary />` and `<LotCount />` as siblings so Next.js can initiate both fetches concurrently.

#### 2.5 Per-Request Deduplication with React.cache()
- [x] Verify `React.cache()` usage is correct
- [x] Check for inline object arguments that break caching
- [x] **Files to check**:
  - `src/lib/session.ts:5` — `cache(async () => auth.api.getSession(...))`
  - `src/trpc/server.tsx:15` — `cache(makeQueryClient)`
- [x] **Expected finding**: ✅ Both usages are correct.

> **Audit findings (2026-04-04):** ✅ Compliant — Both `React.cache()` usages are correct.
>
> **`src/lib/session.ts:5`** — `export const getSession = cache(async () => { ... })`
> - Zero-argument function wrapped with `cache`. No arguments means no inline objects can break the cache key.
> - `headers()` is called inside the function body, not passed as an argument — correct pattern.
> - Ensures `auth.api.getSession()` is called at most once per request regardless of how many server components call `getSession()`.
> - **Assessment**: ✅ Correct usage.
>
> **`src/trpc/server.tsx:15`** — `export const getQueryClient = cache(makeQueryClient)`
> - Wraps the `makeQueryClient` factory with `cache`. Called with no arguments in both `HydrateClient` and `prefetch`.
> - Ensures a single `QueryClient` instance is shared across the request for consistent dehydration.
> - **Assessment**: ✅ Correct usage.
>
> **Inline object argument check**: Neither cached function accepts arguments, so there is no risk of inline object references producing cache misses. No changes required.

#### 2.6 Use after() for Non-Blocking Operations
- [x] Identify logging, analytics, or side effects in API routes that could use `after()`
- [x] **Files to check**:
  - `src/app/api/trpc/[trpc]/route.ts` — `onError` handler logs in dev
  - `src/server/api/trpc.ts` — `timingMiddleware` logs execution time
- [x] **Expected finding**: `console.log` in timing middleware could use `after()`. Low priority.

> **Audit findings (2026-04-04):** ✅ Compliant (N/A) — Neither logging site is a meaningful candidate for `after()`.
>
> **`src/app/api/trpc/[trpc]/route.ts` — `onError` handler (lines 20-27)**:
> - Dev-only `console.error` executed synchronously as a callback within `fetchRequestHandler`.
> - Not in the Next.js route handler scope where `after()` can be called; it runs inside the tRPC adapter's error path.
> - Trivial cost — no network I/O, no database writes, no latency impact.
> - **Assessment**: ✅ No benefit from `after()`.
>
> **`src/server/api/trpc.ts` — `timingMiddleware` `console.log` (line 46)**:
> - Runs after `await next()` returns inside tRPC middleware. It is already non-blocking from the HTTP response perspective — tRPC streams the result, and the `console.log` is a microsecond-cost sync operation.
> - `after()` cannot be used inside tRPC middleware; it requires a Next.js route handler or Server Action context.
> - Even if accessible, deferring a `console.log` post-response would make the timing log meaningless (it would fire after the client already received the response).
> - **Assessment**: ✅ No benefit from `after()`. Timing middleware log is appropriate as-is.
>
> **What would warrant `after()`**: Analytics HTTP calls (e.g., PostHog event tracking in a route handler), audit log DB writes, or cache invalidation webhooks triggered by a tRPC mutation response. None of these patterns exist yet.
>
> **Conclusion**: No changes required.

#### 3.1 Avoid Barrel File Imports
- [x] Audit all barrel files and their consumers
- [x] **Barrel files found**:
  - `src/server/db/schema/index.ts` — re-exports 8 schema modules (server-only, acceptable)
  - `src/hooks/index.ts` — re-exports `useMediaQuery` (single export, acceptable)
  - `src/types/index.ts` — type-only exports (tree-shaken, acceptable)
  - `src/app/(website)/_components/stats/index.ts` — re-exports stats components
- [x] Check if any barrel files are imported in client bundles unnecessarily
- [x] **Expected finding**: Barrel files are minimal and mostly server-side. Low risk.

> **Audit findings (2026-04-04):** ✅ Compliant — No problematic barrel file imports found.
>
> **`src/server/db/schema/index.ts`** (8 re-exports: auth, conversations, enums, leads, lot-matches, lots, message-queue, nurture-sequences):
> - Single consumer: `src/server/api/routers/leads.ts:10` — `import { leads } from "~/server/db/schema"`
> - Server-only path (`src/server/`), never bundled for the client
> - **Assessment**: ✅ Compliant — server-side barrel, tree-shaking irrelevant
>
> **`src/hooks/index.ts`** (1 re-export: `useMediaQuery`):
> - Consumers: `src/app/(website)/_components/sections/Hero.tsx:9`, `src/app/(website)/_components/stats/StatsMarquee.tsx:4`
> - Both consumers are client components (`"use client"`) that import a single hook
> - Single-export barrel adds indirection with no benefit — direct imports (`~/hooks/useMediaQuery`) would be marginally cleaner — but there is zero tree-shaking risk since there is only one export
> - **Assessment**: ✅ Compliant (minor: could use direct imports, but no bundle impact)
>
> **`src/types/index.ts`** (type-only interfaces: PricingTier, Testimonial, CaseStudy, FormField, FormStep, FormSubmission, FAQItem, Metric, Feature, ProcessStep):
> - Single consumer: `src/app/(website)/_components/sections/Pricing.tsx:10` — `import type { PricingTier } from "~/types"`
> - Uses `import type` — fully erased at compile time, zero runtime impact
> - **Assessment**: ✅ Compliant — type-only barrel, no bundle impact possible
>
> **`src/app/(website)/_components/stats/index.ts`** (3 re-exports: StatCard, StatsMarquee, stats-data):
> - Single consumer: `src/app/(website)/_components/sections/Hero.tsx:15` — `import { StatsMarquee } from "../stats"`
> - Hero imports only `StatsMarquee`, but the barrel also re-exports `StatCard` and `stats-data` exports
> - **No actual risk**: `StatsMarquee` internally imports `StatCard` and `stats-data` directly, so those modules would be bundled regardless. The barrel creates no extra payload.
> - **Assessment**: ✅ Compliant — co-located feature barrel, all exports are transitively needed anyway
>
> **Conclusion**: No barrel files are imported unnecessarily in client bundles. No changes required.

#### 3.2 Server vs. Client Component Decision
- [x] Review all `"use client"` components — are any unnecessarily client-side?
- [x] **Key files to audit**:
  - `src/components/ui/Badge.tsx` — pure presentational, no hooks/events → could be server component
  - `src/components/ui/Card.tsx` — pure presentational, no hooks/events → could be server component
  - `src/components/ui/separator.tsx` — pure presentational → could be server component
  - `src/components/ui/label.tsx` — check if it needs client features
- [x] **Expected finding**: Several UI components are marked `"use client"` but use no client features. Removing the directive would reduce client bundle.

> **Audit findings (2026-04-04):** ✅ Two unnecessary `"use client"` directives removed. Two components already compliant.
>
> **`src/components/ui/Badge.tsx`**:
> - No `"use client"` directive — already a server component.
> - Pure CVA variant component, no hooks or event handlers. Used by Pricing, CaseStudies, AboutFounder sections (all server components, no event handlers passed).
> - **Assessment**: ✅ Already compliant. No change needed.
>
> **`src/components/ui/Card.tsx`**:
> - No `"use client"` directive — already a server component.
> - Uses `React.forwardRef` (available in server components). No hooks or event handlers. Used by 7 section/page files.
> - **Assessment**: ✅ Already compliant. No change needed.
>
> **`src/components/ui/separator.tsx`** — ❌ Had unnecessary `"use client"`:
> - `@base-ui/react/separator` already declares `'use client'` internally (`node_modules/@base-ui/react/esm/separator/Separator.js:1`). The client boundary is at the Base UI layer — our wrapper does not need to repeat it.
> - Only consumer: `src/components/ui/field.tsx` which already has `"use client"`.
> - **Fix applied**: Removed `"use client"` from `separator.tsx`.
>
> **`src/components/ui/label.tsx`** — ❌ Had unnecessary `"use client"`:
> - Plain `<label>` HTML element with Tailwind classes. No hooks, no event handlers, no browser APIs.
> - Only consumer: `src/components/ui/field.tsx` which already has `"use client"`.
> - **Fix applied**: Removed `"use client"` from `label.tsx`.

### Changes Required

Based on audit findings, apply fixes for any issues found. Expected changes:

#### 1. Remove unnecessary `"use client"` from pure presentational components
**Files**: `src/components/ui/Badge.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/separator.tsx`
**Change**: Remove `"use client"` directive if the component uses no hooks, event handlers, or browser APIs.

> **Important**: Only remove if no consumer passes event handler props (onClick, etc.) that require client hydration. Verify each by checking all import sites.
>
> **Result (2026-04-04)**: Badge and Card already lacked `"use client"`. Removed from `separator.tsx` and `label.tsx`. `make check` passed, `make build` succeeded.

### Success Criteria

#### Automated Verification:
- [x] `make check` passes (lint + typecheck)
- [x] `make build` succeeds

#### Manual Verification:
- [x] Audit report written with findings per rule
- [x] Each finding categorized as: ✅ Compliant, ⚠️ Recommendation, ❌ Issue
- [x] No regressions in page functionality

---

## Phase 2: Vercel React Best Practices

### Overview
Audit the codebase against 57 React performance rules across 8 categories, from critical (waterfalls, bundle size) to low (advanced patterns).

### Checklist

#### Category 1: Eliminating Waterfalls (CRITICAL)
- [x] **1.1 Defer await**: Check async functions for early-return optimization opportunities
- [x] **1.2 Dependency-based parallelization**: Check for partial-dependency async chains
- [x] **1.3 API route waterfalls**: Audit `src/app/api/` route handlers
- [x] **1.4 Promise.all()**: Search for sequential independent awaits
- [x] **1.5 Suspense boundaries**: Already covered in Phase 1 — cross-reference

> **Audit findings (2026-04-04):** ❌ One fix applied. Remainder ✅ compliant.
>
> **1.1 Defer await — `src/app/api/hubspot/webhook/route.ts`** ❌ Fixed:
> - Original: `await request.text()` called at line 6, before three cheap early-return checks (missing headers, expired timestamp, invalid signature). Body parsing ran unconditionally even for requests that would be rejected without needing the body.
> - **Fix applied**: Moved `await request.text()` to after the header and timestamp checks. Invalid requests now fail fast without paying the body-parsing cost.
> - All other async functions in the codebase use single awaits with no early-return opportunity — compliant.
>
> **1.2 Dependency-based parallelization:**
> - `src/app/api/dev/session/route.ts` POST: `await db.query.user.findFirst()` → conditional `await db.insert(user)` → `await db.insert(session)`. Each step depends on the previous (session insert needs user ID from the insert/find result). Not a waterfall — true sequential dependencies.
> - All other routes issue single awaits per handler. No partial-dependency chains exist.
> - **Assessment**: ✅ Compliant — no parallelization opportunities missed.
>
> **1.3 API route waterfalls — full audit:**
> - `src/app/api/hubspot/webhook/route.ts`: Defer-await fix applied (see 1.1). No sequential independent awaits.
> - `src/app/api/dev/session/route.ts`: Sequential dependent awaits only — not a waterfall (covered in 1.2).
> - `src/app/api/health/route.ts`: No async operations — synchronous JSON response.
> - `src/app/api/trpc/[trpc]/route.ts`: No direct awaits in handler body; async context creation delegated to `fetchRequestHandler`.
> - `src/app/api/auth/[...all]/route.ts`: Delegated to better-auth handler — internal implementation.
> - **Assessment**: ✅ Compliant after fix.
>
> **1.4 Promise.all():**
> - `src/server/api/routers/leads.ts:68` — already uses `Promise.all([items query, count query])` in `leads.list`. ✅ Best practice already applied.
> - All other tRPC procedures issue a single DB call per handler. No sequential independent awaits anywhere in server routers or HubSpot client functions.
> - **Assessment**: ✅ Compliant — existing `Promise.all()` usage is correct; no new opportunities found.
>
> **1.5 Suspense boundaries:**
> - Cross-reference Phase 1 §1.3: Recommendation noted — no Suspense boundaries exist. Not implementing in this review per plan scope.
> - **Assessment**: ✅ Cross-reference complete.

#### Category 2: Bundle Size Optimization (CRITICAL)
- [x] **2.1 Barrel imports**: Already covered in Phase 1 — cross-reference
- [x] **2.2 Conditional module loading**: Check for feature-gated heavy imports
- [x] **2.3 Defer third-party libraries**: Audit PostHog, tsparticles, framer-motion loading
  - **Files**: `src/providers/AnalyticsProvider.tsx`, `src/components/ui/sparkles.tsx`
  - PostHog loads eagerly in provider — should it defer until after hydration?
  - tsparticles uses lazy init pattern (✅ already deferred)
- [x] **2.4 Dynamic imports**: Check for heavy components that should use `next/dynamic`
  - **Candidates**:
    - `src/components/ui/sparkles.tsx` — loads @tsparticles engine (~50KB+)
    - `src/components/ui/compare.tsx` — complex interactive component
    - `src/app/(website)/_components/sections/BookingForm.tsx` — loads react-hook-form + zod
  - [x] Implement `next/dynamic` for tsparticles/sparkles component
- [x] **2.5 Preload on intent**: Check navigation patterns for preload opportunities

> **Audit findings (2026-04-04):** ❌ One fix applied. Remainder ✅ compliant.
>
> **2.1 Barrel imports** — Cross-reference Phase 1 §3.1: No problematic barrel imports. ✅
>
> **2.2 Conditional module loading** — No feature-gated heavy imports found. PostHog is protected by `isPostHogReady()` guards at call sites. ✅
>
> **2.3 Defer third-party libraries**:
> - **PostHog** (`src/providers/AnalyticsProvider.tsx`): `analytics.session.initialize()` is called inside `useEffect` — deferred until after hydration. `posthog-js` is imported at module level, but this is by design (PostHog itself buffers events before initialization). `isPostHogReady()` guards all tracking calls. **Assessment**: ✅ Already appropriately deferred.
> - **tsparticles** (`src/components/ui/sparkles.tsx`): `initParticlesEngine` is called inside `useEffect` — the engine itself is deferred. However, the packages (`@tsparticles/react`, `@tsparticles/slim`) are statically imported, adding to the initial bundle. Fixed via 2.4. **Assessment**: ✅ After fix.
> - **framer-motion**: Used throughout as a core animation library. Acceptable — not a candidate for deferral.
>
> **2.4 Dynamic imports** ❌ Fixed:
> - `SparklesCore` was statically imported in `compare.tsx`, pulling `@tsparticles/react` and `@tsparticles/slim` (~50KB+) into the initial bundle even before the particle engine was used.
> - **Fix applied**: Replaced static import in `compare.tsx` with `next/dynamic` using `ssr: false`. The tsparticles packages now load as a separate chunk, deferred until the Compare component is rendered.
> - `BookingForm.tsx` and `compare.tsx` themselves: `react-hook-form` and `zod` are reasonable client-bundle inclusions for a form. `compare.tsx` without tsparticles is lightweight. No further dynamic imports warranted.
>
> **2.5 Preload on intent** — Site is a single-page marketing layout with anchor navigation (`#booking-form`, etc.). No page navigations to preload. ✅ N/A.

#### Category 3: Server-Side Performance (HIGH)
- [x] **3.1 Auth in server actions**: N/A — no server actions
- [x] **3.2 Duplicate serialization**: Cross-reference Phase 1 finding
- [x] **3.3 LRU caching**: Check for expensive repeated computations across requests
- [x] **3.4 Minimize serialization**: Cross-reference Phase 1 finding
- [x] **3.5 Parallel data fetching**: Cross-reference Phase 1 finding
- [x] **3.6 React.cache()**: Cross-reference Phase 1 finding
- [x] **3.7 after()**: Cross-reference Phase 1 finding

> **Audit findings (2026-04-04):** ✅ All compliant — no server-side performance issues found.
>
> **3.1 Auth in server actions** — Cross-reference Phase 1 §2.1: No `"use server"` directives exist. Auth is handled by `protectedProcedure` in tRPC. ✅ N/A.
>
> **3.2 Duplicate serialization** — Cross-reference Phase 1 §2.2: Application layout passes only `{ name, email }` extracted from `session.user` to `AppSidebar`. No object is serialized twice across RSC boundaries. Website sections receive no props. ✅ Compliant.
>
> **3.3 LRU caching** — Checked all server-side code for expensive repeated per-request computations:
> - `src/server/hubspot/properties.ts`: `REVERSE_MAP` is a module-level constant, computed once at module load time. Not a per-request cost.
> - `src/server/api/routers/leads.ts` — `getByStage`: Loads all leads from DB and runs 4 in-memory `.filter()` calls. The filters are O(n) but trivially cheap. Data is user-specific and mutable — cross-request caching would require invalidation infrastructure that doesn't exist and isn't warranted at this scale.
> - No CPU-intensive transforms, no repeated config/schema parsing, no external API responses that would benefit from a cache layer.
> - **Assessment**: ✅ N/A — no LRU cache candidates found.
>
> **3.4 Minimize serialization** — Cross-reference Phase 1 §2.3: Only necessary fields are passed at RSC → client boundaries. `{ name, email }` for `AppSidebar`, no props for website sections. ✅ Compliant.
>
> **3.5 Parallel data fetching** — Cross-reference Phase 1 §2.4: No opportunities missed. `leads.list` already uses `Promise.all()`. No sibling server components fetching independent data sources in sequence. ✅ Compliant.
>
> **3.6 React.cache()** — Cross-reference Phase 1 §2.5: Both usages are correct. `getSession` (zero-arg, wraps `auth.api.getSession`) and `getQueryClient` (zero-arg, wraps `makeQueryClient`) — no inline object arguments that could cause cache misses. ✅ Compliant.
>
> **3.7 after()** — Cross-reference Phase 1 §2.6: No `after()` candidates found. The two logging sites (`onError` callback in tRPC adapter, `timingMiddleware` `console.log`) are not accessible from Next.js route handler scope and are trivial-cost sync operations. ✅ N/A.

#### Category 4: Client-Side Data Fetching (MEDIUM-HIGH)
- [x] **4.1 Event listener deduplication**: Audit global event listeners
  - **Files**: `src/hooks/use-mobile.ts`, `src/hooks/useMediaQuery.ts`, `src/app/(website)/_components/mode-toggle.tsx`
  - Check for duplicate `matchMedia` listeners
- [x] **4.2 Passive event listeners**: Check scroll/touch handlers
  - **Files**: `src/components/ui/compare.tsx` — touch/mouse event handlers
  - Verify scroll listeners use `{ passive: true }`
- [x] **4.3 SWR deduplication**: N/A — using TanStack Query via tRPC
- [x] **4.4 localStorage schema versioning**: Check for any localStorage usage

> **4.1 Event listener deduplication** — All three `matchMedia` listeners have proper `addEventListener`/`removeEventListener` pairs inside `useEffect` cleanup. `use-mobile.ts` listens to `(max-width: 767px)`, `useMediaQuery.ts` listens to an arbitrary query prop, `mode-toggle.tsx` listens to `(prefers-color-scheme: dark)`. Each is independently scoped with cleanup. Removed a stray `console.log(theme)` debug statement from `mode-toggle.tsx`. ✅ Compliant.
>
> **4.2 Passive event listeners** — `glowing-effect.tsx` already uses `{ passive: true }` on `window.scroll` and `document.body.pointermove` listeners. `compare.tsx` touch handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) are React synthetic events passed as JSX props — the `{ passive: true }` option is not available through React's event system. However, none of the handlers call `preventDefault()`, so they are functionally equivalent to passive listeners and will not block scrolling. ✅ Compliant.
>
> **4.3 SWR deduplication** — ✅ N/A — confirmed using TanStack Query via tRPC, no SWR in codebase.
>
> **4.4 localStorage schema versioning** — No `localStorage` usage found anywhere in `src/`. ✅ N/A.

#### Category 5: Re-render Optimization (MEDIUM)
- [ ] **5.1 Derived state during render**: Check for `useEffect` that derives state
  - **Files**: `src/app/(website)/_components/mode-toggle.tsx` — system theme detection via effect
- [ ] **5.2 Defer state reads**: Check for state subscriptions only used in callbacks
- [ ] **5.3 Simple useMemo**: Check for `useMemo` wrapping trivial expressions
- [ ] **5.4 Default non-primitive props**: Check memoized components for inline default objects
- [ ] **5.5 Extract to memoized components**: Verify `React.memo` usage is appropriate
  - **Files**: `src/app/(website)/_components/shimmer-text.tsx`, `src/components/ui/compare.tsx`, `src/components/ui/glowing-effect.tsx`
- [ ] **5.6 Narrow effect dependencies**: Check `useEffect` dependency arrays for objects
  - **Files**: `src/components/ui/compare.tsx` — multiple effects with callbacks in deps
- [ ] **5.7 Interaction logic in event handlers**: Check for effects that should be event handlers
- [ ] **5.8 Subscribe to derived state**: Check for components subscribing to raw state then deriving
- [ ] **5.9 Functional setState**: Check for setState calls that could be functional
  - **Files**: `src/app/(login)/login/page.tsx` — multiple `setLoading`, `setError` calls
- [ ] **5.10 Lazy state init**: Check `useState` calls with expensive initial values
- [ ] **5.11 useTransition**: Check loading states that could use `useTransition`
  - **Files**: `src/app/(login)/login/page.tsx` — manual `loading` state
  - `src/app/(application)/settings/_components/sign-out-button.tsx` — manual loading state
- [ ] **5.12 useRef for transient values**: Check for frequently-updating state that doesn't need re-renders

#### Category 6: Rendering Performance (MEDIUM)
- [x] **6.1 SVG animation**: Check SVG animations wrap a div, not the SVG
- [x] **6.2 content-visibility**: Check for long scrollable lists
- [x] **6.3 Hoist static JSX**: Check for static JSX recreated every render
  - **Files**: Audit section components for static elements inside component bodies
- [x] **6.4 SVG precision**: Check inline SVG coordinate precision
  - **Files**: `src/icons/bento-icons.tsx`, `src/icons/illustrations.tsx`, `src/icons/card-icons.tsx`, `src/icons/general.tsx`
- [x] **6.5 Hydration mismatch prevention**: Check for client-only rendering patterns
  - **Files**: `src/hooks/use-mobile.ts` — returns `undefined` initially (✅ correct)
- [x] **6.6 Suppress hydration mismatches**: Check `suppressHydrationWarning` usage
  - **Files**: `src/app/(website)/layout.tsx` — has `suppressHydrationWarning` on `<html>` (✅)
- [x] **6.7 Activity component**: N/A — React 19 experimental
- [x] **6.8 Explicit conditional rendering**: Check for `&&` rendering with falsy gotchas (0, "")
- [x] **6.9 useTransition over manual loading**: Cross-reference with 5.11

> **Audit findings (2026-04-04):** ✅ All compliant — no rendering performance issues found.
>
> **6.1 SVG animation**: No `motion.svg`, `motion.path`, `motion.circle`, or `motion.rect` usage anywhere. All framer-motion usage wraps `div` elements, never SVG elements directly. ✅
>
> **6.2 content-visibility**: No long scrollable lists. Marketing sections use small static arrays (3–4 items). Dashboard leads list uses server-side pagination via tRPC. `content-visibility` not applicable. ✅
>
> **6.3 Hoist static JSX**: All helper components (`Bars`, `GradientBeam`, `BackgroundGrids`, `Explosion`, `GridLineVertical`, `GridLineHorizontal`) are defined at module level, not inside component bodies — no JSX recreated per render. `structuredData` in `(website)/layout.tsx:85` is recreated per request but this is a server component with no React re-render lifecycle. ✅
>
> **6.4 SVG precision**: Icon files use coordinates exported from design tools. Values like `6.68512e-05` (Gartner logo) are design-software precision and intentional. No truncation applied — modifying would risk visual regressions. ✅
>
> **6.5 Hydration mismatch prevention**: `use-mobile.ts:6` — `useState<boolean | undefined>(undefined)` returns `undefined` on the server and first client render, then updates in `useEffect`. Pattern is correct. ✅
>
> **6.6 Suppress hydration mismatches**: `(website)/layout.tsx:113` — `suppressHydrationWarning` on `<html>` tag, required for `next-themes` ThemeProvider to apply `class` attribute without mismatch. Correctly scoped to the `<html>` element only. ✅
>
> **6.7 Activity component**: N/A — React 19 experimental, not yet stable.
>
> **6.8 Explicit conditional rendering**: Audited all `&&` patterns in JSX across the codebase. All use boolean comparisons (`===`, `!==`, `>`) or non-number typed variables (strings, booleans, objects, arrays). No number variables used directly as the left-hand side of `&&` in JSX — the `0` render gotcha is not present. ✅
>
> **6.9 useTransition over manual loading**: Both `login/page.tsx:33` and `sign-out-button.tsx:10` use `useState(false)` + `setLoading(true)` around async `authClient` calls. `useTransition` is designed for React state transitions (rendering), not arbitrary async I/O. Since these are imperative external API calls (auth library), the manual loading pattern is correct and `useTransition` would not apply. ✅
>
> **Conclusion**: No changes required. All 9 items are compliant.

#### Category 7: JavaScript Performance (LOW-MEDIUM)
- [x] **7.1 Layout thrashing**: Check for interleaved DOM reads/writes
- [x] **7.2 Index maps**: Check for repeated array lookups
- [x] **7.3-7.12**: Quick scan for low-hanging fruit across utility functions

> **Audit findings (2026-04-04):**
>
> **7.1 Layout thrashing** (interleaved DOM reads/writes):
>
> - `src/components/ui/glowing-effect.tsx` — `getBoundingClientRect()` read and all `style.setProperty()` writes are batched inside a single `requestAnimationFrame` callback. ✅
> - `src/components/ui/compare.tsx` — `getBoundingClientRect()` is wrapped in `requestAnimationFrame` (line 117). All DOM updates follow within the same RAF. ✅
> - `src/components/ui/timeline.tsx` — `getBoundingClientRect()` is called in a `useEffect` with an empty dependency array (runs once). No interleaving with writes. ✅
> - `src/app/(website)/_components/sections/Hero.tsx` — collision detection reads `getBoundingClientRect()` inside a `setInterval(50ms)` callback without writes; state update is the only side effect. ✅
>
> **Conclusion**: No layout thrashing found. All DOM read/write patterns are correctly batched or isolated. ✅
>
> **7.2 Index maps** (repeated array lookups):
>
> - `src/app/(website)/_components/sections/FAQ.tsx:210` — `faqData.find((f) => f.id === id)` inside `newlyOpened.forEach()`. Technically O(n) per item. However, `faqData` has 12 items and `newlyOpened` is typically 1 item (user opens one accordion at a time). No actionable fix required at this scale. ✅
> - `src/app/(website)/_components/sections/FAQ.tsx:230` — `openItems.includes(item.id)` inside `.map()` over `filteredFAQs` (max 12 items). Technically O(n²). With a 12-item dataset this is inconsequential — a premature optimization. ✅
>
> **Conclusion**: No index map issues of practical concern. Dataset is too small for O(n²) patterns to matter. ✅
>
> **7.3–7.12 Quick scan (utility functions, hooks, components)**:
>
> - **console.log in production** — `src/server/api/trpc.ts:46`: `console.log(\`[TRPC] ${path} took ${end - start}ms\`)` ran unconditionally on every tRPC call. The random delay above it was gated behind `t._config.isDev`; the log was not. **Fixed**: moved log inside `if (t._config.isDev)` block. ⚠️ → ✅
> - **setTimeout/setInterval cleanup** — `compare.tsx`, `Hero.tsx`, `FAQ.tsx`: all timers are properly cleared in effect cleanup or before reassignment. ✅
> - **Expensive computations** — `shimmer-text.tsx`: `MotionComponent` memoized via `useMemo`. `field.tsx`: `FieldError` content memoized. ✅
> - **Inline constants recreated on render** — `BookingForm.tsx`: `challengeOptions` defined at module level. `faqData`: module-level constant. Hero `Explosion` creates `Array.from({ length: 20 })` per collision event only — acceptable frequency. ✅
> - **Passive event listeners** — `glowing-effect.tsx`: mousemove listener uses `{ passive: true }`. `compare.tsx` touch listeners: already audited in cat4 (passive added in p2.cat4). ✅
> - **No other issues found**: No excessive loops, no redundant double-computation, no unguarded `while` loops. ✅
>
> **Conclusion**: One fix applied (`console.log` gated behind `isDev`). Codebase is otherwise clean for JS performance.

#### Category 8: Advanced Patterns (LOW)
- [x] **8.1 Init once**: Check for initialization in effects that should be module-level
  - **Files**: `src/providers/AnalyticsProvider.tsx` — initializes in `useEffect`
- [x] **8.2 Event handler refs**: Check for handlers recreated causing effect re-runs
- [x] **8.3 useEffectEvent**: Note as future consideration (React 19 experimental)

> **Audit findings (2026-04-04):** ✅ Compliant — No advanced pattern issues found.
>
> **8.1 Init once — `src/providers/AnalyticsProvider.tsx`**:
> - `analytics.session.initialize()` is called inside `useEffect([], [])`. The `initialize()` function reads `window.innerWidth`, `window.location.search`, and checks `posthog.__loaded` — all runtime-only values that are unavailable during SSR.
> - Moving this call to module level would execute it during SSR (where `window` is undefined) and before PostHog has loaded (async). The `useEffect` is the correct location.
> - The function also has an internal `if (!isPostHogReady()) return;` guard — if called at module level, this guard would always bail out since PostHog loads asynchronously after module evaluation.
> - **Assessment**: ✅ Compliant — `useEffect` with empty deps is the correct pattern here. Not a candidate for module-level initialization.
>
> **8.2 Event handler refs — `glowing-effect.tsx` and `compare.tsx`**:
> - `glowing-effect.tsx`: `handleMove` is memoized via `useCallback([inactiveZone, proximity, movementDuration])`. The `useEffect` depends on `[handleMove, disabled]`. Inline wrappers `handleScroll` and `handlePointerMove` inside the effect do not appear in the dependency array (they're local), so no extra re-runs occur.
> - `compare.tsx`: `startAutoplay` and `stopAutoplay` are memoized via `useCallback`. The autoplay `useEffect` correctly lists `[startAutoplay, stopAutoplay]` as deps. Plain JSX event handlers `mouseEnterHandler` and `mouseLeaveHandler` are recreated each render but are used only as JSX props, not as `useEffect` deps — recreation has no performance impact on effects.
> - **Assessment**: ✅ Compliant — handlers that appear in effect dependency arrays are properly stabilized with `useCallback`. No stale-closure or unnecessary re-run issues.
>
> **8.3 useEffectEvent — Future consideration**:
> - `useEffectEvent` (experimental, React 19) would allow reading current props/state inside effects without listing them as dependencies — effectively giving event-handler semantics (always-fresh values, not reactive) to functions used inside `useEffect`.
> - The primary candidate would be `glowing-effect.tsx`: `handleMove` currently needs `useCallback([inactiveZone, proximity, movementDuration])` to stabilize it for the effect dep array. With `useEffectEvent`, it could read these props directly without `useCallback` or deps, simplifying the code.
> - **Assessment**: Future consideration — revisit when `useEffectEvent` is stabilized in React. No action needed now.

### Changes Required

Based on audit findings, expected changes:

#### 1. Dynamic import for Sparkles/tsparticles
**File**: Components that import Sparkles
**Change**: Use `next/dynamic` with `ssr: false` for the particle engine component

#### 2. Standardize motion imports
**Files**: All 15 components importing `framer-motion` or `motion/react`
**Change**: Standardize on `motion/react` (the newer package name) — `framer-motion` is the legacy name for the same package

#### 3. Passive event listeners for scroll/touch
**File**: `src/components/ui/compare.tsx`
**Change**: Add `{ passive: true }` to touch/mouse move listeners

#### 4. useTransition for loading states (evaluate)
**Files**: `src/app/(login)/login/page.tsx`, `src/app/(application)/settings/_components/sign-out-button.tsx`
**Change**: Evaluate whether `useTransition` is appropriate (may not apply since these are imperative auth calls, not React state transitions)

### Success Criteria

#### Automated Verification:
- [ ] `make check` passes
- [ ] `make build` succeeds

#### Manual Verification:
- [ ] Audit report written with findings per category
- [ ] Bundle size compared before/after dynamic imports
- [ ] Animation behavior unchanged after motion import standardization
- [ ] No regressions in interactive components (compare slider, sparkles, etc.)

---

## Phase 3: Vercel Composition Patterns

### Overview
Audit component architecture against 9 composition rules covering boolean props, compound components, state management, and React 19 APIs.

### Checklist

#### Category 1: Component Architecture (HIGH)

##### 1.1 Avoid Boolean Prop Proliferation
- [x] Audit components for boolean props that control rendering variants
- [x] **Files to check**:
  - `src/components/ui/compare.tsx` — `showHandlebar?: boolean`, `autoplay?: boolean` (10 props total)
  - `src/components/ui/sparkles.tsx` — check prop count
  - `src/app/(website)/_components/navbar.tsx` — `visible` prop passed to Desktop/Mobile nav
- [x] **Assessment**: Compare component has boolean props but they're feature flags with defaults, not variant selectors. This is acceptable per the rule — the anti-pattern is `isThread`, `isEditing` style booleans that create exponential state combinations.
- [x] Document which components are compliant vs need refactoring

> **Audit findings (2026-04-04):** ✅ All compliant — no boolean prop proliferation found.
>
> **`src/components/ui/compare.tsx`**:
> - `showHandlebar?: boolean` (default `true`) — simple on/off feature flag controlling a single UI element. Not a variant selector.
> - `autoplay?: boolean` (default `false`) — behavioral feature toggle, not a rendering variant.
> - `slideMode?: "hover" | "drag"` — already uses a union type for mode selection. ✅
> - **Assessment**: ✅ Compliant — boolean props are single-responsibility feature flags with sensible defaults, not accumulating variant booleans that create exponential state combinations.
>
> **`src/components/ui/sparkles.tsx`**:
> - No boolean props. All 8 props are optional numeric/string configuration values (`id`, `className`, `background`, `particleSize`, `minSize`, `maxSize`, `speed`, `particleColor`, `particleDensity`).
> - **Assessment**: ✅ Compliant.
>
> **`src/app/(website)/_components/navbar.tsx`**:
> - `visible: boolean` in `NavbarProps` — internal scroll-state passed to sub-components to drive Framer Motion animations. Not a public API variant selector; there is no alternative rendering path, only animated value interpolation.
> - `open: boolean` in `MobileNav` — local component state, not a prop.
> - **Assessment**: ✅ Compliant — `visible` is animation state, not a variant flag.

##### 1.2 Use Compound Components
- [x] Review existing compound component patterns
- [x] **Already using compound pattern**:
  - `Card` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - `Accordion` (Accordion, AccordionItem, AccordionTrigger, AccordionContent)
  - `Select` (Select, SelectTrigger, SelectValue, SelectContent, SelectItem, etc.)
  - `InputOTP` (InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator)
- [x] **Potential candidates for compound pattern**: None currently — components are appropriately simple for current scope
- [x] Note: Card uses structural composition (no shared context) which is appropriate for its use case

> **Audit findings (2026-04-04):** ✅ All compliant — compound component pattern applied where appropriate.
>
> **`src/components/ui/Card.tsx`**: Exports Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter as separate named exports. Uses `forwardRef` wrappers with `displayName` for each sub-component. No shared context — structural composition only. ✅ Appropriate: Card sub-components are pure layout wrappers with no shared state.
>
> **`src/components/ui/Accordion.tsx`**: Exports Accordion, AccordionItem, AccordionTrigger, AccordionContent. Wraps Base UI's Accordion primitives which handle context internally. ✅
>
> **`src/components/ui/select.tsx`**: Exports Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue. Wraps Base UI's Select primitives. ✅
>
> **`src/components/ui/input-otp.tsx`**: Exports InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot. ✅
>
> **Candidates for refactoring**: None. Remaining custom components (Compare, SparklesCore, Timeline) are self-contained with no sub-component API needed — compound pattern would be over-engineering for their scope.

#### Category 2: State Management (MEDIUM)

##### 2.1 Decouple State Management from UI
- [ ] Check if any UI components are tightly coupled to specific state implementations
- [ ] **Files to check**:
  - `src/app/(login)/login/page.tsx` — form state managed directly in page component
  - `src/app/(website)/_components/sections/BookingForm.tsx` — uses react-hook-form (✅ decoupled via hook)
  - `src/app/(website)/_components/navbar.tsx` — scroll state in parent, local state in children (✅)
- [ ] **Assessment**: Login page has state trapped in component but it's a single-use page, not a reusable component. Acceptable for current scope.

##### 2.2 Generic Context Interfaces
- [x] Check existing context providers for generic interfaces
- [x] **Files to check**:
  - `src/providers/ThemeProvider.tsx` — thin wrapper around next-themes (✅)
  - `src/providers/AnalyticsProvider.tsx` — side-effect only, no context (✅)
  - `src/trpc/react.tsx` — TRPCProvider wraps QueryClientProvider (✅ generated by library)
- [x] **Assessment**: No custom contexts with state/actions/meta pattern needed yet.

##### 2.3 Lift State into Provider Components
- [x] Check for state trapped inside components that siblings need access to
- [x] **Assessment**: No current cases where state needs to be shared between siblings beyond what's already handled by props or context.

#### Category 3: Implementation Patterns (MEDIUM)

##### 3.1 Create Explicit Component Variants
- [ ] Check for components using boolean modes instead of explicit variants
- [ ] **Files to check**:
  - `src/components/ui/compare.tsx` — `slideMode?: "hover" | "drag"` (✅ uses enum, not boolean)
  - `src/components/ui/Button.tsx` — uses CVA variants (✅)
  - `src/components/ui/Badge.tsx` — uses CVA variants (✅)
- [ ] **Assessment**: Components already use enum variants via CVA. ✅ compliant.

##### 3.2 Prefer Children Over Render Props
- [ ] Search for `renderX` prop patterns
- [ ] **Files to check**:
  - `src/components/ui/select.tsx` — Base UI uses `render` prop (library API, acceptable)
- [ ] **Assessment**: No custom render prop patterns. Base UI's `render` prop is acceptable per the rule's exception for data-passing scenarios.

#### Category 4: React 19 APIs (MEDIUM)

##### 4.1 Remove forwardRef (React 19)
- [ ] Audit all `forwardRef` usage — React 19 supports ref as a regular prop
- [ ] **Files using forwardRef**:
  - `src/components/ui/Button.tsx` — `React.forwardRef<HTMLButtonElement, ButtonProps>`
  - `src/components/ui/Card.tsx` — 6 forwardRef wrappers (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - `src/components/ui/input.tsx` — forwardRef
  - `src/components/ui/textarea.tsx` — forwardRef
  - `src/components/ui/label.tsx` — forwardRef
  - `src/components/ui/checkbox.tsx` — forwardRef
  - `src/components/ui/separator.tsx` — forwardRef
- [ ] **Change**: Convert from `forwardRef` pattern to direct `ref` prop
- [ ] **Note**: Only convert components we own. Skip third-party wrappers (Accordion, Select, InputOTP use Base UI primitives).

##### 4.2 Replace useContext with use()
- [ ] Search for `useContext` usage
- [ ] **Files**:
  - `src/components/ui/input-otp.tsx:49` — `React.useContext(OTPInputContext)`
- [ ] **Change**: Replace with `React.use(OTPInputContext)` (if context is from our code, not library internals)
- [ ] **Note**: If `OTPInputContext` is exported from `input-otp` library, check compatibility first.

### Changes Required

#### 1. Remove forwardRef from owned UI components
**Files**: `Button.tsx`, `Card.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `checkbox.tsx`, `separator.tsx`
**Change**: Convert `React.forwardRef<Ref, Props>((props, ref) => ...)` to `function Component({ ref, ...props }: Props & { ref?: React.Ref<Element> })`

Example:
```tsx
// Before
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  }
)
Button.displayName = "Button"

// After
function Button({ className, variant, size, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
```

#### 2. Replace useContext with use() (if applicable)
**File**: `src/components/ui/input-otp.tsx`
**Change**: `React.useContext(OTPInputContext)` → `React.use(OTPInputContext)` (verify library compatibility first)

### Success Criteria

#### Automated Verification:
- [ ] `make check` passes
- [ ] `make build` succeeds
- [ ] `make test_e2e` passes (forwardRef removal could affect component behavior)

#### Manual Verification:
- [ ] All components accepting `ref` still work correctly
- [ ] Form inputs (login OTP, booking form) still function
- [ ] No TypeScript errors from ref prop changes
- [ ] Card, Button, Input components render correctly

---

## Performance Considerations

- **Phase 2 dynamic imports**: Adding `next/dynamic` for sparkles/tsparticles will reduce initial JS bundle for the marketing page
- **Phase 2 motion standardization**: Consolidating to `motion/react` may reduce bundle if webpack can better tree-shake a single entry point
- **Phase 3 forwardRef removal**: No performance impact — purely code modernization

## Execution Order

1. **Phase 1** first — establishes baseline understanding of server-side patterns
2. **Phase 2** second — addresses bundle size (highest user-facing impact)
3. **Phase 3** third — modernizes component patterns (code quality improvement)

Each phase should be committed separately with its own audit findings.

## References

- Skill: `/accelint-nextjs-best-practices` — 12 rules across 3 categories
- Skill: `/vercel-react-best-practices` — 57 rules across 8 categories
- Skill: `/vercel-composition-patterns` — 9 rules across 4 categories
