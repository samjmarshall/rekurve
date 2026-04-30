# Immediate Lead Follow-Up Automation

**Date:** 2026-04-29
**Branch:** `claude/lead-followup-automation-akwSH`
**Status:** Design — ready for ticket / plan

---

## Goal

When a sales consultant adds a qualified lead, the system must:

1. Generate a tailored SMS draft within seconds (not 3 days).
2. Track whether the consultant actually sent it.
3. Schedule a durable 24-hour follow-up that fires only when the lead has not replied.
4. Capture inbound replies — even when they live in the consultant's personal phone — so we can see qualification depth and measure conversion.

Together these close three of the four gaps the consultant team currently feels: speed-to-lead (A), qualification depth (C), and consultant follow-through (D). Message quality (B) is already covered by the existing AI-draft system.

## Background

The MIT Lead Response Management Study found firms contacting leads within 5 minutes are 21× more likely to qualify them than firms waiting 30 minutes. The current system delays the first AI-drafted message by 3 days, violating the 5-minute rule by four orders of magnitude.

Vercel Cron's free tier runs once per day, so we cannot poll for state changes at the cadence this work requires. Inngest delivers events within seconds, retries on failure, and supports durable multi-step workflows via `step.sleep` — making it the canonical pick on this stack.

## Current state

Verified directly in the codebase:

- **Lead create** at `src/server/api/routers/leads.ts:81` writes the lead row, scores it, and inserts a `nurture_sequences` row with `nextStepAt = now + 3 days`. No draft is generated on create.
- **Cadence config** at `src/server/nurture/scheduler.ts:18` is a flat `Record<SequenceType, number>` of repeating delay days. There is no notion of step #1 vs step #2 content.
- **Draft generation** at `src/server/ai/draft-message.ts:20` accepts only `{ lead }` — no step index, no prior-message context.
- **Scheduler tick** at `src/server/nurture/scheduler.ts:83` polls `nurture_sequences` for due rows and calls `draftMessage()` then inserts into `message_queue`.
- **Send tracking** is partial. `messageStatusEnum` is `pending | approved | edited_and_approved | dismissed | snoozed` — no `sent`. Email auto-dispatch writes `sentAt`; SMS only transitions to `approved`, leaving the system unable to distinguish "consultant clicked Approve" from "consultant pasted into their phone and sent."
- **Reply capture** does not exist. No Twilio, no inbound webhook, no UI surface. The `conversations` table has an `inbound`/`outbound` direction enum but no code path inserts inbound rows.

## Scope

### In scope

1. Trigger the first AI draft immediately on lead create.
2. Add `sent` to the message status enum and a "Mark sent" action for SMS that records `sentAt` plus an outbound `conversations` row.
3. Auto-schedule the next nurture step 24 hours after `sent`, cancelled if a reply is logged in the meantime.
4. Manual reply-capture button — consultant pastes the lead's reply text, we insert an inbound `conversations` row.
5. Replace `runSchedulerTick()` with Inngest event-driven functions, fronted by a transactional outbox.

### Out of scope (deferred)

- Twilio or any business-routed SMS path.
- AI parsing of pasted replies into structured BANT/CHAMP fields.
- Lead self-serve qualification form.
- Auto-enrichment (Clearbit, Apollo, ZoomInfo).
- Multi-channel sequencing beyond SMS and the existing email path.
- Step-aware prompt variation in `draftMessage()`. Revisit when AI-on-reply work begins.

## Architecture

The polled scheduler is replaced by Inngest functions driven by three events. Events leave the database via a transactional outbox so an Inngest outage cannot lose work.

### Events

- **`lead/created`** — emitted at the end of `leads.create` after the DB transaction commits. Handler calls `draftMessage()` and inserts a `message_queue` row.
- **`message/sent`** — emitted when the consultant clicks "Mark sent" on an SMS draft, or when `email-dispatch.ts` writes `sentAt` for email. Handler runs `step.sleep("24h")`, then checks `conversations` for a reply; if absent, drafts the next nurture step.
- **`message/replied`** — emitted when the consultant pastes a reply into the queue card. Cancels any in-flight `message-sent` follow-up via `cancelOn` keyed on `data.leadId`.

### Outbox pattern

A new `outbox` table receives an event row inside the same DB transaction as the business write. Two delivery paths run in parallel:

- **Inline (fast path):** after the transaction commits, `after()` from `next/server` calls `inngest.send()` with `event.id = outbox.id`. On success we stamp `sent_to_inngest_at`.
- **Sweep (safety net):** an Inngest cron function runs every minute and re-publishes outbox rows where `sent_to_inngest_at IS NULL AND created_at < now() - INTERVAL '30 seconds'`. Inngest dedupes by event ID, so inline successes never double-fire.

### State of record

`nurture_sequences` remains the per-lead cadence-step bookkeeping table — gains a `current_step INTEGER` counter so subsequent steps can identify themselves. Inngest run state is operational, not authoritative.

### Migration path

`runSchedulerTick()` keeps running for 1–2 weeks alongside Inngest to catch orphaned `nurture_sequences` rows. Delete after the new path proves itself on real leads.

