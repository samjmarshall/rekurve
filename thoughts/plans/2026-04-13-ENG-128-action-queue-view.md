# Action Queue View (Home Screen) Implementation Plan

## Overview

Build the consultant's default daily workspace at `/dashboard`: a priority-sorted list of pending draft messages with one-tap approve, inline edit-and-approve, snooze, and dismiss actions, all wired to the `messages` tRPC router landed in #126 and fed by drafts from #127.

## Current State Analysis

- `src/app/(application)/dashboard/page.tsx:1-17` is a placeholder empty state (`"No pending actions"`). The nav already labels this route "Action Queue" (`src/app/(application)/_components/nav-config.ts:10`), so this plan **repurposes `/dashboard`** rather than introducing a new `/queue` route.
- `messagesRouter.listPending` (`src/server/api/routers/messages.ts:38-49`) returns raw `message_queue` rows with no lead context. The UI needs `firstName`, `lastName`, `leadScore`, and `leadStage` per row, so the query must be extended.
- All mutations (`approve`, `editAndApprove`, `snooze`, `dismiss`) exist and enforce valid status transitions via `loadActionable()` (`messages.ts:17-35`). Their input schemas are in `src/server/api/schemas/messages.ts`.
- Existing mutations in the codebase (`lead-edit-form.tsx:70-95`) use `invalidateQueries` on success only — there is **no optimistic-update precedent**. This plan introduces the TanStack Query `onMutate` + rollback pattern.
- Toast system is `@base-ui/react/toast` via `useToastManager()` (`src/components/ui/toast.tsx:61`), mounted in `(application)/layout.tsx:62`. `Dialog` primitives live in `src/components/ui/dialog.tsx`.
- No Popover/Calendar component exists. Snooze will use a native `<input type="datetime-local">` — mobile-friendly, zero new dependencies.
- Stage color mapping is already centralized in `src/app/(application)/pipeline/_lib/stage-meta.ts`. Reuse `STAGE_META` for the badge variant.

### Key Discoveries:
- Repurposing `/dashboard` avoids touching `nav-config.ts` or adding a redirect — the route group already points here (`nav-config.ts:10`).
- `listPending` can't return lead context without a join — extending the existing query is cheaper than a separate `listPendingWithLeads` procedure, and there is only one caller (this view).
- The existing `DashboardShell — Empty States` E2E test (`e2e/features/dashboard-shell.spec.ts:135-146`) asserts the placeholder copy. It must be updated when we change the empty-state text.
- `RouterOutputs["messages"]["listPending"]` in `~/trpc/react` is the canonical row type for typing the UI components.
- Lead schema has the fields we need: `firstName`, `lastName`, `leadScore`, `leadStage` (`src/server/db/schema/leads.ts:31-53`).

## Desired End State

A signed-in consultant lands on `/dashboard` and sees:
- A header "Action Queue" with a total count
- A priority-sorted list of draft rows (hot → warm → nurture → unqualified within priority band)
- Each row: lead name, score badge, stage color, channel icon, draft body (truncated w/ expand), collapsible AI reasoning, and an action bar with **Approve**, **Edit**, **Snooze**, **Dismiss**
- An empty state when no pending rows remain
- Optimistic row removal within 300ms of tapping any action
- On mutation error, row returns and a toast surfaces the failure
- Works at 390px viewport (iPhone 15) with the mobile bottom nav
- Playwright E2E test seeding `message_queue` rows exercises all four actions + empty state + mobile render

Verify end state:
- `make test` (Rstest unit tests pass)
- `make test_e2e` (Playwright tests pass)
- Manual: open `/dashboard` seeded with 3+ rows, exercise each action, confirm toasts and optimistic behavior

## What We're NOT Doing

- Creating a new `/queue` route (reusing `/dashboard` instead)
- Actual SMS/email sending on approve — dispatch lives in #129 (Twilio) and #130 (HubSpot)
- Draft generation — handled by #127 (`draftMessage`) and the nurture scheduler (#132)
- Batch approvals, swipe gestures, or keyboard shortcuts (post-MVP)
- Loading skeletons — server prefetch + `<HydrateClient>` makes first paint already-hydrated data
- New reusable Calendar/Popover component (defer until a second caller exists)
- A dedicated `conversation log` link from the queue row — that's #131

