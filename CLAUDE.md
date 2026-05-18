# CLAUDE.md

---

## Current Project State

**Status**: Pre-PMF validation phase.

**Project Tracking**: [GitHub Project](https://github.com/users/samjmarshall/projects/2) - all tasks, roadmap, and progress tracked via GitHub Issues.

---

## Build & Test Commands

Prefer Makefile targets with `yarn` as a fallback — never use `npm` or `npx` directly:

- `make build` — clean build (`rm -rf .next` + `yarn build`)
- `make check` — lint + typecheck (`yarn check`)
- `make test` — run Rstest unit tests (`yarn test`)
- `make test_e2e` — run Playwright E2E tests (`yarn test:e2e`)
- `make start` — local dev server (`yarn dev`)
- `make install` — install dependencies (`yarn`)

The dev server runs via Vercel Portless - no port.
- Main worktree (no prefix): https://www.localhost
- Linked worktree on branch "fix-ui": https://fix-ui.www.localhost

---

## Database Migrations

**Never use `drizzle-kit push`** — it applies schema changes directly without recording them in the migrations table, breaking idempotency.

Always use this two-step process:

1. `make db_generate` — generate a migration SQL file in `drizzle/`
2. `make db_migrate` — apply pending migrations and record them in `__drizzle_migrations`

When schema changes touch tables seeded by `scripts/seed-dev.ts`, update the corresponding fixture in `src/server/db/seed/fixtures/*` in the same PR. The seeder is typesafe — a stale fixture will fail `make check` and `make build`.

---

## Vercel CLI

Vercel is the source of truth for env vars — never hand-edit `.env.local`, pull from Vercel instead.

**One-time setup per clone:** `make vercel_link` → `make env_pull`

Use `--sensitive` when adding `CRON_SECRET`, `BETTER_AUTH_SECRET`, `HUBSPOT_*`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY` to Vercel.

---

## Testing

- **Unit tests** use **Rstest** via `make test` (not `yarn test`). See the `rstest-best-practices` skill for config.
- **Integration tests** hit real Neon branches. **Never mock the database** — we got burned by mock/prod divergence.
- **E2E tests** use **Playwright** via `make test_e2e`. Don't TDD E2E — they're too slow for the tracer-bullet loop.

---

## E2E Testing

**_BEFORE marking e2e test changes complete:_** Audit every locator in every method you modified or called. If any uses `getByRole()`, `getByText()`, `getByLabel()`, or CSS selectors instead of `getByTestId()`, check the source component — if it already has a `data-testid`, switch to it; if not, add one to the source, then kill any Next.js server and build and start to verify. This is a **blocking gate** — do not check off e2e test task items until this audit is done.

Additional guardrails for all E2E specs:

- **Per-spec cleanup** — every spec that creates leads or HubSpot contacts tracks them by phone or email within that spec and cleans up in `afterAll`. Never rely on broad search filters — HubSpot search is eventually consistent and can miss a contact created moments earlier.
- **dotenv load order** — any script or fixture that reads env vars must call `dotenv.config()` **before** importing anything that triggers `~/env` validation.
- **Flake double-run** — if an E2E spec fails, re-run just that spec once before diagnosing. Only treat it as a real regression if it fails twice in a row.
- **Test data isolation** — never share a phone number or email across specs; collisions hit the unique constraint and mask real failures. Always generate a unique value per run (e.g., timestamp + random suffix).

---

## GitHub Actions

`repository_dispatch`, `schedule`, and `workflow_dispatch` triggers always run from the **default branch (`main`)** — not from the branch that triggered the event. A fix pushed to a feature branch will not take effect until it is merged into `main`. This is how GitHub Actions works by design (see `.github/workflows/quality-control.yml:48` for the existing `repository_dispatch` usage).

---

## Workflows

### Building & Reviewing UI

Use the `frontend-design` skill when implementing UI components, pages, or layouts. After completing UI/UX work in `src/`, run `/design_review` before committing.

### Verification

**NEVER run `make build`, `make check`, `make test`, or `make test_e2e` directly via Bash.** Always use **@agent-codebase-verification**! This applies to both proactive post-code-change verification *and* explicit user requests ("run make test", "run the e2e suite"). The agent isolates verbose build/test output from the main context and returns a compact pass/fail result.

---

## Frontend Architecture

**Context Providers**: reserved for genuinely global state (auth, theme, feature flags, transport clients, routing). For page- or modal-local state, inline `useState` in the owning component and pass values down as explicit named props — never extract into a custom hook (callable elsewhere) or a Context Provider (widens the read/write surface to the whole subtree). See [ADR-012](docs/adr/adr012-context-providers-for-global-state-only.md).
