- When reporting information to me, be extremely concise and sacrifice grammar for the sake of concision.

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
- `make diagrams` — render ADR D2 diagrams (`docs/adr/diagrams/*.d2` -> `.svg`, ELK layout)
- `make diagrams-check` — CI freshness gate: fails if any committed diagram SVG is stale

Make targets carry `NODE_OPTIONS=--conditions=react-server` (the `import "server-only"` boundary marker throws without it); the rstest targets (`test`, `test_coverage`, `test_integration`) **deliberately unexport it** — rstest stubs the marker via `resolve.alias` instead. Details: `.claude/rules/server-only-boundary.md`.

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
- **Seams**: domain tiers (decide/service/repository/worker cores) are tested through **factory-fake deps objects** (`make*(fakeDeps)`), not module mocks. `rs.doMock` is reserved for Next-route/client seams (route handlers, `~/env`, `~/server/db` import-time graphs).
- **Shared harnesses**: `src/server/api/__tests__/caller-harness.ts` (tRPC caller), `src/server/inngest/__tests__/step-fake.ts` (Inngest step fake), `src/server/__tests__/import-neutraliser.ts` (worker import-graph neutraliser), plus per-domain `__tests__/fixtures.ts`.
- **Integration tests** hit real Neon branches. **Never mock the database** — we got burned by mock/prod divergence.
- **E2E tests** use **Playwright** via `make test_e2e`. Don't TDD E2E — they're too slow for the tracer-bullet loop. Detailed E2E guardrails live in `.claude/rules/e2e-testing.md`.

---

## Server architecture

Domain-oriented 3-tier under `src/server/<domain>/` with an isomorphic kernel at `src/domain/` and a transactional-outbox write path. Decision records: [adr019](docs/adr/adr019-system-wide-transactional-outbox-posture.md) (outbox posture), [adr020](docs/adr/adr020-domain-oriented-3-tier-server-architecture.md) (3-tier + `commit(writes, outboxEvents)`), [adr021](docs/adr/adr021-per-domain-schema-files.md) (schema homes). Working rules: `.claude/rules/server-architecture.md` (tier map, module surface, write door, frozen identifiers) and `.claude/rules/server-only-boundary.md` (the `server-only` marker mechanism).

---

## Workflows

### Reviewing code

- **Pre-merge gate (optional).** Before merging a substantial PR, you may run `/code-review ultra` (alias `/ultrareview`) for a deep pass — a fleet of reviewer agents in a remote sandbox that independently reproduces and verifies each finding. **This is a premium feature billed against usage credits, not your plan's included usage:** Pro/Max get 3 one-time free runs, then ~$5–$20 per review in usage credits (which must be enabled on the account). Use fast `/code-review` (subscription usage) for everyday review.

### Verification

**NEVER run `make build`, `make check`, `make test`, or `make test_e2e` directly via Bash.** Always use **@agent-codebase-verification**! This applies to both proactive post-code-change verification *and* explicit user requests ("run make test", "run the e2e suite"). The agent isolates verbose build/test output from the main context and returns a compact pass/fail result.

### GitHub Issues & Projects board

**NEVER run `gh issue create`/`edit`, `gh api … /sub_issues`, or `gh project … ` field mutations directly via Bash in the main context.** Delegate to an agent so the verbose tracker output stays out of context:

- **@agent-github-issue** — to *publish a prepared ticket set*: create issues from body files, wire sub-issues, set Project fields, and run the ticket validator. The `write-tickets` skill routes its publish phase here.
- **@agent-github-project** — to *read or restructure the existing board*: query state, compute milestone/field deltas, move/close/relabel issues.

Pick by intent: authoring-then-publishing new issues → `github-issue`; operating on what's already there → `github-project`. Read-only one-off `gh` lookups in service of another task are fine inline.