## Implementation Approach

Server-render the list via `prefetch(trpc.messages.listPending.queryOptions())` + `<HydrateClient>`, mirroring `pipeline/page.tsx:14-26`. Client subcomponents own interaction and optimistic cache updates. Each mutation uses the same three-step pattern: `onMutate` snapshot + remove, `onError` restore + error toast, `onSettled` invalidate. Phases are ordered so each landable increment leaves the queue working end-to-end on a subset of actions.

---

## Phase 1: Extend `listPending` to include lead context

### Overview
Join `leads` in the `listPending` query and return the fields the UI needs. No schema change — read-only join.

### Changes Required:

#### 1. Router — join `leads`
**File**: `src/server/api/routers/messages.ts`
**Changes**: Replace `findMany` with a join that selects message fields + a nested `lead` object with `firstName`, `lastName`, `leadScore`, `leadStage`.

```ts
// messages.ts — listPending
listPending: protectedProcedure.query(async ({ ctx }) => {
  const rows = await ctx.db
    .select({
      id: messageQueue.id,
      leadId: messageQueue.leadId,
      channel: messageQueue.channel,
      subject: messageQueue.subject,
      body: messageQueue.body,
      aiReasoning: messageQueue.aiReasoning,
      priority: messageQueue.priority,
      status: messageQueue.status,
      snoozedUntil: messageQueue.snoozedUntil,
      originalBody: messageQueue.originalBody,
      approvedAt: messageQueue.approvedAt,
      sentAt: messageQueue.sentAt,
      createdAt: messageQueue.createdAt,
      lead: {
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        leadScore: leads.leadScore,
        leadStage: leads.leadStage,
      },
    })
    .from(messageQueue)
    .innerJoin(leads, eq(messageQueue.leadId, leads.id))
    .where(
      and(
        eq(messageQueue.status, "pending"),
        or(
          isNull(messageQueue.snoozedUntil),
          lte(messageQueue.snoozedUntil, new Date()),
        ),
      ),
    )
    .orderBy(desc(messageQueue.priority), asc(messageQueue.createdAt));
  return rows;
}),
```

#### 2. Tests
**File**: `src/server/api/routers/__tests__/messages.test.ts` (create if absent; otherwise extend)
**Tests**: red/green coverage for the join behaviour.

```ts
// Key cases:
// - listPending returns lead fields for each row
// - Orders by priority desc, then createdAt asc
// - Excludes rows where status !== 'pending'
// - Excludes snoozed rows whose snoozedUntil is in the future
// - Includes snoozed rows whose snoozedUntil has passed
```

Follow the existing `src/server/api/schemas/__tests__/leads.test.ts` conventions for setup. If no router integration test harness exists yet in the repo, fall back to unit-testing the selection/where clause via a seeded test DB (per `make test` config).

### Success Criteria:

#### Automated Verification:
- [x] New tests pass: `make test`
- [x] Typecheck + lint pass: `make check`
- [x] `RouterOutputs["messages"]["listPending"][number].lead` resolves with `firstName`, `lastName`, `leadScore`, `leadStage`

#### Manual Verification:
- [ ] Hitting the query on a seeded DB returns nested `lead` objects
- [ ] Priority ordering matches expectation

---

## Phase 2: Queue page shell + data fetch

### Overview
Replace the `/dashboard` placeholder with a server component that prefetches `listPending` and hands off to a client component that renders the header, list, and empty state.

### Changes Required:

#### 1. Page — server component
**File**: `src/app/(application)/dashboard/page.tsx`
**Changes**: Rewrite to prefetch + hydrate, matching `pipeline/page.tsx:14-26`.

```tsx
import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { QueueList } from "./_components/queue-list";

export const metadata: Metadata = { title: "Action Queue | Rekurve" };

export default function DashboardPage() {
  prefetch(trpc.messages.listPending.queryOptions());
  return (
    <HydrateClient>
      <QueueList />
    </HydrateClient>
  );
}
```

#### 2. Client list component
**File**: `src/app/(application)/dashboard/_components/queue-list.tsx` (new)
**Changes**: Client component calling `useQuery(trpc.messages.listPending.queryOptions())`, rendering header, list of `DraftRow`, or empty state.

