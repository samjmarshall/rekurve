---
date: 2026-04-21
topic: E2E test coverage for the nurture scheduler flow
status: design
related:
  - PR #147 (feat/132-nurture-scheduler)
  - Issue #132
---

# Nurture scheduler — end-to-end test design

## Problem

PR #147 ships the nurture scheduler (auto-start on lead create/update, daily Vercel Cron that drafts messages into `message_queue`, partial unique index on `nurture_sequences(lead_id) WHERE status='active'`). The PR has two unchecked acceptance criteria that both hinge on `yarn db:migrate` having been run:

- Drafts appear in the action queue once the migration runs.
- Manual: age a sequence forward via `POST /api/dev/nurture/advance`, run the cron, confirm a draft appears in the action queue.

Current E2E coverage does not exercise any of this. `leads.create` and `leads.update` wrap `startOrUpdateSequence` in `.catch()` (`src/server/api/routers/leads.ts:142`, `:270`), so a missing migration or broken nurture wiring does not surface through the normal lead-create path — lead creation returns 200 regardless. No existing spec hits the cron route, and the unit tests for the scheduler and cron route both mock `draftFn` and the DB, so they cannot catch migration drift, bearer-auth wiring, or the UI read path.

The test gap this design closes: **prove, on every PR, that (1) the migration has been applied, (2) auto-start writes a real `nurture_sequences` row, (3) the cron route authorizes correctly and drafts a pending message, and (4) the draft renders in the action queue UI.**

## Scope

**In scope.** A Playwright E2E spec covering the full flow from lead create through cron invocation to action-queue render. A small AI-stub mechanism driven by a request header so the test does not burn Anthropic tokens per run. Helper functions for DB-level seeding and assertion of `nurture_sequences`/`message_queue`. A CI wiring change that runs `yarn db:migrate` before the Playwright web server boots.

**Out of scope.** Real-LLM smoke tests and offline/online evaluation suites — deferred to a separate ticket that will cover local, CI, and synthetic monitoring against production. Neon per-PR branch infrastructure — deferred unless cross-PR flake emerges on the shared preview DB. Rate-limiting of the `x-ai-stub` header beyond the existing `CRON_SECRET` gating — flagged as a known gap.

## Approach

Vertical-slice E2E: one spec, three tests, exercises UI + backend + DB + cron HTTP + UI together. The spec follows the existing `e2e/features/action-queue.spec.ts` pattern (direct Neon DB helpers, cookie-based auth via `createTestSession`, per-spec cleanup plus global teardown marker). The cron route is invoked directly from Playwright using `playwright.request.newContext()` with a bearer header — this is Vercel's canonical way to trigger cron in a test, since Vercel itself only fires cron on production deployments.

The migration is asserted *implicitly*: if the table or the partial unique index is missing, the first test's DB assertion that a `nurture_sequences` row exists will fail. No separate meta-inspection step is needed.

## AI stub mechanism

The cron route currently calls `runSchedulerTick(db)` with no second argument (`src/app/api/cron/nurture-scheduler/route.ts:15`), so `draftMessage` always hits Anthropic. We add a generic `x-ai-stub` request header that any AI-touching route honours when the caller is already authenticated.

**New file: `src/server/ai/stub.ts`**

Exports `resolveDraftFn(req: Request): DraftFn | undefined`. Reads `x-ai-stub` off the incoming request. Returns `undefined` when absent (callers fall back to real `draftMessage`). Returns a deterministic stub when the header is `"1"`.

The helper does not enforce auth — it trusts the route to gate first, then pass the request in. This keeps per-route auth logic centralised (cron routes gate on `CRON_SECRET`; user-facing routes will gate on admin session). The stub re-uses real `selectChannel(lead)` and `computePriority(lead)` so lead-shape-dependent branching is still exercised; only the LLM token-generation is faked.

**Stub shape:**

```
channel: selectChannel(lead)
subject: channel === 'sms' ? null : '[ai-stub] subject'
body:    `[ai-stub] body for ${lead.id}`
aiReasoning: '[ai-stub]'
priority: computePriority(lead)
```

