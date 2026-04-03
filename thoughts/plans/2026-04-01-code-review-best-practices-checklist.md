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

#### 1.2 Parallelize Independent Operations
- [x] Search for multiple sequential `await` calls that could use `Promise.all()`
- [x] Check tRPC context creation (`src/server/api/trpc.ts`) for parallel opportunities
- [x] **Expected finding**: Minimal async operations currently. Note as ✅ compliant.

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
- [ ] Check server components passing data to client components for duplicated objects
- [ ] **Files to check**:
  - `src/app/(application)/layout.tsx` — passes `user` to `AppSidebar`
  - `src/app/(website)/page.tsx` — renders 8 section components
- [ ] **Expected finding**: Minimal RSC → client data transfer currently. Note observations.

#### 2.3 Minimize Serialization at RSC Boundaries
- [ ] Check what props server components pass to client components
- [ ] Verify only necessary fields are passed (not entire objects)
- [ ] **Files to check**: Same as 2.2 above

#### 2.4 Parallel Data Fetching with Component Composition
- [ ] Check if sibling server components could fetch data in parallel
- [ ] **Expected finding**: Most pages are stubs with no data fetching. Note as future consideration.

#### 2.5 Per-Request Deduplication with React.cache()
- [ ] Verify `React.cache()` usage is correct
- [ ] Check for inline object arguments that break caching
- [ ] **Files to check**:
  - `src/lib/session.ts:5` — `cache(async () => auth.api.getSession(...))`
  - `src/trpc/server.tsx:15` — `cache(makeQueryClient)`
- [ ] **Expected finding**: ✅ Both usages are correct.

#### 2.6 Use after() for Non-Blocking Operations
- [ ] Identify logging, analytics, or side effects in API routes that could use `after()`
- [ ] **Files to check**:
  - `src/app/api/trpc/[trpc]/route.ts` — `onError` handler logs in dev
  - `src/server/api/trpc.ts` — `timingMiddleware` logs execution time
- [ ] **Expected finding**: `console.log` in timing middleware could use `after()`. Low priority.

#### 3.1 Avoid Barrel File Imports
- [ ] Audit all barrel files and their consumers
- [ ] **Barrel files found**:
  - `src/server/db/schema/index.ts` — re-exports 8 schema modules (server-only, acceptable)
  - `src/hooks/index.ts` — re-exports `useMediaQuery` (single export, acceptable)
  - `src/types/index.ts` — type-only exports (tree-shaken, acceptable)
  - `src/app/(website)/_components/stats/index.ts` — re-exports stats components
- [ ] Check if any barrel files are imported in client bundles unnecessarily
- [ ] **Expected finding**: Barrel files are minimal and mostly server-side. Low risk.

#### 3.2 Server vs. Client Component Decision
- [ ] Review all `"use client"` components — are any unnecessarily client-side?
- [ ] **Key files to audit**:
  - `src/components/ui/Badge.tsx` — pure presentational, no hooks/events → could be server component
  - `src/components/ui/Card.tsx` — pure presentational, no hooks/events → could be server component
  - `src/components/ui/separator.tsx` — pure presentational → could be server component
  - `src/components/ui/label.tsx` — check if it needs client features
- [ ] **Expected finding**: Several UI components are marked `"use client"` but use no client features. Removing the directive would reduce client bundle.

### Changes Required

Based on audit findings, apply fixes for any issues found. Expected changes:

#### 1. Remove unnecessary `"use client"` from pure presentational components
**Files**: `src/components/ui/Badge.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/separator.tsx`
**Change**: Remove `"use client"` directive if the component uses no hooks, event handlers, or browser APIs.

> **Important**: Only remove if no consumer passes event handler props (onClick, etc.) that require client hydration. Verify each by checking all import sites.

### Success Criteria

#### Automated Verification:
- [ ] `make check` passes (lint + typecheck)
- [ ] `make build` succeeds