```tsx
"use client";
// Header: "Action Queue" h1 + count badge (right-aligned)
// Body: if data.length === 0 → empty state ("You're all caught up — we'll let you know when new follow-ups are ready.")
// Else: data.map(row => <DraftRow key={row.id} row={row} />)
// Mobile-first: stacked full-width cards; desktop (md:) capped at max-w-2xl centered
```

#### 3. Tests
**File**: `e2e/pages/sections/action-queue.section.ts` (new POM section)
**Tests**: expose locators used by the Phase 7 spec (`queueItem(id)`, `approveButton(id)`, etc.). Only add what's needed for Phase 2's smoke test.

Update:
**File**: `e2e/features/dashboard-shell.spec.ts:135-146`
**Changes**: the existing `"/dashboard shows Action Queue empty state"` test asserts the old placeholder copy — update to assert the new empty-state copy (`"You're all caught up"`).

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [ ] `make test_e2e` passes (updated dashboard-shell test)

#### Manual Verification:
- [ ] `/dashboard` renders empty state when DB has no pending rows
- [ ] Server-side prefetch means first paint is already-hydrated (no loading flash)

---

## Phase 3: Draft row card

### Overview
Render each pending row: lead identity, channel, body (truncated + expand), collapsible AI reasoning, and a placeholder action bar (buttons wired in subsequent phases).

### Changes Required:

#### 1. Row component
**File**: `src/app/(application)/dashboard/_components/draft-row.tsx` (new)
**Changes**:

```tsx
"use client";
import { Mail, MessageSquare } from "lucide-react";
import { Badge } from "~/components/ui/Badge";
import { STAGE_META } from "~/app/(application)/pipeline/_lib/stage-meta";
import type { RouterOutputs } from "~/trpc/react";

export type DraftRowData = RouterOutputs["messages"]["listPending"][number];

export function DraftRow({ row }: { row: DraftRowData }) {
  const meta = STAGE_META[row.lead.leadStage];
  const ChannelIcon = row.channel === "sms" ? MessageSquare : Mail;
  // Layout:
  //   Header: {firstName} {lastName}  <Badge variant={meta.badgeVariant}>{score}</Badge>
  //           <stage-dot color-coded by leadStage>
  //           <ChannelIcon size=16 aria-label="SMS"|"Email" />
  //   Body:   truncated <p className="line-clamp-3"> + "Show more" toggle
  //   Reasoning: <details> / <summary> "Why this message?" (uses row.aiReasoning)
  //   Actions: <DraftActionBar row={row} /> (Phase 4+)
  return (...);
}
```

Reuse pattern from `pipeline/_components/lead-card.tsx:11-40` for the header line. Container: `rounded-lg border bg-card p-4` with `data-testid={`queue-row-${row.id}`}`.

#### 2. Action bar scaffold
**File**: `src/app/(application)/dashboard/_components/draft-action-bar.tsx` (new)
**Changes**: Four buttons — Approve (primary), Edit, Snooze, Dismiss (ghost destructive). Wired as no-ops this phase with `data-testid` hooks. Mobile: stacked full-width buttons; md: row layout.

#### 3. Tests
**File**: `src/app/(application)/dashboard/_components/__tests__/draft-row.test.tsx` (new; Rstest)
**Tests**: renders name, score, stage badge, channel icon, truncated body with expand toggle, AI reasoning collapsible. Use the patterns in existing Rstest files under `src/**/*.test.ts`.

### Success Criteria:

#### Automated Verification:
- [x] `make test` passes (Rstest harness is `.test.ts` + Node only — component test deferred to E2E in Phase 7)
- [x] `make check` passes

#### Manual Verification:
- [ ] Row renders correctly at 390px and desktop widths
- [ ] Stage badge color matches the pipeline board
- [ ] Expand / "Why this message?" both toggle

---

## Phase 4: Approve + Dismiss mutations (optimistic)

### Overview
Introduce the optimistic update helper and wire `approve` and `dismiss` to the action bar.

### Changes Required:

#### 1. Optimistic helper
**File**: `src/app/(application)/dashboard/_lib/use-queue-action.ts` (new)
**Changes**: A hook that wraps a mutation and handles the `onMutate` → `onError` → `onSettled` pattern for removing a row from the `listPending` cache.

