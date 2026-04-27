# Conversation Log on Lead Profile Implementation Plan

## Context

The lead profile page currently shows scoring, qualification gaps, and lead details, but the consultant has no way to see the message history for a lead in one place. Tickets #129 (Twilio) and #130 (HubSpot email) write rows to the existing `conversations` table on send; this ticket renders that history below the scoring section so the consultant has full context when reviewing a lead. Inbound rows are not yet populated (deferred with iMessage/ADR-001) but the rendering must already handle them.

## Current State

- **Schema is ready.** `conversations` (`src/server/db/schema/conversations.ts:7-26`) has every field needed (`channel`, `direction`, `deliveryMethod`, `subject`, `body`, `messageQueueId`, `createdAt`) plus `conversations_lead_id_idx`. `messageQueue.originalBody` (`src/server/db/schema/message-queue.ts:27`) is populated only on first edit by `messages.editAndApprove` (`src/server/api/routers/messages.ts:105`), so its presence is the signal that a sent message was edited.
- **Schema is exported.** `src/server/db/schema/index.ts:2` re-exports `conversations`.
- **Component stub exists.** `<ConversationHistory />` (`src/app/(application)/leads/[id]/_components/conversation-history.tsx:1-25`) is a Card with `data-testid="lead-profile-conversation-history"`, mounted in the right column at `lead-profile-view.tsx:85`. Currently takes no props.
- **No `conversationsRouter` yet.** Sibling `messagesRouter` (`src/server/api/routers/messages.ts:37-136`) is the pattern to mirror; wired in at `src/server/api/root.ts:8-14`.
- **Relative-time helper lives in pipeline.** `formatLastContact` at `src/app/(application)/pipeline/_lib/format-last-contact.ts:14-29` uses `Intl.RelativeTimeFormat` and returns "2 hours ago" form. Used today in pipeline only.
- **No popover component.** `src/components/ui/` has `dialog.tsx` but no popover. `Badge` (`src/components/ui/Badge.tsx:5-26`) variants: `default | amber | brand | coral | success | outline`.
- **Icons.** `lucide-react` v0.563.0. `MessageSquare` for SMS, `Mail` for email already used in `src/app/(application)/dashboard/_components/draft-row.tsx:3`.
- **E2E plumbing.** `LeadProfileSection` (`e2e/pages/sections/lead-profile.section.ts:33,61-63`) already has a `conversationHistory` Locator. `e2e/utils/messages-helper.ts` exposes `seedLead` and `seedPendingMessage` via direct Neon SQL — no `seedConversation` peer yet.
- **Blocker resolved.** Issue #126 (router plumbing) closed 2026-04-12.

## Desired End State

- Visiting `/leads/{id}` shows a "Conversation history" Card in the right column populated with all `conversations` rows for that lead, ordered newest-first. The Card's content area has a `max-h` with internal scroll once the list grows beyond the visible area.
- Each row renders: channel icon (`MessageSquare`/`Mail`), direction label (Sent/Received), email subject when present, body, and relative timestamp ("2 hours ago").
- Outbound rows linked to a `message_queue` row whose `originalBody` differs from the sent `body` show an `Edited` pill. Clicking the pill expands an inline disclosure beneath the sent body that shows the original draft. Clicking again collapses it.
- Empty state renders the copy "No messages yet — drafts will appear in the action queue." with the existing `MessageCircle` glyph treatment.
- Layout is usable at ~390px viewport (mobile-first); Card stacks below the qualification gaps card on small screens (already the case via the existing grid).
- The relative-time helper lives in `src/lib/` and is consumed by both pipeline and lead profile without cross-feature `_lib` imports.

## Out of Scope

- Inbound message ingestion (covered by iMessage/ADR-001 work).
- Manual-reply send affordance / composer in the conversation card (the action queue is the send surface).
- Pagination — pilot volumes don't justify it; revisit if any lead exceeds ~50 messages.
- Adding a `popover` component to the UI library.
- Real-time / live-updating list (consultant refreshes via natural navigation; no WS/poll).
- Editing or deleting historical conversation rows.

## Approach

Build a thin standalone `conversationsRouter` with a single `list({ leadId })` query that joins `message_queue.originalBody` so the "edited" detection lives server-side. Hoist the existing relative-time helper to `src/lib/` so both consumers import cleanly. Replace the empty-state stub with a real list component that renders chronological items with channel/direction styling and an inline-expand `Edited` pill. Cover the router with unit tests mirroring `messages-router.test.ts`, and assert the rendered behaviour end-to-end with a new `seedConversation` helper.

## Phase 1: Hoist relative-time helper

### Changes

- `src/app/(application)/pipeline/_lib/format-last-contact.ts` — delete after move.
- `src/lib/format-relative-time.ts` (new) — move the file verbatim; keep export name `formatLastContact`. Add a one-line file header comment only if needed for API clarity.
- `src/app/(application)/pipeline/_components/*.tsx` — update existing import(s) to `~/lib/format-relative-time`. Locate via `grep -rn "format-last-contact"` before editing.
- `src/lib/__tests__/format-relative-time.test.ts` (new) — characterization tests covering the existing branches (null/undefined → "Never contacted"; seconds, minutes, hours, days, weeks, months, years; "a long time ago" fallback). These tests pin the current behaviour before any other phase touches it.

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes (new characterization tests included)
- [ ] `make build` passes