## Data model changes

All migrations run via `make db_generate` then `make db_migrate` per CLAUDE.md.

### New table: `outbox`

```
id                 uuid primary key
event_name         text not null
payload            jsonb not null
created_at         timestamptz not null default now()
sent_to_inngest_at timestamptz
attempt_count      integer not null default 0
```

Index: `(sent_to_inngest_at NULLS FIRST, created_at)` for the sweep query.

Sweep uses `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100` to avoid worker contention.

### `message_status` enum

Add `'sent'` value. Email-dispatch and the new SMS "Mark sent" action both transition rows into this state. `sentAt` is no longer email-only.

### `message_queue` columns

- `step_index INTEGER NOT NULL DEFAULT 0` — identifies position in the cadence (0 = first touch).
- Partial unique index: `ON message_queue (lead_id, step_index) WHERE status != 'dismissed'`. Prevents double-fires from manual re-triggers or stale outbox events; allows regeneration when a draft is dismissed.

### `nurture_sequences` columns

- `current_step INTEGER NOT NULL DEFAULT 0` — increments when a follow-up step fires.
- `step_delay_seconds INTEGER NOT NULL DEFAULT 86400` — per-row sleep duration so cadence is tunable without redeploys. Default 24h matches our research.

### `conversations` columns

- `client_dedup_id UUID` — nullable, populated only for rows written via `logReply`.
- Partial unique index: `ON conversations (message_queue_id, client_dedup_id) WHERE direction = 'inbound' AND client_dedup_id IS NOT NULL`. Lets the API return the existing row on replay rather than erroring.

## Data flow

### Path A: lead added → first draft → sent → 24h follow-up

1. Consultant submits the lead form. tRPC `leads.create` runs one DB transaction:
   - HubSpot upsert.
   - Lead insert.
   - `scoreLead()`.
   - `nurture_sequences` row, `current_step = 0`, `next_step_at = now()`.
   - Outbox row: `{ event_name: "lead/created", payload: { leadId } }`.
2. Transaction commits. Response returns to the consultant. `after()` fires `inngest.send("lead/created", { leadId }, { id: outboxId })`. On success, outbox row stamped.
3. Inngest `lead-created` handler:
   - `step.run("draft", () => draftMessage({ lead }))`.
   - `step.run("queue", () => insert into message_queue { step_index: 0, status: 'pending' })`.
4. Draft visible in the consultant's queue within seconds.
5. Consultant clicks "Mark sent". `messages.approve` mutation, in one tx:
   - Update `message_queue` set `status = 'sent'`, `sentAt = now()`.
   - Insert outbound `conversations` row with the draft body.
   - Outbox row: `{ event_name: "message/sent", payload: { messageId, leadId } }`.
6. After commit, `inngest.send("message/sent", ...)`.
7. Inngest `message-sent` handler:
   - `step.sleep` reads `nurture_sequences.step_delay_seconds`, then sleeps that long.
   - `step.run("check-reply", () => query conversations for inbound row > sentAt)`. If a reply exists, exit. Otherwise, increment `current_step`, draft step #2, insert into `message_queue` at `step_index = current_step`.

### Path B: lead reply logged

1. Consultant pastes reply text into the queue card and submits. `logReply` mutation:
   - Insert inbound `conversations` row with `client_dedup_id` from the form.
   - Outbox row: `{ event_name: "message/replied", payload: { leadId, messageQueueId, replyText } }`.
2. After commit, `inngest.send("message/replied", ...)`.
3. Inngest `message-replied` handler cancels any in-flight `message-sent` follow-up via `cancelOn: { event: "message/replied", if: "event.data.leadId == async.data.leadId" }`. Cadence pauses; control returns to the human.

The `replyText` field on the `message/replied` payload is a forward-compat seam. When AI-on-reply work begins, the handler can pass it to `draftMessage()` for a context-aware response without changing the schema or API.

## Error handling, retries, idempotency

### Idempotency

- Every outbox row has a uuid `id` used as the Inngest event ID. Inngest dedupes by event ID, so sweep re-publishes of inline-successful sends do not double-fire downstream.
- `message_queue` partial unique on `(lead_id, step_index) WHERE status != 'dismissed'` prevents duplicate inserts at the same cadence step.
- `messages.approve` is idempotent on status — `sent → sent` is a no-op.
- `logReply` upserts on `(message_queue_id, client_dedup_id)` for inbound rows. Replays return the original row, never an error.
- Client disables the submit button on click — defense layer one.

### Retries

Inngest defaults (4 retries, exponential backoff up to ~24h) cover transient `draftMessage`, Anthropic, and DB blips. `step.run` memoization means only the failed step re-runs on retry.

### Race conditions

