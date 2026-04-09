# CLAUDE.md

The role of this file is to describe common mistakes, confusion points and workflows that agents might encounter when they work in this project. If you encounter something in this project that surprises you, make an update to the CLAUDE.md file to help prevent future agents from having the same issue.

---

## Quick Start: Current Project State

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

---

## Database Migrations

**Never use `drizzle-kit push`** — it applies schema changes directly without recording them in the migrations table, breaking idempotency.

Always use this two-step process:

1. `yarn db:generate` — generate a migration SQL file in `drizzle/`
2. `yarn db:migrate` — apply pending migrations and record them in `__drizzle_migrations`

---

## Workflows

### Building & Reviewing UI

Use the `frontend-design` skill when implementing UI components, pages, or layouts. After completing UI/UX work in `src/`, run `/design_review` before committing.
