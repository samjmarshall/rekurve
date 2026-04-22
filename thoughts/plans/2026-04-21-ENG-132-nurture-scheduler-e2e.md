# Nurture Scheduler E2E Coverage Implementation Plan

## Context
PR #147 ships the nurture scheduler but leaves two acceptance criteria unchecked because they hinge on `yarn db:migrate` having run against the target DB. Current coverage cannot catch migration drift, bearer-auth wiring, or the action-queue read path — `leads.create`/`leads.update` wrap `startOrUpdateSequence` in `.catch()` (`src/server/api/routers/leads.ts:142`, `:266-276`), so a broken nurture backend does not surface through the normal lead-create path. This plan closes the gap with a single Playwright spec exercising the full flow from lead create → cron invocation → action-queue render, plus an AI stub so the test does not burn Anthropic tokens.

## Current State
- **Cron route** — `src/app/api/cron/nurture-scheduler/route.ts:15` calls `runSchedulerTick(db)` with no injected `draftFn`, so `draftMessage` always hits Anthropic.
- **Injectable seam** — `src/server/nurture/scheduler.ts:83-86` already accepts `runSchedulerTick(db, draftFn?)`; fallback to real `draftMessage` at lines 87-88. Internal `DraftFn` type at line 9 is not exported.
- **Auto-start wiring** — `startOrUpdateSequence` already called in `leads.create` at `src/server/api/routers/leads.ts:142` and `leads.update` at lines 266-276, both swallowed by `.catch()`.
- **Dev advance route** — `src/app/api/dev/nurture/advance/route.ts` exists and backdates `nextStepAt` by 60s (gated by `env.NODE_ENV !== "production"`).
- **AI helpers** — `selectChannel(lead)` at `src/server/ai/channel-selection.ts:12`, `computePriority(lead)` at `src/server/ai/priority.ts:29`. Types `DraftMessageInput`/`DraftMessageOutput`/`LeadRow` exported from `src/server/ai/schema.ts`.
- **No `x-ai-stub` references** anywhere in the repo (grep: 0 matches). This is a brand-new pattern.
- **No `src/server/ai/stub.ts`** — `src/server/ai/` contains `draft-message.ts`, `schema.ts`, `channel-selection.ts`, `priority.ts`, `anthropic-client.ts`, `prompts.ts`.
- **Env schema** — `src/env.js:31` already declares `CRON_SECRET: z.string().min(16)` and includes it in `runtimeEnv` (line 63).
- **E2E patterns** — closest existing spec is `e2e/features/action-queue.spec.ts`; Neon client + helper pattern at `e2e/utils/messages-helper.ts:1-10`; polling at `e2e/utils/hubspot-helper.ts:235-254` (`waitForLeadField`); lead-id lookup at `e2e/utils/leads-helper.ts:21-29` (`getLeadIdByPhone`); session helpers at `e2e/utils/auth-helper.ts:39-71` (`createTestSession`, `deleteTestSession`).
- **Teardown markers** — `TEST_FIRST_NAMES` lives in `e2e/utils/auth-helper.ts:98-101` (DB sweep) and `e2e/utils/hubspot-helper.ts:112-125` (HubSpot sweep); `e2e/utils/global-teardown.ts:13-29` imports from both — no third copy.
- **Playwright config** — `playwright.config.ts:43-50` webServer runs `rm -rf .next/ && yarn preview` locally (skipped in CI where tests hit a deployed URL). `extraHTTPHeaders` pattern at lines 33-39 for Vercel bypass secret.
- **CI workflow** — `.github/workflows/post-deploy.yml:86-91` runs `yarn db:migrate` before E2E; env block at lines 111-120 passes `DATABASE_URL`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `BETTER_AUTH_SECRET`, `HUBSPOT_*` but **not** `CRON_SECRET`.
- **Dashboard testids** — `src/app/(application)/dashboard/_components/draft-row.tsx:39` (`queue-row-${row.id}`) and line 79-80 (`queue-row-body-${row.id}`).

