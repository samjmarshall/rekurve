# Pipeline Board — Design Review Fixes Implementation Plan

## Overview

Address the twelve issues raised in the design review of the Pipeline Board view (#100). Two are blocking, two are high-priority pre-merge, and eight are polish. All twelve are scoped tightly to the pipeline feature plus one shared `Badge` variant fix that is only consumed by the pipeline today.

## Current State Analysis

The Pipeline Board landed in feat/100-pipeline-board-view and works end-to-end (auth, prefetch, filters, URL state, mobile snap-scroll). The design review surfaced two functional regressions and ten cosmetic / accessibility nits:

1. **Hot column hidden at common desktop viewports** — at 1280px the fourth column is entirely off-screen with no scroll affordance (`pipeline-board.tsx:85`, `stage-column.tsx:15`).
2. **Global "No leads yet" empty state fires under active filter** — when a filter narrows results to zero, the user sees an "Add your first lead" CTA instead of a "no matches" message (`pipeline-board.tsx:55-95`).
3. **`brand` Badge variant has `bg-none`** — not a valid Tailwind utility, so Nurture badges render as plain orange numerals in light mode while Warm/Hot have full pill fills (`Badge.tsx:14`). Variant is only consumed by `stage-meta.ts`, so the fix is contained.
4. **Tablet (768px) collapses snap-scroll prematurely** — `md:snap-none` removes the horizontal-scroll affordance at 768px, but four 320px columns still need 1360px (`pipeline-board.tsx:85`).
5. **No temperature cue on column headers themselves** — all four `<header>` elements look identical; only the badges signal stage urgency (`stage-column.tsx`, `stage-meta.ts`).
6. **Card hover state nearly imperceptible in light mode** — `hover:bg-secondary/50` produces ~2% luminance change (`lead-card.tsx:17`).
7. **Timeline `<SelectTrigger>` lacks `aria-label`** — accessible name comes from current value text, not field label (`pipeline-filters.tsx:148`).
8. **Null score renders as "0" badge** beside a "Score pending" gap line — confusing dual signal (`lead-card.tsx:27`).
9. **`__any__` sentinel in timeline select is brittle** — would collide if a backend timeline value ever started with `__` (`pipeline-filters.tsx:22-27`).
10. **Filter bar wraps to three rows on tablet/mobile** — noisy, poor visual grouping (`pipeline-filters.tsx:115-200`).
11. **Column count badge uses `font-mono`** instead of `tabular-nums` — semantically misleading on a non-tabular pill (`stage-column.tsx:21`).
12. **Page H1 is `text-lg` (18px)** — same as a column H2; insufficient hierarchy (`pipeline-board.tsx:43`).

### Key Discoveries

- **`brand` Badge variant has only one consumer.** `grep -r 'variant="brand"' src/` returns only `src/app/(application)/pipeline/_lib/stage-meta.ts:18`. Fixing `bg-none` is safe — no other surface depends on the broken variant.
- **`tabular-nums` utility already exists** at `src/styles/globals.css:157`. Just swap the class name on the count badge.
- **Accent CSS tokens are exposed as Tailwind utilities.** `--color-accent-amber` and `--color-accent-coral` live inside `@theme`, so `border-l-accent-amber`, `border-l-accent-coral`, `border-l-primary`, and `border-l-muted-foreground` all work without further config. The existing Badge variants prove this (`bg-accent-amber/10`, `bg-accent-coral/10`).
- **No component-level tests exist for the board yet.** The unit-test surface for the pipeline feature is `_lib/__tests__/*.test.ts` — pure utilities only. The empty-state branching logic in fix #2 should be extracted into a tiny helper so it can be unit-tested in that style, rather than introducing React Testing Library for one assertion.
- **`pb-16` on `<main>` already accounts for the mobile bottom-nav** (`layout.tsx:70`), so the scroll-shadow fix doesn't need to think about overlap.
- **The `min-w-0` fix on `<main>` from the original PR is correct** — it's the idiomatic Tailwind/flex pattern, not a band-aid. No rework needed there.

## Desired End State

After this plan ships:

1. The Hot column is reachable at every desktop viewport ≥1024px without the user having to hunt for a horizontal scrollbar — a soft right-edge gradient cues that more content exists.
2. Snap-scroll affordance persists through the tablet breakpoint (`lg:snap-none`).
3. Filters that narrow results to zero render the board with per-column "No {stage} leads" messages — never the "Add your first lead" CTA.
4. The global "No leads yet" CTA only appears when the database is genuinely empty AND no filters are active.
5. Nurture badges in light mode have a visible orange-tinted pill background, matching Warm and Hot.
6. Each column header shows a 2px coloured left-border accent matching its temperature (gray → orange → amber → coral).
7. Card hover state is clearly perceptible (border-color change + subtle shadow).
8. Timeline select announces "Construction timeline" as its accessible name.
9. Null score renders as `—` rather than `0`; "Score pending" gap line is the canonical "not yet scored" indicator.
10. Filter bar groups its controls into a tidier two-row max layout at tablet, with stage checkboxes wrapping as a labelled cluster.
11. Column count uses `tabular-nums` instead of `font-mono`.
12. Page H1 reads as `text-xl` (20px), comfortably above the column H2.

### Verification

- `make check` passes.
- `make test` passes — including a new unit test for the extracted empty-state helper.
- Manual: `/design_review` re-run shows the four blocker/high issues resolved and no regressions.
- Manual: visit `/pipeline?estate=sovereign` (or any non-matching estate) — see per-column empty messages, NOT the "Add your first lead" CTA.
- Manual: at 1280×800, scroll the board horizontally — Hot column reachable, scroll-shadow visible at the right edge until scrolled to the end.
- Manual: at 768×1024, swipe horizontally — snap-scroll is fluid.
- Manual: tab through filter controls with the keyboard — focus order logical, all controls reachable, screen reader announces "Construction timeline, combobox" on the timeline select.

## What We're NOT Doing

- **App-wide colour-contrast remediation** for amber/coral badges. The review flagged borderline 3.0–3.2:1 contrast on small bold text, but the fix would touch every badge consumer in the app. Out of scope here — separate WCAG audit PR.
- **Fluid column widths** as the column-overflow fix. The design review offered fluid columns OR a scroll shadow; the user chose the scroll shadow. Columns stay fixed at `w-80`.
- **Replacing the `__any__` sentinel with a structurally different control.** A documenting comment plus a TypeScript-level guard is sufficient — no Combobox refactor.
- **Filter-bar disclosure / sheet** on mobile. We're improving the existing wrap layout, not introducing a collapsible filter drawer.
- **New component-level testing infrastructure** (React Testing Library, jest-dom). The one testable behaviour change (#2) gets a pure-function unit test.
- **Lead profile page** (`/leads/[id]`) — still issue #101.
- **Touching the existing `dashboard-shell.spec.ts` empty-state assertion.** It already accepts both `pipeline-empty` and `pipeline-board`, so it stays green after the empty-state fix.

## Implementation Approach

Two phases. Phase 1 fixes the four pre-merge issues that change behaviour or visibility. Phase 2 is the polish bundle. Both phases ship together as one PR — the split exists to give clean commit boundaries and clear verification gates.

---

## Phase 1: Pre-merge Fixes

### Overview

Resolve the two blockers and two high-priority issues from the design review.

### Changes Required:

#### 1. Right-edge scroll shadow on the board container
**File**: `src/app/(application)/pipeline/_components/pipeline-board.tsx`
**Changes**: Wrap the board scroller in a positioned container that overlays a CSS gradient on the right edge. The gradient is purely decorative (`pointer-events-none aria-hidden`) and fades in/out based on scroll position via a small `useScrollEdge` hook (or simpler: always-on gradient that's masked when content fits, using a CSS-only approach with `mask-image`).

Simplest concrete approach — a static gradient that's only visible when the inner scroller actually overflows. We use a sibling absolutely-positioned `<div>` and toggle its visibility based on a `useEffect` measuring `scrollWidth > clientWidth`.

```tsx
// At the top of pipeline-board.tsx
import { useEffect, useMemo, useRef, useState } from "react";

// Inside PipelineBoard, after the existing useMemo blocks:
const scrollerRef = useRef<HTMLDivElement>(null);
const [showRightEdge, setShowRightEdge] = useState(false);
const [showLeftEdge, setShowLeftEdge] = useState(false);

useEffect(() => {
  const el = scrollerRef.current;
  if (!el) return;
  const update = () => {
    setShowLeftEdge(el.scrollLeft > 4);
    setShowRightEdge(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  update();
  el.addEventListener("scroll", update, { passive: true });
  const ro = new ResizeObserver(update);
  ro.observe(el);
  return () => {
    el.removeEventListener("scroll", update);
    ro.disconnect();
  };
}, [data]);
```

Then replace the existing board `<div>` with a positioned wrapper:

```tsx
<div className="relative flex min-w-0 flex-1">
  <div
    ref={scrollerRef}
    data-testid="pipeline-board"
    className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-4 lg:snap-none"
  >
    {STAGE_ORDER.filter((s) => visibleStages.has(s)).map((stage) => (
      <StageColumn key={stage} stage={stage} leads={data?.[stage] ?? []} />
    ))}
  </div>
  {showLeftEdge && (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
    />
  )}
  {showRightEdge && (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
    />
  )}
</div>
```

Note: also fixes issue #4 in this same change by swapping `md:snap-none` → `lg:snap-none` (snap-scroll persists through the tablet breakpoint).

#### 2. Per-column empty state under active filter
**File**: `src/app/(application)/pipeline/_lib/empty-state.ts` (new)
**Changes**: Extract the "should we show the global empty state" decision into a pure function so it can be unit-tested without component-level test infrastructure.

```typescript
import type { PipelineFilters } from "~/server/api/schemas/leads";
import { type LeadStage, STAGE_ORDER } from "./stage-meta";

interface EmptyStateInput {
  totalLeads: number;
  filters: PipelineFilters;
  visibleStages: Set<LeadStage>;
  /** True once the tRPC query has resolved at least once. */
  dataLoaded: boolean;
}

/**
 * The global "No leads yet / Add your first lead" CTA is the marketing-style
 * empty state for a brand-new account. It must NOT fire when filters are
 * active, even if the filters narrow the result to zero — that case should
 * fall through to the per-column "No {stage} leads" messages so the user
 * understands the filter is responsible for the emptiness.
 */
export function shouldShowGlobalEmpty(input: EmptyStateInput): boolean {
  if (!input.dataLoaded) return false;
  if (input.totalLeads > 0) return false;
  // Any backend filter active?
  if (input.filters !== null && input.filters !== undefined) {
    const f = input.filters;
    if (
      f.constructionTimeline ||
      f.preferredEstate ||
      f.fhogEligible
    ) {
      return false;
    }
  }
  // Any stage hidden?
  if (input.visibleStages.size < STAGE_ORDER.length) return false;
  return true;
}
```

**File**: `src/app/(application)/pipeline/_components/pipeline-board.tsx`
**Changes**: Use the helper to drive the conditional render. Pass `dataLoaded` derived from React Query's `data !== undefined`.

```tsx
import { shouldShowGlobalEmpty } from "../_lib/empty-state";

// ...inside the component:
const { data } = useQuery(trpc.leads.getByStage.queryOptions(filters));
const totalLeads = data
  ? data.unqualified.length + data.nurture.length + data.warm.length + data.hot.length
  : 0;
const showGlobalEmpty = shouldShowGlobalEmpty({
  totalLeads,
  filters,
  visibleStages,
  dataLoaded: data !== undefined,
});

// In JSX:
{showGlobalEmpty ? (
  <div data-testid="pipeline-empty" ...>
    {/* existing CTA */}
  </div>
) : (
  <div className="relative flex min-w-0 flex-1">
    {/* board scroller from fix #1 — per-column "No {stage} leads"
        messages already fire from StageColumn when leads.length === 0 */}
  </div>
)}
```

#### 3. Tests for empty-state helper
**File**: `src/app/(application)/pipeline/_lib/__tests__/empty-state.test.ts` (new)
**Tests**: Verify each branch of `shouldShowGlobalEmpty` matches the desired contract.

```typescript
import { describe, expect, test } from "@rstest/core";
import { shouldShowGlobalEmpty } from "../empty-state";
import { STAGE_ORDER } from "../stage-meta";

const allStages = new Set(STAGE_ORDER);

describe("shouldShowGlobalEmpty", () => {
  test("returns false before data has loaded", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: null,
        visibleStages: allStages,
        dataLoaded: false,
      }),
    ).toBe(false);
  });

  test("returns true when data loaded, no leads, no filters, all stages visible", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: null,
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(true);
  });

  test("returns false when leads exist", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 3,
        filters: null,
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when an estate filter is active", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: "Sovereign",
          constructionTimeline: null,
          fhogEligible: null,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when fhogEligible filter is active", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: null,
          constructionTimeline: null,
          fhogEligible: true,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when timeline filter is active", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: null,
          constructionTimeline: "ready_now",
          fhogEligible: null,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when at least one stage is hidden", () => {
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: null,
        visibleStages: new Set(["unqualified", "nurture", "warm"]),
        dataLoaded: true,
      }),
    ).toBe(false);
  });

  test("returns false when filters object exists but all properties are null", () => {
    // safety check — empty filter object shouldn't suppress the global empty
    expect(
      shouldShowGlobalEmpty({
        totalLeads: 0,
        filters: {
          preferredEstate: null,
          constructionTimeline: null,
          fhogEligible: null,
        },
        visibleStages: allStages,
        dataLoaded: true,
      }),
    ).toBe(true);
  });
});
```

#### 4. Brand badge `bg-none` typo
**File**: `src/components/ui/Badge.tsx`
**Changes**: Replace the broken light-mode background with `bg-primary/10 hover:bg-primary/20` so the `brand` variant matches the structure of `amber`/`coral`/`success`.

```typescript
// Before (line 13-14):
brand:
  "border-transparent bg-none text-primary dark:bg-primary/10 dark:hover:bg-primary/20",

// After:
brand:
  "border-transparent bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/10 dark:hover:bg-primary/20",
```

No new tests — this is a CSS fix that only affects visual appearance. The `brand` variant is only consumed by `stage-meta.ts:18`, so blast radius is contained to the pipeline.

### Success Criteria:

#### Automated Verification:
- [ ] `make check` passes (Biome + tsc)
- [ ] `make test` passes — new `empty-state.test.ts` suite green (8 cases)
- [ ] No regressions in existing `_lib/__tests__/*.test.ts` suites or the leads-router tests

#### Manual Verification:
- [ ] At 1280×800, the right-edge scroll shadow is visible until scrolled to the end of the board; Hot column is reachable
- [ ] At 1440×900 and 1920×1080, the right-edge shadow is hidden if all four columns fit
- [ ] At 768×1024, swiping horizontally triggers snap-scroll between columns
- [ ] Visit `/pipeline?estate=sovereign` (no matching leads) — see per-column "No {stage} leads" messages, NOT the "Add your first lead" CTA
- [ ] Visit `/pipeline` on a fresh user with zero leads — see the "No leads yet / Add your first lead" CTA
- [ ] Nurture badges in light mode have a visible orange-tinted background pill (matches Warm/Hot structure)
- [ ] Dark mode unchanged for the `brand` badge

---

## Phase 2: Polish

### Overview

Address the eight medium/low items from the review. All are visual or accessibility tweaks; no behaviour changes; no new tests required.

### Changes Required:

#### 1. Per-stage column header accent
**File**: `src/app/(application)/pipeline/_lib/stage-meta.ts`
**Changes**: Add an `accentBorderClass` field to `STAGE_META` keyed to the stage's temperature colour. Use existing CSS tokens (`primary`, `accent-amber`, `accent-coral`, `muted-foreground`).

```typescript
import type { BadgeProps } from "~/components/ui/Badge";

export type LeadStage = "unqualified" | "nurture" | "warm" | "hot";

export const STAGE_ORDER: readonly LeadStage[] = [
  "unqualified",
  "nurture",
  "warm",
  "hot",
] as const;

export const STAGE_META: Record<
  LeadStage,
  {
    label: string;
    badgeVariant: BadgeProps["variant"];
    /** Tailwind class for the column header's left-border accent. */
    accentBorderClass: string;
  }
> = {
  unqualified: {
    label: "Unqualified",
    badgeVariant: "outline",
    accentBorderClass: "border-l-muted-foreground/40",
  },
  nurture: {
    label: "Nurture",
    badgeVariant: "brand",
    accentBorderClass: "border-l-primary",
  },
  warm: {
    label: "Warm",
    badgeVariant: "amber",
    accentBorderClass: "border-l-accent-amber",
  },
  hot: {
    label: "Hot",
    badgeVariant: "coral",
    accentBorderClass: "border-l-accent-coral",
  },
};
```

**File**: `src/app/(application)/pipeline/_components/stage-column.tsx`
**Changes**: Apply the accent class as a 2px left border on the column root, and swap `font-mono` → `tabular-nums` on the count badge in the same edit (item #11 from review).

```tsx
import { type LeadStage, STAGE_META } from "../_lib/stage-meta";
import { LeadCard, type LeadCardData } from "./lead-card";

interface StageColumnProps {
  stage: LeadStage;
  leads: LeadCardData[];
}

export function StageColumn({ stage, leads }: StageColumnProps) {
  const meta = STAGE_META[stage];
  return (
    <section
      data-testid={`pipeline-column-${stage}`}
      aria-label={`${meta.label} leads`}
      className={`flex w-[calc(100vw-2rem)] shrink-0 snap-center flex-col rounded-lg border border-l-2 bg-card md:w-80 ${meta.accentBorderClass}`}
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-base">{meta.label}</h2>
        <span
          data-testid={`pipeline-column-count-${stage}`}
          className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground text-xs tabular-nums"
        >
          {leads.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {leads.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            No {meta.label.toLowerCase()} leads
          </p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </section>
  );
}
```

#### 2. Card hover affordance + null score handling
**File**: `src/app/(application)/pipeline/_components/lead-card.tsx`
**Changes**: Add `hover:border-primary/40 hover:shadow-sm` for a clearly perceptible hover, and render null scores as `—` instead of `0`.

```tsx
import Link from "next/link";
import { Badge } from "~/components/ui/Badge";
import type { RouterOutputs } from "~/trpc/react";
import { formatLastContact } from "../_lib/format-last-contact";
import { STAGE_META } from "../_lib/stage-meta";
import { extractTopGap } from "../_lib/top-gap";

export type LeadCardData =
  RouterOutputs["leads"]["getByStage"]["unqualified"][number];

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const meta = STAGE_META[lead.leadStage];
  return (
    <Link
      href={`/leads/${lead.id}`}
      data-testid={`lead-card-${lead.id}`}
      className="block rounded-md border bg-background p-3 transition-all hover:border-primary/40 hover:bg-secondary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 truncate font-medium text-sm">
          {lead.firstName} {lead.lastName}
        </p>
        <Badge
          variant={meta.badgeVariant}
          data-testid={`lead-card-score-${lead.id}`}
        >
          {lead.leadScore ?? "—"}
        </Badge>
      </div>
      <p className="mt-1 text-muted-foreground text-xs">
        {formatLastContact(lead.lastContactedAt)}
      </p>
      <p
        className="mt-1 line-clamp-1 text-muted-foreground text-xs"
        data-testid={`lead-card-gap-${lead.id}`}
      >
        {extractTopGap(lead.scoreMetadata)}
      </p>
    </Link>
  );
}
```

> Note: the existing E2E test `quick-capture lead appears in the Unqualified column with score 0` (`leads-crud.spec.ts:246`) asserts the score badge text is exactly `"0"`. **This still passes** because quick-capture leads land with `leadScore: 0` (not `null`) per `leads.create` at `leads.ts:101`. The `??` only kicks in for genuinely null scores, which only happens during the brief window before `scoreLeadAsync` writes back. No test changes needed.

#### 3. Timeline select aria-label
**File**: `src/app/(application)/pipeline/_components/pipeline-filters.tsx`
**Changes**: Add `aria-label="Construction timeline"` to the `SelectTrigger` so the combobox has a stable accessible name independent of its current value.

```tsx
<SelectTrigger
  className="h-9 min-w-[10rem]"
  data-testid="filter-timeline"
  aria-label="Construction timeline"
>
```

#### 4. `__any__` sentinel safer pattern
**File**: `src/app/(application)/pipeline/_components/pipeline-filters.tsx`
**Changes**: Promote the sentinel to a named const, document it, and add a compile-time guard so a future enum value beginning with `__` would fail typecheck. The runtime behaviour stays the same — this is purely a safety belt.

```tsx
import type { z } from "zod";
import type { constructionTimelineSchema } from "~/server/api/schemas/leads";

/**
 * Sentinel value for "no timeline filter applied" inside the Radix Select.
 * Radix Select does not allow `null`/`undefined` as item values, so we need
 * a string that cannot collide with any real `constructionTimeline` enum
 * value. The compile-time guard below fails typecheck if a future enum value
 * ever starts with `__`, forcing us to pick a new sentinel.
 */
const ANY_TIMELINE = "__any__" as const;

type RealTimeline = z.infer<typeof constructionTimelineSchema>;
// If this errors, ANY_TIMELINE collides with a real enum value — rename it.
type _SentinelGuard = RealTimeline extends `__${string}` ? never : true;
const _sentinelOk: _SentinelGuard = true;
void _sentinelOk;

const TIMELINE_OPTIONS = [
  { value: ANY_TIMELINE, label: "Any timeline" },
  { value: "ready_now", label: "Ready now" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "12_months_plus", label: "12 months+" },
] as const;

type TimelineValue = (typeof TIMELINE_OPTIONS)[number]["value"];
```

Then update the `currentTimeline` and `resolvedTimeline` lookups to compare against `ANY_TIMELINE` instead of the literal `"__any__"`.

#### 5. Filter bar layout improvement
**File**: `src/app/(application)/pipeline/_components/pipeline-filters.tsx`
**Changes**: Group the four stage checkboxes into a single labelled cluster that wraps as a unit, and add a small visual separator (`border-l` divider) between filter groups. This keeps the bar to two rows max at tablet without introducing a disclosure.

```tsx
<div
  data-testid="pipeline-filters"
  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3"
>
  {/* Group 1: text + boolean filters */}
  <div className="flex flex-1 flex-wrap items-center gap-3">
    <Input ... />
    <label className="...">FHOG eligible</label>
    <Select>...</Select>
  </div>

  {/* Divider visible only on md+ */}
  <div aria-hidden className="hidden h-6 w-px bg-border md:block" />

  {/* Group 2: stage visibility */}
  <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
    <legend className="sr-only">Visible stages</legend>
    {STAGE_ORDER.map((stage) => (
      <label
        key={stage}
        className="flex items-center gap-1.5 text-sm"
        data-testid={`filter-stage-${stage}`}
      >
        <Checkbox ... />
        {STAGE_META[stage].label}
      </label>
    ))}
  </fieldset>

  {hasActiveFilter && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={clearAll}
      data-testid="filter-clear"
      className="ml-auto"
    >
      <X className="mr-1 size-3.5" />
      Clear filters
    </Button>
  )}
</div>
```

The `<fieldset>` + `<legend className="sr-only">` also improves screen-reader semantics — the four checkboxes now announce as a labelled group ("Visible stages, group, 4 items").

#### 6. Page H1 size bump
**File**: `src/app/(application)/pipeline/_components/pipeline-board.tsx`
**Changes**: Change the page header `<h1>` from `text-lg` to `text-xl` so it sits comfortably above the column H2s (`text-base`).

```tsx
<header className="flex items-center justify-between border-b px-4 py-3">
  <h1 className="font-semibold text-xl">Pipeline</h1>
  <Link href="/leads/new" ...>...</Link>
</header>
```

### Success Criteria:

#### Automated Verification:
- [ ] `make check` passes (Biome + tsc — including the new sentinel guard type)
- [ ] `make test` passes — no regressions in existing suites
- [ ] Existing E2E test `quick-capture lead appears in the Unqualified column with score 0` still passes (the `0` literal is still rendered, only `null` falls through to `—`)

#### Manual Verification:
- [ ] At 1280×800 light mode: each column has a visible 2px coloured left border (gray → orange → amber → coral)
- [ ] At 1280×800 dark mode: column accent borders are visible against the dark card background
- [ ] Hovering a card produces a clear border-color change AND subtle shadow lift
- [ ] Tab to the timeline select with the keyboard, then with VoiceOver active — announces "Construction timeline, combobox, Any timeline"
- [ ] Tab through the stage checkboxes with VoiceOver — announces "Visible stages, group, 4 items" (or equivalent NVDA wording)
- [ ] At 768×1024: filter bar fits in two rows max (text/select group on row 1, stage checkboxes on row 2)
- [ ] Page title "Pipeline" is visibly larger than the column titles
- [ ] Column count pills use proportional spacing (tabular-nums) rather than monospace
- [ ] A lead with `null` score (briefly visible after creation, before scoring) shows `—` in the badge instead of `0`
- [ ] `/design_review` re-run shows all twelve issues resolved

---

## Performance Considerations

- The scroll-edge `useEffect` adds one passive scroll listener and one ResizeObserver per `PipelineBoard` mount. Both are cheap and torn down on unmount. The `update` callback only calls `setState` when the boolean changes (React's `setState` bails out on identical values), so re-renders are minimal.
- The empty-state helper is a pure function called once per render — negligible cost.
- All other changes are CSS-only and have zero runtime cost.

## Migration Notes

None — every change is additive or in-place. No data migrations, no API changes, no breaking type changes for downstream consumers (the `brand` Badge variant is only consumed by `stage-meta.ts`).

## References

- GitHub issue: `#100`
- Design review: in this conversation, see assistant message after `/design_review` at 2026-04-10
- Original implementation plan: `thoughts/plans/2026-04-09-100-pipeline-board-view.md`
- Pipeline files (the entire `src/app/(application)/pipeline/` tree)
- Badge variant: `src/components/ui/Badge.tsx:14`
- Existing utility test pattern: `src/app/(application)/pipeline/_lib/__tests__/filters.test.ts`
- Tabular-nums utility: `src/styles/globals.css:157`
- Accent CSS tokens: `src/styles/globals.css:38-44`
