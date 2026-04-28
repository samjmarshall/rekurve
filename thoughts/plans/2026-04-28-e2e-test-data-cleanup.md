# E2E Test Data Cleanup Implementation Plan

## Context
Leads with E2E test names (Count Update, Pipeline Unqualified, Quick Qualified, Nav Test, E2E NoLand, FHOG Investor, Pipeline Hot, E2E Hot, Quick Edit, QC Capture, FHOG Buyer, E2E Breakdown, Nurture AutoStart) are accumulating in the database and HubSpot. Three concrete bugs in the Playwright `afterAll` and global teardown hooks are letting them through. Cleanup must remain a property of the test lifecycle — no separate Make target — so the fix targets the hooks themselves.

## Current State

**Cleanup paths today:**

- Per-spec `afterAll` — primary path, runs immediately after each spec's tests, no HubSpot search-index lag.
  - `cleanupTestLeadsByPhone(phones)` for UI-driven specs (`hubspot-helper.ts:210`).
  - `cleanupLeads(leadIds)` + `cleanupMessages(messageIds)` for seed-driven specs (`messages-helper.ts:99,104`).
- Global teardown — fallback sweeper, runs once after the full Playwright run (`playwright.config.ts:8` → `e2e/utils/global-teardown.ts:13`).
  - Phase 1 archives HubSpot contacts by ID via DB lookup (`hubspot-helper.ts:144-164`).
  - Phase 2 searches HubSpot for orphans by email/firstname pattern (`hubspot-helper.ts:166-201`).
  - `deleteTestLeads()` deletes DB rows by email pattern + firstname whitelist (`auth-helper.ts:94-103`).

**Bug 1 — `TEST_FIRST_NAMES` whitelist drift.** `auth-helper.ts:99-100` and `hubspot-helper.ts:112-126` (`TEST_FIRST_NAMES` constant) both list 13 names including `Nurture`. The inline SQL inside `deleteTestContacts` Phase 1 at `hubspot-helper.ts:149-151` lists only 12 — `Nurture` is missing. Result: nurture leads' DB rows get deleted by `deleteTestLeads` but their HubSpot contacts are not picked up by Phase 1, so they fall to Phase 2's search-only path (which has bug 3).

**Bug 2 — Per-spec `phones.push()` skipped on most leads-crud tests.** `e2e/features/leads-crud.spec.ts` declares `const phones: string[] = []` and an `afterAll` that calls `cleanupTestLeadsByPhone(phones)` (lines 21, 28), but only 2 of 9 `uniquePhone()` call sites actually push to the array. The 7 missing pushes are at lines 209, 219, 264, 297, 330, 360, 374. Same shape in `nurture-scheduler.spec.ts` test 1 (lines 44-90): the UI form creates a HubSpot-synced lead with phone `phone` (line 51) but the spec only tracks `leadId`, never the phone — `cleanupLeads([leadId])` removes the DB row but leaves the HubSpot contact orphaned.

**Bug 3 — Phase 2 search hard-capped at 100, no pagination.** `hubspot-helper.ts:189` passes `limit: 100, after: "0"` and never iterates. Once the orphan backlog exceeds 100 contacts, each teardown drains 100 and leaves the rest. The set the user is observing today is exactly that backlog.

**Verified non-issues:**
- `action-queue.spec.ts`, `email-dispatch.spec.ts` use `seedLead` (`messages-helper.ts:23`), which inserts directly to the DB and **bypasses HubSpot sync**. `cleanupLeads(leadIds)` is sufficient — these specs do not leak HubSpot contacts.
- `lead-profile.spec.ts` and `hubspot-sync.spec.ts` already track every phone (`lead-profile.spec.ts:41,78,129,181`; `hubspot-sync.spec.ts:68,139,219,244,263`).

## Desired End State

- Every lead and HubSpot contact created by an E2E test is removed in that spec's `afterAll`. Global teardown remains a fallback only.
- `TEST_FIRST_NAMES` is the single source of truth for the firstname whitelist; both Phase 1 SQL and `deleteTestLeads` reference the same constant.
- Phase 2 search paginates to exhaustion — no orphan ever survives a teardown because of the 100-cap.
- An Rstest unit asserts the two cleanup paths use the same name list.
- After running the full E2E suite once, both `leads` (filtered by test markers) and HubSpot (filtered by test firstnames + `test.rekurve.dev` email) return zero matching rows.

## Out of Scope

- Standalone cleanup CLI / Make target (explicitly rejected — cleanup must live in test hooks).
- HubSpot test sandbox / portal split.
- Refactoring `cleanupTestLeadsByPhone` into a Playwright fixture (the inline `phones.push` pattern matches existing convention; fixture refactor is a separate concern).
- Cleanup helpers for tables unrelated to the leak (`conversations`, `ms_graph_tokens`, `nurture_sequences` — already covered by existing helpers and cascades).

## Approach

Three sequenced phases, each shipped with tests in the same phase. Phase 1 unifies the whitelist to close bug 1. Phase 2 paginates Phase 2 search to close bug 3. Phase 3 audits each leaking spec and adds the missing `phones.push()` to close bug 2. After phase 3 the backlog drains naturally on the next full run because Phase 2 will paginate over all remaining orphans.

## Phase 1: Unify the firstname whitelist

### Changes

