# Lead Profile Page Implementation Plan

**Issue:** [samjmarshall/www#101](https://github.com/samjmarshall/www/issues/101)
**Epic:** #86 — Lead Management + AI Qualification Scoring
**Status:** Draft

## Overview

Build `/leads/[id]` — the consultant's detailed view of a single lead. Displays all qualification data, a per-factor score breakdown, ranked qualification gaps with a suggested next question, and inline edit that re-scores the lead on save. Completes the last child issue of Epic 2.

## Current State Analysis

Most of the infrastructure is already in place:

- **Schema.** `leads` table has every field the page needs, including `lead_score`, `lead_stage`, and a JSONB `score_metadata` column that holds the full `ScoreResult` plus a `scoredAt` timestamp (`src/server/db/schema/leads.ts:52-54`).
- **Scoring.** `qualifyAndScore()` is pure, deterministic, and in-process — six factor functions produce `{score, stage, breakdown, gaps, nextQuestion}` (`src/server/scoring/qualify-and-score.ts:48`). No Claude API call. Max achievable today is 85 (finance capped at 15, engagement hardcoded to 0). This matches the issue's "fully qualified → score 85" criterion exactly.
- **Router.** `leads.getById` and `leads.update` already exist (`src/server/api/routers/leads.ts:123,190`). `update` already re-scores when qualification fields change.
- **UI primitives.** shadcn Card, Badge, Button, Field, Input, Select, Textarea are all in `src/components/ui/`. `cn`, `formatCurrency`, and `isValidAuMobile` live in `src/lib/`.
- **Form patterns.** `leads/new/_components/lead-form.tsx` shows the react-hook-form + `useTRPC` + `useMutation` pattern used throughout the app.
- **Test harness.** E2E tests use session-cookie fixtures (`e2e/utils/auth-helper.ts`), `uniquePhone()` for parallel safety, test emails matching `e2e-*@test.rekurve.dev`, and a global teardown that cleans both the DB and HubSpot contacts.

Two gaps need closing before the page can meet its acceptance criteria:

1. **Fire-and-forget scoring race.** `leads.router` wraps the re-score in `scoreLeadAsync` and calls it with `void`, so the mutation response returns before the new `scoreMetadata` is persisted (`src/server/api/routers/leads.ts:20-56, 232-239`). A naive refetch after edit would show stale data. Since scoring is fully synchronous and in-process, the fix is to await it.
2. **No RSC prefetch usage yet.** `src/trpc/server.tsx` exports `HydrateClient` and `prefetch`, but no file under `src/app/` imports them. The profile page is the first consumer of the dual-client pattern — the infra exists, it just needs wiring.

## Desired End State

A consultant navigating to `/leads/[id]` sees:

- Header with name, tap-to-call phone, tap-to-email email, a large score badge colour-coded by stage, the stage label, and last-contacted date.
- Score breakdown showing all six factors (land/30, finance/25, timeline/20, budget/10, propertyType/10, engagement/5) with scores, max, and reasoning pulled from `score_metadata.breakdown`.
- Ranked qualification gaps with impact badges and descriptions, plus a prominent "Suggested next question" from `score_metadata.nextQuestion`. A fully qualified lead shows a "No gaps" state instead.
- Lead details grouped into Contact / Land / Build / Preferences / Source sections in a readable layout.
- Conversation history placeholder card.
- An Edit button that swaps the whole page into inline-edit mode with sticky Save/Cancel. Save calls `leads.update`, the page refetches `getById`, and the score badge and breakdown update in place without navigation.

### Key Discoveries

- `scoreMetadata` already holds everything the UI needs — no new tRPC procedure or scoring pass required (`src/server/db/schema/leads.ts:54`).
- `leads.getById` throws `TRPCError({code: "NOT_FOUND"})` for missing leads (`src/server/api/routers/leads.ts:129-131`), which the RSC page can catch to call `notFound()`.
- `QualifyAndScoreResult.breakdown` has exactly the six keys needed (`land`, `finance`, `timeline`, `budget`, `propertyType`, `engagement`) with `{score, maxScore, reasoning}` on each (`src/server/scoring/schema.ts:10-18`).
- `detectGaps` already ranks gaps by factor weight and maps them to `high`/`medium`/`low` impact (`src/server/scoring/score-factors.ts:219-227`), and `pickNextQuestion` always targets the highest-impact gap (`src/server/scoring/score-factors.ts:243-247`). The UI just renders what the server produced.
- `lead-form.tsx` already handles Zod field errors from tRPC and maps them back onto the form (`src/app/(application)/leads/new/_components/lead-form.tsx:75-91`) — the edit form mirrors this.

## What We're NOT Doing

- No changes to `qualifyAndScore()` itself, scoring factors, or thresholds. Existing behaviour is the contract.
- No new tRPC procedures — `getById` and `update` are sufficient.
- No Epic 3 work: conversation history is a static placeholder card.
- No pipeline board work (that's #100). The profile page doesn't depend on the pipeline for navigation; E2E tests navigate directly to `/leads/[id]`.
- No `frontend-design`-led redesign of the app shell, sidebar, or bottom nav.
- No new icon or charting library — the score breakdown uses plain segmented bars.
- No multi-step edit form. Single page-level toggle, all fields editable on one screen.
- No optimistic updates on save — refetch-on-success is simpler and matches the acceptance criteria.

## Implementation Approach

Three phases, each independently testable:

1. Make `leads.create` and `leads.update` re-score synchronously so the response is always authoritative.
2. Build the read-only profile page using the dual-client RSC prefetch pattern, and add E2E tests for the score/breakdown/gaps/next-question requirements.
3. Add the inline edit mode on top of the same page, and add the edit-in-place E2E test.

---

## Phase 1: Synchronous re-scoring in `leads` router

### Overview

Remove the fire-and-forget wrapper around scoring so `create` and `update` return a lead whose `leadScore`, `leadStage`, and `scoreMetadata` already reflect the new qualification state. This closes the race that would otherwise make "score updates in-place" flaky.

### Changes Required

#### 1. Inline scoring into `create` and `update`

**File:** `src/server/api/routers/leads.ts`

**Changes:**
- Delete `scoreLeadAsync` at lines 20-56.
- Add a small `scoreLead(db, lead, hubspotContactId)` helper that computes the score, writes `leadScore`/`leadStage`/`scoreMetadata`/`updatedAt` in a single update, pushes the score/stage to HubSpot if linked, and returns the fully-scored lead row. Errors from the HubSpot push remain logged-not-thrown (consistent with current behaviour); errors from the score write or the qualify call propagate up.
- In `create`: after the insert, call `await scoreLead(ctx.db, lead, hubspotContactId)` and return its result instead of the unscored row.
- In `update`: after the main update, if `SCORING_FIELDS` changed, call `await scoreLead(ctx.db, updated, updated.hubspotContactId)` and return its result. Otherwise return `updated` unchanged.

```ts
// src/server/api/routers/leads.ts
async function scoreLead(
  db: typeof import("~/server/db").db,
  lead: typeof leads.$inferSelect,
  hubspotContactId: string | null,
): Promise<typeof leads.$inferSelect> {
  const result = qualifyAndScore(lead);
  const metadata: ScoreMetadata = { ...result, scoredAt: new Date().toISOString() };

  const [scored] = await db
    .update(leads)
    .set({
      leadScore: result.score,
      leadStage: result.stage,
      scoreMetadata: metadata,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id))
    .returning();

  if (hubspotContactId) {
    await updateHubSpotContact(hubspotContactId, {
      leadScore: String(result.score),
      leadStage: result.stage,
    }).catch((err) => {
      console.error(`[scoring] HubSpot sync failed for lead ${lead.id}:`, err);
    });
  }

  return scored!;
}
```

#### 2. Router unit tests

**File:** `src/server/api/__tests__/leads-router.test.ts`

**Tests:**
- `create` returns a lead with `leadScore > 0`, `leadStage !== "unqualified"`, and a populated `scoreMetadata` when the input contains qualifying data (e.g. `hasLand: true`, `landRegistered: true`, `landSizeSqm: "450"`, `seenBroker: true`, `constructionTimeline: "ready_now"`, `budget: "$650000"`, `propertyType: "first_home_buyer"`).
- `create` returns a lead with `leadScore === 0`, `leadStage === "unqualified"`, and a `scoreMetadata` whose `gaps.length === 5` when the input is quick-capture-shaped (name + phone only).
- `update` with `constructionTimeline: "ready_now"` on an existing unqualified lead bumps `leadScore` and returns the new score in the response (no refetch needed).
- `update` with a non-scoring field like `notes` leaves `leadScore` unchanged and does not re-write `scoreMetadata`.

### Success Criteria

#### Automated Verification
- [x] `make test` passes
- [x] `make check` passes (lint + typecheck)

#### Manual Verification
- [ ] Create a lead via the full form locally and inspect the tRPC response — the returned row has a non-zero score and populated `scoreMetadata`

---

## Phase 2: Profile page — read-only view

### Overview

Build the server-rendered profile page and all its read-only sections. Wire up the dual-client RSC prefetch pattern so the page arrives with data already hydrated. Apply the `frontend-design` skill during implementation and run `/design_review` before merging this phase.

### Changes Required

#### 1. RSC page + `notFound` handling

**File:** `src/app/(application)/leads/[id]/page.tsx`

**Changes:** New file. Async server component: await `params`, fetch the lead via `queryClient.fetchQuery(trpc.leads.getById.queryOptions({id}))`, catch `TRPCError` with `code === "NOT_FOUND"` and call `notFound()`, then render `<HydrateClient><LeadProfileView id={id} /></HydrateClient>`. This is the first use of `HydrateClient` in the app — set the precedent cleanly.

```tsx
// src/app/(application)/leads/[id]/page.tsx
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrateClient, getQueryClient, trpc } from "~/trpc/server";
import { LeadProfileView } from "./_components/lead-profile-view";

export const metadata: Metadata = { title: "Lead | Rekurve" };

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();

  try {
    await queryClient.fetchQuery(trpc.leads.getById.queryOptions({ id }));
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <HydrateClient>
      <LeadProfileView id={id} />
    </HydrateClient>
  );
}
```

**Note:** `src/trpc/server.tsx` currently exports `getQueryClient`, `HydrateClient`, `trpc`, and `prefetch`. No changes needed there.

#### 2. Not-found boundary

**File:** `src/app/(application)/leads/[id]/not-found.tsx`

**Changes:** New file. A small full-page empty state with a "Back to pipeline" link, using the existing `Users` icon treatment from the pipeline empty state for consistency.

#### 3. Profile view container (client)

**File:** `src/app/(application)/leads/[id]/_components/lead-profile-view.tsx`

**Changes:** New client component. Calls `useQuery(trpc.leads.getById.queryOptions({id}))` — hydrated from the RSC prefetch so there's no loading flash. Renders a page header and the five sub-components in order: `ProfileHeader`, `ScoreBreakdown`, `QualificationGaps`, `LeadDetails`, `ConversationHistoryPlaceholder`. Owns the `isEditing` state (flipped to `true` in Phase 3 — declared here as a stub returning `false` for now). Handles the `isLoading` and `isError` edge cases.

#### 4. Profile header (tap-to-call/email, score badge, stage)

**File:** `src/app/(application)/leads/[id]/_components/profile-header.tsx`

**Changes:** New component. Shows `{firstName} {lastName}`, phone as `<a href="tel:...">` when present, email as `<a href="mailto:...">` when present, a large score badge whose colour maps to stage (see stage helper below), a stage label, last-contacted date (or "Never"), and an Edit button (wired in Phase 3 — stubbed `disabled` here with a `data-testid` in place). The whole header is sticky-on-desktop but inline on mobile.

#### 5. Score breakdown

**File:** `src/app/(application)/leads/[id]/_components/score-breakdown.tsx`

**Changes:** New component. Iterates over `scoreMetadata.breakdown` in the canonical order `["land", "finance", "timeline", "budget", "propertyType", "engagement"]`, rendering each factor as a row with:
- Factor label (from a factor-display helper below)
- `{score}/{maxScore}` on the right
- A horizontal track with a filled segment sized by `score/maxScore`
- The `reasoning` text underneath

If `scoreMetadata` is `null` (should only happen transiently before Phase 1 lands, but defend anyway), show a subtle "Score pending…" state rather than blanking. Each factor row gets `data-testid="score-factor-{key}"` so tests can assert directly.

#### 6. Qualification gaps + suggested next question

**File:** `src/app/(application)/leads/[id]/_components/qualification-gaps.tsx`

**Changes:** New component. Renders `scoreMetadata.gaps` as a list (the server already sorted them high → low). Each item: field label, impact badge (reuse `Badge` variants — `coral` for high, `amber` for medium, `outline` for low), description. Above the list, the "Suggested next question" is rendered as a prominent quoted block showing `scoreMetadata.nextQuestion`. When `gaps.length === 0`, render a success-variant message: "No gaps — this lead is fully qualified." and hide the next-question block.

Each gap item gets `data-testid="gap-item-{field}"`; the whole list gets `data-testid="gaps-list"`; the next question gets `data-testid="next-question"`.

#### 7. Lead details

**File:** `src/app/(application)/leads/[id]/_components/lead-details.tsx`

**Changes:** New component. Five grouped Cards:
- **Contact:** first/last name, phone, email, preferred contact time
- **Land:** has land (Yes/No), registered, address, size (m² + width × depth)
- **Build:** property type, budget, seen broker, construction timeline
- **Preferences:** preferred estates (chips), preferred suburbs (chips), Resolve Finance opt-in
- **Source:** lead source, referrer name, notes, created at

Unset fields render as muted "Not provided". Enum values are humanised via a shared display helper (`formatPropertyType`, `formatTimeline`, etc.).

#### 8. Conversation history placeholder

**File:** `src/app/(application)/leads/[id]/_components/conversation-history.tsx`

**Changes:** New component. A single Card with the literal message from the ticket: "No messages yet — conversation history will appear here when Epic 3 is complete."

#### 9. Display helpers

**File:** `src/app/(application)/leads/[id]/_lib/display.ts`

**Changes:** New file. Small pure helpers used across the sub-components:
- `stageLabel(stage)` → "Unqualified" / "Nurture" / "Warm" / "Hot"
- `stageTone(stage)` → returns a Badge `variant` key plus a text colour class for the score badge (e.g. `unqualified → outline`, `nurture → amber`, `warm → brand`, `hot → coral` — confirm final mapping during `frontend-design`/`/design_review`)
- `factorLabel(key)` → "Land", "Finance", "Timeline", "Budget", "Property type", "Engagement"
- `impactTone(impact)` → Badge variant for high/medium/low
- `formatPropertyType(value)`, `formatTimeline(value)`, `formatContactTime(value)`, `formatLeadSource(value)` — enum → human label
- `formatLastContacted(date | null)` → short relative string ("Today", "3d ago") or "Never"

All pure, no React, trivially unit-tested.

#### 10. Unit tests for display helpers

**File:** `src/app/(application)/leads/[id]/_lib/__tests__/display.test.ts`

**Tests:**
- `stageLabel` returns the right label for each stage
- `factorLabel` returns the right label for each of the six keys
- `impactTone` maps high/medium/low to distinct values
- `formatLastContacted(null)` → "Never"; a recent date → today/days-ago string
- Enum formatters map known values and fall back gracefully on unknown input

#### 11. E2E page object

**File:** `e2e/pages/sections/lead-profile.section.ts`

**Changes:** New page object modeled on `lead-form.section.ts` and `quick-capture.section.ts`. Exposes locators for the header, score badge, stage label, phone link, email link, each score factor row, gaps list, individual gap items, next question, conversation history placeholder, and edit/save/cancel buttons (used in Phase 3). Helper methods:

```ts
// e2e/pages/sections/lead-profile.section.ts
async waitForScored() {
  // Waits until the score badge is non-empty — defensive even after Phase 1
  await expect(this.scoreBadge).not.toHaveText("--", { timeout: 10_000 });
}

async expectScore(score: number) { ... }
async expectStage(stage: "unqualified" | "nurture" | "warm" | "hot") { ... }
async expectGapCount(count: number) { ... }
async expectFactor(key: string, score: number, max: number) { ... }
async expectNextQuestionMentions(keyword: string | RegExp) { ... }
```

All locators use `data-testid="lead-profile-*"`.

#### 12. E2E tests — read-only profile behaviour

**File:** `e2e/features/lead-profile.spec.ts`

**Tests:**
- `test.beforeAll` / `afterAll` create and delete a session, same pattern as `leads-crud.spec.ts`.
- `test.skip(!process.env.DATABASE_URL, ...)` — same guard.

1. **Quick capture lead → unqualified, 5 gaps.** Navigate to `/dashboard`, open quick capture, fill name + unique phone, submit, wait for the success toast, extract the lead id from the toast's "View profile" link (added to the quick capture success toast, see next bullet) or by querying the DB with the phone number, navigate to `/leads/[id]`, assert score badge shows `0`, stage label shows "Unqualified", gap list has 5 items, next question mentions land.

2. **Fully qualified lead → hot, 0 gaps.** Create via the full form (reuse `LeadFormSection` to fill all four steps with the issue's acceptance data: registered land with dimensions, seen broker, ready now, $650k budget, first home buyer), wait for success screen, extract the lead id, navigate to `/leads/[id]`, assert score badge shows `85`, stage "Hot", gaps list shows the "No gaps" state, next question block is not visible.

3. **Score breakdown shows all six factors with correct max scores.** Using the same fully-qualified lead, assert each of the six factor rows exists with the expected `{score}/{max}` — land `30/30`, finance `15/25`, timeline `20/20`, budget `10/10`, propertyType `10/10`, engagement `0/5`. Total: 85.

4. **Suggested next question targets the highest-impact gap.** Create a lead with everything except land filled in (seen broker, ready now, $650k, first home buyer, no `hasLand`). Navigate to profile. Assert the next question matches `/land/i` (the canonical land question from `NEXT_QUESTIONS` in `score-factors.ts`).

```ts
// e2e/features/lead-profile.spec.ts — skeleton
import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import { LeadProfileSection } from "../pages/sections/lead-profile.section";
import { QuickCaptureSection } from "../pages/sections/quick-capture.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import { getLeadIdByPhone } from "../utils/leads-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("Lead Profile — E2E", () => {
  test.skip(!process.env.DATABASE_URL, "Requires direct DB access");

  let session: TestSession;
  test.beforeAll(async () => { session = await createTestSession(); });
  test.afterAll(async () => { await deleteTestSession(session.userId); });

  test("quick capture lead: score 0, unqualified, 5 gaps", async ({ context, page, baseURL }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    // ... create via quick capture, look up id by phone, navigate, assert
  });

  test("fully qualified lead: score 85, hot, 0 gaps", async ({ context, page, baseURL }) => {
    // ...
  });

  test("score breakdown shows all 6 factors with correct max scores", async ({ context, page, baseURL }) => {
    // ...
  });

  test("suggested next question targets the highest-impact gap", async ({ context, page, baseURL }) => {
    // ...
  });
});
```

#### 13. E2E helper — look up lead id by phone

**File:** `e2e/utils/leads-helper.ts`

**Changes:** New file. A single `getLeadIdByPhone(phone: string)` helper that queries the local DB via the existing `neon` pattern (see `hubspot-helper.ts:17-21`) and returns `id` or throws. This lets tests that create a lead via quick capture (which has no success-screen id anchor) still navigate to `/leads/[id]`. Lightweight and parallel-safe because each test uses `uniquePhone()`.

### Success Criteria

#### Automated Verification
- [x] `make test` passes (unit tests for display helpers + Phase 1 router tests)
- [x] `make check` passes
- [ ] `make test_e2e` passes locally with `DATABASE_URL` and `HUBSPOT_ACCESS_TOKEN` set
- [ ] New test file `e2e/features/lead-profile.spec.ts` has all four read-only tests green

#### Manual Verification
- [ ] `/design_review` run against the branch passes for the new page
- [ ] `frontend-design` skill applied during build (colours, spacing, typography follow `brand-guidelines`)
- [ ] Page loads without a loading flash on a fresh hard refresh (RSC hydration working)
- [ ] On mobile viewport (375px wide), all sections are legible and the score badge is prominent
- [ ] Tap-to-call opens the device dialer on a real device or when inspected (`tel:` href present)
- [ ] Tap-to-email opens the mail app (`mailto:` href present)
- [ ] `/leads/00000000-0000-0000-0000-000000000000` renders the `not-found.tsx` state (not a tRPC error page)

---

## Phase 3: Edit mode

### Overview

Add a page-level Edit toggle that swaps the read-only layout for an inline editable form, with sticky Save/Cancel. Save calls `leads.update`, invalidates `getById`, and the score/stage update in place. Phase 1 already made the mutation response authoritative, so invalidation alone is sufficient.

### Changes Required

#### 1. Inline edit form

**File:** `src/app/(application)/leads/[id]/_components/lead-edit-form.tsx`

**Changes:** New client component. Takes the current `lead` as a prop (for default values) plus `onCancel` and `onSuccess` callbacks. Uses `useForm<LeadCreate>` with `zodResolver(leadCreateSchema)` — the same shape as the create form — so the same field-level validation applies. Renders all five section Cards with inline inputs (reusing the same sub-step field components where it keeps things tidy, otherwise inline field code — keep it flat, no multi-step wizard). Uses `useMutation(trpc.leads.update.mutationOptions(...))` and on success:

```ts
const updateLead = useMutation(
  trpc.leads.update.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        trpc.leads.getById.queryFilter({ id: lead.id }),
      );
      onSuccess();
    },
    onError: (error) => {
      // mirror lead-form.tsx: map zodError.fieldErrors to setError
    },
  }),
);
```

Save button uses `data-testid="lead-profile-save-btn"`; Cancel uses `data-testid="lead-profile-cancel-btn"`. Sticky bar pinned to the bottom on mobile, top-right on desktop.

#### 2. Wire the Edit toggle into the view container

**File:** `src/app/(application)/leads/[id]/_components/lead-profile-view.tsx`

**Changes:** Flip the `isEditing` stub from Phase 2 into real state. When `isEditing === false`, render the read-only sub-components with the Edit button enabled. When `isEditing === true`, render `<LeadEditForm lead={...} onCancel={...} onSuccess={...} />` in place of the read-only sections (keep the header visible but hide its Edit button while editing). On `onSuccess`, flip back to `false` — the refetched data already contains the new score.

#### 3. Enable the Edit button

**File:** `src/app/(application)/leads/[id]/_components/profile-header.tsx`

**Changes:** Remove the `disabled` stub; wire the button to call `onEdit` passed from the view container. Ensure the button is hidden while `isEditing === true`.

#### 4. E2E test — edit in place

**File:** `e2e/features/lead-profile.spec.ts`

**Test (appended):** "edit a lead's qualification fields: score and stage update in place without reload."

1. Create an unqualified lead (name + phone via quick capture).
2. Navigate to profile, assert score `0` / stage "Unqualified".
3. Click Edit, record the page's navigation id (to prove no full navigation).
4. Update: set `hasLand = true`, `landRegistered = true`, `landSizeSqm = 450`, `landWidth = 15`, `landDepth = 30`, `propertyType = first_home_buyer`, `budget = $650,000`, `seenBroker = true`, `constructionTimeline = ready_now`.
5. Click Save.
6. Assert: the edit form disappears, the score badge shows `85`, the stage label shows "Hot", the gap list shows the "No gaps" state. The URL did not change.
7. Reload the page manually and assert the same values persist (sanity check that the mutation actually wrote to the DB).

### Success Criteria

#### Automated Verification
- [x] `make test` passes
- [x] `make check` passes
- [ ] `make test_e2e` passes; the new edit-in-place test is green
- [ ] `yarn test:e2e:mobile` passes for the new test file (mobile viewport regression)

#### Manual Verification
- [ ] `/design_review` run again against the edit-mode branch passes
- [ ] Edit toggle feels snappy; Save button shows a loading state while the mutation is in flight
- [ ] Cancel discards unsaved changes and returns to the read-only view with original values
- [ ] A Zod error from the server surfaces on the correct field (e.g. invalid email)
- [ ] After save, the score/stage/gaps update visibly without a page reload
- [ ] HubSpot contact reflects the updated fields and the new `lead_score`/`lead_stage` within a few seconds

---

## Performance Considerations

- The page makes exactly one tRPC call (`leads.getById`) — prefetched on the server and hydrated on the client, so the user sees data on first paint without a round-trip.
- Phase 1 adds one extra awaited DB update per create/update (the re-score write). This is a localhost-to-Neon roundtrip and is negligible compared to the HubSpot call that already happens in the same path.
- No chart library, no icons beyond the existing `lucide-react` set — bundle impact is near-zero.
- The `score_metadata` JSONB blob is small (<2KB). Fetching it alongside the lead row is cheaper than a second query.

## Migration Notes

None. No schema changes. Existing leads created before Phase 1 may have `scoreMetadata === null`; the read-only view gracefully shows a "Score pending…" state for those, and any subsequent `update` will populate it. No backfill required — the pilot is in pre-PMF state with a tiny row count.

## References

- Issue: [samjmarshall/www#101](https://github.com/samjmarshall/www/issues/101)
- Parent epic: [samjmarshall/www#86](https://github.com/samjmarshall/www/issues/86)
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Dashboard UX, Data Model, Tech Architecture sections)
- Scoring engine plan: `thoughts/plans/2026-04-08-99-ai-qualification-scoring-engine.md`
- tRPC dual-client pattern: `src/trpc/server.tsx`, `src/trpc/react.tsx`
- Schema and enums: `src/server/db/schema/leads.ts`, `src/server/db/schema/enums.ts`
- Router to modify: `src/server/api/routers/leads.ts:20-56` (scoreLeadAsync), `:74-121` (create), `:190-242` (update)
- Scoring source of truth: `src/server/scoring/qualify-and-score.ts`, `src/server/scoring/score-factors.ts`, `src/server/scoring/schema.ts`
- E2E conventions: `e2e/features/leads-crud.spec.ts`, `e2e/pages/sections/lead-form.section.ts`, `e2e/utils/auth-helper.ts`, `e2e/utils/hubspot-helper.ts`
- Skills to apply: `frontend-design` during Phases 2 & 3 build; `/design_review` before completing each UI phase; `brand-guidelines` for colour/typography decisions