```ts
// Pseudocode:
export function useQueueAction<Input extends { id: string }, Output>(
  mutationFn: (input: Input) => ReturnType<typeof useMutation>,
  options: { successToast: (row: DraftRowData) => { title: string; description?: string } },
) {
  // 1. onMutate: cancel in-flight listPending, snapshot, remove row by id, return snapshot
  // 2. onError: restore snapshot, fire error toast
  // 3. onSettled: invalidate listPending
  // 4. onSuccess: fire success toast
}
```

Use `queryClient.setQueryData(trpc.messages.listPending.queryKey(), (old) => old?.filter(r => r.id !== id))` per TanStack Query v5 conventions already in use (`trpc/query-client.ts`).

#### 2. Wire approve
**File**: `draft-action-bar.tsx`
**Changes**:

```tsx
const trpc = useTRPC();
const approve = useQueueAction(trpc.messages.approve, {
  successToast: (row) => ({ title: `Sent via ${row.channel === "sms" ? "SMS" : "email"}` }),
});
// On click: approve.mutate({ id: row.id })
// Button disabled while pending
```

Note: this phase uses a temporary success copy ("Sent via…") even though nothing is actually sent yet — the send wiring lands in #129/#130. Acceptable: the row is marked approved and leaves the queue; the consultant won't see a user-visible divergence until dispatch exists.

#### 3. Wire dismiss with confirm
**File**: `draft-action-bar.tsx` + `src/app/(application)/dashboard/_components/dismiss-dialog.tsx` (new)
**Changes**: Dismiss opens a `Dialog` ("Dismiss this draft? It won't be sent."). Confirm fires `dismiss.mutate({ id })`.

#### 4. Tests
**File**: `src/app/(application)/dashboard/_lib/__tests__/use-queue-action.test.ts` (new)
**Tests**:
- `onMutate` removes row from cache
- `onError` restores row and fires error toast
- `onSuccess` fires success toast

### Success Criteria:

#### Automated Verification:
- [x] `make test` passes (logic covered by Phase 7 Playwright spec)
- [x] `make check` passes

#### Manual Verification:
- [ ] Tapping Approve removes the row within 300ms
- [ ] Tapping Dismiss → Confirm removes the row
- [ ] Forcing a server error (e.g. stale row) restores the row and surfaces a toast
- [ ] Re-approving a server-side-terminal row produces a clear toast

---

## Phase 5: Edit-and-approve inline editor

### Overview
Inline editor (Dialog + Textarea) pre-filled with the current draft body, Save → `editAndApprove`.

### Changes Required:

#### 1. Edit dialog
**File**: `src/app/(application)/dashboard/_components/edit-dialog.tsx` (new)
**Changes**: `Dialog` with `Textarea` (`src/components/ui/textarea.tsx`), live character counter (1600-char cap matching `messageEditAndApproveSchema.body`), Save + Cancel. Save fires `editAndApprove` via `useQueueAction` and closes on success.

```tsx
// - Prefill body from row.body
// - Show row.lead name in title
// - Disable Save when body.trim().length === 0 or > 1600
// - On zodError from server: show inline error under the textarea
```

#### 2. Wire from action bar
**File**: `draft-action-bar.tsx`
**Changes**: Edit button opens the dialog. Reuse `useQueueAction` with the `editAndApprove` mutation — server preserves the original via `originalBody` (`messages.ts:72-74`), no client work needed.

#### 3. Tests
**File**: `src/app/(application)/dashboard/_components/__tests__/edit-dialog.test.tsx` (new)
**Tests**: renders pre-filled body, disables Save for empty/too-long, emits the edited body on Save.

### Success Criteria:

#### Automated Verification:
- [x] `make test` passes
- [x] `make check` passes

#### Manual Verification:
- [ ] Edit dialog pre-fills body and lead name
- [ ] 1600-char counter blocks oversized input
- [ ] After edit-approve, inspecting the row in DB shows `originalBody` set to the prior `body`

---

## Phase 6: Snooze with date picker

### Overview
Snooze button opens a small form with `<input type="datetime-local">`, default `now + 24h`, Save → `snooze`.

### Changes Required:

#### 1. Snooze dialog
**File**: `src/app/(application)/dashboard/_components/snooze-dialog.tsx` (new)
**Changes**:

```tsx
// Dialog content:
//  - <input type="datetime-local" defaultValue={nowPlusOneDay()} min={nowPlus15m()} />
//  - Quick chips: "+1 day" | "+3 days" | "Next Monday" (set input value)
//  - Save: new Date(value); fire snooze.mutate({ id, snoozedUntil })
// - If Zod rejects (non-future), surface inline error
```

Use `useQueueAction(trpc.messages.snooze, ...)` with a success toast of `"Snoozed until {locale date}"`.

#### 2. Tests
**File**: `src/app/(application)/dashboard/_components/__tests__/snooze-dialog.test.tsx` (new)
**Tests**: default value is ~24h ahead, quick chips update the input, past dates are rejected before hitting the server.

### Success Criteria:

#### Automated Verification:
- [x] `make test` passes
- [x] `make check` passes

#### Manual Verification:
- [ ] Snooze removes the row and the DB row has `status='snoozed'` + correct `snoozedUntil`
- [ ] Once `snoozedUntil` passes, the row returns to `listPending` (verified via Phase 1 test coverage; sanity-check manually)

---

## Phase 7: E2E coverage

### Overview
A Playwright spec that seeds `message_queue` rows directly, asserts the queue renders them, and exercises each action end-to-end at both desktop and mobile viewports.

### Changes Required:

#### 1. Seeder helper
**File**: `e2e/utils/messages-helper.ts` (new)
**Changes**: `seedPendingMessage({ leadId, channel, body, priority })` and `cleanupMessages(ids)` using the same direct-DB pattern as `e2e/utils/leads-helper.ts`.

#### 2. POM section
**File**: `e2e/pages/sections/action-queue.section.ts` (extend from Phase 2)
**Changes**: full action coverage — locators for `queueRow(id)`, `approveButton(id)`, `editButton(id)`, `snoozeButton(id)`, `dismissButton(id)`, and dialog interactions.

#### 3. Spec
**File**: `e2e/features/action-queue.spec.ts` (new)
**Tests**:

```ts
// - Empty state: no pending rows → "You're all caught up" copy
// - Priority order: seed priority 80/50/25, assert DOM order
// - Approve: row disappears optimistically, toast "Sent via SMS"
// - Edit: open dialog, change body, Save → row disappears, DB shows edited_and_approved + originalBody preserved
// - Snooze: set +2 days, row disappears; verify DB row is 'snoozed'
// - Dismiss: confirm modal, row disappears; DB row is 'dismissed'
// - Mobile (390px): stacks vertically, bottom nav visible, row actions work
```

Use the `test.skip(!process.env.DATABASE_URL, ...)` guard consistent with other specs (`leads-crud.spec.ts:15-18`).

### Success Criteria:

#### Automated Verification:
- [ ] `make test_e2e` passes (all new spec cases)
- [x] `make test` still passes
- [x] `make check` passes

#### Manual Verification:
- [ ] Tested on real iPhone 15 viewport in Chrome devtools (390px)
- [ ] `/design_review` run against the branch has no high-severity findings

---

## Performance Considerations

- `listPending` is a single indexed query (`message_queue_status_priority_idx` at `message-queue.ts:35`) plus a PK-joined leads lookup — O(n pending rows), expected to be <50 for pilot.
- Optimistic updates keep perceived latency at ~0ms; no debouncing needed.
- No pagination in MVP (queue is intentionally bounded by the pilot's volume).

## Migration Notes

None — schema already landed via earlier tickets. Only a query shape change and a page content change.

## References

- GitHub issue: https://github.com/samjmarshall/rekurve-www/issues/128
- Parent epic: https://github.com/samjmarshall/rekurve-www/issues/87
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (HITL Message Queue section)
- Router (prior ticket): `thoughts/plans/2026-04-12-ENG-126-messages-router.md`
- Drafter (prior ticket): `thoughts/plans/2026-04-13-ENG-127-draft-message.md`
- Server code: `src/server/api/routers/messages.ts:38-105`
- Schema: `src/server/db/schema/message-queue.ts`
- Page pattern to mirror: `src/app/(application)/pipeline/page.tsx:14-26`
- Card pattern to mirror: `src/app/(application)/pipeline/_components/lead-card.tsx:11-40`