## Desired End State
- Every PR runs a Playwright spec that proves (1) the nurture migration has applied, (2) auto-start writes a real `nurture_sequences` row, (3) the cron route authorizes correctly and drafts a pending message via a stubbed AI path, and (4) the draft renders in the dashboard action queue.
- A generic `x-ai-stub: 1` header is honoured by routes that already authenticate the caller; the cron route is the first consumer. Stubbed drafts are observably marked with a `[ai-stub]` prefix in `body`/`aiReasoning` so production ops can audit usage.
- CI (`post-deploy.yml`) passes `CRON_SECRET` through to the Playwright process; local `webServer` runs `yarn db:migrate` before `yarn preview`.
- The `.catch()` swallows in `leads.create`/`leads.update` remain untouched — the DB assertion in Test 1 is the migration gate.

## Out of Scope
- Real-LLM smoke tests and offline/online eval suites (deferred to a separate ticket).
- Neon per-PR branching (deferred unless cross-PR flake emerges on the shared preview DB).
- Per-request rate limit on the `x-ai-stub` header (gated only by `CRON_SECRET` for now — tracked as a broader secrets-hygiene concern).
- Adopting the `x-ai-stub` pattern in non-cron AI routes (no such routes exist today; future AI-touching routes adopt the same two-line wiring when they land).
- Changes to `startOrUpdateSequence`, `runSchedulerTick`, or the dev-advance route (all already in place on `feat/132-nurture-scheduler`).

## Approach
Three phases. **Phase 1** lands the AI stub module and the one-line cron-route change, with a unit test — no E2E surface yet, so the stub infra can be reviewed independently. **Phase 2** builds the E2E scaffolding (DB helpers, teardown markers, `webServer` migration step, CI env passthrough) without introducing a spec that would fail in CI due to missing plumbing. **Phase 3** adds the spec itself as three tests, using `test.describe.configure({ mode: 'serial' })` for Tests 2→3 so the cron-drafted row can be asserted end-to-end in the UI. The migration is asserted *implicitly* via Test 1's DB read — no separate meta-inspection step.

## Phase 1: AI stub module + cron route wiring

### Changes
- `src/server/ai/stub.ts` — new module. Exports `resolveDraftFn(req: Request): DraftFn | undefined` where `DraftFn = (input: DraftMessageInput) => Promise<DraftMessageOutput>` (types re-exported from `~/server/ai/schema`). Reads `x-ai-stub` off the request; returns `undefined` when absent. When header is `"1"`, returns a deterministic async function that computes:
  ```ts
  {
    channel: selectChannel(lead),
    subject: channel === 'sms' ? null : '[ai-stub] subject',
    body: `[ai-stub] body for ${lead.id}`,
    aiReasoning: '[ai-stub]',
    priority: computePriority(lead),
  }
  ```
  Logs `[ai-stub] route=<url.pathname> leadId=<id>` at `console.info` on each invocation. Does not enforce auth — trusts the caller.
- `src/server/ai/__tests__/stub.test.ts` — new rstest spec covering:
  - `resolveDraftFn` returns `undefined` when `x-ai-stub` header is absent.
  - `resolveDraftFn` returns `undefined` for any `x-ai-stub` value other than `"1"` (e.g. `"0"`, empty string).
  - When header is `"1"`, the returned fn produces output whose `channel` matches `selectChannel(lead)` and `priority` matches `computePriority(lead)` (use fixtures from `src/server/ai/__tests__/fixtures.ts`).
  - `body` starts with `[ai-stub] body for ` and includes `lead.id`.
  - `subject` is `null` for an SMS-selected lead and `'[ai-stub] subject'` for an email-selected lead.
  - Invocation logs to `console.info` with the `[ai-stub]` prefix (spy on `console.info`).
- `src/app/api/cron/nurture-scheduler/route.ts:15` — edit: replace `const result = await runSchedulerTick(db);` with:
  ```ts
  const draftFn = resolveDraftFn(request);
  const result = await runSchedulerTick(db, draftFn);
  ```
  Import `resolveDraftFn` from `~/server/ai/stub`.