**Manual**
- [ ] Pipeline page still renders relative timestamps unchanged at `/pipeline`.

## Phase 2: `conversationsRouter` with `list({ leadId })`

### Changes

- `src/server/api/schemas/conversations.ts` (new) — Zod schema:
  ```ts
  export const conversationsListSchema = z.object({ leadId: z.string().uuid() });
  ```
  Mirrors `src/server/api/schemas/messages.ts:14-21` style.
- `src/server/api/routers/conversations.ts` (new) — single `list` procedure, protected. Uses the chainable `select().from().leftJoin().where().orderBy()` pattern from `src/server/api/routers/messages.ts:38-79`. Selects:
  ```
  conversations.id, leadId, channel, direction, deliveryMethod,
  subject, body, createdAt,
  messageQueue.originalBody AS originalBody
  ```
  `LEFT JOIN message_queue ON conversations.messageQueueId = message_queue.id`, `WHERE conversations.leadId = $1`, `ORDER BY conversations.createdAt DESC`. Returns the array directly.
- `src/server/api/root.ts` — add `conversations: conversationsRouter` to the `appRouter` map.
- `src/server/api/__tests__/conversations-router.test.ts` (new) — Rstest unit tests, mirroring `src/server/api/__tests__/messages-router.test.ts:1-152` structure:
  - mock `~/env`, `~/lib/session`, `~/server/db`
  - chainable `mockSelectListConversations` helper for `select().from().leftJoin().where().orderBy()`
  - **test:** returns rows ordered newest-first
  - **test:** returns `[]` when the lead has no conversations
  - **test:** surfaces `originalBody` when the row's `messageQueueId` resolves to an edited queue row
  - **test:** `originalBody` is `null` when no `messageQueueId` link or no edit
  - **test:** rejects non-uuid `leadId` with `BAD_REQUEST`
  - **test:** scopes the `where` clause to the requested `leadId` (assert the chainable `where` was called)

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes (`conversations-router.test.ts` green)
- [ ] `make build` passes

**Manual**
- [ ] tRPC client autocomplete shows `trpc.conversations.list` in IDE.

## Phase 3: Conversation log UI (replace stub)

### Changes

- `src/app/(application)/leads/[id]/_components/conversation-history.tsx` — rewrite:
  - Accept `{ leadId: string }` prop.
  - `useTRPC().conversations.list.queryOptions({ leadId })` via `useQuery`.
  - Loading: existing Card shell + a small skeleton (a single muted bar). Reuse the `lead-profile-loading` semantic — testid `lead-profile-conversation-history-loading`.
  - Error: testid `lead-profile-conversation-history-error`, copy "Couldn't load messages. Refresh to try again."
  - Empty: existing `MessageCircle` icon + new copy *"No messages yet — drafts will appear in the action queue."* (single `<p>` with `data-testid="lead-profile-conversation-empty"`).
  - Non-empty: scroll container `<ul>` with `max-h-[28rem] overflow-y-auto` (and unstyled list semantics) inside `<CardContent>`. Renders `<ConversationItem>` per row keyed by id. Newest at top.
- `src/app/(application)/leads/[id]/_components/conversation-item.tsx` (new) — single row:
  - Top line: channel icon (`MessageSquare` for `sms`, `Mail` for `email`), direction label ("Sent" for `outbound`, "Received" for `inbound`), relative timestamp via `formatLastContact`.
  - Visual: outbound right-aligned with `bg-primary/5` bubble, inbound left-aligned with `bg-muted` bubble. Bubble `max-w-[85%]`. Outer flex flips `justify-end` vs `justify-start` by direction.
  - Subject line: rendered only when `channel === "email"` and `subject != null`, semi-bold, single-line truncation on overflow.
  - Body: `whitespace-pre-wrap break-words text-sm`.
  - Edited pill: when `originalBody != null && originalBody !== body`, render `<Badge variant="outline">` containing a `<button>` ("Edited", small chevron icon — `ChevronDown` collapsed / `ChevronUp` expanded). Toggling reveals an inline disclosure beneath the sent body inside the same bubble: a muted-bg block labelled "Original draft" with the `originalBody` text. Use `useState` for the open boolean. The button gets `aria-expanded` and `aria-controls`.
  - testids: `lead-profile-conversation-item-{id}`, `lead-profile-conversation-edited-pill-{id}`, `lead-profile-conversation-original-{id}`.
- `src/app/(application)/leads/[id]/_components/lead-profile-view.tsx` — pass `leadId={lead.id}` to `<ConversationHistory />` (line 85).
- `src/app/(application)/leads/[id]/_lib/conversation-display.ts` (new) — small pure helpers (kept testable without React):
  - `directionLabel(direction): "Sent" | "Received"`
  - `channelIcon(channel): typeof MessageSquare | typeof Mail` (or return a key the component maps — pick whichever keeps the test pure)
  - `wasEdited({ originalBody, body }): boolean`
