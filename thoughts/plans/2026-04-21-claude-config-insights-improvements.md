# Claude Code Config Improvements from /insights Report Implementation Plan

## Context

The `/insights` run on 2026-04-21 analysed 171 sessions over 510h and surfaced recurring friction patterns (drizzle-kit push drift, `repository_dispatch` branch confusion, HubSpot eventual-consistency flakes, dotenv ordering, scope misalignment during implementation). Several fixes already landed in `CLAUDE.md` and existing skills; this plan codifies the remaining learnings as concrete edits to `CLAUDE.md`, slash commands, and skills so each recurring mistake becomes a guardrail before it can recur. MCP servers (GitHub, HubSpot) and speculative "on the horizon" ideas are out of scope for execution — the latter are captured as research notes for later.

## Current State

- `CLAUDE.md:30-38` — Database Migrations section already forbids `drizzle-kit push` and documents `yarn db:generate` → `yarn db:migrate`.
- `CLAUDE.md:51-53` — E2E Testing section only covers `getByTestId` locator audits; no guidance on per-spec cleanup, dotenv ordering, or flake re-runs.
- `CLAUDE.md:63-65` — Verification rule forbids running `make check/test/build/test_e2e` via Bash and mandates `@agent-codebase-verification`.
- `.claude/skills/commit/SKILL.md:13-26` — Conventional Commits rule set (type as category, `ci/fix/feat/test/chore/refactor/docs`) and `Refs: #` footer for ticket links.
- `.claude/commands/create_plan.md:12` — Already mandates parallel `Explore` subagents for non-trivial scope.
- `.claude/commands/implement_plan.md:11-19` — No pre-flight risk scan; Claude currently jumps from plan read to code.
- `.claude/settings.json:3-35` — Active hooks: Skill logging (PreToolUse), dangerous-git blocker (PreToolUse), biome-format (PostToolUse on Edit/Write/MultiEdit).
- `.claude/scripts/block-dangerous-git.sh:12-22` — Blocks `git push`, `reset --hard`, `branch -D`, `checkout .`, `restore .`, `clean -f[d]`.
- `.claude/skills/` — `commit`, `tdd`, `plan-to-ralph-spec`, `frontend-design`, `roadmap-review`, `rstest-best-practices`, `ticket-writer`, `improve-architecture`, `writing-clearly-and-concisely`, `zod`, plus symlinked shared skills. No `e2e-cleanup` skill exists.
- `.github/workflows/` — `neon.yml`, `quality-control.yml`, `post-deploy.yml`, `release.yml`. Mix of `push`, `pull_request`, `pull_request.closed`, and `repository_dispatch` (per `quality-control.yml:48`) triggers.
- `thoughts/research/` — Uses `YYYY-MM-DD-<slug>.md` naming (see `2026-04-21-autorubric-verbatim-quotes.md`).

## Desired End State

A future session that hits any of these patterns gets caught by a durable guardrail:

- `CLAUDE.md` has dedicated `## GitHub Actions` and expanded `## E2E Testing` sections that pre-state the five recurring gotchas (default-branch trigger, per-spec cleanup, eventual consistency, dotenv load order, flake double-run).
- `/implement_plan` produces a "Risks & Gotchas" block and waits for approval before touching code.
- `/validate_plan` mandates re-running failed E2E specs once before treating them as regressions.
- `.claude/skills/e2e-cleanup/SKILL.md` captures the per-spec phone/email tracking + eventual-consistency-aware cleanup pattern.
- `thoughts/research/2026-04-21-claude-config-on-the-horizon.md` captures the three speculative workflow ideas (autonomous E2E repair, parallel plan-to-PR pipeline, self-improving config) with trigger conditions and rough designs.
- Each change is verified by running the associated slash command or skill once against a tiny scenario and confirming the new behaviour appears.

## Out of Scope