- `src/app/api/cron/nurture-scheduler/__tests__/route.test.ts` — extend: add a case where the request carries `Authorization: Bearer <secret>` + `x-ai-stub: 1` and `runSchedulerTick` is a spy; assert the spy was called with a non-undefined `draftFn` whose first invocation yields an output whose `body` starts with `[ai-stub]`.

### Success
**Automated**
- [x] `make check` passes
- [x] `make test` passes (new `stub.test.ts`; updated `route.test.ts`)
- [x] `make build` passes

**Manual**
- [ ] Start a local dev server (`make start`), create an active `nurture_sequences` row manually pointing at a real lead, `POST /api/dev/nurture/advance`, then `curl -H 'Authorization: Bearer $CRON_SECRET' -H 'x-ai-stub: 1' https://www.localhost/api/cron/nurture-scheduler`. Confirm response is `{"drafted":1,"failed":0}` and a `message_queue` row appears whose `body` starts with `[ai-stub]`.
- [ ] Repeat without the `x-ai-stub` header and confirm the real `draftMessage` path runs (message body is natural-language output, not the stub prefix). Skip if Anthropic key is not configured locally.

## Phase 2: E2E scaffolding — helpers, teardown markers, config, CI

### Changes
- `e2e/utils/nurture-helper.ts` — new file. Uses the Neon client pattern from `e2e/utils/messages-helper.ts:1-10`. Exports:
  - `seedActiveSequence(args: { leadId: string; sequenceType: 'discovery' | 'nurture' | 'warm_progression' | 'lot_alert'; nextStepAt: Date }): Promise<{ id: string }>` — direct `INSERT INTO nurture_sequences` with `status='active'`; returns the new id.
  - `getActiveSequenceByLead(leadId: string): Promise<{ id: string; sequenceType: string; nextStepAt: Date | null } | null>` — `SELECT id, sequence_type, next_step_at FROM nurture_sequences WHERE lead_id=$1 AND status='active' LIMIT 1`.
  - `getPendingMessagesByLead(leadId: string): Promise<Array<{ id: string; body: string; status: string; channel: string; subject: string | null }>>` — returns rows from `message_queue` scoped to the lead.
  - `waitForPendingMessage(leadId: string, opts?: { intervalMs?: number; timeoutMs?: number }): Promise<{ id: string; body: string; status: string; channel: string; subject: string | null }>` — polls `getPendingMessagesByLead`, resolves on first hit, throws on timeout. Defaults `intervalMs=2000`, `timeoutMs=10000`. Modeled on `waitForLeadField` at `e2e/utils/hubspot-helper.ts:235-254`.
  - `cleanupSequences(ids: string[]): Promise<void>` — `DELETE FROM nurture_sequences WHERE id = ANY($1::uuid[])`. Noop when `ids.length === 0`.
  - `cronRequestContext(baseURL: string): Promise<APIRequestContext>` — imports from `@playwright/test` and returns `request.newContext({ baseURL, extraHTTPHeaders })` where headers include `Authorization: Bearer ${process.env.CRON_SECRET}`, `x-ai-stub: '1'`, and (when set) `x-vercel-protection-bypass: process.env.VERCEL_AUTOMATION_BYPASS_SECRET` + `x-vercel-set-bypass-cookie: 'true'` — matching the pattern at `playwright.config.ts:33-39`. Throws if `CRON_SECRET` is unset. Caller is responsible for `ctx.dispose()`.
- `e2e/utils/nurture-helper.test.ts` — skip. Rstest does not run against `e2e/`; helpers are exercised transitively by the Phase 3 spec.
- `e2e/utils/auth-helper.ts:98-101` — edit: append `'Nurture'` to the `TEST_FIRST_NAMES` array (alphabetised insertion between `'Nav'` and `'Order'`).
- `e2e/utils/hubspot-helper.ts:112-125` — edit: append `'Nurture'` to the `TEST_FIRST_NAMES` array (alphabetised insertion between `'Nav'` and `'Order'`). No edit to `global-teardown.ts` — it imports both arrays.
- `playwright.config.ts:46` — edit: change `command: "rm -rf .next/ && yarn preview"` to `command: "rm -rf .next/ && yarn db:migrate && yarn preview"`. `reuseExistingServer: true` at line 49 already prevents re-runs mid-session; local devs already migrate manually.
- `.github/workflows/post-deploy.yml:111-120` — edit: add `CRON_SECRET: ${{ secrets.CRON_SECRET }}` to the Playwright job env block. Add the secret to the repo's GitHub Actions secrets (documented in this plan's manual step, not in code).

