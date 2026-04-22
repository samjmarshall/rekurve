# Nurture Scheduler + `nurture` tRPC Router Implementation Plan

## Context
The action queue only fills when the consultant manually captures or edits leads. Without a nurture scheduler, warm/nurture leads go cold between touches, defeating the core follow-up-compliance value of Epic 3. This ticket fleshes out the `nurture` tRPC router (currently a 7-line stub at `src/server/api/routers/nurture.ts:1`), adds a background scheduler that queries due sequences and inserts drafts into `message_queue` on cadence, and wires auto-start/stop into the leads flow so every new or re-scored lead gets a stage-appropriate sequence without manual action.

## Current State
- **Nurture router stub** — `src/server/api/routers/nurture.ts:3-7` exposes a single `getActive` query returning `[]`. Registered in `src/server/api/root.ts:13` as `nurture`.
- **Schema ready** — `nurture_sequences` table exists at `src/server/db/schema/nurture-sequences.ts:6-26` with `leadId`, `sequenceType`, `status` (default `"active"`), `nextStepAt` (nullable timestamptz), and a `(leadId, status)` index. Enums `sequenceTypeEnum` (`discovery|nurture|warm_progression|lot_alert`) and `sequenceStatusEnum` (`active|paused|completed`) live at `src/server/db/schema/enums.ts:89-100`.
- **Lead stage enum** — `src/server/db/schema/enums.ts:25-30` defines `unqualified|nurture|warm|hot`.
- **Draft helper landed** — `draftMessage(input)` at `src/server/ai/draft-message.ts:20-70` returns `{ channel, subject, body, aiReasoning, priority }` and already primes Claude's prompt cache with `cache_control: { type: "ephemeral" }` (line 48), so sequential calls within one scheduler tick amortize the system prompt.
- **Message insertion path** — `message_queue` schema at `src/server/db/schema/message-queue.ts` accepts `leadId, channel, subject, body, aiReasoning, priority, status` (default `"pending"`); the messages router at `src/server/api/routers/messages.ts:37-136` exposes no insert procedure — drafts are inserted server-side only, which the scheduler will do directly via `ctx.db.insert(messageQueue)`.
- **Lead create hook point** — `leadsRouter.create` at `src/server/api/routers/leads.ts:138` returns `await scoreLead(...)`. Auto-start must run between `scoreLead()` and the return.
- **Lead re-score hook point** — `leadsRouter.update` at `src/server/api/routers/leads.ts:251-253` calls `scoreLead()` when any field in `SCORING_FIELDS` (lines 64-77) changes. Stage-change handler attaches here.
- **No cron infrastructure** — no `vercel.json` in repo root; no `src/app/api/cron/` directory; no `CRON_SECRET` in `src/env.js:9-32`. Must be added.
- **Test conventions** — rstest (`@rstest/core`). Server modules tested by direct call (`src/server/scoring/__tests__/qualify-and-score.test.ts:1-10`). Routers tested via `createCaller` with `rs.doMock()` for `~/env`, `~/lib/session`, `~/server/db` (`src/server/api/__tests__/messages-router.test.ts:26-57`). Schemas tested in `src/server/api/schemas/__tests__/`.

## Desired End State
- `nurture` router exposes `listActive`, `startSequence`, `pauseSequence`, `resumeSequence`; the `getActive` stub is removed.
- Every new lead created via `leadsRouter.create` gets exactly one active `nurture_sequences` row whose `sequenceType` matches the post-scoring stage (unqualified→`discovery`, nurture→`nurture`, warm→`warm_progression`); `hot` gets no sequence.
- Stage transitions via `leadsRouter.update` update `sequenceType` and recompute `nextStepAt`; transitions into `hot` complete the sequence.
- Partial unique index `nurture_active_one_per_lead_uidx ON (lead_id) WHERE status = 'active'` prevents duplicate active sequences at the DB level.
- A Vercel Cron-triggered route `GET /api/cron/nurture-scheduler` (authenticated via `CRON_SECRET`) runs every 15 minutes, queries `status='active' AND nextStepAt <= now()`, and for each due row: calls `draftMessage(lead)` sequentially, inserts the result into `message_queue` with `status='pending'`, and advances `nextStepAt` by the stage-specific cadence (3/14/7 days).
- A dev-only helper `POST /api/dev/nurture/advance` sets `nextStepAt = now() - 1 minute` for a given sequence id, gated by `NODE_ENV !== "production"`, so the scheduler can be manually triggered end-to-end in staging.
- Drafts inserted by the scheduler are visible in the action queue (`messages.listPending`) because the insert uses `status='pending'` and null `snoozedUntil`.