**Route wiring.** `src/app/api/cron/nurture-scheduler/route.ts:15` changes from `runSchedulerTick(db)` to:

```ts
const draftFn = resolveDraftFn(req);
const result = await runSchedulerTick(db, draftFn);
```

No other route changes in this ticket. When future AI-touching routes land they adopt the same two-line pattern.

**Observability.** Every stubbed invocation logs `[ai-stub] route=/api/cron/nurture-scheduler leadId=<id>` at info level. The `[ai-stub]` prefix in `body`/`aiReasoning` is the durable audit trail on the row itself — ops can `SELECT count(*) FROM message_queue WHERE body LIKE '[ai-stub]%'` to measure stub traffic in production if the header is ever abused.

**Production safety.** The header is only honoured when the request is already authenticated by the route's own auth. Anonymous `x-ai-stub: 1` requests are ignored. `CRON_SECRET` secrecy is the primary gate — same surface as the cron route itself.

## E2E test structure

**New spec: `e2e/features/nurture-scheduler.spec.ts`**

Guarded by `test.skip(!process.env.DATABASE_URL, 'DB required')`. `createTestSession` in `beforeAll`, `deleteTestSession` in `afterAll`. Lead/sequence/message IDs collected during each test and cleaned up in `afterEach`.

**Test 1 — Auto-start on lead create (migration gate).**

Flow: UI navigates to `/leads/new`, fills the form with `firstName: 'Nurture'` and `email: e2e-<uuid>@test.rekurve.dev`, submits. After submission, resolve the new lead's ID via the existing `getLeadIdByPhone` helper pattern. Assert `getActiveSequenceByLead(leadId)` returns `{ sequenceType: 'discovery', nextStepAt: <~3 days out> }`.

**This is the migration gate.** If the `nurture_sequences` table, `sequence_type_enum`/`sequence_status_enum`, or the partial unique index is missing, the `INSERT` inside `startOrUpdateSequence` either throws (caught and swallowed) or succeeds but the row shape doesn't match — either way the assertion fails with a clear message. The `.catch()` in `leads.create` stays untouched; we rely on the DB assertion to surface the failure, not on lead-create erroring out. This preserves the intended production behaviour where lead creation does not break if nurture infra is degraded.

**Test 2 — Cron drafts a pending message.**

Flow: seed a lead + active sequence directly via DB helpers (skip HubSpot round-trip for speed). `POST /api/dev/nurture/advance` with `{ sequenceId }` via Playwright's per-test `request` fixture to backdate `nextStepAt` by one minute. `GET /api/cron/nurture-scheduler` via `playwright.request.newContext({ extraHTTPHeaders: { Authorization: 'Bearer <CRON_SECRET>', 'x-ai-stub': '1', 'x-vercel-protection-bypass': <bypass> } })`. Assert response status 200 and body `{ drafted: 1, failed: 0 }`. Poll `getPendingMessagesByLead(leadId)` (2s interval, 10s timeout) until a row exists; assert `status === 'pending'` and `body` starts with `[ai-stub]`.

The cron response assertion runs *before* the DB read, so a count mismatch surfaces at the API layer before the DB assertion muddies the signal.

**Test 3 — Action queue renders the draft.**

Continuation of Test 2 (same seeded lead and message). Navigate to `/dashboard`. Assert `queue-row-<messageId>` is visible. Assert `queue-row-body-<messageId>` contains the stubbed body substring. Exercises the tRPC read path, the dashboard render, and the per-row `data-testid` wiring (`src/app/(application)/dashboard/_components/draft-row.tsx:39`).

## Helpers

**New file: `e2e/utils/nurture-helper.ts`**