### Success
**Automated**
- [x] `make check` passes
- [x] `make build` passes
- [x] `make test` passes (no new rstest files in this phase; no regressions)

**Manual**
- [ ] Run `make test_e2e` locally against the existing spec suite — confirm the `webServer` boots successfully with the new `yarn db:migrate &&` prepend (migrations apply cleanly against the configured `DATABASE_URL`).
- [ ] Confirm `CRON_SECRET` is set in the repo's GitHub Actions secrets (check via `gh secret list` or the repo settings UI). Without this, Phase 3's spec will fail in CI even though the code compiles.
- [ ] Verify `cronRequestContext(baseURL)` in a scratch Node script: assert the resulting context includes the bearer + stub headers.

## Phase 3: E2E spec — auto-start, cron draft, action-queue render

### Changes
- `e2e/features/nurture-scheduler.spec.ts` — new spec. Structure:
  ```ts
  test.describe('Nurture scheduler', () => {
    test.skip(!process.env.DATABASE_URL, 'DB required');
    test.skip(!process.env.CRON_SECRET, 'CRON_SECRET required');

    let session: TestSession;
    const leadIds: string[] = [];
    const sequenceIds: string[] = [];
    const messageIds: string[] = [];

    test.beforeAll(async () => { session = await createTestSession(); });
    test.afterAll(async () => {
      await cleanupMessages(messageIds);
      await cleanupSequences(sequenceIds);
      await cleanupLeads(leadIds);
      await deleteTestSession(session.userId);
    });

    test('auto-starts a sequence on lead create (migration gate)', async ({ page, context, baseURL }) => { ... });

    test.describe.configure({ mode: 'serial' });
    test.describe('cron → action queue', () => {
      let seededLeadId: string;
      let seededSequenceId: string;
      let draftedMessageId: string;

      test('cron drafts a pending message', async ({ request, baseURL }) => { ... });
      test('action queue renders the drafted message', async ({ page, context, baseURL }) => { ... });
    });
  });
  ```
  Per-test details:
  - **Test 1 — Auto-start on lead create (migration gate).** Add the session cookie via `context.addCookies([getSessionCookie(session.signedToken, baseURL!)])`. Navigate to `/leads/new`, fill the form with `firstName: 'Nurture'`, `lastName: 'AutoStart'`, a unique phone, and `email: e2e-<randomUUID()>@test.rekurve.dev`, then submit. Resolve the new lead's id via `getLeadIdByPhone(phone)` (modeled on `e2e/utils/leads-helper.ts:21-29`). Push into `leadIds`. Assert `getActiveSequenceByLead(leadId)` returns a non-null row whose `sequenceType === 'discovery'` and `nextStepAt` is within `±1 minute` of `now + 3 days`. Push the returned id into `sequenceIds`. **This is the migration gate** — a missing table, enum, or partial unique index causes the `INSERT` inside `startOrUpdateSequence` to throw (swallowed by `.catch()` in `leads.create`) or return a row with a wrong shape; either way the DB assertion fails with a clear message.
  - **Test 2 — Cron drafts a pending message.** Seed a lead directly via `seedLead({ firstName: 'Nurture', lastName: 'Cron', ... })` (bypasses HubSpot round-trip for speed); push into `leadIds` and store as `seededLeadId`. Seed an active sequence via `seedActiveSequence({ leadId: seededLeadId, sequenceType: 'nurture', nextStepAt: new Date(Date.now() + 5 * 60_000) })`; push into `sequenceIds` and store as `seededSequenceId`. POST `/api/dev/nurture/advance` with `{ sequenceId: seededSequenceId }` via the test's `request` fixture (no auth needed — route is `NODE_ENV !== 'production'` gated). Create a cron context via `cronRequestContext(baseURL!)`, `GET /api/cron/nurture-scheduler`, assert `response.status() === 200` and `response.json()` deep-equals `{ drafted: 1, failed: 0 }`. Dispose the context. Poll via `waitForPendingMessage(seededLeadId)` (default 2s/10s). Assert `body.startsWith('[ai-stub]')` and `status === 'pending'`. Store `msg.id` as `draftedMessageId`; push into `messageIds`. Cron-response assertion precedes the DB poll so an API-layer failure surfaces before the DB assertion muddies the signal.
  - **Test 3 — Action queue renders the draft.** Re-add the session cookie (new test, fresh context), navigate to `/dashboard`. Assert `page.getByTestId(`queue-row-${draftedMessageId}`)` is visible within the default Playwright timeout. Assert `page.getByTestId(`queue-row-body-${draftedMessageId}`)` contains the text `[ai-stub]` (substring match via `toContainText`). Exercises the tRPC `messages.listPending` read path, dashboard render, and the per-row `data-testid` wiring (`src/app/(application)/dashboard/_components/draft-row.tsx:39,79-80`).