- **Reply lands during `step.sleep("24h")`:** `cancelOn` cancels the pending follow-up before `check-reply` runs. Inngest's documented semantics — both overlapping sleeps for the same lead get cancelled, which matches our intent.
- **Reply lands after sleep wakes but before `check-reply` queries:** `check-reply` reads `conversations` at execution time, so the reply is visible. Worst case, step #2 drafts and the `message-replied` event arrives shortly after, cancelling step #2's downstream follow-up. Acceptable.
- **Lead deleted mid-cadence:** every step guards on lead existence and exits cleanly.
- **Anthropic outage beyond Inngest's retry window:** step terminates failed. Card never enters the queue. Visible in the Inngest dashboard. Surfacing failures in our UI is a future ops concern.
- **HubSpot upsert failure inside `leads.create`:** entire transaction rolls back; no outbox row written. Consultant sees an error and retries.

## Testing strategy

All test runs go through `@agent-codebase-verification` per CLAUDE.md — never `make test` or `make test_e2e` directly via Bash.

### Unit (Rstest)

- `buildOutboxPayload` and event-emitter helpers — pure functions.
- Status-transition guards in `messages.approve`.
- `cancelOn` predicate construction for the leadId-match expression.
- Channel-selection regression coverage after wrapper changes.

### Integration (real Neon branch — never mock the database)

- `leads.create` atomicity: lead row, `nurture_sequences` row, and outbox row all visible after commit; forced HubSpot failure rolls all three back.
- `logReply` ON CONFLICT path: two calls with the same `clientDedupId` return the same `conversations` row id without raising. Calls without `clientDedupId` both succeed.
- `message_queue` partial unique behaviour: second insert at the same step fails for active rows, succeeds when the prior row is dismissed.
- Outbox sweep idempotency: write a row, run sweep twice, confirm second pass is a no-op.

### Inngest function tests

Use `@inngest/test` to invoke handlers with synthetic events. Mock the Anthropic client at the function boundary so CI does not burn API credits. Assert DB side effects directly. Do not test `step.sleep` durations — that is Inngest's domain; verify manually via the local dev server.

### E2E (Playwright, `make test_e2e`) — one spec only

Per CLAUDE.md "don't TDD E2E":

1. Create a lead via tRPC with a unique phone (`Date.now()` + random suffix).
2. Poll the queue page until the draft appears (≤30s timeout).
3. Click "Mark sent".
4. Paste reply text, submit.
5. Assert no follow-up draft appears within 10s — proving cadence cancellation worked.

`afterAll`: delete the lead and the HubSpot contact by phone; assert the HubSpot contact is gone.

**Locator audit (blocking gate per CLAUDE.md):** every new interactive element gets a `data-testid` in the source component before the spec ships. Restart the dev server after adding test IDs.

### Manual QA before merge

- End-to-end smoke on `fix-ui.www.localhost` (linked worktree per CLAUDE.md).
- Watch Inngest dashboard for `lead/created` event delivery and downstream runs.
- Confirm draft visible in queue within seconds.
- Force a `draftMessage` failure (mock 5xx) and confirm Inngest retries via dashboard.

## Open items / future work

- **AI-on-reply drafting.** When consultants ask for it, swap the no-op body of `message-replied` for a `draftMessage()` call that takes the reply as context. Will require extending `DraftMessageInput` with a `replyContext` field and adding 1–3 lines to the prompt builder. The `replyText` payload is already wired through.
- **Step-aware prompt variation.** Same trigger as above — when the AI starts seeing replies, also start telling it which iteration this is.
- **Twilio / business-routed SMS.** Eliminates the manual paste step and gives us inbound replies for free. Adds TCPA compliance burden.
- **Failure surfacing in the UI.** A small "ops" panel listing failed Inngest runs so consultants don't silently lose drafts.
- **Body-hash dedup safety net on `conversations`.** Add the day a second ingestion path (Twilio webhook, HubSpot inbound) lands.

## References

### Codebase

- `src/server/api/routers/leads.ts:81` — `leadsRouter.create`.
- `src/server/nurture/scheduler.ts:18,83,106` — cadence config, scheduler tick, `draftMessage` call site.
- `src/server/ai/draft-message.ts:20` — `draftMessage()` entry.
- `src/server/ai/prompts.ts` — system and user prompt construction.
- `src/server/ai/channel-selection.ts:12` — SMS vs email choice.
- `src/server/db/schema/message-queue.ts` — current `message_queue` schema.
- `src/server/db/schema/nurture-sequences.ts` — current `nurture_sequences` schema.
- `src/server/db/schema/enums.ts:71` — `messageStatusEnum`.
- `src/server/db/schema/conversations.ts` — `conversations` table with unused `inbound` direction.
- `src/server/api/routers/messages.ts` — queue mutations (`approve`, `editAndApprove`, `snooze`, `dismiss`).
- `src/server/dispatch/email-dispatch.ts:68` — `sentAt` write path.
- `src/app/api/hubspot/webhook/route.ts:108` — HubSpot inbound webhook (no SMS reply ingestion).

### External

- MIT Lead Response Management Study (Oldroyd) — 21× / 100× speed-to-lead figures.
- Stripe — *Designing robust APIs with idempotency* (canonical idempotency-key pattern, 24h TTL, hidden form field).
- Vercel Cron Jobs documentation — daily floor on Hobby tier.
- Inngest — `step.sleep`, `cancelOn`, retry defaults, event ID dedup.
- HubSpot, Salesloft — content-hash vs field-priority dedup approaches in mature CRM platforms.