- `seedActiveSequence({ leadId, sequenceType, nextStepAt })` — direct Neon `INSERT` into `nurture_sequences`.
- `getActiveSequenceByLead(leadId)` — returns `{ id, sequenceType, nextStepAt } | null`.
- `getPendingMessagesByLead(leadId)` — returns an array of message rows scoped to the lead; used both for row-existence assertion and for resolving the message ID for UI locators.
- `waitForPendingMessage(leadId, { intervalMs: 2000, timeoutMs: 10000 })` — polling wrapper over `getPendingMessagesByLead`, modeled on `waitForLeadField` in `e2e/utils/hubspot-helper.ts:235`.
- `cleanupSequences(ids: string[])` — scoped DELETE.
- `cronRequestContext()` — returns a pre-configured `APIRequestContext` with `Authorization: Bearer <CRON_SECRET>`, `x-ai-stub: 1`, and `x-vercel-protection-bypass` (matching the existing `playwright.config.ts:33-39` pattern). Caller is responsible for `ctx.dispose()`.

**Append `"Nurture"` to `TEST_FIRST_NAMES`** in `e2e/utils/hubspot-helper.ts:112` and `e2e/utils/auth-helper.ts:99` so global teardown sweeps any leaked rows.

## Environment and CI wiring

- `CRON_SECRET` must be available to the Playwright process. Add it to the CI workflow env block and to `playwright.config.ts` env passthrough.
- `playwright.config.ts:46-50` — change `webServer.command` from `rm -rf .next/ && yarn preview` to `rm -rf .next/ && yarn db:migrate && yarn preview`. Migrations run against whatever `DATABASE_URL` the environment provides. Local developers are unaffected — they already run migrations manually and `reuseExistingServer` prevents re-runs mid-session.
- If the pooled Neon connection produces read-after-write visibility gaps, the `waitForPendingMessage` poll absorbs it. If flake persists, switch the DB helpers to `DATABASE_URL_UNPOOLED`.

## Error handling and resilience

- Cron response assertion precedes DB assertion; layered failure surface.
- Polling with 10s ceiling on DB reads; no indefinite waits.
- Each test generates a fresh lead ID; no shared mutable state between tests. Serial mode not needed.
- `afterEach` cleanup is scoped to IDs collected during the test. Global teardown is the backstop via the `Nurture` first-name marker and `e2e-*@test.rekurve.dev` email pattern.
- The `.catch()` swallow in `leads.create` / `leads.update` stays. The DB assertion is the correct signal here — we explicitly do not want a flaky nurture backend to start blocking production lead creation.

## Known gaps and follow-ups

- **No per-request rate limit on `x-ai-stub`.** A leaked `CRON_SECRET` could flood `message_queue` with stub rows. Addressed at the `CRON_SECRET` auth layer rather than per-header; tracked as a broader secrets-hygiene concern.
- **No real-LLM smoke test.** Deferred to the eval-suite ticket (offline + CI + synthetic monitoring against production).
- **Shared preview DB.** Concurrent PR runs rely on ID-scoped cleanup + unique lead markers. If cross-PR flake emerges, adopt Neon per-PR branching per the pattern in `neondatabase/neon-playwright-example`.
- **`page.route()` not usable for server-side LLM calls.** Documented here so nobody reaches for it in future AI-path tests; the `x-ai-stub` header pattern is the convention.

## References

- `src/app/api/cron/nurture-scheduler/route.ts:15` — cron route call site (to be modified)
- `src/server/nurture/scheduler.ts:83` — `runSchedulerTick(db, draftFn?)` existing injectable seam
- `src/server/api/routers/leads.ts:142,270` — `.catch()` swallow points
- `src/app/(application)/dashboard/_components/draft-row.tsx:39` — per-row `data-testid`
- `e2e/features/action-queue.spec.ts` — closest existing pattern
- `e2e/utils/messages-helper.ts` — Neon client pattern
- `e2e/utils/auth-helper.ts:39` — `createTestSession`
- `e2e/utils/hubspot-helper.ts:235` — polling pattern
- `playwright.config.ts:33-39,46-50` — protection-bypass header wiring, web server config
- Vercel — [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- Neon — [E2E Playwright Tests with Neon Branching](https://neon.com/guides/e2e-playwright-tests-with-neon-branching)
- Playwright — [API Testing / APIRequestContext](https://playwright.dev/docs/api-testing)