#### Manual Verification:
- [ ] Audit report written with findings per rule
- [ ] Each finding categorized as: ✅ Compliant, ⚠️ Recommendation, ❌ Issue
- [ ] No regressions in page functionality

---

## Phase 2: Vercel React Best Practices

### Overview
Audit the codebase against 57 React performance rules across 8 categories, from critical (waterfalls, bundle size) to low (advanced patterns).

### Checklist

#### Category 1: Eliminating Waterfalls (CRITICAL)
- [ ] **1.1 Defer await**: Check async functions for early-return optimization opportunities
- [ ] **1.2 Dependency-based parallelization**: Check for partial-dependency async chains
- [ ] **1.3 API route waterfalls**: Audit `src/app/api/` route handlers
- [ ] **1.4 Promise.all()**: Search for sequential independent awaits
- [ ] **1.5 Suspense boundaries**: Already covered in Phase 1 — cross-reference

#### Category 2: Bundle Size Optimization (CRITICAL)
- [ ] **2.1 Barrel imports**: Already covered in Phase 1 — cross-reference
- [ ] **2.2 Conditional module loading**: Check for feature-gated heavy imports
- [ ] **2.3 Defer third-party libraries**: Audit PostHog, tsparticles, framer-motion loading
  - **Files**: `src/providers/AnalyticsProvider.tsx`, `src/components/ui/sparkles.tsx`
  - PostHog loads eagerly in provider — should it defer until after hydration?
  - tsparticles uses lazy init pattern (✅ already deferred)
- [ ] **2.4 Dynamic imports**: Check for heavy components that should use `next/dynamic`
  - **Candidates**:
    - `src/components/ui/sparkles.tsx` — loads @tsparticles engine (~50KB+)
    - `src/components/ui/compare.tsx` — complex interactive component
    - `src/app/(website)/_components/sections/BookingForm.tsx` — loads react-hook-form + zod
  - [ ] Implement `next/dynamic` for tsparticles/sparkles component
- [ ] **2.5 Preload on intent**: Check navigation patterns for preload opportunities

#### Category 3: Server-Side Performance (HIGH)
- [ ] **3.1 Auth in server actions**: N/A — no server actions
- [ ] **3.2 Duplicate serialization**: Cross-reference Phase 1 finding
- [ ] **3.3 LRU caching**: Check for expensive repeated computations across requests
- [ ] **3.4 Minimize serialization**: Cross-reference Phase 1 finding
- [ ] **3.5 Parallel data fetching**: Cross-reference Phase 1 finding
- [ ] **3.6 React.cache()**: Cross-reference Phase 1 finding
- [ ] **3.7 after()**: Cross-reference Phase 1 finding

#### Category 4: Client-Side Data Fetching (MEDIUM-HIGH)
- [ ] **4.1 Event listener deduplication**: Audit global event listeners
  - **Files**: `src/hooks/use-mobile.ts`, `src/hooks/useMediaQuery.ts`, `src/app/(website)/_components/mode-toggle.tsx`
  - Check for duplicate `matchMedia` listeners
- [ ] **4.2 Passive event listeners**: Check scroll/touch handlers
  - **Files**: `src/components/ui/compare.tsx` — touch/mouse event handlers
  - Verify scroll listeners use `{ passive: true }`
- [ ] **4.3 SWR deduplication**: N/A — using TanStack Query via tRPC
- [ ] **4.4 localStorage schema versioning**: Check for any localStorage usage

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
- [ ] **6.1 SVG animation**: Check SVG animations wrap a div, not the SVG
- [ ] **6.2 content-visibility**: Check for long scrollable lists
- [ ] **6.3 Hoist static JSX**: Check for static JSX recreated every render
  - **Files**: Audit section components for static elements inside component bodies
- [ ] **6.4 SVG precision**: Check inline SVG coordinate precision
  - **Files**: `src/icons/bento-icons.tsx`, `src/icons/illustrations.tsx`, `src/icons/card-icons.tsx`, `src/icons/general.tsx`
