# Claude Config: On the Horizon

Source: /insights run 2026-04-21 (171 sessions analysed).

Three ambitious workflow ideas surfaced from session analysis. None is ready to build now — each has a trigger condition that must be met first. Captured here to avoid losing the design thinking.

---

## 1. Autonomous E2E Repair Swarm

**Trigger:** ≥3 consecutive weeks containing at least one E2E flake session.

**Rough design:**
- Headless Claude triggered by a failed CI run via `workflow_dispatch` or `repository_dispatch`.
- Spins up parallel git worktrees — one per failing spec.
- Each worktree agent reproduces the failure locally, then classifies it: flake (non-deterministic) vs. regression (consistent).
- Flake: patches cleanup or timing; opens a fix PR.
- Regression: opens a bug report issue with reproduction steps.
- Merge agent reviews worktree PRs, squashes atomic commits, runs final CI gate.

**Prerequisites:**
- Headless Claude available in CI with sufficient token budget.
- `EnterWorktree` / `ExitWorktree` tooling stable and well-tested.
- Transcript access so the agent can read prior failure context.

**Risks:**
- Flake classification is hard; mis-classifying a regression as a flake delays a real fix.
- Parallel worktrees multiply API cost; a flaky suite could trigger runaway spend.

---

## 2. Parallel Plan-to-PR Pipeline

**Trigger:** Plans with ≥5 independent phases that currently execute serially, extending wall-clock time beyond 2 hours.

**Rough design:**
- Orchestrator reads a ralph `spec.json`, identifies phases with no inter-dependencies.
- Fans independent phases out to per-worktree subagents running in parallel.
- Each subagent commits its phase to its worktree branch.
- Merge agent cherry-picks or rebases phase branches into a single PR, resolving conflicts, and runs the full CI gate.

**Prerequisites:**
- ralph `spec.json` format stable and widely adopted across plans.
- Worktree tooling supports concurrent writes without lock contention.
- Orchestrator can reliably detect phase dependencies from the plan graph.

**Risks:**
- Merge conflicts between phases are hard to resolve automatically without losing intent.
- Subagent cost multiplies with parallelism; a mis-scoped plan could be expensive.

---

## 3. Self-Improving Config From Session Telemetry

**Trigger:** A recurring friction pattern appears in ≥5 distinct sessions within a 2-week window without a corresponding guardrail in `CLAUDE.md` or `.claude/commands/`.

**Rough design:**
- Nightly job parses `~/.claude/projects/*.jsonl` transcripts.
- Clusters tool-call sequences around known friction signals (retries, user corrections, mismatch blocks).
- Groups clusters by pattern type (wrong migration command, wrong branch assumption, missing cleanup, etc.).
- For each cluster above the threshold, drafts a one-paragraph addition to `CLAUDE.md` or the relevant command file.
- Opens a PR with the proposed edits for human review before merging.

**Prerequisites:**
- Transcript JSONL format is stable and parseable (field names, event types).
- Clustering logic can distinguish genuine friction from intentional deviation.
- PR workflow for config changes is established (review, merge, rollout).

**Risks:**
- Noisy transcripts produce low-quality suggestions; human review is essential.
- Self-referential edits (config changing the config process) risk runaway drift without a stability anchor.
