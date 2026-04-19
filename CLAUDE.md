# CLAUDE.md

---

## Current Project State

**Status**: Pre-PMF validation phase. Running free Release Pilot to validate use cases.

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


1. `yarn db:generate` — generate a migration SQL file in `drizzle/`
2. `yarn db:migrate` — apply pending migrations and record them in `__drizzle_migrations`

---

## E2E Testing

**_BEFORE marking e2e test changes complete:_** Audit every locator in every method you modified or called. If any uses `getByRole()`, `getByText()`, `getByLabel()`, or CSS selectors instead of `getByTestId()`, check the source component — if it already has a `data-testid`, switch to it; if not, add one to the source, then kill any Next.js server and build and start to verify. This is a **blocking gate** — do not check off e2e test task items until this audit is done.

---

## Workflows

### Building & Reviewing UI

Use the `frontend-design` skill when implementing UI components, pages, or layouts. After completing UI/UX work in `src/`, run `/design_review` before committing.
