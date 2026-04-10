# Pipeline Board View Implementation Plan

## Overview

Replace the `/pipeline` stub with a Kanban-style board showing leads grouped into four stages (Unqualified → Nurture → Warm → Hot). Cards display name, score badge, last-contact time, and the top qualification gap. The board is mobile-first (one column per viewport, swipe between columns; four-across on desktop) and filterable by estate, FHOG eligibility, timeline, and column visibility — with filter state in the URL so refreshes and shared links work.

## Current State Analysis

- `src/app/(application)/pipeline/page.tsx` is an empty-state stub with "No leads yet" copy. The route, sidebar link (`src/app/(application)/_components/nav-config.ts:11`), and bottom-nav link are already wired.
- `leads.getByStage` already exists at `src/server/api/routers/leads.ts:258-269`. It returns `{unqualified, nurture, warm, hot}` arrays sorted by `leadScore desc`, but takes no filter args.
- `leads.list` accepts `stage`, `constructionTimeline`, `preferredEstate`, `fhogEligible` via `leadFilterSchema` at `src/server/api/schemas/leads.ts:106-119`. We will not use it for the board — the design decision below.
- `leads.scoreMetadata` (JSONB on `src/server/db/schema/leads.ts:54`) carries `gaps: Gap[]` already sorted by weight high→low. Each `Gap` has `field`, `impact`, `description` (`src/server/scoring/schema.ts:19-25`). `scoreMetadata` is `null` for the brief window between lead insert and the fire-and-forget scorer writing back.
- RSC prefetch helpers live in `src/trpc/server.tsx`: `trpc` proxy, `prefetch()`, and `HydrateClient`.
- `src/app/(application)/layout.tsx` already wraps children in `TRPCReactProvider`, sidebar, and bottom-nav.
- Badge variants available: `default | amber | brand | coral | success | outline` (`src/components/ui/Badge.tsx:8-20`) — enough to colour-code the four stages without introducing new variants.
- No relative-time lib (`date-fns`, `dayjs`, etc.) is installed. Will use native `Intl.RelativeTimeFormat`.
- No URL-search-params filter pattern exists in authenticated pages — this will be the first.
- E2E test scaffolding exists: `createTestSession` / `deleteTestSession` / `uniquePhone` in `e2e/utils/auth-helper.ts`; cookie helper in `e2e/utils/session-cookie.ts`; page-object pattern in `e2e/pages/sections/*`. A fixme'd pipeline board test already sits at `e2e/features/leads-crud.spec.ts:188`.
- `/leads/[id]` profile page does not exist yet (sibling issue #101). Cards will link to it and 404 for now — acceptable per scope.

### Key Discoveries

- **One procedure, one return shape.** We will extend `leads.getByStage` to accept optional filter args instead of routing filtered loads through `leads.list`. This avoids mixing two return shapes on one page and drops one client branch.
- **Stage column visibility is a UI concern, not a backend filter.** The server always returns all four stage arrays; hiding a column is a client-side render decision. This keeps the backend filter schema simple and avoids round-trips when the user toggles column visibility.
- **Deterministic scorer already populates score & stage on create.** `scoreLeadAsync()` at `src/server/api/routers/leads.ts:21-56` fires after insert. It's synchronous TypeScript now (no API call), so the DB update lands within milliseconds of the mutation resolving. E2E tests can poll `leads.lead_stage` to wait for the scorer.
- **`leads.getByStage` already sorts by `lead_score desc`** globally, which preserves order within each stage after the client-side partition.

## Desired End State

After this plan ships:

1. Visiting `/pipeline` shows four columns with per-stage lead counts and cards rendered from prefetched data — no loading flash.
2. Each card shows `First Last`, numeric score badge coloured by stage, relative last-contact ("3 days ago" / "Never contacted"), and the top qualification gap (`"No finance info"`, `"Score pending"` if not yet scored, `"No qualification gaps"` if fully qualified).
3. Tapping a card navigates to `/leads/[id]` (will 404 until #101 lands — tests assert URL only).
4. Filters — estate (text), FHOG eligibility (toggle), construction timeline (select), visible stages (four checkboxes) — live in the URL as `?estate=…&fhog=true&timeline=ready_now&stages=warm,hot`. Reload preserves them.
5. Mobile viewport shows one column per screen with horizontal snap-scroll. Desktop shows four columns side-by-side.
6. Each empty column shows "No {stage} leads". If all four are empty, the page shows the existing "No leads yet" global empty state with a CTA to add a lead.
7. E2E tests cover: board renders 4 columns, quick-capture lead lands in Unqualified, fully-qualified lead lands in Hot, card navigation, column counts updating after a new lead, and estate/FHOG filters narrowing the result.

### Verification

- `make check` passes.
- `make test` passes (new unit tests for the router filter paths, `formatLastContact`, `extractTopGap`, and the URL-param parser).
- `make test_e2e` passes (new/un-fixme'd pipeline tests).
- Manual: open `/pipeline` with a mix of scored leads on mobile (375px) and desktop (1280px); confirm layout, filter URL round-trip, and card navigation.

## What We're NOT Doing

- Lead profile page (`/leads/[id]`) — issue #101.
- Drag-and-drop stage changes on the board — out of scope; tap → profile is the only card interaction.
- Infinite scroll / pagination inside columns — pilot scale is a few hundred leads; full fetch is fine.
- Real-time updates / websocket / tRPC subscriptions — React Query invalidation is sufficient.
- Sort controls — the backend's `leadScore desc` is the only ordering.
- A shared `<Skeleton>` primitive — the prefetch strategy means the board is populated on first paint; a small inline fade is enough for filter re-fetches.
- New date libraries — `Intl.RelativeTimeFormat` is sufficient.
- Pushing stage visibility to the server — client-side partition only.

## Implementation Approach

Three phases, each independently testable:

1. **Backend filter support on `leads.getByStage`** — one new Zod schema, one procedure change, router tests.
2. **Pipeline board UI** — RSC page with prefetch, client board component, stage columns, lead cards, formatting utilities. Unit tests for the utilities.
3. **Filters + URL state + E2E** — filter bar component, URL param parser/serialiser, and end-to-end tests matching the ticket's acceptance criteria.

---

## Phase 1: Backend Filter Support on `leads.getByStage`

### Overview

Add an optional input to `leads.getByStage` carrying the three backend-side pipeline filters. Stage visibility stays client-side.

### Changes Required:

#### 1. New Zod schema for pipeline filters
**File**: `src/server/api/schemas/leads.ts`
**Changes**: Add a `pipelineFiltersSchema` beside `leadFilterSchema`. Export the inferred type.

```typescript
// Filters consumed by leads.getByStage for the Pipeline Board view.
// Stage visibility is a client-side render concern, not a backend filter.
export const pipelineFiltersSchema = z
  .object({
    constructionTimeline: constructionTimelineSchema.nullish(),
    preferredEstate: z.string().min(1).max(100).nullish(),
    fhogEligible: z.boolean().nullish(),
  })
  .nullish();

export type PipelineFilters = z.infer<typeof pipelineFiltersSchema>;
```

#### 2. Extend the `getByStage` procedure
**File**: `src/server/api/routers/leads.ts`
**Changes**: Import `pipelineFiltersSchema`, wire input, build WHERE clause, keep the same partitioned return shape.

```typescript
import {
  leadCreateSchema,
  leadFilterSchema,
  leadUpdateSchema,
  pipelineFiltersSchema,
} from "~/server/api/schemas/leads";

// ...

  getByStage: protectedProcedure
    .input(pipelineFiltersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.constructionTimeline)
        conditions.push(
          eq(leads.constructionTimeline, input.constructionTimeline),
        );
      if (input?.fhogEligible)
        conditions.push(eq(leads.propertyType, "first_home_buyer"));
      if (input?.preferredEstate)
        conditions.push(
          sql`${input.preferredEstate} = ANY(${leads.preferredEstates})`,
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const allLeads = await ctx.db.query.leads.findMany({
        where,
        orderBy: desc(leads.leadScore),
      });

      return {
        unqualified: allLeads.filter((l) => l.leadStage === "unqualified"),
        nurture: allLeads.filter((l) => l.leadStage === "nurture"),
        warm: allLeads.filter((l) => l.leadStage === "warm"),
        hot: allLeads.filter((l) => l.leadStage === "hot"),
      };
    }),
```

#### 3. Router tests for the new filter paths
**File**: `src/server/api/__tests__/leads-router.test.ts`
**Tests**: Extend the existing mock-db suite. Use the same `getCaller()` pattern already in the file (see `src/server/api/__tests__/leads-router.test.ts:131-136`).

Add a new `describe("leads.getByStage")` block with:

- Returns all four arrays partitioned by stage, ordered by `leadScore desc` within each.
- With `fhogEligible: true`, pushes `eq(propertyType, "first_home_buyer")` into the query — assert via `findMany` call args.
- With `preferredEstate: "Springfield Rise"`, pushes a `sql` fragment into the query.
- With `constructionTimeline: "ready_now"`, pushes the eq condition.
- With no input (undefined), runs the unfiltered query.
- Returns empty arrays for stages with no matches.

Follow the existing test shape:

```typescript
describe("leads.getByStage", () => {
  test("partitions leads by stage, sorted by score desc", async () => {
    const rows = [
      { ...mockLead, id: "a", leadStage: "hot", leadScore: 90 },
      { ...mockLead, id: "b", leadStage: "warm", leadScore: 60 },
      { ...mockLead, id: "c", leadStage: "nurture", leadScore: 30 },
      { ...mockLead, id: "d", leadStage: "unqualified", leadScore: 10 },
    ];
    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue(rows);

    const caller = await getCaller();
    const result = await caller.leads.getByStage();

    expect(result.hot).toHaveLength(1);
    expect(result.warm).toHaveLength(1);
    expect(result.nurture).toHaveLength(1);
    expect(result.unqualified).toHaveLength(1);
  });

  test("applies fhogEligible filter", async () => {
    const findMany = (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.leads.getByStage({ fhogEligible: true });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() }),
    );
  });

  // ...equivalent tests for preferredEstate, constructionTimeline, undefined input
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes.
- [x] `make test` passes — new `leads.getByStage` test block green.

#### Manual Verification:
- [ ] Calling `leads.getByStage({ fhogEligible: true })` from the tRPC panel (or a temporary page) returns only first-home-buyer leads.
- [ ] Calling with no args still returns the same 4-key object shape as before.

---

## Phase 2: Pipeline Board UI

### Overview

Replace the stub page with a RSC that prefetches `leads.getByStage` using filters parsed from `searchParams`, then renders a client `PipelineBoard` that reads the same query via `useQuery`. Introduce lightweight formatting utilities so the card stays presentational.

### Changes Required:

#### 1. Stage metadata constants
**File**: `src/app/(application)/pipeline/_lib/stage-meta.ts` (new)

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
  { label: string; badgeVariant: BadgeProps["variant"] }
> = {
  unqualified: { label: "Unqualified", badgeVariant: "outline" },
  nurture: { label: "Nurture", badgeVariant: "brand" },
  warm: { label: "Warm", badgeVariant: "amber" },
  hot: { label: "Hot", badgeVariant: "coral" },
};
```

#### 2. Relative time utility
**File**: `src/app/(application)/pipeline/_lib/format-last-contact.ts` (new)

```typescript
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DIVISIONS: Array<{ amount: number; name: Intl.RelativeTimeFormatUnit }> =
  [
    { amount: 60, name: "second" },
    { amount: 60, name: "minute" },
    { amount: 24, name: "hour" },
    { amount: 7, name: "day" },
    { amount: 4.34524, name: "week" },
    { amount: 12, name: "month" },
    { amount: Number.POSITIVE_INFINITY, name: "year" },
  ];

export function formatLastContact(
  date: Date | string | null | undefined,
): string {
  if (!date) return "Never contacted";

  const d = typeof date === "string" ? new Date(date) : date;
  let duration = (d.getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.name);
    }
    duration /= division.amount;
  }
  return "a long time ago";
}
```

#### 3. Top-gap extractor
**File**: `src/app/(application)/pipeline/_lib/top-gap.ts` (new)

```typescript
import type { ScoreMetadata } from "~/server/scoring";

/**
 * The single most-impactful missing qualification field. ScoreMetadata.gaps
 * is already sorted weight-high → weight-low by the scorer.
 */
export function extractTopGap(
  metadata: ScoreMetadata | null | undefined,
): string {
  if (!metadata) return "Score pending";
  const [top] = metadata.gaps;
  if (!top) return "Fully qualified";
  return top.description;
}
```

#### 4. URL param parser + visible-stages parser
**File**: `src/app/(application)/pipeline/_lib/filters.ts` (new)

```typescript
import {
  type PipelineFilters,
  pipelineFiltersSchema,
} from "~/server/api/schemas/leads";
import { type LeadStage, STAGE_ORDER } from "./stage-meta";

type RawParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function pick(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Parse backend filter args from URL search params. */
export function parseFiltersFromSearchParams(
  params: RawParams,
): PipelineFilters {
  const parsed = pipelineFiltersSchema.safeParse({
    constructionTimeline: pick(params, "timeline") ?? null,
    preferredEstate: pick(params, "estate") ?? null,
    fhogEligible: pick(params, "fhog") === "true" ? true : null,
  });
  return parsed.success ? parsed.data : null;
}

/** Parse the client-only "which columns are visible" filter. */
export function parseVisibleStages(params: RawParams): Set<LeadStage> {
  const raw = pick(params, "stages");
  if (!raw) return new Set(STAGE_ORDER);

  const stages = raw
    .split(",")
    .filter((s): s is LeadStage =>
      (STAGE_ORDER as readonly string[]).includes(s),
    );
  return new Set(stages.length > 0 ? stages : STAGE_ORDER);
}
```

#### 5. Lead card component
**File**: `src/app/(application)/pipeline/_components/lead-card.tsx` (new)

```typescript
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
      className="block rounded-md border bg-background p-3 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 truncate font-medium text-sm">
          {lead.firstName} {lead.lastName}
        </p>
        <Badge
          variant={meta.badgeVariant}
          data-testid={`lead-card-score-${lead.id}`}
        >
          {lead.leadScore ?? 0}
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

#### 6. Stage column component
**File**: `src/app/(application)/pipeline/_components/stage-column.tsx` (new)

```typescript
import { LeadCard, type LeadCardData } from "./lead-card";
import { type LeadStage, STAGE_META } from "../_lib/stage-meta";

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
      className="flex w-[calc(100vw-2rem)] shrink-0 snap-center flex-col rounded-lg border bg-card md:w-80"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-base">{meta.label}</h2>
        <span
          data-testid={`pipeline-column-count-${stage}`}
          className="rounded-full bg-secondary px-2 py-0.5 font-mono text-muted-foreground text-xs"
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

#### 7. Pipeline board client component
**File**: `src/app/(application)/pipeline/_components/pipeline-board.tsx` (new)

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { buttonVariants } from "~/components/ui/button-variants";
import { useTRPC } from "~/trpc/react";
import {
  parseFiltersFromSearchParams,
  parseVisibleStages,
} from "../_lib/filters";
import { STAGE_ORDER } from "../_lib/stage-meta";
import { StageColumn } from "./stage-column";

export function PipelineBoard() {
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );
  const visibleStages = useMemo(
    () => parseVisibleStages(searchParams),
    [searchParams],
  );

  const trpc = useTRPC();
  const { data } = useQuery(trpc.leads.getByStage.queryOptions(filters));

  const totalLeads = data
    ? data.unqualified.length +
      data.nurture.length +
      data.warm.length +
      data.hot.length
    : 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold text-lg">Pipeline</h1>
        <Link
          href="/leads/new"
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          <Plus className="mr-1.5 size-4" />
          Add Lead
        </Link>
      </header>

      {/* PipelineFilters goes here in Phase 3 */}

      {totalLeads === 0 ? (
        <div
          data-testid="pipeline-empty"
          className="flex flex-1 items-center justify-center p-4"
        >
          <div className="text-center">
            <Users
              size={48}
              className="mx-auto mb-4 text-muted-foreground/50"
            />
            <h2 className="font-semibold text-lg">No leads yet</h2>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              Your leads will appear here, grouped by stage
            </p>
            <Link
              href="/leads/new"
              className={buttonVariants({
                variant: "outline",
                size: "md",
                className: "mt-4",
              })}
            >
              <Plus className="mr-1.5 size-4" />
              Add your first lead
            </Link>
          </div>
        </div>
      ) : (
        <div
          data-testid="pipeline-board"
          className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-4 md:snap-none"
        >
          {STAGE_ORDER.filter((s) => visibleStages.has(s)).map((stage) => (
            <StageColumn key={stage} stage={stage} leads={data?.[stage] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 8. RSC page with prefetch
**File**: `src/app/(application)/pipeline/page.tsx` (replace stub)

```typescript
import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { PipelineBoard } from "./_components/pipeline-board";
import { parseFiltersFromSearchParams } from "./_lib/filters";

export const metadata: Metadata = {
  title: "Pipeline | Rekurve",
};

interface PipelinePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PipelinePage({
  searchParams,
}: PipelinePageProps) {
  const params = await searchParams;
  const filters = parseFiltersFromSearchParams(params);
  prefetch(trpc.leads.getByStage.queryOptions(filters));

  return (
    <HydrateClient>
      <PipelineBoard />
    </HydrateClient>
  );
}
```

#### 9. Unit tests for the utilities
**File**: `src/app/(application)/pipeline/_lib/__tests__/format-last-contact.test.ts` (new)

Test cases:
- `null` / `undefined` → `"Never contacted"`
- A date 2 days ago → `"2 days ago"`
- A date 3 hours ago → `"3 hours ago"`
- A date 5 minutes in the future → `"in 5 minutes"` (sanity check, should basically never happen)
- A date passed as ISO string gets parsed correctly

Freeze `Date.now()` via `rs.fn().mockReturnValue(...)` or `vi.useFakeTimers()` equivalent in Rstest.

**File**: `src/app/(application)/pipeline/_lib/__tests__/top-gap.test.ts` (new)

Test cases:
- `null` → `"Score pending"`
- Empty gaps → `"Fully qualified"`
- Gaps with a `land` gap first → returns that gap's `description`
- Gaps with mixed impacts → returns `gaps[0].description` (verifies it doesn't re-sort)

**File**: `src/app/(application)/pipeline/_lib/__tests__/filters.test.ts` (new)

Test cases for `parseFiltersFromSearchParams`:
- Empty params → `null` (nullish schema allows that).
- `{ estate: "Springfield Rise" }` → `{ preferredEstate: "Springfield Rise", ... }`.
- `{ fhog: "true" }` → `fhogEligible: true`. `{ fhog: "false" }` or absent → `null`.
- `{ timeline: "ready_now" }` → valid. `{ timeline: "nope" }` → parse fails, returns `null`.
- Accepts both `URLSearchParams` and plain object input.

Test cases for `parseVisibleStages`:
- Empty → all four stages.
- `{ stages: "warm,hot" }` → `Set(["warm", "hot"])`.
- `{ stages: "bogus" }` → all four stages (fallback when nothing valid).
- `{ stages: "warm,bogus" }` → `Set(["warm"])`.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes.
- [x] `make test` passes — new `_lib` unit test suites green.
- [x] `yarn tsc --noEmit` — `RouterOutputs["leads"]["getByStage"]` type resolves cleanly in `lead-card.tsx`.

#### Manual Verification:
- [ ] Seed ~6 leads across all four stages (via quick capture + full form), visit `/pipeline` — columns render in order with correct counts and cards.
- [ ] Resize to 375px — each column is one viewport wide and snaps into place on horizontal swipe.
- [ ] Desktop at 1280px — four columns fit side-by-side without horizontal scroll.
- [ ] Tap a card — URL changes to `/leads/{id}` (404 is expected until #101 lands).
- [ ] Empty DB → "No leads yet" global empty state with the CTA.
- [ ] One stage empty, others populated → that column shows "No nurture leads" while others show cards.
- [ ] Reload `/pipeline` — no loading flash (RSC prefetch hit).

---

## Phase 3: Filters UI + URL State + E2E

### Overview

Add a filter bar above the board, a serialiser that writes filter state to the URL via `router.replace()`, and Playwright tests matching the ticket's acceptance criteria. Un-fixme the existing pipeline test at `e2e/features/leads-crud.spec.ts:188`.

### Changes Required:

#### 1. URL serialiser helper
**File**: `src/app/(application)/pipeline/_lib/filters.ts`
**Changes**: Add a `buildPipelineSearchParams` helper beside the parsers.

```typescript
import type { PipelineFilters } from "~/server/api/schemas/leads";
import type { LeadStage } from "./stage-meta";
import { STAGE_ORDER } from "./stage-meta";

export interface PipelineUrlState {
  filters: NonNullable<PipelineFilters>;
  visibleStages: Set<LeadStage>;
}

/** Serialise current pipeline state into a URLSearchParams string. */
export function buildPipelineSearchParams(state: PipelineUrlState): string {
  const params = new URLSearchParams();
  if (state.filters.constructionTimeline)
    params.set("timeline", state.filters.constructionTimeline);
  if (state.filters.preferredEstate)
    params.set("estate", state.filters.preferredEstate);
  if (state.filters.fhogEligible) params.set("fhog", "true");

  // Only persist stages when the user has hidden at least one.
  if (state.visibleStages.size < STAGE_ORDER.length) {
    params.set(
      "stages",
      STAGE_ORDER.filter((s) => state.visibleStages.has(s)).join(","),
    );
  }
  return params.toString();
}
```

Extend `filters.test.ts` with round-trip tests: parse → build → parse returns the same state for every permutation.

#### 2. Filter bar component
**File**: `src/app/(application)/pipeline/_components/pipeline-filters.tsx` (new)

A single client component that:
- Reads current filter/stage state via `useSearchParams()`.
- Renders: estate text input (debounced ~300ms), FHOG toggle (checkbox styled as pill), timeline `<Select>` with options matching `constructionTimelineSchema`, and four stage checkboxes.
- On change, builds the next URL with `buildPipelineSearchParams` and calls `router.replace(`/pipeline?${qs}`, { scroll: false })`.
- Exposes `data-testid="pipeline-filters"` on its root, and nested `data-testid` values for each control (`filter-estate`, `filter-fhog`, `filter-timeline`, `filter-stage-{stage}`, `filter-clear`).
- Shows a "Clear filters" link-button that is visible only when any filter is active.

Use the existing primitives: `Input`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` from `~/components/ui/select`, `Checkbox` from `~/components/ui/checkbox`, `Button` for the clear action.

Wire the component into `PipelineBoard` directly below the `<header>` block (the `{/* PipelineFilters goes here */}` placeholder).

#### 3. E2E page section
**File**: `e2e/pages/sections/pipeline-board.section.ts` (new)

```typescript
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

type Stage = "unqualified" | "nurture" | "warm" | "hot";

export class PipelineBoardSection {
  readonly page: Page;
  readonly board: Locator;
  readonly empty: Locator;
  readonly filters: Locator;
  readonly filterEstate: Locator;
  readonly filterFhog: Locator;
  readonly filterTimeline: Locator;
  readonly filterClear: Locator;

  constructor(page: Page) {
    this.page = page;
    this.board = page.locator('[data-testid="pipeline-board"]');
    this.empty = page.locator('[data-testid="pipeline-empty"]');
    this.filters = page.locator('[data-testid="pipeline-filters"]');
    this.filterEstate = page.locator('[data-testid="filter-estate"]');
    this.filterFhog = page.locator('[data-testid="filter-fhog"]');
    this.filterTimeline = page.locator('[data-testid="filter-timeline"]');
    this.filterClear = page.locator('[data-testid="filter-clear"]');
  }

  column(stage: Stage): Locator {
    return this.page.locator(`[data-testid="pipeline-column-${stage}"]`);
  }

  columnCount(stage: Stage): Locator {
    return this.page.locator(`[data-testid="pipeline-column-count-${stage}"]`);
  }

  async expectColumnCount(stage: Stage, n: number) {
    await expect(this.columnCount(stage)).toHaveText(String(n));
  }

  async cardByName(fullName: string): Promise<Locator> {
    return this.page.locator('[data-testid^="lead-card-"]', {
      hasText: fullName,
    });
  }
}
```

#### 4. E2E test: replace the `test.fixme()` pipeline test
**File**: `e2e/features/leads-crud.spec.ts`
**Changes**: Replace the stub at line 188 with a real test and add the remaining AC-driven tests.

```typescript
test("pipeline board displays leads grouped by stage (unqualified, nurture, warm, hot)", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

  // Seed one quick-capture lead (→ unqualified) and one full-form
  // fully-qualified lead (→ hot after scoring).
  const uniqueId = Date.now().toString(36);

  await page.goto("/dashboard");
  const quickCapture = new QuickCaptureSection(page);
  await quickCapture.open();
  await quickCapture.fill({
    firstName: "Pipeline",
    lastName: `Unqualified ${uniqueId}`,
    phone: uniquePhone(),
  });
  await quickCapture.submit();
  await quickCapture.expectSuccessToast(`Pipeline Unqualified ${uniqueId}`);

  const fullyQualifiedEmail = `e2e-${uniqueId}-hot@test.rekurve.dev`;
  await page.goto("/leads/new");
  const form = new LeadFormSection(page);
  await form.fillStep1({
    firstName: "Pipeline",
    lastName: `Hot ${uniqueId}`,
    phone: uniquePhone(),
    email: fullyQualifiedEmail,
  });
  await form.clickNext();
  await form.selectSegmented("Has land", "Yes");
  await form.landAddressInput.waitFor({ state: "visible" });
  await form.selectSegmented("Land registered", "Yes");
  await form.landAddressInput.fill("1 Hot St");
  await form.landSqmInput.fill("450");
  await form.clickNext();
  await form.selectSegmented("Property type", "First Home Buyer");
  await form.budgetInput.fill("$650,000");
  await form.selectSegmented("Seen broker", "Yes");
  await form.selectSegmented("Construction timeline", "Ready Now");
  await form.clickNext();
  await form.clickSubmit();
  await form.expectSuccess(`Pipeline Hot ${uniqueId}`);

  // Scoring is fire-and-forget, so poll until the hot lead lands in the hot column.
  await page.goto("/pipeline");
  const board = new PipelineBoardSection(page);

  await expect(
    board
      .column("unqualified")
      .getByText(`Pipeline Unqualified ${uniqueId}`),
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    board.column("hot").getByText(`Pipeline Hot ${uniqueId}`),
  ).toBeVisible({ timeout: 15_000 });
});
```

Add three more tests in the same `describe` block:

```typescript
test("quick-capture lead appears in the Unqualified column with score 0", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
  const uniqueId = Date.now().toString(36);

  await page.goto("/dashboard");
  const quickCapture = new QuickCaptureSection(page);
  await quickCapture.open();
  await quickCapture.fill({
    firstName: "QC",
    lastName: `Capture ${uniqueId}`,
    phone: uniquePhone(),
  });
  await quickCapture.submit();
  await quickCapture.expectSuccessToast(`QC Capture ${uniqueId}`);

  await page.goto("/pipeline");
  const board = new PipelineBoardSection(page);
  const card = board
    .column("unqualified")
    .getByText(`QC Capture ${uniqueId}`)
    .locator("..");
  await expect(card).toBeVisible();
  await expect(card.locator('[data-testid^="lead-card-score-"]')).toHaveText(
    "0",
  );
});

test("tapping a lead card navigates to /leads/[id]", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
  const uniqueId = Date.now().toString(36);

  // Seed a lead
  await page.goto("/dashboard");
  const quickCapture = new QuickCaptureSection(page);
  await quickCapture.open();
  await quickCapture.fill({
    firstName: "Nav",
    lastName: `Test ${uniqueId}`,
    phone: uniquePhone(),
  });
  await quickCapture.submit();
  await quickCapture.expectSuccessToast(`Nav Test ${uniqueId}`);

  await page.goto("/pipeline");
  const board = new PipelineBoardSection(page);
  await board
    .column("unqualified")
    .getByText(`Nav Test ${uniqueId}`)
    .click();
  // Profile page is not built yet (#101) — just assert URL shape.
  await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
});

test("column counts update after creating a new lead", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
  const uniqueId = Date.now().toString(36);

  await page.goto("/pipeline");
  const board = new PipelineBoardSection(page);
  const before = Number(
    (await board.columnCount("unqualified").innerText()) || "0",
  );

  // Create a new unqualified lead via quick capture on the pipeline page.
  const quickCapture = new QuickCaptureSection(page);
  await quickCapture.open();
  await quickCapture.fill({
    firstName: "Count",
    lastName: `Update ${uniqueId}`,
    phone: uniquePhone(),
  });
  await quickCapture.submit();
  await quickCapture.expectSuccessToast(`Count Update ${uniqueId}`);

  await page.reload();
  await board.expectColumnCount("unqualified", before + 1);
});
```

Filter-narrowing tests (estate + FHOG):

```typescript
test("FHOG filter narrows to first home buyer leads", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
  const uniqueId = Date.now().toString(36);

  // Seed one first_home_buyer lead and one investment lead via full form.
  // ...fill form twice with different property types...

  await page.goto("/pipeline");
  const board = new PipelineBoardSection(page);

  await board.filterFhog.check();
  await page.waitForURL(/fhog=true/);

  await expect(
    board.board.getByText(`FHOG Buyer ${uniqueId}`),
  ).toBeVisible();
  await expect(
    board.board.getByText(`FHOG Investor ${uniqueId}`),
  ).not.toBeVisible();
});
```

(Estate-filter test follows the same shape, seeding two leads with different `preferredEstates` and asserting the URL reflects `estate=...`.)

#### 5. Touch the dashboard shell empty-state test
**File**: `e2e/features/dashboard-shell.spec.ts`
**Changes**: The existing test at line 148 asserts `/pipeline` shows "No leads yet". After the rewrite, that copy only appears when the DB has zero leads. The test already runs against a fresh `createTestSession` user with no seeded leads, so the assertion still holds — but update the locator to target `[data-testid="pipeline-empty"]` for stability:

```typescript
test("/pipeline shows Pipeline empty state", async ({ context, page, baseURL }) => {
  await withAuth(context, session, baseURL!);
  await page.goto("/pipeline");
  await expect(
    page.locator('[data-testid="pipeline-empty"]'),
  ).toBeVisible();
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes.
- [x] `make test` passes — `filters.test.ts` round-trip cases green.
- [ ] `make test_e2e` passes — new pipeline tests, updated dashboard-shell test, existing leads-crud tests. (Deferred — E2E requires live DB, typically run in CI/locally.)

#### Manual Verification:
- [ ] Apply estate filter → URL shows `?estate=Springfield+Rise`, columns narrow.
- [ ] Toggle FHOG → URL shows `&fhog=true`, only first-home-buyer cards visible.
- [ ] Uncheck "Warm" and "Hot" in stage visibility → URL shows `&stages=unqualified,nurture`, only those two columns render.
- [ ] Hard reload with filters in URL → state is rehydrated, no loading flash.
- [ ] "Clear filters" removes all query params and shows every card again.
- [ ] Filter bar is usable with keyboard only; `Tab` order is logical.

---

## Performance Considerations

- `leads.getByStage` does a single unpaged `SELECT ... ORDER BY lead_score DESC`. Pilot scale (tens to a few hundred leads) is fine. Revisit if the table crosses ~2k rows.
- `scoreMetadata` is a JSONB column — Drizzle hydrates it on every row. The board reads only `gaps[0].description`. A later optimisation could project `score_metadata->'gaps'->0` in SQL, but not worth it at pilot scale.
- RSC prefetch covers the initial render with zero client fetches. Filter changes invalidate the cached query key (different input hash) and trigger a background re-fetch with Tanstack Query's default behaviour — UI stays responsive because the previous data is kept until the new response arrives.

## Migration Notes

None — schema and router changes are additive. The `getByStage` input is nullish, so existing callers (none in the app today) continue to work unchanged.

## References

- GitHub issue: `#100` (parent epic `#86`)
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Dashboard UX — Pipeline Board, lines 256–258)
- Scoring engine plan: `thoughts/plans/2026-04-08-99-ai-qualification-scoring-engine.md`
- Leads router: `src/server/api/routers/leads.ts:258-269`
- Leads filter schema: `src/server/api/schemas/leads.ts:106-119`
- Score metadata shape: `src/server/scoring/schema.ts:19-31`
- RSC prefetch pattern: `src/trpc/server.tsx:36-46`
- Existing pipeline stub: `src/app/(application)/pipeline/page.tsx`
- Existing fixme test to replace: `e2e/features/leads-crud.spec.ts:188`
- Dashboard shell empty-state test to update: `e2e/features/dashboard-shell.spec.ts:148`
