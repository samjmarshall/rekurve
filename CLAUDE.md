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

### Reviewing code

- **Pre-merge gate (optional).** Before merging a substantial PR, you may run `/code-review ultra` (alias `/ultrareview`) for a deep pass — a fleet of reviewer agents in a remote sandbox that independently reproduces and verifies each finding. **This is a premium feature billed against usage credits, not your plan's included usage:** Pro/Max get 3 one-time free runs, then ~$5–$20 per review in usage credits (which must be enabled on the account). Use fast `/code-review` (subscription usage) for everyday review.

### Verification

**NEVER run `make build`, `make check`, `make test`, or `make test_e2e` directly via Bash.** Always use **@agent-codebase-verification**! This applies to both proactive post-code-change verification *and* explicit user requests ("run make test", "run the e2e suite"). The agent isolates verbose build/test output from the main context and returns a compact pass/fail result.

### GitHub Issues & Projects board

**NEVER run `gh issue create`/`edit`, `gh api … /sub_issues`, or `gh project … ` field mutations directly via Bash in the main context.** Delegate to an agent so the verbose tracker output stays out of context:

- **@agent-github-issue** — to *publish a prepared ticket set*: create issues from body files, wire sub-issues, set Project fields, and run the ticket validator. The `ticket-writer` skill routes its publish phase here.
- **@agent-github-project** — to *read or restructure the existing board*: query state, compute milestone/field deltas, move/close/relabel issues.

Pick by intent: authoring-then-publishing new issues → `github-issue`; operating on what's already there → `github-project`. Read-only one-off `gh` lookups in service of another task are fine inline.