- [ ] **6.5 Hydration mismatch prevention**: Check for client-only rendering patterns
  - **Files**: `src/hooks/use-mobile.ts` — returns `undefined` initially (✅ correct)
- [ ] **6.6 Suppress hydration mismatches**: Check `suppressHydrationWarning` usage
  - **Files**: `src/app/(website)/layout.tsx` — has `suppressHydrationWarning` on `<html>` (✅)
- [ ] **6.7 Activity component**: N/A — React 19 experimental
- [ ] **6.8 Explicit conditional rendering**: Check for `&&` rendering with falsy gotchas (0, "")
- [ ] **6.9 useTransition over manual loading**: Cross-reference with 5.11

#### Category 7: JavaScript Performance (LOW-MEDIUM)
- [ ] **7.1 Layout thrashing**: Check for interleaved DOM reads/writes
- [ ] **7.2 Index maps**: Check for repeated array lookups
- [ ] **7.3-7.12**: Quick scan for low-hanging fruit across utility functions

#### Category 8: Advanced Patterns (LOW)
- [ ] **8.1 Init once**: Check for initialization in effects that should be module-level
  - **Files**: `src/providers/AnalyticsProvider.tsx` — initializes in `useEffect`
- [ ] **8.2 Event handler refs**: Check for handlers recreated causing effect re-runs
- [ ] **8.3 useEffectEvent**: Note as future consideration (React 19 experimental)

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
- [ ] Audit components for boolean props that control rendering variants
- [ ] **Files to check**:
  - `src/components/ui/compare.tsx` — `showHandlebar?: boolean`, `autoplay?: boolean` (10 props total)
  - `src/components/ui/sparkles.tsx` — check prop count
  - `src/app/(website)/_components/navbar.tsx` — `visible` prop passed to Desktop/Mobile nav
- [ ] **Assessment**: Compare component has boolean props but they're feature flags with defaults, not variant selectors. This is acceptable per the rule — the anti-pattern is `isThread`, `isEditing` style booleans that create exponential state combinations.
- [ ] Document which components are compliant vs need refactoring

##### 1.2 Use Compound Components
- [ ] Review existing compound component patterns
- [ ] **Already using compound pattern**:
  - `Card` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - `Accordion` (Accordion, AccordionItem, AccordionTrigger, AccordionContent)
  - `Select` (Select, SelectTrigger, SelectValue, SelectContent, SelectItem, etc.)
  - `InputOTP` (InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator)
- [ ] **Potential candidates for compound pattern**: None currently — components are appropriately simple for current scope
- [ ] Note: Card uses structural composition (no shared context) which is appropriate for its use case

#### Category 2: State Management (MEDIUM)

##### 2.1 Decouple State Management from UI
- [ ] Check if any UI components are tightly coupled to specific state implementations
- [ ] **Files to check**:
  - `src/app/(login)/login/page.tsx` — form state managed directly in page component
  - `src/app/(website)/_components/sections/BookingForm.tsx` — uses react-hook-form (✅ decoupled via hook)
  - `src/app/(website)/_components/navbar.tsx` — scroll state in parent, local state in children (✅)
- [ ] **Assessment**: Login page has state trapped in component but it's a single-use page, not a reusable component. Acceptable for current scope.

##### 2.2 Generic Context Interfaces
- [ ] Check existing context providers for generic interfaces
- [ ] **Files to check**:
  - `src/providers/ThemeProvider.tsx` — thin wrapper around next-themes (✅)
  - `src/providers/AnalyticsProvider.tsx` — side-effect only, no context (✅)
  - `src/trpc/react.tsx` — TRPCProvider wraps QueryClientProvider (✅ generated by library)
- [ ] **Assessment**: No custom contexts with state/actions/meta pattern needed yet.

##### 2.3 Lift State into Provider Components
- [ ] Check for state trapped inside components that siblings need access to
- [ ] **Assessment**: No current cases where state needs to be shared between siblings beyond what's already handled by props or context.

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