### Success
**Automated**
- [x] `make check` passes
- [x] `make build` passes
- [x] `make test_e2e` passes locally with `DATABASE_URL` and `CRON_SECRET` set (three new tests pass; existing suite unaffected).
- [ ] The new spec runs green in the post-deploy CI workflow with `CRON_SECRET` passed through.

**Manual**
- [ ] Run `make test_e2e` locally and observe the Playwright trace for Test 2 → confirm the cron request headers include `x-ai-stub: 1` and `Authorization: Bearer ...` in the network log.
- [ ] Delete the `nurture_active_one_per_lead_uidx` partial unique index in a scratch DB, re-run the spec, and confirm Test 1 fails with a meaningful DB-assertion message (sanity-check the migration gate).
- [ ] Run `/design_review` — N/A for this change (no UI modifications). Noted here to acknowledge the CLAUDE.md workflow rule explicitly.

## References
- Design: `thoughts/designs/2026-04-21-nurture-scheduler-e2e.md`
- Prior plan (Phase 1/2 of the feature itself): `thoughts/plans/2026-04-20-ENG-132-nurture-scheduler.md`
- PR: https://github.com/samjmarshall/rekurve/pull/147
- Ticket: https://github.com/samjmarshall/rekurve/issues/132
- Cron route call site (to modify): `src/app/api/cron/nurture-scheduler/route.ts:15`
- Scheduler injectable seam: `src/server/nurture/scheduler.ts:83-86`
- AI types + helpers: `src/server/ai/schema.ts` (`DraftMessageInput`, `DraftMessageOutput`, `LeadRow`), `src/server/ai/channel-selection.ts:12` (`selectChannel`), `src/server/ai/priority.ts:29` (`computePriority`)
- Leads-router swallow points: `src/server/api/routers/leads.ts:142,266-276`
- Dashboard testids: `src/app/(application)/dashboard/_components/draft-row.tsx:39,79-80`
- Dev advance route: `src/app/api/dev/nurture/advance/route.ts`
- Closest existing spec: `e2e/features/action-queue.spec.ts`
- E2E helpers: `e2e/utils/messages-helper.ts:1-10` (Neon client), `e2e/utils/auth-helper.ts:39-71,98-101` (session + first-name marker), `e2e/utils/hubspot-helper.ts:112-125,235-254` (first-name marker + polling), `e2e/utils/leads-helper.ts:21-29` (`getLeadIdByPhone`), `e2e/utils/global-teardown.ts:13-29` (sweep)
- Playwright config: `playwright.config.ts:33-39` (bypass header pattern), `:43-50` (webServer)
- CI workflow: `.github/workflows/post-deploy.yml:86-91` (existing `yarn db:migrate` step), `:111-120` (env block to extend)
- Env schema: `src/env.js:31,63` (`CRON_SECRET` — already declared)
- Migration convention: `drizzle/NNNN_<name>.sql` (no new migration in this plan — partial unique index shipped in PR #147)
- Vercel — [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- Playwright — [API Testing / APIRequestContext](https://playwright.dev/docs/api-testing)