## Out of Scope
- Sequence analytics, open/click tracking, or touchpoint history beyond what `nurture_sequences` already stores.
- Lot-alert nurture (`sequenceTypeEnum` value `lot_alert`) — belongs to a separate matching flow.
- Any UI for the nurture router (no page, no action-queue tab) — consumption is via the existing action queue (#128).
- Retry/backoff semantics for `draftMessage` failures — failures are logged and the sequence's `nextStepAt` still advances to avoid a poison row blocking the whole tick.
- Idempotency keys on `message_queue` inserts — out-of-tick dedup is not required because the scheduler only inserts after advancing `nextStepAt`.
- Concurrency control across simultaneous cron invocations — Vercel Cron guarantees serial firing per path, which is sufficient.

## Approach
Two vertical slices. **Slice 1** builds the cadence logic, state transitions, and router procedures as a pure module (`src/server/nurture/scheduler.ts`) plus a thin tRPC surface, with a partial unique index migration for the active-per-lead invariant. **Slice 2** wires auto-start/stop into `leadsRouter.create`/`update` and adds the Vercel Cron route, the dev-advance route, and the `CRON_SECRET` env var. Tests ship inside each slice per `tdd` skill. Sequencing is strict: the scheduler module is pure and the only async I/O is DB reads/writes plus the existing `draftMessage()` call, so it can be unit-tested without mocking Claude.

## Phase 1: Nurture core — schemas, router, scheduler module, migration

### Changes
- `src/server/api/schemas/nurture.ts` — new: export `startSequenceSchema` (`{ leadId: uuid, sequenceType: sequenceTypeSchema }`), `pauseSequenceSchema` (`{ id: uuid }`), `resumeSequenceSchema` (`{ id: uuid }`), `sequenceTypeSchema` enum mirroring `sequenceTypeEnum` from `src/server/db/schema/enums.ts:89-94`, `sequenceStatusSchema` mirroring lines 96-100. Follow the enum-mirroring pattern in `src/server/api/schemas/leads.ts:5-39`.
- `src/server/api/schemas/__tests__/nurture.test.ts` — new: rejects non-uuid ids, rejects invalid enum values, accepts all four `sequenceType` values, accepts all three `sequenceStatus` values. Mirror `src/server/api/schemas/__tests__/leads.test.ts` style.
- `src/server/nurture/scheduler.ts` — new: pure business-logic module.
  - `SEQUENCE_TYPE_BY_STAGE: Record<LeadStage, SequenceType | null>` = `{ unqualified: "discovery", nurture: "nurture", warm: "warm_progression", hot: null }`.
  - `CADENCE_DAYS: Record<SequenceType, number>` = `{ discovery: 3, nurture: 14, warm_progression: 7, lot_alert: 7 }` (lot_alert unused here but included for completeness).
  - `computeNextStepAt(sequenceType: SequenceType, from: Date = new Date()): Date` — pure.
  - `startOrUpdateSequence(db, leadId, stage): Promise<void>` — encapsulates "given a post-scoring stage, transition this lead's sequence to the right state": if `stage === 'hot'`, mark any active sequence `completed`; else upsert an active sequence (insert if none, update `sequenceType` + `nextStepAt` if existing sequenceType differs).
  - `runSchedulerTick(db): Promise<{ drafted: number; failed: number }>` — query `nurture_sequences` join `leads` where `status='active' AND nextStepAt <= now()`; for each row, call `draftMessage({ lead })`, insert `message_queue` row with `status='pending'`, advance `nextStepAt = computeNextStepAt(sequenceType)`, update `updatedAt`. Sequential loop (not `Promise.all`) to amortize the Claude prompt cache. Per-row try/catch: log error, still advance `nextStepAt` so one bad row doesn't block the tick. Returns counts for logging.
- `src/server/nurture/__tests__/scheduler.test.ts` — new: rstest, direct-call style. Cover:
  - `computeNextStepAt` returns +3/+14/+7 days for the three real sequence types.
  - `SEQUENCE_TYPE_BY_STAGE.hot === null`.
  - `runSchedulerTick` skips sequences where `nextStepAt > now()`.
  - `runSchedulerTick` advances `nextStepAt` and inserts a `message_queue` row with `status='pending'` for each due sequence (mock `draftMessage`).
  - `runSchedulerTick` continues past a thrown `draftMessage` and still advances `nextStepAt` on the failed row.
  - `startOrUpdateSequence('hot')` marks any active sequence `completed` and does not insert.
  - `startOrUpdateSequence('nurture')` when no row exists inserts one with the right `sequenceType` and `nextStepAt`.
  - `startOrUpdateSequence('warm')` when an existing `nurture` sequence is active updates `sequenceType` to `warm_progression` and recomputes `nextStepAt`.
- `src/server/api/routers/nurture.ts` — rewrite: replace `getActive` stub with:
  - `listActive` — `ctx.db.query.nurtureSequences.findMany({ where: eq(status, 'active'), with: { lead: true } })`. Since `protectedProcedure` already scopes to the authenticated user but `nurture_sequences` has no direct user column, the scope is "all leads in the tenant" (same pattern as `leads.list` at `src/server/api/routers/leads.ts:153-206`, which also returns all leads without a user filter).
  - `startSequence` — validates input with `startSequenceSchema`; rejects if an active sequence already exists for the lead (returns `BAD_REQUEST`); otherwise inserts with `nextStepAt = computeNextStepAt(sequenceType)`.
  - `pauseSequence` — loads by id; rejects if status is not `active` (`BAD_REQUEST`); updates to `status='paused'` and clears `nextStepAt`.
  - `resumeSequence` — loads by id; rejects if status is not `paused`; updates `status='active'` and `nextStepAt = computeNextStepAt(row.sequenceType)` (from-now, per ticket "recompute").
- `src/server/api/__tests__/nurture-router.test.ts` — new: mirror `messages-router.test.ts:1-100` setup (mock `~/env`, `~/lib/session`, `~/server/db`, `createCaller`). Cover:
  - `listActive` returns only active rows.
  - `startSequence` rejects duplicate active (`BAD_REQUEST`).
  - `pauseSequence` transitions active→paused and nulls `nextStepAt`; rejects from non-active state.
  - `resumeSequence` transitions paused→active and sets `nextStepAt` to a future date; rejects from non-paused state.
- `src/server/db/schema/nurture-sequences.ts` — edit lines 22-26: add partial unique index `uniqueIndex("nurture_active_one_per_lead_uidx").on(table.leadId).where(sql\`status = 'active'\`)` alongside the existing index.
- `drizzle/NNNN_add_nurture_active_unique.sql` — new migration: `CREATE UNIQUE INDEX "nurture_active_one_per_lead_uidx" ON "nurture_sequences" ("lead_id") WHERE "status" = 'active';`. Generated via `yarn db:generate` (per CLAUDE.md — never use `drizzle-kit push`).

### Success
**Automated**
- [x] `make check` passes
- [x] `make test` passes (new tests: `nurture.test.ts`, `scheduler.test.ts`, `nurture-router.test.ts`)
- [x] `make build` passes

**Manual**
- [ ] Run `yarn db:migrate`; verify partial index exists via `\d nurture_sequences` in a `psql` session.
- [ ] Insert two `active` rows for the same `lead_id` manually — second insert fails with unique violation.
- [ ] Via a local tRPC caller, call `nurture.startSequence` twice for the same lead — second call returns `BAD_REQUEST`.

## Phase 2: Auto-start wiring + cron + dev helper

### Changes
- `src/env.js` — edit line 30 area: add `CRON_SECRET: z.string().min(16)` to `server` block and to `runtimeEnv` (lines 48-62). Marks it required in prod; document in a follow-up env-setup note that Vercel Cron auto-sets this.
- `src/server/api/routers/leads.ts` — edit:
  - Import `startOrUpdateSequence` from `~/server/nurture/scheduler`.
  - Line 138 (`create`): after `scoreLead(...)` returns the scored lead, call `await startOrUpdateSequence(ctx.db, scored.id, scored.leadStage)` before returning. Wrap in try/catch that logs and swallows so nurture failure cannot block lead create (same philosophy as the HubSpot push at lines 55-57).
  - Lines 251-253 (`update`): when `hasQualificationChange` is true, after `scoreLead()` returns the re-scored lead, call `startOrUpdateSequence(ctx.db, scored.id, scored.leadStage)` with the same try/catch/log wrapper.
- `src/server/api/__tests__/leads-router.test.ts` — edit: add two tests.
  - `create` auto-starts a nurture sequence for an unqualified/nurture/warm stage lead (mock `startOrUpdateSequence`, assert called with post-scoring stage).
  - `update` with a qualification-field change calls `startOrUpdateSequence` with the new stage.
- `src/app/api/cron/nurture-scheduler/route.ts` — new: Next.js route handler, `GET`. Validates `Authorization: Bearer ${env.CRON_SECRET}` header (Vercel Cron sets this automatically). Calls `runSchedulerTick(db)`. Returns `{ drafted, failed }` JSON. Marks the route `export const dynamic = "force-dynamic"` to prevent static optimization.
- `src/app/api/cron/nurture-scheduler/__tests__/route.test.ts` — new: unit-test the handler with a mocked `runSchedulerTick` and verify auth-header enforcement (401 without header, 200 with correct bearer).
- `src/app/api/dev/nurture/advance/route.ts` — new: `POST` with `{ sequenceId: uuid }`. Returns 404 when `env.NODE_ENV === "production"`. Sets `nextStepAt = new Date(Date.now() - 60_000)` on the target sequence. Follows the pattern of `src/app/api/dev/session/` (already in repo per directory listing).
- `vercel.json` — new: root-level `{ "crons": [{ "path": "/api/cron/nurture-scheduler", "schedule": "*/15 * * * *" }] }`. Every 15 minutes gives near-real-time nurture without burning API quota.

### Success
**Automated**
- [x] `make check` passes
- [x] `make test` passes (new route tests; updated leads-router tests)
- [x] `make build` passes

**Manual**
- [ ] Create a new lead via the UI with qualification data that lands in the `nurture` stage. In the DB, confirm exactly one `nurture_sequences` row exists for that lead with `sequenceType='nurture'`, `status='active'`, `nextStepAt` ≈ now + 14 days.
- [ ] Update the same lead's qualification to land in `warm`. Confirm the existing row's `sequenceType` becomes `warm_progression` and `nextStepAt` becomes ≈ now + 7 days (no new row).
- [ ] Update the lead again to land in `hot`. Confirm the row's `status` becomes `completed` and `nextStepAt` is null/ignored.
- [ ] Start a fresh `nurture`-stage lead, `POST /api/dev/nurture/advance` with that sequence id, then `GET /api/cron/nurture-scheduler` with the `Authorization: Bearer ${CRON_SECRET}` header. Confirm: (a) a new `message_queue` row with `status='pending'` for that lead, (b) sequence's `nextStepAt` advanced by 14 days, (c) row visible in the action queue view at `/dashboard`.
- [ ] Pause the sequence via `nurture.pauseSequence`; re-run `/api/cron/nurture-scheduler`; confirm no new draft inserted.
- [ ] Resume; confirm `nextStepAt` is set to ≈ now + 14 days; re-run cron; confirm new draft.
- [ ] Hit `/api/cron/nurture-scheduler` with no Authorization header → 401. With wrong bearer → 401. With correct bearer but no due sequences → 200 with `{ drafted: 0, failed: 0 }`.

## References
- Ticket: https://github.com/samjmarshall/rekurve/issues/132
- Epic: https://github.com/samjmarshall/rekurve/issues/87
- Prior plans (pattern): `thoughts/plans/2026-04-13-ENG-127-draft-message.md`, `thoughts/plans/2026-04-12-ENG-126-messages-router.md`
- Schema: `src/server/db/schema/nurture-sequences.ts:6-26`, `src/server/db/schema/message-queue.ts`, `src/server/db/schema/enums.ts:25-30,89-100`
- Draft helper: `src/server/ai/draft-message.ts:20-70`
- Lead hook points: `src/server/api/routers/leads.ts:138,251-253`; scoring side-effect model: `src/server/api/routers/leads.ts:29-61`
- Router patterns: `src/server/api/routers/leads.ts:79-300`, `src/server/api/routers/messages.ts:37-136`
- Test patterns: `src/server/api/__tests__/messages-router.test.ts:1-100`, `src/server/scoring/__tests__/qualify-and-score.test.ts:1-10`
- Migration workflow: `CLAUDE.md` "Database Migrations" section — always `yarn db:generate` + `yarn db:migrate`