- `e2e/utils/auth-helper.ts` — remove the inline name array at lines 99-100; import `TEST_FIRST_NAMES` from `hubspot-helper.ts` and use `${TEST_FIRST_NAMES}` in the SQL `IN` clause.
- `e2e/utils/hubspot-helper.ts` — export `TEST_FIRST_NAMES` (currently a module-private `const` at line 112). Replace the inline name array at lines 149-151 in `deleteTestContacts` Phase 1 with `${TEST_FIRST_NAMES}`. This adds `Nurture` to Phase 1's coverage.
- `e2e/utils/cleanup-whitelist.test.ts` — new Rstest unit (co-located with helpers). Asserts: (a) `TEST_FIRST_NAMES` length and contents match what each cleanup helper actually queries; (b) the constant contains every firstname literal used in `e2e/features/*.spec.ts` (regex scan over the spec files at test time so future drift fails the build).

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes (new whitelist parity test passes)
- [ ] `make build` passes

**Manual**
- [ ] Search `e2e/utils/auth-helper.ts` and `e2e/utils/hubspot-helper.ts` for hard-coded firstname arrays — only one definition remains (`TEST_FIRST_NAMES` in `hubspot-helper.ts`).
- [ ] Diff the two SQL statements — both reference the same parameter binding.

## Phase 2: Paginate Phase 2 search to drain backlog

### Changes

- `e2e/utils/hubspot-helper.ts` — refactor the search block at lines 167-201 in `deleteTestContacts`. Wrap `searchApi.doSearch` in a `do { … } while (after !== undefined)` loop that uses `response.paging?.next?.after` to advance. Cap each page at 100. Continue until no more pages. Archive each unseen contact (skip `archived` set members). Cap total pages at a defensive 50 (5 000 contacts) and log a warning if hit — protects against runaway loops.
- `e2e/utils/cleanup-whitelist.test.ts` — extend the unit added in phase 1 with a mocked `searchApi.doSearch` that returns 250 results across 3 pages; assert all 250 archive calls fire. Use Rstest's mock helpers (`vi.fn` equivalent — see `rstest-best-practices` skill).

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes (pagination test passes)

**Manual**
- [ ] Run the full E2E suite locally with the existing backlog present. After teardown, query HubSpot via `searchApi.doSearch` with the same filterGroups manually — count is 0 (or below 100 if a fresh run created new test data that subsequent runs will catch).
- [ ] Tail the global teardown logs — no warning about hitting the page cap.

## Phase 3: Close per-spec `afterAll` gaps

Audit each UI-driven spec and ensure every `uniquePhone()` is paired with `phones.push(phone)`. Seed-driven specs (`action-queue`, `email-dispatch`) already use `cleanupLeads(leadIds)` and bypass HubSpot — no change needed there.

### Changes

- `e2e/features/leads-crud.spec.ts` — at each of lines 209, 219, 264, 297, 330, 360, 374, lift the `phone: uniquePhone()` arg into a local `const phone = uniquePhone(); phones.push(phone);` and pass `phone` into the form. Mirrors the pattern already used at line 47.
- `e2e/features/nurture-scheduler.spec.ts` — declare `const phones: string[] = []` alongside `leadIds` (line 29). At line 51 push `phone` into `phones`. In the `afterAll` (line 37) add `await cleanupTestLeadsByPhone(phones)` before `cleanupLeads(leadIds)` — `cleanupTestLeadsByPhone` archives the HubSpot contact and deletes the lead by phone, so `cleanupLeads` becomes a no-op for that row but is kept to handle the cron-test seed leads (line 106) which have no HubSpot contact.
- `e2e/utils/cleanup-coverage.test.ts` — new Rstest unit. Static-scan every `e2e/features/*.spec.ts` for `uniquePhone()` call sites and assert each is followed (within 5 lines) by `phones.push(`. Future tests that forget to track their phone fail the unit suite. (Uses the `e2e/utils/` path so it's part of the unit run, not the Playwright run.)

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes (coverage test passes — every `uniquePhone` paired with `phones.push`)
- [ ] `make test_e2e` passes (no regression in the four touched specs)
- [ ] `make build` passes

**Manual**
- [ ] Run the full E2E suite locally on a clean DB + clean HubSpot. After the run completes (and after global teardown):
  - `SELECT count(*) FROM leads WHERE first_name IN (TEST_FIRST_NAMES) OR email LIKE 'e2e-%@test.rekurve.dev'` → 0.
  - HubSpot search by `firstname IN TEST_FIRST_NAMES` → 0 results.
- [ ] Force-fail one test mid-spec (throw before `afterAll` runs naturally) — confirm `afterAll` still fires and cleans up that test's phone.
- [ ] Run only `e2e/features/nurture-scheduler.spec.ts` — confirm the `Nurture AutoStart` HubSpot contact is archived within seconds of `afterAll`, not minutes (no search-index dependency).

## References

- Ticket: none assigned — filename uses date prefix `2026-04-28-e2e-test-data-cleanup`.
- Existing helpers: `e2e/utils/auth-helper.ts:94-103`, `e2e/utils/hubspot-helper.ts:112-126,141-202,210-230`, `e2e/utils/messages-helper.ts:99-107`.
- Affected specs: `e2e/features/leads-crud.spec.ts:209,219,264,297,330,360,374`; `e2e/features/nurture-scheduler.spec.ts:37-42,51`.
- Global teardown wiring: `playwright.config.ts:8` → `e2e/utils/global-teardown.ts:13-29`.
- Test guardrails (per CLAUDE.md): per-spec cleanup tracks by phone or email; never rely on broad search filters; HubSpot search is eventually consistent.
- HubSpot search pagination reference: `searchApi.doSearch` returns `paging.next.after` — see `@hubspot/api-client` codegen used at `src/server/hubspot/contacts.ts:78-109`.
