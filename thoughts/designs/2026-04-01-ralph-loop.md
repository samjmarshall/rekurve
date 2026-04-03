# Ralph Loop: Automated Plan Implementation Script

## Overview

A shell script that drives Claude Code through implementation plans one section at a time, using isolated environments and incremental commits. Each section goes through an implement-then-validate cycle with separate Claude sessions, producing atomic commits and structured metrics for analysis and optimization.

## Context

Implementation plans in `thoughts/plans/` follow a checkbox format with phases, sections, and success criteria. Today these are executed manually via `/implement_plan` and `/validate_plan` skills in interactive Claude sessions. The Ralph loop automates this with:

- **Isolation**: Git worktree + Portless + conditional Neon branch
- **Incremental progress**: One section at a time, committed before moving on
- **Failure resilience**: Progress notes written on failure so the next attempt can resume
- **Metrics collection**: Token usage, cost, duration, and success rate per session
- **Optimization hooks**: Configurable knobs for model, prompts, and limits — enabling prompt optimization pipelines

## Three-State Checkbox Protocol

```
- [ ]  → Not started
- [/]  → Implemented, awaiting validation
- [x]  → Validated and committed
```

The shell script owns the loop. Claude sessions are stateless — each receives a single section to work on and exits when done. Progress lives in the plan file, not in Claude's memory.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  ralph.sh                                            │
│                                                      │
│  1. Setup (idempotent):                              │
│     - Git worktree on ralph/<plan-slug>/<date>       │
│     - Portless dev server (if UI/E2E needed)         │
│     - Neon branch (if migrations detected)           │
│     - Sanity gate: make check                        │
│                                                      │
│  2. Main loop:                                       │
│     a. Parse plan → find first section with - [ ]    │
│     b. claude -p + ralph-implement.md                │
│        └→ implements section, marks - [/]            │
│     c. claude -p + ralph-validate.md                 │
│        └→ validates, marks - [x], atomic commit      │
│     d. Append metrics → loop back to (a)             │
│                                                      │
│  3. On failure at (b) or (c):                        │
│     Claude writes progress note → exits              │
│     Script logs failure metrics → stops              │
│                                                      │
│  4. Teardown (plan complete or interrupt):            │
│     - Stop Portless                                  │
│     - Delete Neon branch                             │
│     - Optionally merge and remove worktree           │
└──────────────────────────────────────────────────────┘
```

## Task Granularity

**Per numbered section** (e.g., everything under `#### 1.1 Prevent Waterfall Chains`). Sub-checkboxes within a section are interdependent — they share file references and expected findings. One implement+validate cycle per section, one commit per section.

Configurable fallback to per-checkbox granularity (`--granularity checkbox`) if sections prove too large for reliable single-session completion.

## Shell Script Design

### Invocation

```bash
scripts/ralph.sh <plan-path> [options]
```

| Flag | Default | Description |
|---|---|---|
| `--max-turns` | `15` | Max Claude agent turns per session |
| `--max-budget` | `5.00` | Max USD per session |
| `--model` | `opus` | Claude model to use |
| `--implement-prompt` | `.claude/prompts/ralph-implement.md` | Override implement prompt |
| `--validate-prompt` | `.claude/prompts/ralph-validate.md` | Override validate prompt |
| `--granularity` | `section` | `section` or `checkbox` |
| `--no-portless` | (off) | Skip Portless dev server |
| `--no-neon` | (off) | Skip Neon branch even if migrations detected |

### Plan Parsing

The script extracts sections by scanning for `####` headers within phases (`##` or `###` headers). A section is "incomplete" if it contains any `- [ ]` markers. The first incomplete section becomes the target.

The section identifier (e.g., `1.1`) and header text are passed to Claude as part of the `-p` prompt argument.

### Claude Invocation Pattern

```bash
output=$(claude -p \
  "Implement section $SECTION_ID ($SECTION_TITLE) from the plan at $PLAN_PATH." \
  --append-system-prompt-file "$IMPLEMENT_PROMPT" \
  --output-format json \
  --max-turns "$MAX_TURNS" \
  --max-budget-usd "$MAX_BUDGET" \
  --model "$MODEL" \
  --allowedTools "Read,Edit,Grep,Glob,Bash(make *),Bash(git diff *),Bash(git status *)")
```

### Success Detection

After each Claude session, the script checks:

1. **Process exit code** — non-zero means crash
2. **`is_error`** in JSON — logical failure
3. **`subtype`** — `"error_max_turns"` means Claude ran out of iterations
4. **Plan file state** — did the expected markers appear (`[/]` after implement, `[x]` after validate)?