- GitHub and HubSpot MCP server installation — both are token-heavy and unreliable per user feedback.
- `PostToolUse` typecheck hook — conflicts with `CLAUDE.md:63-65` (use `@agent-codebase-verification`, not direct Bash).
- A `/migrate` skill — `CLAUDE.md:30-38` already covers the rule; a skill would duplicate.
- Immediate implementation of the three "on the horizon" ambitious workflows. They are captured as research notes only.
- Any change to `.github/workflows/` YAML files themselves — the CI guidance is documentation only, since the user wants Claude to reason about `repository_dispatch` behaviour, not rewrite the workflows.

## Approach

Six small phases, each landing one or two files. Every phase is verified by invoking the relevant slash command or skill against a trivial scenario and confirming the new guardrail fires or the new guidance is visible. No `make` targets apply since nothing is compiled, but Phase 6 adds a single automated `make check`/`make test` pass as a sanity check that none of the doc edits broke an unrelated reference. Phases are independent and can be reordered; they are sequenced below roughly by bang-for-buck.

## Phase 1: Expand CLAUDE.md with missing guardrails

### Changes
- `CLAUDE.md` — Add two new sections after the existing `## E2E Testing` section:
  - `## GitHub Actions` — one paragraph stating `repository_dispatch`, `schedule`, and `workflow_dispatch` always run from the default branch (`main`); fixes on feature branches will not take effect until merged. Cite the existing `repository_dispatch` usage in `.github/workflows/quality-control.yml:48`.
  - Expand `## E2E Testing` (append, keep the existing locator-audit paragraph as-is) with four bullets:
    1. Per-spec cleanup — every spec that creates leads/HubSpot contacts tracks them by phone or email within that spec and cleans up in `afterAll`. Do not rely on broad filters — HubSpot search is eventually consistent.
    2. dotenv load order — any script that reads env vars must load `dotenv` **before** importing anything that runs env validation (i.e. before importing `~/env`).
    3. Flake double-run — if an E2E spec fails, re-run just that spec once before diagnosing. Only treat it as a regression if it fails twice in a row.
    4. Test data isolation — never share a phone number or email across specs; collisions hit the unique constraint and mask real failures.

### Success
**Automated**
- [x] N/A — documentation only.

**Manual**
- [x] New `## GitHub Actions` section renders in `CLAUDE.md` with the default-branch statement and cites `.github/workflows/quality-control.yml:48`.
- [x] `## E2E Testing` section contains all four new bullets alongside the existing locator-audit paragraph.
- [ ] Start a fresh Claude Code session and ask "what branch does a `repository_dispatch` workflow run from?" — the answer reflects the new guidance without further prompting.

## Phase 2: Add pre-flight risk scan to /implement_plan

### Changes
- `.claude/commands/implement_plan.md` — Inserted `## Pre-flight: Risks & Gotchas` section between `## Getting Started` and `## Implementation Philosophy`. Generic 4-item checklist (schema changes, CI trigger scope, env vars, test data). Updated Getting Started bullet to "Run the Pre-flight risk scan (next section) before writing code."

### Success
**Automated**
- [x] N/A — command definition only.

**Manual**
- [x] `## Pre-flight: Risks & Gotchas` section present in `.claude/commands/implement_plan.md` with 4 items.
- [ ] Run `/implement_plan` with a plan containing a fake env var + migration and confirm Claude produces a Risks block before editing files.

## Phase 3: Add flake double-run rule to /validate_plan

### Changes
- `.claude/commands/validate_plan.md` — In `### Step 2: Systematic Validation` → item **2. Run automated verification** (around `.claude/commands/validate_plan.md:77-79`), append a sub-bullet: "If an E2E spec fails, re-run just that spec once via `@agent-codebase-verification` before starting root-cause analysis. Only treat the failure as a real regression if it fails twice in a row. First-run flakes on parallel specs are a recurring pattern."

### Success
**Automated**
- [x] N/A — command definition only.

**Manual**
- [x] New sub-bullet present under **2. Run automated verification** in `.claude/commands/validate_plan.md`.
- [ ] In a fresh session, ask "during `/validate_plan`, what do I do if a single E2E spec fails?" — response names the re-run-once rule.

## Phase 4: Create e2e-cleanup skill

