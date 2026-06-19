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
- Main worktree (no prefix): https://rekurve.localhost
- Linked worktree on branch "fix-ui": https://fix-ui.rekurve.localhost

---

## Vercel CLI

Vercel is the source of truth for env vars — never hand-edit `.env.local`, pull from Vercel instead.

**One-time setup per clone:** `make vercel_link` → `make env_pull`

Use `--sensitive` when adding `BETTER_AUTH_SECRET`, `HUBSPOT_*`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY` to Vercel.

---

## Testing

- **Unit tests** use **Rstest** via `make test` (not `yarn test`). See the `rstest-best-practices` skill for config.
- **Integration tests** hit real Neon branches. **Never mock the database** — we got burned by mock/prod divergence.
- **E2E tests** use **Playwright** via `make test_e2e`. Don't TDD E2E — they're too slow for the tracer-bullet loop. Detailed E2E guardrails live in `.claude/rules/e2e-testing.md`.

---

## Workflows

### Verification

**NEVER run `make build`, `make check`, `make test`, or `make test_e2e` directly via Bash.** Always use **@agent-codebase-verification**! This applies to both proactive post-code-change verification *and* explicit user requests ("run make test", "run the e2e suite"). The agent isolates verbose build/test output from the main context and returns a compact pass/fail result.
