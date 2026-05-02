# Local Dev Data Seeder Implementation Plan

## Context

Fresh Neon branch DBs created by `scripts/neon-branch.sh` are empty after migrate, so every dev session begins with manual clicking to populate the action queue and other surfaces. Action-queue work (#163–#166) is the current focus and the pain is daily. This plan adds a deterministic seeder (`yarn seed:dev`) auto-invoked by `neon-branch.sh create`, plus a `HUBSPOT_MOCK` short-circuit so the seeded leads work end-to-end without touching `api.hubapi.com`.

## Current State

- `scripts/neon-branch.sh:181` runs `SKIP_ENV_VALIDATION=1 yarn db:migrate` and exits — no seeding.
- Branch DB naming: `local/{git_branch}` per `scripts/neon-branch.sh:142`.
- `package.json:6-38` has no seed script; `tsx@^4.21.0` is already a devDependency at `package.json:109`; `@faker-js/faker` is **not** present.
- `src/server/hubspot/client.ts:4-7` instantiates a single `Client` from `@hubspot/api-client` using `env.HUBSPOT_ACCESS_TOKEN`. All API call-sites flow through this instance via the typed wrappers in `src/server/hubspot/contacts.ts:1-109` and `src/server/hubspot/emails.ts:1-64`. The webhook handler (`src/app/api/hubspot/webhook/route.ts`) calls `getContact`, `getEmailEngagement`, and `findContactIdForEmail` from these modules.
- `src/env.js:9-50` declares server env via Zod with `runtimeEnv` mapping at `src/env.js:66-90`. No `HUBSPOT_MOCK` or `NEON_PROJECT_ID` exist.
- Drizzle client at `src/server/db/index.ts:1-11` (`@neondatabase/serverless` + `drizzle-orm/neon-http`). Migrations live in `drizzle/0000_*.sql` … `drizzle/0004_magical_thundra.sql`.
- Schema (all required-for-seed fields summarised — full inventory in `thoughts/designs/2026-04-19-local-dev-data-seeding.md`):
  - `user` — `src/server/db/schema/auth.ts:3-14` — `id`, `name`, `email` (unique), `emailVerified` required.
  - `leads` — `src/server/db/schema/leads.ts:24-84` — `firstName`, `lastName` required; `leadStage` enum defaults to `unqualified`; unique partial index on `email WHERE email IS NOT NULL`; `hubspotContactId` unique.
  - `lots` — `src/server/db/schema/lots.ts:12-36` — `estateName`, `suburb`, `lotNumber` required; `status` enum defaults to `available`.
  - `lot_matches` — `src/server/db/schema/lot-matches.ts:13-36` — FKs `lotId`, `leadId` (cascade); `matchStrength` required; UNIQUE `(lotId, leadId)`.
  - `conversations` — `src/server/db/schema/conversations.ts:7-32` — `leadId`, `channel`, `direction`, `body` required; optional FK `messageQueueId`.
  - `message_queue` — `src/server/db/schema/message-queue.ts:13-38` — `leadId`, `channel`, `body` required; `status` defaults to `pending`.
  - `nurture_sequences` — `src/server/db/schema/nurture-sequences.ts:13-37` — `leadId`, `sequenceType` required; partial UNIQUE `nurture_active_one_per_lead_uidx` on `leadId WHERE status = 'active'` (only one active sequence per lead).
- E2E helpers (`e2e/utils/messages-helper.ts`, `e2e/utils/nurture-helper.ts`, `e2e/utils/auth-helper.ts`) use direct Neon SQL with `randomUUID()` — no Faker. They stay untouched per design (`thoughts/designs/2026-04-19-local-dev-data-seeding.md:60-62`).
- `scripts/seed-preview-166.ts` was deleted on this branch (`git status` shows `D`); no replacement.

## Desired End State

A developer running `scripts/neon-branch.sh create my-branch` ends up on a branch DB that has been migrated and seeded with realistic, deterministic fixtures: 1 user (`sam.marshall@v2.ai`), 20 leads, 15 lots, ~30 lot_matches, ~40 conversations, ~25 message_queue rows (mixed states), ~6 nurture_sequences. Visiting `/dashboard` renders the action queue without any manual setup. `yarn seed:dev` is a standalone re-seed; `--no-seed` opts out from `neon-branch.sh`. With `HUBSPOT_MOCK=true`, editing a seeded lead never reaches `api.hubapi.com` and logs `[hubspot-mock]`. The seeder refuses to run if it can detect production. `make check` and `make build` pass.

## Out of Scope

- Pre-authenticated dev sessions or OTP bypass — login flow stays as-is.
- Real HubSpot dev portal integration.
- Named bug-repro seeds (`--seed=snooze-expiry`) and `--volume=large` — design lists these as future work.
- Multi-user / demo fixtures.
- Modifying E2E helpers.
- Implementing the `HUBSPOT_MOCK` path inside webhook handlers (webhooks are exercised in dev by direct payload POSTs, per design).

## Approach

Single PR, three sequential phases inside it. Phase 1 lays the foundation that the seeder depends on (env, mock, deps, guards) so the actual seed code in Phase 2 can be written against a stable surface. Phase 3 wires `neon-branch.sh` and CLAUDE.md only after the seeder is proven independently. Tests cluster in Phase 1's `guards.ts` slice — fixtures rely on typesafety against the schema (failing `make check`/`make build`) and manual idempotency observation per the design's validation criteria.

Implementation strategy for the HubSpot mock: wrap each exported function in `src/server/hubspot/contacts.ts` and `src/server/hubspot/emails.ts` with an `env.HUBSPOT_MOCK === 'true'` short-circuit that logs `[hubspot-mock] <fn>` and returns a shape-correct fixture. The real `Client` instantiation in `client.ts` is left intact but only reached when the flag is off. Production startup guard lives in the env validation layer (or at module init in `client.ts`) so any process booted with `NODE_ENV=production` and `HUBSPOT_MOCK=true` throws before serving traffic.

## Phase 1: Foundation — env, HubSpot mock, deps, guards

### Changes

- `package.json` — add `"@faker-js/faker": "^9.x"` to `devDependencies`; add `"seed:dev": "tsx scripts/seed-dev.ts"` to `scripts`.
- `src/env.js` — add to `server` block (around line 30, after `HUBSPOT_BCC_ADDRESS`):
  - `HUBSPOT_MOCK: z.string().optional()` — treat `=== 'true'` as on (no boolean precedent in this file; matches existing string-optional pattern).
  - `NEON_PROJECT_ID: z.string().optional()` — used by the safety guard.
  - Mirror both into `runtimeEnv` (lines 66-90).
- `src/server/hubspot/contacts.ts` — at the top of each exported function (`createContact`, `getContact`, `updateContact`, `searchContacts`, `findExistingContact`), branch on `env.HUBSPOT_MOCK === 'true'`: log `[hubspot-mock] <name>` once per call and return a shape-correct fixture. `createContact` echoes input with `id: 'dev_stub_<uuid>'`; `getContact`/`findExistingContact` return `null` (or a fixture if the design needs a positive case — start with `null` and revisit only if a flow breaks); `updateContact` echoes input; `searchContacts` returns `[]`.
- `src/server/hubspot/emails.ts` — same pattern for `getEmailEngagement` (return a fixture engagement with stub IDs) and `findContactIdForEmail` (return `null`).
- `src/server/hubspot/client.ts` — add a top-of-module guard: `if (env.HUBSPOT_MOCK === 'true' && env.NODE_ENV === 'production') throw new Error("HUBSPOT_MOCK must not be set in production");`. The real `Client` constructor stays — it only runs when the flag is off, since wrappers short-circuit before touching it; however, leaving the constructor at module scope means the Client *is* still instantiated when the flag is on. Fix: lazy-init the Client (export a `getHubspot()` factory used only by non-short-circuited paths) **or** keep eager init since `HUBSPOT_ACCESS_TOKEN` is still required env. Decision: keep eager init — the env still requires `HUBSPOT_ACCESS_TOKEN`, and no network call happens at construction time per `@hubspot/api-client` (verify during implementation; if it does I/O, switch to lazy). Document the decision in a one-line comment on `client.ts`.
- `src/server/db/seed/guards.ts` — new file. Exports `assertSafeToSeed(databaseUrl: string): void` that runs three checks before any caller writes:
  1. `env.NODE_ENV !== 'production'` — throw with which check tripped.
  2. If `env.NEON_PROJECT_ID` is set, `databaseUrl` must not contain it; if unset, log a loud warning.
  3. Parse `databaseUrl` host/database; host must contain `.neon.tech` and database name must include the current git branch slug (read via `child_process.execSync('git rev-parse --abbrev-ref HEAD')` and slugified to match `neon-branch.sh:142`'s `local/{git_branch}` convention — confirm exact slug shape during implementation by inspecting `neon-branch.sh:131-148`).

  Failures throw with a message naming which check tripped. Caller wraps in try/catch and exits 1 before opening the Drizzle client.
- `src/server/db/seed/__tests__/guards.test.ts` — new Rstest unit tests (TDD vertical slice — write each test, then the matching guard branch, then move on):
  - Throws when `NODE_ENV === 'production'`.
  - Throws when `NEON_PROJECT_ID` is set and `DATABASE_URL` contains it.
  - Warns (does not throw) when `NEON_PROJECT_ID` is unset.
  - Throws when host is not `.neon.tech`.
  - Throws when DB name does not include the current branch slug.
  - Passes when all checks succeed.

  Mock `~/env` and `child_process.execSync` per the existing test pattern in `src/server/api/__tests__/leads-router.test.ts:44-50`.

### Success

**Automated**
- [x] `make check` passes
- [x] `make test` passes (new `guards.test.ts` runs green; existing tests unaffected)
- [x] `make build` passes

**Manual**
- [x] `yarn install` adds `@faker-js/faker` and lock-file diff is clean.
- [x] In a dev shell: `HUBSPOT_MOCK=true yarn dev`, edit a lead via `/leads/[id]`; terminal logs `[hubspot-mock] updateContact` and Network tab shows zero requests to `api.hubapi.com`.
- [x] In a dev shell: `NODE_ENV=production HUBSPOT_MOCK=true yarn start` throws on boot before serving traffic.
- [x] Manual import sanity: `yarn tsx -e "import('./src/server/db/seed/guards.ts')"` resolves without runtime error.

## Phase 2: Fixtures and seed entry point

### Changes

- `scripts/seed-dev.ts` — new file. Entry point invoked via `yarn seed:dev`. Parses `--seed=<n>` (default `42`) and `--no-mock` flags. Order:
  1. `assertSafeToSeed(env.DATABASE_URL)`.
  2. Open Drizzle client (`db` from `~/server/db`).
  3. `TRUNCATE nurture_sequences, message_queue, conversations, lot_matches, lots, leads, "user" RESTART IDENTITY CASCADE` — explicit table list in dependency order; do **not** include `account`/`session`/auth tables to preserve any local login state, with the exception of `user` since the seeder owns the seeded user row.
  4. Run fixture inserts in dependency order: `user` → `leads` → `lots` → `lot_matches` → `conversations` → `message_queue` → `nurture_sequences`. Each fixture module exports `seed(db, faker)` and returns the inserted rows so the next module can FK against them.
  5. Log row counts per table and total elapsed.
- `src/server/db/seed/fixtures/user.ts` — new file. Inserts `sam.marshall@v2.ai` (`name: "Sam Marshall"`, `emailVerified: true`).
- `src/server/db/seed/fixtures/leads.ts` — new file. 20 leads with stage distribution `5 unqualified / 6 nurture / 5 warm / 2 hot / 2 lost` (note: schema enum is `unqualified | nurture | warm | hot` per `src/server/db/schema/enums.ts` — adjust counts if "lost" doesn't exist; the design's "5/6/5/2/2 across new/qualified/nurturing/converted/lost" predates the current enum, so resolve to the actual `leadStageEnum` values during implementation). Stub `hubspotContactId = 'dev_stub_lead_001'`...`'020'`. Faker-seeded names, emails, phones (Australian format `04XXXXXXXX`), `preferredEstates`, `preferredSuburbs`, `budget`, `propertyType`, `constructionTimeline`. Vary `createdAt` relative to `new Date()` (1–60 days ago) — non-determinism in timestamps is intentional per design.
- `src/server/db/seed/fixtures/lots.ts` — new file. 15 lots across 3 estates (`Creation Park`, `Aura Heights`, `Sunshine Rise`) and corresponding suburbs, mixed `availabilityType` (`first_come | exclusive_territory | developer_direct`) and `status`. ~3 with `availabilityType = 'exclusive_territory'` and `exclusiveUntil` set 7–30 days in the future.
- `src/server/db/seed/fixtures/lot-matches.ts` — new file. For each lead with stage in `{nurture, warm, hot}`, pick 1–3 lots and create a `lot_match` row with plausible `matchStrength` and `matchReasoning`. Aim for ~30 total. Respect `UNIQUE (lotId, leadId)`.
- `src/server/db/seed/fixtures/conversations.ts` — new file. 1–3 threads per lead across `sms` and `email`, mixed `direction`, ~40 total. Optional `messageQueueId` link populated for ~half (after Phase 2 message_queue fixture runs — actually conversations runs **before** message_queue in dependency order; resolve by either inserting message_queue first and back-linking conversations, **or** leaving `messageQueueId` null in fixtures and accepting a slightly less rich graph for now). Decision: leave `messageQueueId` null in seeded conversations; the FK is nullable per `src/server/db/schema/conversations.ts:7-32` and back-population is future polish.
- `src/server/db/seed/fixtures/message-queue.ts` — new file. ~25 rows across statuses: 10 `pending`, 6 `snoozed` (3 with `snoozedUntil` in the past, 3 in the future), 5 `approved`, 4 `sent` (with `sentAt` populated). Mixed `priority` 0–3. ~3 rows have `originalBody !== body` to simulate edited drafts. Spread across leads so the action queue surfaces variety.
- `src/server/db/seed/fixtures/nurture-sequences.ts` — new file. 6 sequences tied to `nurture`-stage leads with `sequenceType ∈ {discovery, nurture, warm_progression, lot_alert}`. All `status = 'active'` — schema enforces one active per lead via `nurture_active_one_per_lead_uidx`, so pick 6 distinct leads.

### Success

**Automated**
- [x] `make check` passes — every fixture file is typesafe against the Drizzle schema; any drift (renamed column, changed enum) fails compile.
- [x] `make test` passes (no new tests; Phase 1 tests still green).
- [x] `make build` passes.

**Manual**
- [x] `yarn seed:dev` against a fresh branch DB completes in under 10s and exits 0.
- [x] Two consecutive runs of `yarn seed:dev` produce identical row counts and (modulo `createdAt` relative-to-now drift) identical body content. Verify via `psql ... -c 'SELECT count(*) FROM leads, lots, lot_matches, conversations, message_queue, nurture_sequences'` between runs.
- [x] `/dashboard` renders the action queue with pending, snoozed, approved, and sent messages spread across multiple leads with varied priorities — no manual setup.
- [x] `/leads` renders 20 leads across stages.
- [x] Guard test: temporarily point `DATABASE_URL` at a non-`.neon.tech` host (or set `NEON_PROJECT_ID` to match the current URL's project) → `yarn seed:dev` exits 1 before any writes; verify with `psql` that pre-existing rows are intact.
- [ ] Smoke check: `HUBSPOT_MOCK=true yarn dev`, navigate seeded leads, click into a lead, edit a field — no `api.hubapi.com` calls in network log; `[hubspot-mock]` appears in server logs.

## Phase 3: `neon-branch.sh` integration and docs

### Changes

- `scripts/neon-branch.sh` — in `cmd_create()` after the existing `db:migrate` invocation at line 181, add a conditional `yarn seed:dev` call:
  - Parse `--no-seed` from `cmd_create`'s arguments (mirror the existing `--all` flag pattern in `cmd_delete` at line 187).
  - If not skipped: `(cd "$REPO_ROOT" && SKIP_ENV_VALIDATION=1 yarn seed:dev)`. Log `Seeding dev fixtures…` first.
  - Update the dispatcher at lines 285-297 to pass `"$@"` into `cmd_create` so the flag reaches it.
  - On seed failure: report non-zero, exit. Branch DB is left migrated but unseeded; user can retry with `yarn seed:dev`.
- `CLAUDE.md` — append under the "Database Migrations" section (around the `db:push` warning):
  > When schema changes touch tables seeded by `scripts/seed-dev.ts`, update the corresponding fixture in `src/server/db/seed/fixtures/*` in the same PR. The seeder is typesafe — a stale fixture will fail `make check` and `make build`.
- (Optional, only if time permits) `CLAUDE.md` — add a one-line `yarn seed:dev` mention to the local-dev workflow.

### Success

**Automated**
- [x] `make check` passes
- [x] `make build` passes
- [x] `bash -n scripts/neon-branch.sh` reports no syntax errors

**Manual**
- [x] `scripts/neon-branch.sh create test-seed-branch` runs migrations, seeds fixtures, and prints row counts. App boots (`yarn dev`), `/dashboard` shows populated action queue.
- [x] `scripts/neon-branch.sh create test-seed-branch --no-seed` runs migrations only; `/dashboard` action queue is empty until `yarn seed:dev` is run manually.
- [x] `scripts/neon-branch.sh delete test-seed-branch` cleans up.

## References

- Ticket: [GitHub issue #197](https://github.com/samjmarshall/rekurve-www/issues/197)
- Design: `thoughts/designs/2026-04-19-local-dev-data-seeding.md`
- Branch script: `scripts/neon-branch.sh:131-148` (branch slug naming), `scripts/neon-branch.sh:181` (migrate insertion point), `scripts/neon-branch.sh:285-297` (flag dispatch)
- Env pattern: `src/env.js:9-50` (server schema), `src/env.js:66-90` (runtimeEnv mapping)
- HubSpot client: `src/server/hubspot/client.ts:4-7`, `src/server/hubspot/contacts.ts:1-109`, `src/server/hubspot/emails.ts:1-64`
- HubSpot mock test pattern precedent: `src/server/api/__tests__/leads-router.test.ts:44-50`
- Schema files: `src/server/db/schema/{auth,leads,lots,lot-matches,conversations,message-queue,nurture-sequences,enums}.ts`
- Drizzle client: `src/server/db/index.ts:1-11`
- E2E helpers (untouched): `e2e/utils/messages-helper.ts`, `e2e/utils/nurture-helper.ts`