- `src/app/(application)/leads/[id]/_lib/__tests__/conversation-display.test.ts` (new) — direct unit tests over those helpers (no DOM), one test per helper plus the edge cases for `wasEdited` (`null` originalBody, equal strings, differing strings).

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes (`conversation-display.test.ts` green)
- [ ] `make build` passes

**Manual**
- [ ] At `/leads/{id}` with seeded conversations: list renders newest-first with correct channel icons and direction alignment.
- [ ] Edited outbound row shows the `Edited` pill; clicking expands and collapses the original draft inline.
- [ ] Lead with no conversations shows the new empty-state copy.
- [ ] Card scrolls internally once content exceeds `max-h-[28rem]`; outer page scroll position is unaffected.
- [ ] At ~390px viewport, the card sits below the qualification gaps card and remains readable; bubbles don't overflow horizontally.
- [ ] `/design_review` on the right-column card.

## Phase 4: E2E coverage

### Changes

- `e2e/utils/messages-helper.ts` — add:
  - `seedConversation({ leadId, channel, direction, body, subject?, messageQueueId?, deliveryMethod?, createdAt? })` — direct SQL insert into `"conversations"`.
  - `seedEditedQueueMessage({ leadId, channel, body, originalBody })` — inserts a `message_queue` row whose `original_body` differs from `body`, returns `{ id }`. Used to back an edited outbound conversation.
  - `cleanupConversations(ids: string[])` — `DELETE FROM "conversations" WHERE id = ANY($1::uuid[])`.
- `e2e/pages/sections/lead-profile.section.ts` — extend `LeadProfileSection`:
  - `conversationItems: Locator` (all items)
  - `conversationItem(id: string): Locator`
  - `conversationEmpty: Locator`
  - `editedPill(id: string): Locator`
  - `conversationOriginal(id: string): Locator`
  - helper `expectConversationCount(n: number)`
- `e2e/features/lead-profile.spec.ts` — add a `test.describe("Lead Profile — Conversation history")` block guarded by `test.skip(!process.env.DATABASE_URL, ...)` matching the existing pattern at line 16. Per-spec cleanup tracks ids in `afterAll` (per CLAUDE.md E2E guardrails). Tests:
  - **empty state** — fresh lead, no conversations seeded → `conversationEmpty` visible with the expected copy; `conversationItems` count is 0.
  - **renders newest-first** — seed three outbound conversations with explicit `created_at` 5min/30min/2h ago; assert DOM order matches newest-first; assert relative timestamp text contains "minute"/"hour" appropriately.
  - **edited pill toggles original** — seed a `message_queue` row via `seedEditedQueueMessage`, then a conversation linked via `messageQueueId` whose `body` matches the queue's edited body. `editedPill` visible; click; `conversationOriginal` appears with the original body text; click again; original collapses (`not.toBeVisible()`).
  - **email subject renders only for email** — seed one `email` row with subject and one `sms` row without; assert subject text on the email row only.

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes
- [ ] `make build` passes
- [ ] `make test_e2e` passes (new specs included)

**Manual**
- [ ] Per-spec `afterAll` cleans seeded conversation ids and lead phones — re-run the spec twice locally and confirm no row leakage in `conversations` (`SELECT COUNT(*) FROM conversations` unchanged).
- [ ] Locator audit per CLAUDE.md "E2E Testing" gate: every locator in changed/added section methods uses `getByTestId()` (or attribute selectors via `data-testid`), not `getByRole`/`getByText`/`getByLabel`/CSS. If any fall through, add the `data-testid` to the source component, kill the Next.js server, rebuild, and re-run.

## References

- Ticket: https://github.com/samjmarshall/www/issues/131
- Parent epic: `thoughts/epics/2026-03-27-epic-3-hitl-message-queue-nurture.md` (deliverable 7, success criterion line 108)
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md:189-194` (iMessage/inbound), `:380-388` (`conversations` schema)
- Conversations table: `src/server/db/schema/conversations.ts:7-26`
- Message queue + `originalBody` write: `src/server/db/schema/message-queue.ts:27`, `src/server/api/routers/messages.ts:105`
- Stub component: `src/app/(application)/leads/[id]/_components/conversation-history.tsx:1-25`
- Mount point: `src/app/(application)/leads/[id]/_components/lead-profile-view.tsx:85`
- Router pattern to mirror: `src/server/api/routers/messages.ts:37-80`
- Router test pattern to mirror: `src/server/api/__tests__/messages-router.test.ts:75-152`
- Relative-time helper to hoist: `src/app/(application)/pipeline/_lib/format-last-contact.ts:14-29`
- E2E section to extend: `e2e/pages/sections/lead-profile.section.ts:13-114`
- E2E spec to extend: `e2e/features/lead-profile.spec.ts`
- E2E seed helpers to extend: `e2e/utils/messages-helper.ts`
