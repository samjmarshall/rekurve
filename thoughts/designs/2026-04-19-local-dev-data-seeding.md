# Local Dev Data Seeding

**Date:** 2026-04-19
**Status:** Design — ready for `/create_plan`

## Problem

Feature and bug branches start with whatever prod data existed when `scripts/neon-branch.sh` created the branch. That means stale or absent data, privacy exposure, and manual clicking to reproduce UI state. E2E helpers in `e2e/utils/` seed per-test data, but there is no general-purpose dev seeder. The pain is concrete: opening a fresh branch DB, the action queue is empty, so every dev session starts with manual setup.

## Goals

1. **Primary:** Populate a fresh branch DB with enough shape that every app surface renders without manual clicking.
2. **Secondary:** Deterministic fixtures so bug scenarios are reproducible on demand.
3. **Tertiary:** Realistic volume for catching UI/perf issues that do not surface with 2–3 rows.

Goal 1 is the target for this design; the structure must leave room for 2 and 3 without rework.

## Non-goals

- Pre-authenticated dev sessions or an OTP bypass. Login flow stays as-is.
- Real HubSpot dev portal integration. Stubs only.
- A "golden parent" Neon branch. Per-branch fresh seed is fast enough.
- Multi-user / demo fixtures. Single-dev project.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| HubSpot in dev | Stub `hubspotContactId` values + `HUBSPOT_MOCK=true` env flag that short-circuits the HubSpot client | Zero external dependency; UI pain does not require real HubSpot round-trips |
| Scope | Full domain (leads, lots, lot_matches, conversations, message_queue, nurture_sequences) | Every surface exercisable without future rework |
| Login | Seed the `user` row only; log in via OTP as in prod | Avoids auth surface area; matches prod fidelity |
| Invocation | Auto-run from `neon-branch.sh create` (with `--no-seed` opt-out) **and** available as standalone `yarn seed:dev` | Zero friction per branch; standalone lets you re-seed mid-branch |
| Idempotency | `TRUNCATE ... RESTART IDENTITY CASCADE` then insert | Simpler than upserts; safety guards prevent prod damage |
| Determinism | Seeded pRNG (`@faker-js/faker` with fixed seed arg, default `42`) | Reproducible state; `--seed=<n>` for variety |
| Library choice | Hand-rolled Drizzle inserts + Faker | `drizzle-seed` is pre-v1 with known bugs (#4124, #3961); not worth the risk |

## Architecture

### New files

- `scripts/seed-dev.ts` — entry point, run via `tsx`.
- `src/server/db/seed/`
  - `guards.ts` — safety checks (env, prod project ID, branch vs. parent).
  - `fixtures/user.ts` — seeds `user` row for `sam.marshall@v2.ai`.
  - `fixtures/leads.ts` — ~20 leads across stages with stub `hubspotContactId` values.
  - `fixtures/lots.ts` — ~15 lots across 3 estates.
  - `fixtures/lot-matches.ts` — joins leads ↔ lots where criteria fit.
  - `fixtures/conversations.ts` — 1–3 threads per lead.
  - `fixtures/message-queue.ts` — mixed states (pending, snoozed, approved, sent).
  - `fixtures/nurture-sequences.ts` — active sequences for nurturing-stage leads.

### Changed files

- `scripts/neon-branch.sh` — after `db:migrate`, invoke `yarn seed:dev` unless `--no-seed` is passed.
- `src/server/hubspot/` — add `HUBSPOT_MOCK` short-circuit at the client boundary.
- `src/env.js` — add optional `HUBSPOT_MOCK` boolean, optional `NEON_PROD_PROJECT_ID` for guard.
- `package.json` — add `"seed:dev": "tsx scripts/seed-dev.ts"`.
- `CLAUDE.md` — under Database Migrations, add a seeder sync note (see below).

### E2E helper reuse

The existing `e2e/utils/messages-helper.ts` functions (`seedLead`, `seedPendingMessage`) stay put. E2E needs per-test isolation and unique markers; the dev seeder needs a bulk deterministic fixture. Different shape. The dev seeder uses Drizzle directly, so it stays typesafe with the schema.

## Data shape

### Volume and distribution

- **1 user** — `sam.marshall@v2.ai`.
- **20 leads** — 5 new / 6 qualified / 5 nurturing / 2 converted / 2 lost. `hubspotContactId` = `dev_stub_lead_{001..020}`.
- **15 lots** — 3 estates (Creation Park, Aura Heights, Sunshine Rise), mixed `status`/`availabilityType`. ~3 marked exclusive with near-future `exclusiveUntil`.
- **~30 lot_matches** — each qualified/nurturing lead gets 1–3 matches with plausible `matchStrength` and `matchReasoning`.
- **~40 conversations** — 1–3 threads per lead across SMS/email, mixed directions.
- **~25 message_queue rows** — ~10 pending, ~6 snoozed (3 past-due, 3 future), ~5 approved, ~4 sent; varied priorities. Most important fixture for the current action-queue work.
- **~6 nurture_sequences** — tied to nurturing-stage leads.

### Timestamps

Computed relative to `new Date()` at run time, not frozen. "Created 2 hours ago" stays meaningful across runs. This is the one non-deterministic piece; acceptable because dates-relative-to-now is what the UI actually wants.

## HubSpot mock

`src/server/hubspot/` exports thin wrappers. When `env.HUBSPOT_MOCK === true`:

- Every exported function short-circuits: logs `[hubspot-mock] <fn> called`, returns a shape-correct fixture response (e.g. `createContact` echoes the input with `id: 'dev_stub_<uuid>'`).
- No call reaches `api.hubapi.com`.
- Webhook handler (`/api/hubspot/webhook`) is unaffected. To exercise webhook paths in dev, call the endpoint directly with a fixture payload.
- Startup guard: if `HUBSPOT_MOCK === true` and `NODE_ENV === 'production'`, throw.

The seeder itself never calls the HubSpot client. It writes leads with stub IDs and relies on the app-level flag to keep runtime code paths working when those leads are read back.

## Safety guards

`src/server/db/seed/guards.ts` asserts all three before any `TRUNCATE`:

1. `env.NODE_ENV !== 'production'`.
2. `DATABASE_URL` does not contain `env.NEON_PROD_PROJECT_ID`. If the env var is unset, skip this check but warn loudly.
3. The connection host contains `.neon.tech` and the database name includes the current git branch slug (matches `neon-branch.sh` output — confirms we are on a branch DB, not `main`).

Any failure: log which check tripped, exit 1 before opening the Drizzle client.

## `neon-branch.sh` integration

After `db:migrate` succeeds on `create`, call `yarn seed:dev`. Respect `--no-seed`. If seeding fails, the branch DB remains migrated but empty; the script reports non-zero and exits. Manual `yarn seed:dev` retries.

## CLAUDE.md addition

Append under "Database Migrations":

> When schema changes touch tables seeded by `scripts/seed-dev.ts`, update the corresponding fixture in `src/server/db/seed/fixtures/*` in the same PR. The seeder is typesafe — a stale fixture will fail `make check` and `make build`.

## Validation

- `yarn seed:dev` against a fresh branch DB completes in under 10s and exits 0.
- Two consecutive runs produce identical state, modulo relative timestamps.
- `/dashboard` renders the action queue with pending/snoozed/sent messages across varied leads.
- `make build` and `make check` pass.
- Smoke check with `HUBSPOT_MOCK=true`: editing a lead produces no `api.hubapi.com` network calls and no runtime errors.
- Guard test: point `DATABASE_URL` at `main` → seeder exits 1 before any writes.
- End-to-end: `scripts/neon-branch.sh create test-seed-branch` runs migrations, seeds, and the app boots with data.

## Rollout

Single PR. Additive — seeder only runs when invoked, `HUBSPOT_MOCK` defaults off, prod/staging unchanged.

## Future work

- **Named seeds** (`--seed=snooze-expiry`) for specific bug-reproducing fixtures — add when a bug demands it.
- **`--volume=large`** flag for hundreds of leads — add when a perf issue demands it.
- **Real HubSpot dev portal** path — add when a sync-path bug demands it.
- **Golden parent Neon branch** — consider if per-branch seed time grows past ~30s.

## Dependencies

- `@faker-js/faker` (new devDependency).
- No `drizzle-seed`; no `@snaplet/seed`.