### Changes
- `.claude/skills/tdd/e2e-cleanup.md` — New sub-file under the existing `tdd` skill (not a standalone skill). Covers: eventual-consistency failure mode, per-spec tracking set pattern, test data isolation, dotenv load order, and when not to use. Cites `CLAUDE.md` E2E Testing as the canonical rules reference.
- `.claude/skills/tdd/SKILL.md` — Updated the E2E bullet in `## Rekurve-specific notes` to link to `e2e-cleanup.md`.

### Success
**Automated**
- [x] N/A — skill definition only.

**Manual**
- [x] `.claude/skills/tdd/e2e-cleanup.md` exists with the per-spec tracking pattern and dotenv note.
- [x] `.claude/skills/tdd/SKILL.md` links to `e2e-cleanup.md` from the E2E bullet.

## Phase 5: Capture "on the horizon" ideas as research notes

### Changes
- `thoughts/research/2026-04-21-claude-config-on-the-horizon.md` — New file. One section per ambitious idea, each with:
  - **Trigger** — the objective signal that would justify starting this build (e.g. "≥3 consecutive weeks with an E2E flake session").
  - **Rough design** — 3–5 bullets sketching the architecture (orchestrator, subagents, data flow).
  - **Prerequisites** — what needs to be true before starting (headless Claude in CI, git worktree tooling, transcript access, token budget).
  - **Risks** — top 2 failure modes.
  - Sections:
    1. Autonomous E2E Repair Swarm — headless Claude triggered by failed CI, reproduces in parallel worktrees, classifies flake vs. regression, opens fix PR.
    2. Parallel Plan-to-PR Pipeline — orchestrator reads ralph `spec.json`, fans phases out to per-worktree subagents, merge agent stitches atomic commits.
    3. Self-Improving Config From Session Telemetry — nightly job parses `~/.claude/projects/*.jsonl`, clusters friction events, opens a PR with proposed edits to `CLAUDE.md` and `.claude/commands/`.
  - Append a one-line reference in the file header: `Source: /insights run 2026-04-21 (171 sessions analysed).`

### Success
**Automated**
- [x] N/A — research doc only.

**Manual**
- [x] File exists at `thoughts/research/2026-04-21-claude-config-on-the-horizon.md` with three distinct sections, each containing Trigger/Design/Prerequisites/Risks.
- [x] File is listed under `thoughts/research/` (naming matches siblings like `2026-04-21-autorubric-verbatim-quotes.md`).

## Phase 6: Final integration verification

### Changes
- No code changes. This phase is a cross-cutting sanity check that the doc edits in Phases 1–5 did not break anything the repo depends on.

### Success
**Automated**
- [x] `make check` passes (via `@agent-codebase-verification`).
- [x] `make test` passes (via `@agent-codebase-verification`).

**Manual**
- [ ] Start a fresh Claude Code session, check that `CLAUDE.md` reflects both new sections and that `tdd` skill links to `e2e-cleanup.md`.
- [ ] Run `git status` — only `CLAUDE.md`, `.claude/commands/implement_plan.md`, `.claude/commands/validate_plan.md`, `.claude/skills/tdd/SKILL.md`, `.claude/skills/tdd/e2e-cleanup.md`, and `thoughts/research/2026-04-21-claude-config-on-the-horizon.md` are modified/created. No stray edits.

## References

- Source report: `/insights` run 2026-04-21 (580 sessions total, 171 analysed, 510h, 2026-04-02 → 2026-04-21). HTML at `file:///Users/sam/.claude/usage-data/report.html`.
- Existing guardrails: `CLAUDE.md:30-38` (migrations), `CLAUDE.md:51-53` (E2E locators), `CLAUDE.md:63-65` (verification agent).
- Existing commit rules: `.claude/skills/commit/SKILL.md:13-26`.
- Existing planning workflow: `.claude/commands/create_plan.md:12`, `.claude/commands/implement_plan.md:11-19`, `.claude/commands/validate_plan.md:77-79`.
- Active hooks: `.claude/settings.json:3-35`, `.claude/scripts/biome-format.sh`, `.claude/scripts/block-dangerous-git.sh`.
- Trigger precedent for GitHub Actions guidance: `.github/workflows/quality-control.yml:48` (`repository_dispatch` usage).