The plan file is the source of truth. If Claude claims success but didn't update the markers, the script treats it as a failure.

### Resume

Re-running `ralph.sh` with the same plan skips completed sections (`[x]`). If a section has `[/]` markers (implemented but not validated), the script skips straight to the validate step. Pure `[ ]` sections start from implement.

## Prompt File Design

### `.claude/prompts/ralph-implement.md`

Self-contained system prompt loaded via `--append-system-prompt-file`. Core contract:

**Do:**
- Read the full plan for context, but implement ONLY the target section
- Read all referenced files completely before making changes
- Run verification commands from the plan's success criteria (`make check`, `make build`)
- On success: mark all `- [ ]` in the target section as `- [/]`
- On failure or running out of turns: write a `> **Ralph note (YYYY-MM-DD):**` blockquote under the section header with progress, remaining work, and blockers

**Don't:**
- Touch anything outside the target section's scope
- Create todo lists (single section, not needed)
- Attempt phase-level sequencing (the shell script handles that)
- Handle resumption logic (the shell script handles that)

Behavioral lineage from `/implement_plan`:
- Read files fully (no limit/offset)
- Follow the plan's intent while adapting to reality
- Stop and write structured notes when reality diverges from the plan

### `.claude/prompts/ralph-validate.md`

Core contract:

**Do:**
- Read the target section to understand what was implemented
- Run `git diff` to see what changed
- Run all automated verification: `make check`, `make build`, `make test` if referenced
- Validate changes match the section's intent (not just that checks pass)
- On success: mark all `- [/]` as `- [x]`, then create an atomic commit
- On failure: revert `[/]` back to `[ ]`, write a Ralph note explaining what failed

**The commit step** (inlined from `/commit` behavior):
- `git add` only files changed by this section (explicit paths, never `-A`)
- Conventional commit format derived from the nature of the change
- Plan filename referenced in the commit body for traceability
- Check `git check-ignore` before staging any file

Behavioral lineage from `/validate_plan`:
- Run all automated checks
- Compare actual changes against plan specifications
- Think critically about edge cases and unintended side effects

## Environment Setup

### Git Worktree

```bash
PLAN_SLUG=$(slugify "$PLAN_NAME")
WORKTREE_DIR=".worktrees/ralph-$PLAN_SLUG"
BRANCH_NAME="ralph/$PLAN_SLUG/$(date +%Y-%m-%d)"

git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME"
```

The worktree lives inside `.worktrees/` (gitignored). Ralph's incremental commits accumulate on the ralph branch and get squash-merged or cherry-picked back when the plan is complete.

### Portless

The project's `dev` script uses Portless:

```json
{ "dev": "portless run next dev" }
```

Portless auto-detects the worktree branch and creates subdomains:

| Context | URL |
|---|---|
| Main worktree | `https://www.localhost` |
| Ralph worktree | `https://ralph-code-review.www.localhost` |

The ralph script only starts a dev server if the plan's success criteria reference `make test_e2e` or manual UI verification. Audit-only plans skip this.

### Neon Branch (Conditional)

The script checks whether the plan references migration files, schema changes, or `db_generate`/`db_push`. If yes:

```bash
neon branches create \
  --name "ralph/$PLAN_SLUG" \
  --parent main \
  --project-id "$NEON_PROJECT_ID"

BRANCH_URL=$(neon connection-string \
  --branch "ralph/$PLAN_SLUG" \
  --project-id "$NEON_PROJECT_ID")

echo "DATABASE_URL=$BRANCH_URL" >> "$WORKTREE_DIR/.env.local"
echo "DATABASE_URL_UNPOOLED=${BRANCH_URL/pooler/direct}" >> "$WORKTREE_DIR/.env.local"
```

If no migration references — the worktree inherits the parent's database config.

### Teardown

```bash
# Stop Portless dev server if running
# Delete Neon branch if created
neon branches delete "ralph/$PLAN_SLUG" --project-id "$NEON_PROJECT_ID"
# Remove worktree
git worktree remove "$WORKTREE_DIR"
# Optionally delete the ralph branch if merged
```

## Metrics Collection

### Per-Session Metrics

Each Claude invocation's JSON output is enriched and appended to:

```
.ralph/metrics/<plan-slug>-<date>.jsonl
```

Record schema:

```json
{
  "timestamp": "2026-04-01T14:32:00Z",
  "plan": "2026-04-01-code-review-best-practices-checklist.md",
  "section": "1.1",
  "section_title": "Prevent Waterfall Chains",
  "phase": "implement",
  "subtype": "success",
  "total_cost_usd": 0.0312,
  "input_tokens": 8200,
  "output_tokens": 3100,
  "cache_read_tokens": 1200,
  "duration_ms": 45000,
  "duration_api_ms": 32000,
  "num_turns": 7,
  "model": "claude-opus-4-6",
  "max_turns_configured": 15,
  "max_budget_configured": 5.00
}
```

Two records per section (implement + validate). This gives per-task and per-plan cost, time, and success breakdowns.

### Key Metrics

| Metric | Question it answers |
|---|---|
| `total_cost_usd` (impl + val) | How much does completing one section cost? |
| `num_turns` | Is Claude thrashing (high turns) or efficient? |
| `duration_ms` vs `duration_api_ms` | Tool execution time vs thinking time? |
| `output_tokens / input_tokens` | Reading too much, writing too little (or vice versa)? |
| `subtype` distribution | What % succeed vs hit max_turns vs error? |
| Section completion rate | How many sections complete on first attempt? |
| Validate-to-implement cost ratio | Over-validating relative to implementation effort? |

## Evaluation Suite

### Comparing Runs

```bash
scripts/ralph-eval.sh compare \
  .ralph/metrics/code-review-opus.jsonl \
  .ralph/metrics/code-review-sonnet.jsonl
```

Output:

```
Section | Model A (opus)    | Model B (sonnet)  | Delta
--------|-------------------|-------------------|-------
1.1     | $0.03 / 7 turns   | $0.01 / 5 turns   | -66% cost
2.3     | $0.08 / 12 turns  | FAIL (max_turns)  | x
3.1     | $0.15 / 14 turns  | $0.04 / 6 turns   | -73% cost
```

### Reference Plans as Benchmarks

Completed plans serve as benchmarks. To test a new model or prompt:

1. Create a fresh worktree from the pre-implementation commit
2. Re-run ralph against the same plan with the new config
3. Compare metrics against the baseline run
4. Use the git diff as a correctness check — does the new run produce equivalent changes?

Real plans on real code. No synthetic test fixtures.

### Optimization Pipeline Hooks

The configurable knobs (`--model`, `--implement-prompt`, `--validate-prompt`, `--max-turns`) enable a GEPA-style optimization pipeline:

1. Generate prompt variants (or plan format variants)
2. Run ralph against a reference plan with each variant
3. LLM judge scores the code output for correctness and quality
4. Compare against metrics baseline (cost, turns, success rate)
5. Select Pareto-optimal prompt per model per task category

Model-specific prompt variants live alongside defaults: `.claude/prompts/ralph-implement-sonnet.md`, `.claude/prompts/ralph-implement-haiku.md`, etc.

The metrics JSONL + git diff output gives the judge everything needed — structured metrics for efficiency, actual code changes for quality.

### Building a Task-to-Model Dataset

Over time, the metrics accumulate a dataset mapping:
- **Task type** (audit, refactor, migration, feature) → derived from plan phase/section
- **Task complexity** (tokens consumed, turns needed) → from metrics
- **Model performance** (success rate, cost, quality) → from comparative runs

This dataset informs automatic model routing — e.g., "audit sections go to sonnet, refactoring sections go to opus" — without manual rules.

## File Structure

```
scripts/ralph.sh                              # Main loop script
scripts/ralph-eval.sh                         # Metrics comparison tool
.claude/prompts/ralph-implement.md            # Implement system prompt
.claude/prompts/ralph-validate.md             # Validate system prompt
.ralph/                                       # Runtime directory (gitignored)
  metrics/                                    # JSONL logs per plan run
.worktrees/                                   # Git worktrees (gitignored)
```

## What We're NOT Building

- No dashboard UI — JSONL + jq/CLI is enough for now
- No automated prompt optimization — humans review metrics and iterate first
- No CI integration — ralph is a local development tool first
- No automatic retry on failure — humans review notes and decide
- No parallel section execution — sequential by design for deterministic commits

## References

- `/implement_plan` skill — behavioral lineage for ralph-implement prompt
- `/validate_plan` skill — behavioral lineage for ralph-validate prompt
- `/commit` skill — commit conventions inlined into ralph-validate prompt
- [Vercel Labs Portless](https://github.com/vercel-labs/portless) — local dev isolation
- [Neon CLI branching](https://neon.com/docs/guides/branching-neon-cli) — database isolation
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference.md) — `-p` mode, `--output-format json`
- [Claude Code headless mode](https://code.claude.com/docs/en/headless) — scripting patterns
