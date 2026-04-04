# Ralph Loop: Core Script & Prompts — Implementation Plan

## Overview

Build `scripts/ralph.sh` and two Claude prompts (`ralph-implement.md`, `ralph-validate.md`) that automate implementation plan execution one section at a time using isolated git worktrees, optional Portless dev servers, optional Neon database branches, and JSONL metrics collection.

**Design doc**: `thoughts/designs/2026-04-01-ralph-loop.md`

## Current State Analysis

- `scripts/` exists with one file (`posthog-setup.ts`)
- `.claude/prompts/` does not exist — needs to be created
- `.worktrees/` and `.ralph/` are not in `.gitignore`
- `package.json` name is `www` — Portless URLs will be `https://www.localhost` (main worktree) or `https://<branch>.www.localhost` (linked worktree)
- Dev command is `next dev --turbo` — needs Portless integration via `portless run`
- `portless` is already in devDependencies (`^0.9.4`) — no global install needed
- Neon CLI is used for database branching (referenced in `.github/workflows/neon.yml`, `.env.example`)
- Existing skills (`/implement_plan`, `/validate_plan`, `/commit`) provide behavioral lineage for the prompts
- Claude CLI supports all required flags: `--max-turns`, `--append-system-prompt-file`, `--output-format json`, `--max-budget-usd`, `--model`, `--allowedTools`
- Claude Code `claude -p` uses Max subscription billing when authenticated via `claude auth login` and no `ANTHROPIC_API_KEY` is set (auth precedence: API key > OAuth). The `--max-budget-usd` flag is only meaningful with API key billing.

### Key Discoveries:
- `/implement_plan` (.claude/commands/implement_plan.md) reads files fully, implements phase-by-phase, marks `- [x]`, stops with structured notes on mismatch
- `/validate_plan` (.claude/commands/validate_plan.md) runs git diff + make check + make test, compares changes to plan intent, produces validation report
- `/commit` (.claude/skills/commit/SKILL.md) uses conventional commits by file category, explicit `git add` (never `-A`), runs `git check-ignore` before staging, no co-author attribution
- Plan sections use `#### N.M Title` numbering within `## Phase N:` headers, with `- [ ]` / `- [x]` checkboxes under each section

## Desired End State

All files below exist, `make check` passes, and `ralph.sh --help` prints usage:

```
scripts/ralph.sh                          # Main loop (executable)
.claude/prompts/ralph-implement.md        # Implement system prompt
.claude/prompts/ralph-validate.md         # Validate system prompt
.claude/prompts/ralph-describe-pr.md      # PR description system prompt
.ralph/                                   # Runtime dir (gitignored, created at runtime)
  metrics/                                # JSONL logs (created at runtime)
```

A user can run:
```bash
scripts/ralph.sh thoughts/plans/2026-04-01-code-review-best-practices-checklist.md
```

And the script will:
1. Create a git worktree, optionally start Portless, optionally create a Neon branch
2. Parse the plan, find the first incomplete section
3. Run `claude -p` with the implement prompt, then validate prompt
4. Record metrics, commit on success, stop on failure
5. Loop until all sections are complete or a failure occurs
6. Push branch, create a GitHub PR with a generated description for human review
7. Tear down the environment

## What We're NOT Doing

- `ralph-eval.sh` comparison tool (separate follow-up plan)
- Benchmarking / optimization pipeline hooks
- Model-specific prompt variants (`ralph-implement-sonnet.md`, etc.)
- Parallel section execution
- Automatic retry on failure
- Dashboard or UI for metrics
- CI integration
- Portless global install — it's a devDependency, accessed via `yarn dev`

## Implementation Approach

Build the script bottom-up: foundation (args, dirs), then prompts (the contract Claude sessions follow), then parsing + environment (worktree, Portless, Neon), then the main loop that ties everything together. Each phase is independently testable — the script can be run with `--help` after Phase 1, prompts can be reviewed standalone after Phase 2, parsing can be tested with `--dry-run` after Phase 3, and the full loop works after Phase 4.

---

## Phase 1: Foundation

### Overview
Create directory structure, update `.gitignore`, and build the CLI argument parsing skeleton for `ralph.sh`.

### Changes Required:

#### 1. Update `.gitignore`
**File**: `.gitignore`
**Changes**: Add entries for `.worktrees/` and `.ralph/` runtime directories.

```gitignore
# Ralph loop runtime
/.worktrees/
/.ralph/
```

Add after the existing `/.agents/` block (line 66).

#### 2. Integrate Portless into `package.json` dev script
**File**: `package.json`
**Changes**: Wrap the dev command with `portless run` so `yarn dev` automatically uses a stable `.localhost` URL with HTTPS.

```diff
- "dev": "next dev --turbo"
+ "dev": "portless run next dev --turbo"
```

Since `portless` is already in devDependencies, `yarn dev` resolves the binary from `node_modules/.bin` — no global install needed. The `portless run` form infers the app name from the directory name (`www` → `https://www.localhost`). In a git worktree on branch `fix-ui`, it automatically produces `https://fix-ui.www.localhost`.

#### 3. Create `scripts/ralph.sh`
**File**: `scripts/ralph.sh` (new)
**Changes**: Executable shell script with argument parsing, defaults, help text, and utility functions.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
BILLING="max"           # "max" (subscription) or "api" (API key, metered)
MAX_TURNS=15
MAX_BUDGET="5.00"       # Only enforced in api mode
MODEL="opus"
IMPLEMENT_PROMPT=".claude/prompts/ralph-implement.md"
VALIDATE_PROMPT=".claude/prompts/ralph-validate.md"
GRANULARITY="section"   # "section" or "checkbox"
NO_PORTLESS=false
NO_NEON=false
NO_PR=false
DRY_RUN=false

# ── Usage ─────────────────────────────────────────────────
usage() {
  cat <<'EOF'
Usage: scripts/ralph.sh <plan-path> [options]

Drive Claude Code through an implementation plan one section at a time.

Options:
  --billing MODE           "max" (subscription, default) or "api" (API key, metered)
  --max-turns N            Max Claude agent turns per session (default: 15)
  --max-budget USD         Max USD per session, api mode only (default: 5.00)
  --model MODEL            Claude model: opus, sonnet, haiku (default: opus)
  --implement-prompt PATH  Override implement prompt (default: .claude/prompts/ralph-implement.md)
  --validate-prompt PATH   Override validate prompt (default: .claude/prompts/ralph-validate.md)
  --granularity MODE       "section" or "checkbox" (default: section)
  --no-portless            Skip Portless dev server
  --no-neon                Skip Neon branch even if migrations detected
  --no-pr                  Skip PR creation after loop completes
  --dry-run                Parse plan and print sections without running Claude
  -h, --help               Show this help

Environment:
  NEON_PROJECT_ID          Required for Neon branching (skipped if unset)

Examples:
  scripts/ralph.sh thoughts/plans/2026-04-01-code-review.md
  scripts/ralph.sh thoughts/plans/2026-04-01-schema.md --model sonnet --max-turns 10
  scripts/ralph.sh thoughts/plans/2026-04-01-dashboard.md --dry-run
EOF
  exit 0
}

# ── Argument parsing ──────────────────────────────────────
PLAN_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --billing)       BILLING="$2"; shift 2 ;;
    --max-turns)     MAX_TURNS="$2"; shift 2 ;;
    --max-budget)    MAX_BUDGET="$2"; shift 2 ;;
    --model)         MODEL="$2"; shift 2 ;;
    --implement-prompt) IMPLEMENT_PROMPT="$2"; shift 2 ;;
    --validate-prompt)  VALIDATE_PROMPT="$2"; shift 2 ;;
    --granularity)   GRANULARITY="$2"; shift 2 ;;
    --no-portless)   NO_PORTLESS=true; shift ;;
    --no-neon)       NO_NEON=true; shift ;;
    --no-pr)         NO_PR=true; shift ;;
    --dry-run)       DRY_RUN=true; shift ;;
    -h|--help)       usage ;;
    -*)              echo "Unknown option: $1" >&2; exit 1 ;;
    *)               PLAN_PATH="$1"; shift ;;
  esac
done

if [[ -z "$PLAN_PATH" ]]; then
  echo "Error: plan path required" >&2
  echo "Run scripts/ralph.sh --help for usage" >&2
  exit 1
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  echo "Error: plan not found: $PLAN_PATH" >&2
  exit 1
fi

# ── Utilities ─────────────────────────────────────────────
slugify() {
  echo "$1" | sed -E 's/[^a-zA-Z0-9]+/-/g; s/^-|-$//g' | tr '[:upper:]' '[:lower:]'
}

log() {
  echo "[ralph] $(date +%H:%M:%S) $*"
}

err() {
  echo "[ralph] ERROR: $*" >&2
}

# ── Derived values ────────────────────────────────────────
PLAN_NAME=$(basename "$PLAN_PATH" .md)
PLAN_SLUG=$(slugify "$PLAN_NAME")
WORKTREE_DIR=".worktrees/ralph-$PLAN_SLUG"
BRANCH_NAME="ralph/$PLAN_SLUG/$(date +%Y-%m-%d)"
METRICS_DIR=".ralph/metrics"
METRICS_FILE="$METRICS_DIR/${PLAN_SLUG}-$(date +%Y-%m-%d).jsonl"

log "Plan: $PLAN_PATH"
log "Slug: $PLAN_SLUG"
log "Worktree: $WORKTREE_DIR"
log "Branch: $BRANCH_NAME"
log "Metrics: $METRICS_FILE"
log "Billing: $BILLING | Model: $MODEL | Max turns: $MAX_TURNS"
if [[ "$BILLING" == "api" ]]; then
  log "Max budget: \$$MAX_BUDGET per session"
fi

# ── Auth Verification ────────────────────────────────────
verify_auth() {
  if [[ "$BILLING" == "max" ]]; then
    if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
      err "ANTHROPIC_API_KEY is set — claude -p will use API billing, not your Max plan"
      err "Either unset it:  unset ANTHROPIC_API_KEY"
      err "Or use API mode:  --billing api"
      exit 1
    fi
    if ! claude auth status 2>&1 | grep -q "Logged in"; then
      err "No active Max subscription session"
      err "Run: claude auth login"
      exit 1
    fi
    log "Auth: Max subscription (OAuth)"
  else
    if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
      err "API mode requires ANTHROPIC_API_KEY to be set"
      exit 1
    fi
    log "Auth: API key"
  fi
}

verify_auth
```

Mark the file executable after creation.

#### 4. Create `.claude/prompts/` directory
**Action**: The directory is created implicitly when writing the prompt files in Phase 2. No standalone step needed — git tracks files, not empty directories.

### Success Criteria:

#### Automated Verification:
- [x] `scripts/ralph.sh --help` prints usage and exits 0
- [x] `scripts/ralph.sh` (no args) exits 1 with error message
- [x] `scripts/ralph.sh nonexistent.md` exits 1 with "plan not found"
- [x] `make check` passes (no lint/type issues from new files)
- [x] `.gitignore` contains `/.worktrees/` and `/.ralph/`
- [x] `package.json` dev script is `portless run next dev --turbo`
- [x] `ANTHROPIC_API_KEY=fake scripts/ralph.sh plan.md` exits 1 with credential mismatch error (max mode rejects API key)
- [x] `scripts/ralph.sh plan.md --billing api` without `ANTHROPIC_API_KEY` exits 1 with missing key error

#### Manual Verification:
- [x] Script is executable (`ls -la scripts/ralph.sh` shows `+x`)
- [x] `yarn dev` starts the dev server via Portless with a `.localhost` URL
- [x] `--help` output documents `--billing` flag and notes `--max-budget` is api-mode only

---

## Phase 2: Prompt Files

### Overview
Create the two system prompts that define the contract for Claude's implement and validate sessions. These are loaded via `--append-system-prompt-file` and appended to Claude's default system prompt, preserving built-in capabilities.

### Changes Required:

#### 1. Create `ralph-implement.md`
**File**: `.claude/prompts/ralph-implement.md` (new)
**Changes**: System prompt for the implement phase. Derived from `/implement_plan` skill, adapted for stateless single-section execution.

```markdown
# Ralph: Implement Section

You are implementing a single section of an implementation plan. The shell script that invoked you will tell you which section to work on. You have no memory of previous sessions — all progress is tracked in the plan file.

## Your Task

1. Read the plan file completely for context (architecture, constraints, dependencies)
2. Find the target section by its ID and title
3. Read ALL files referenced in the target section — read them fully, never use limit/offset
4. Implement everything specified in that section, and only that section
5. Run the automated verification commands from the section's success criteria
6. Update the plan file to reflect your progress

## Rules

### Do:
- Read the full plan to understand context, but implement ONLY the target section
- Read all referenced files completely before making changes
- Follow the plan's intent while adapting to what you actually find in the code
- Run verification commands listed in the section's success criteria (`make check`, `make build`, `make test`)
- On success: change every `- [ ]` in the target section to `- [/]`
- On failure or if you're running low on turns: write a progress note (see format below) and change completed items to `- [/]`, leave incomplete items as `- [ ]`

### Don't:
- Touch anything outside the target section's scope
- Create todo lists — you have one section, stay focused
- Attempt to sequence multiple sections — the shell script handles that
- Handle resume logic — the shell script handles that
- Create git commits — the validate phase handles that

## When Reality Diverges from the Plan

If the codebase has changed since the plan was written, or if the plan's instructions don't match what you find:

1. Try to fulfill the plan's *intent* with the code as it exists now
2. If you can adapt without changing the plan's scope, do so
3. If the divergence is too large to resolve, write a progress note and stop

## Progress Note Format

When you cannot complete the section, add this blockquote directly under the section's `####` header:

```
> **Ralph note (YYYY-MM-DD):** [Brief status]
> - Completed: [what you finished]
> - Remaining: [what's left]
> - Blocker: [why you stopped]
```

## Tool Usage

You have access to: Read, Edit, Write, Grep, Glob, and restricted Bash commands. Use `make` targets for builds and tests. Use `git diff` and `git status` to understand the current state.
```

#### 2. Create `ralph-validate.md`
**File**: `.claude/prompts/ralph-validate.md` (new)
**Changes**: System prompt for the validate phase. Derived from `/validate_plan` and `/commit` skills, adapted for stateless single-section validation and atomic commit.

```markdown
# Ralph: Validate & Commit Section

You are validating that a single section of an implementation plan was correctly implemented, then creating an atomic commit. The shell script that invoked you will tell you which section to validate. You have no memory of the implement session.

## Your Task

1. Read the plan file completely for context
2. Find the target section by its ID and title
3. Run `git diff` to see what was changed
4. Run all automated verification commands from the section's success criteria
5. Validate that the changes match the section's intent (not just that checks pass)
6. On success: mark items complete, create an atomic commit
7. On failure: revert markers and write a progress note

## Validation Steps

### 1. Understand the Section
Read the target section to understand what should have been implemented. Note the specific files, behaviors, and success criteria.

### 2. Review Changes
```bash
git diff          # Unstaged changes
git diff --cached # Staged changes (if any)
git status        # Overall state
```

Verify that:
- The right files were modified
- Changes match the section's specifications
- No unrelated changes leaked in
- No obvious bugs, security issues, or regressions

### 3. Run Automated Checks
Execute every command listed in the section's "Automated Verification" criteria. Common ones:
- `make check` — lint + typecheck
- `make build` — full build
- `make test` — unit tests
- `make test_e2e` — E2E tests (if referenced)

### 4. Think Critically
- Were edge cases handled?
- Could these changes break existing functionality?
- Does the implementation match the plan's *intent*, not just its letter?

## On Success

### Mark Complete
Change every `- [/]` in the target section to `- [x]`.

### Create Atomic Commit

Stage only the files changed by this section:
```bash
git check-ignore -v <file>   # Before staging — skip ignored files
git add <specific-files>     # Never use -A or .
```

Commit message format:
- Use conventional commits: type determined by the **category of files changed** (not what the change does)
  - `ci` — `.github/workflows/`, Vercel config
  - `fix` — bug fixes in `src/`
  - `feat` — new features or user-facing functionality in `src/`
  - `test` — files in `e2e/`, `__tests__/`, test utilities
  - `chore` — maintenance, tooling, dependencies
  - `refactor` — structural changes, no behavior change
  - `docs` — documentation only
- Imperative mood, focused on *why* not *what*
- Reference the plan filename in the commit body for traceability
- Add `[ralph]` tag in the commit body
- Do NOT add co-author lines or Claude attribution

Example:
```
feat(dashboard): add sidebar navigation component

Implement responsive sidebar with active-state indicators
for the four core dashboard routes.

[ralph] thoughts/plans/2026-04-01-dashboard-app-shell.md §2.1
```

## On Failure

1. Revert any `- [/]` markers in the target section back to `- [ ]`
2. Write a progress note under the section header:

```
> **Ralph note (YYYY-MM-DD):** Validation failed
> - Checks passed: [list]
> - Failed: [what failed and why]
> - Recommendation: [how to fix]
```

3. Do NOT create a commit

## Tool Usage

You have access to: Read, Edit, Grep, Glob, and restricted Bash commands including git operations. Use `make` targets for builds and tests.
```

### Success Criteria:

#### Automated Verification:
- [x] `.claude/prompts/ralph-implement.md` exists and is non-empty
- [x] `.claude/prompts/ralph-validate.md` exists and is non-empty
- [x] `make check` passes

#### Manual Verification:
- [x] Implement prompt covers: read plan, read files fully, implement section, run checks, mark `[/]`, write progress notes on failure
- [x] Validate prompt covers: read plan, git diff, run checks, think critically, mark `[x]`, atomic commit with conventional format and `[ralph]` tag, revert markers on failure
- [x] Commit message example includes `[ralph]` tag and plan reference

---

## Phase 3: Plan Parsing & Environment Setup

### Overview
Add shell functions to parse plan files (extract the next incomplete section), create a git worktree, optionally start Portless, optionally create a Neon branch, and run a sanity gate. Support `--dry-run` to verify parsing without running Claude.

### Changes Required:

#### 1. Plan parsing functions
**File**: `scripts/ralph.sh`
**Changes**: Add functions after the "Derived values" block to parse `####` section headers and detect `- [ ]` / `- [/]` / `- [x]` markers.

The parser must:
- Scan for `####` headers within the plan
- For each header, collect all lines until the next `####` or `##`/`###` phase boundary
- Determine section state:
  - All `- [x]` → complete, skip
  - Any `- [/]` → implemented but not validated, skip to validate phase
  - Any `- [ ]` → incomplete, this is the target
- Extract the section ID (e.g., `1.1`) and title from the `####` header line
- Return the section ID, title, state (`implement` or `validate`), and line range

For `--granularity checkbox` mode: instead of treating the whole `####` section as a unit, treat each individual `- [ ]` line as a separate task. (This is a fallback — the default `section` mode is the primary path.)

Key parsing logic:

```bash
# Find the next incomplete section in the plan
# Returns: SECTION_ID SECTION_TITLE SECTION_STATE (implement|validate)
# Sets: SECTION_START_LINE SECTION_END_LINE
find_next_section() {
  local plan="$1"
  local current_section_id=""
  local current_section_title=""
  local current_section_start=0
  local has_unchecked=false
  local has_half_checked=false
  local has_checked=false
  local line_num=0

  while IFS= read -r line; do
    line_num=$((line_num + 1))

    # New #### section header
    if [[ "$line" =~ ^####[[:space:]]+([0-9]+\.[0-9]+)[[:space:]]+(.*) ]]; then
      # Evaluate previous section if it exists
      if [[ -n "$current_section_id" ]]; then
        if $has_unchecked; then
          SECTION_START_LINE=$current_section_start
          SECTION_END_LINE=$((line_num - 1))
          echo "$current_section_id" "$current_section_title" "implement"
          return 0
        elif $has_half_checked; then
          SECTION_START_LINE=$current_section_start
          SECTION_END_LINE=$((line_num - 1))
          echo "$current_section_id" "$current_section_title" "validate"
          return 0
        fi
      fi

      # Start tracking new section
      current_section_id="${BASH_REMATCH[1]}"
      current_section_title="${BASH_REMATCH[2]}"
      current_section_start=$line_num
      has_unchecked=false
      has_half_checked=false
      has_checked=false
    fi

    # Track checkbox states
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[[[:space:]]\] ]]; then
      has_unchecked=true
    elif [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[/\] ]]; then
      has_half_checked=true
    elif [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
      has_checked=true
    fi

    # Phase boundary (## or ###) resets section tracking
    if [[ "$line" =~ ^###?[[:space:]] ]] && [[ ! "$line" =~ ^#### ]]; then
      # Evaluate last section before phase boundary
      if [[ -n "$current_section_id" ]]; then
        if $has_unchecked; then
          SECTION_START_LINE=$current_section_start
          SECTION_END_LINE=$((line_num - 1))
          echo "$current_section_id" "$current_section_title" "implement"
          return 0
        elif $has_half_checked; then
          SECTION_START_LINE=$current_section_start
          SECTION_END_LINE=$((line_num - 1))
          echo "$current_section_id" "$current_section_title" "validate"
          return 0
        fi
      fi
      current_section_id=""
    fi

  done < "$plan"

  # Check final section at EOF
  if [[ -n "$current_section_id" ]]; then
    if $has_unchecked; then
      SECTION_START_LINE=$current_section_start
      SECTION_END_LINE=$line_num
      echo "$current_section_id" "$current_section_title" "implement"
      return 0
    elif $has_half_checked; then
      SECTION_START_LINE=$current_section_start
      SECTION_END_LINE=$line_num
      echo "$current_section_id" "$current_section_title" "validate"
      return 0
    fi
  fi

  # All sections complete
  return 1
}
```

Also add a function to count total vs completed sections for progress display:

```bash
count_sections() {
  local plan="$1"
  local total=0
  local complete=0
  # Count #### headers, then check if all their checkboxes are [x]
  # (simplified: count distinct #### headers and track which are fully [x])
}
```

#### 2. Environment setup functions
**File**: `scripts/ralph.sh`
**Changes**: Add functions for worktree, Portless, and Neon management.

```bash
# ── Environment Setup ─────────────────────────────────────

setup_worktree() {
  if [[ -d "$WORKTREE_DIR" ]]; then
    log "Worktree exists: $WORKTREE_DIR"
    return 0
  fi

  mkdir -p "$(dirname "$WORKTREE_DIR")"

  # Check if branch already exists
  if git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
    git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
  else
    git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME"
  fi

  log "Created worktree: $WORKTREE_DIR on $BRANCH_NAME"
}

needs_portless() {
  if $NO_PORTLESS; then return 1; fi
  # Check if plan references e2e tests or manual UI verification
  grep -qE 'make test_e2e|test:e2e|Manual Verification|browser|UI|page\.' "$PLAN_PATH"
}

setup_portless() {
  if ! needs_portless; then
    log "Portless: skipped (no e2e/UI references in plan)"
    return 0
  fi

  log "Starting dev server via yarn dev (Portless) in worktree..."
  (cd "$WORKTREE_DIR" && yarn dev &)
  PORTLESS_PID=$!

  # Wait for server to be ready
  local retries=30
  while [[ $retries -gt 0 ]]; do
    if curl -sf "https://www.localhost" &>/dev/null; then
      break
    fi
    sleep 1
    retries=$((retries - 1))
  done

  if [[ $retries -eq 0 ]]; then
    err "Dev server failed to start"
    exit 1
  fi

  log "Dev server ready (PID: $PORTLESS_PID)"
}

needs_neon() {
  if $NO_NEON; then return 1; fi
  if [[ -z "${NEON_PROJECT_ID:-}" ]]; then return 1; fi
  # Check if plan references migrations, schema, db_generate, db_push
  grep -qE 'migration|schema|db_generate|db_push|DATABASE_URL' "$PLAN_PATH"
}

setup_neon() {
  if ! needs_neon; then
    log "Neon branch: skipped"
    return 0
  fi

  if ! command -v neon &>/dev/null; then
    err "Neon CLI not installed. Install with: npm install -g neonctl"
    err "Or skip with --no-neon"
    exit 1
  fi

  local neon_branch="ralph/$PLAN_SLUG"

  log "Creating Neon branch: $neon_branch"
  neon branches create \
    --name "$neon_branch" \
    --parent main \
    --project-id "$NEON_PROJECT_ID" 2>/dev/null || true  # Idempotent: may already exist

  local branch_url
  branch_url=$(neon connection-string \
    --branch "$neon_branch" \
    --project-id "$NEON_PROJECT_ID")

  local direct_url="${branch_url/pooler/direct}"

  echo "DATABASE_URL=$branch_url" >> "$WORKTREE_DIR/.env.local"
  echo "DATABASE_URL_UNPOOLED=$direct_url" >> "$WORKTREE_DIR/.env.local"

  NEON_BRANCH="$neon_branch"
  log "Neon branch ready: $neon_branch"
}

sanity_gate() {
  log "Running sanity gate: make check"
  if ! (cd "$WORKTREE_DIR" && make check); then
    err "Sanity gate failed — make check does not pass on a clean worktree"
    err "Fix issues on main before running ralph"
    exit 1
  fi
  log "Sanity gate passed"
}
```

#### 3. Dry-run mode
**File**: `scripts/ralph.sh`
**Changes**: After environment setup, if `--dry-run` is set, parse and print all sections with their states, then exit.

```bash
if $DRY_RUN; then
  log "Dry run — parsing sections:"
  echo ""

  # Parse all sections and print their states
  local section_num=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^####[[:space:]]+([0-9]+\.[0-9]+)[[:space:]]+(.*) ]]; then
      section_num=$((section_num + 1))
      local sid="${BASH_REMATCH[1]}"
      local stitle="${BASH_REMATCH[2]}"
      # Determine state of this section by scanning ahead
      # (simplified for dry-run output)
      echo "  $sid $stitle"
    fi
  done < "$PLAN_PATH"

  echo ""
  # Show what the first target would be
  if result=$(find_next_section "$PLAN_PATH"); then
    read -r sid stitle sstate <<< "$result"
    log "Next target: $sid $stitle ($sstate)"
  else
    log "All sections complete"
  fi

  exit 0
fi
```

**Note**: The dry-run implementation above is a simplified sketch. The actual implementation should call `find_next_section` in a loop (with a temp copy of the plan to simulate progression) or simply iterate all `####` headers with state detection. The key requirement is that `--dry-run` prints the section list and identifies the next target without modifying anything.

### Success Criteria:

#### Automated Verification:
- [x] `scripts/ralph.sh thoughts/plans/2026-04-01-code-review-best-practices-checklist.md --dry-run` parses sections and prints their IDs/titles
- [x] `scripts/ralph.sh thoughts/plans/2026-04-01-code-review-best-practices-checklist.md --dry-run` identifies the first incomplete section
- [x] A plan with all `- [x]` markers reports "All sections complete"
- [x] `make check` passes

#### Manual Verification:
- [x] Section parser correctly handles `#### N.M Title` format
- [x] Parser distinguishes `- [ ]` (implement), `- [/]` (validate), and `- [x]` (complete)
- [x] Parser stops at phase boundaries (`##`/`###` headers) and doesn't leak across phases

---

## Phase 4: Main Loop & Metrics

### Overview
Wire the Claude invocation, success detection, JSONL metrics recording, and the main loop that processes sections sequentially until completion or failure.

### Changes Required:

#### 1. Claude invocation functions
**File**: `scripts/ralph.sh`
**Changes**: Add functions to invoke Claude for implement and validate phases.

```bash
# ── Claude Invocation ─────────────────────────────────────

IMPLEMENT_TOOLS="Read,Edit,Write,Grep,Glob,Bash(make\ *),Bash(git\ diff*),Bash(git\ status*)"
VALIDATE_TOOLS="Read,Edit,Grep,Glob,Bash(make\ *),Bash(git\ diff*),Bash(git\ status*),Bash(git\ add\ *),Bash(git\ commit\ *),Bash(git\ check-ignore\ *),Bash(git\ log\ *)"

run_claude() {
  local phase="$1"    # "implement" or "validate"
  local section_id="$2"
  local section_title="$3"
  local prompt_file tools prompt_text

  if [[ "$phase" == "implement" ]]; then
    prompt_file="$IMPLEMENT_PROMPT"
    tools="$IMPLEMENT_TOOLS"
  else
    prompt_file="$VALIDATE_PROMPT"
    tools="$VALIDATE_TOOLS"
  fi

  prompt_text="$phase section $section_id ($section_title) from the plan at $PLAN_PATH."

  local start_time
  start_time=$(date +%s%3N)

  local budget_flags=""
  if [[ "$BILLING" == "api" ]]; then
    budget_flags="--max-budget-usd $MAX_BUDGET"
  fi

  # In max mode, strip ANTHROPIC_API_KEY from subprocess to prevent
  # accidental API billing (belt-and-suspenders — verify_auth already checked)
  local env_prefix=""
  if [[ "$BILLING" == "max" ]]; then
    env_prefix="env -u ANTHROPIC_API_KEY"
  fi

  local output exit_code=0
  output=$(cd "$WORKTREE_DIR" && $env_prefix claude -p \
    "$prompt_text" \
    --append-system-prompt-file "$prompt_file" \
    --output-format json \
    --max-turns "$MAX_TURNS" \
    $budget_flags \
    --model "$MODEL" \
    --allowedTools "$tools" \
    --permission-mode "bypassPermissions" \
    2>&1) || exit_code=$?

  local end_time
  end_time=$(date +%s%3N)
  local duration_ms=$((end_time - start_time))

  # Return output and metadata for metrics
  echo "$output"
  # Store metadata in global vars for the caller
  LAST_EXIT_CODE=$exit_code
  LAST_DURATION_MS=$duration_ms
  LAST_OUTPUT="$output"
}
```

**Note on `--permission-mode bypassPermissions`**: The script runs in a disposable worktree. All changes are reviewed before merge. This avoids permission prompts that would block headless execution. The `--allowedTools` list constrains what Claude can actually do.

**Note on billing modes**: In `max` mode, `--max-budget-usd` is omitted because Max subscription uses a quota-based rolling window, not per-token metering — the flag has no meaningful target. `--max-turns` is the sole runaway prevention. In `api` mode, both `--max-turns` and `--max-budget-usd` are active. The `env -u ANTHROPIC_API_KEY` in max mode is a safety net — even if the variable appears in the environment after `verify_auth` ran (e.g., sourced by a subprocess), it won't reach the Claude CLI.

**Note on prompt file paths**: The prompt file paths are relative to the repository root. Since `claude -p` runs from within the worktree directory (which is a full copy of the repo), the paths `.claude/prompts/ralph-implement.md` resolve correctly within the worktree.

#### 2. Success detection
**File**: `scripts/ralph.sh`
**Changes**: Add function to check if a Claude session succeeded.

```bash
check_success() {
  local phase="$1"      # "implement" or "validate"
  local section_id="$2"
  local output="$LAST_OUTPUT"
  local exit_code=$LAST_EXIT_CODE

  # 1. Non-zero exit code = crash or quota exhaustion
  if [[ $exit_code -ne 0 ]]; then
    # Check for Max plan quota exhaustion
    if echo "$output" | grep -qiE 'rate.limit|quota|capacity|too many requests|429'; then
      err "Max plan quota exhausted — wait for your rolling window to reset"
      err "Re-run ralph when quota is available; it will resume from this section"
      exit 1  # Hard exit — quota hit is environmental, not a section failure
    fi
    err "Claude process exited with code $exit_code"
    return 1
  fi

  # 2. Check JSON for errors
  local is_error subtype
  is_error=$(echo "$output" | jq -r '.is_error // false' 2>/dev/null) || true
  subtype=$(echo "$output" | jq -r '.subtype // ""' 2>/dev/null) || true

  if [[ "$is_error" == "true" ]]; then
    err "Claude reported error (subtype: $subtype)"
    return 1
  fi

  if [[ "$subtype" == "error_max_turns" ]]; then
    err "Claude hit max turns limit ($MAX_TURNS)"
    return 1
  fi

  # 3. Plan file is source of truth — check markers
  local plan="$WORKTREE_DIR/$PLAN_PATH"
  if [[ "$phase" == "implement" ]]; then
    # After implement: section should have [/] markers, no remaining [ ]
    # (within the section's line range)
    local section_text
    section_text=$(sed -n "${SECTION_START_LINE},${SECTION_END_LINE}p" "$plan")
    if echo "$section_text" | grep -q '\- \[ \]'; then
      err "Plan still has unchecked items after implement phase"
      return 1
    fi
  else
    # After validate: section should have [x] markers, no remaining [/]
    local section_text
    section_text=$(sed -n "${SECTION_START_LINE},${SECTION_END_LINE}p" "$plan")
    if echo "$section_text" | grep -q '\- \[/\]'; then
      err "Plan still has [/] items after validate phase"
      return 1
    fi
  fi

  return 0
}
```

#### 3. Metrics recording
**File**: `scripts/ralph.sh`
**Changes**: Add function to extract metrics from Claude's JSON output and append to JSONL.

```bash
record_metrics() {
  local phase="$1"
  local section_id="$2"
  local section_title="$3"
  local output="$LAST_OUTPUT"
  local duration_ms="$LAST_DURATION_MS"
  local exit_code=$LAST_EXIT_CODE

  mkdir -p "$METRICS_DIR"

  # Extract fields from Claude's JSON output
  local total_cost input_tokens output_tokens cache_read num_turns subtype duration_api
  total_cost=$(echo "$output" | jq -r '.total_cost_usd // 0' 2>/dev/null) || total_cost=0
  input_tokens=$(echo "$output" | jq -r '.input_tokens // 0' 2>/dev/null) || input_tokens=0
  output_tokens=$(echo "$output" | jq -r '.output_tokens // 0' 2>/dev/null) || output_tokens=0
  cache_read=$(echo "$output" | jq -r '.cache_read_tokens // 0' 2>/dev/null) || cache_read=0
  num_turns=$(echo "$output" | jq -r '.num_turns // 0' 2>/dev/null) || num_turns=0
  subtype=$(echo "$output" | jq -r '.subtype // "success"' 2>/dev/null) || subtype="unknown"
  duration_api=$(echo "$output" | jq -r '.duration_api_ms // 0' 2>/dev/null) || duration_api=0

  if [[ $exit_code -ne 0 ]]; then
    subtype="crash"
  fi

  # Append JSONL record
  jq -nc \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg plan "$PLAN_NAME" \
    --arg section "$section_id" \
    --arg section_title "$section_title" \
    --arg phase "$phase" \
    --arg subtype "$subtype" \
    --arg billing "$BILLING" \
    --argjson cost "$total_cost" \
    --argjson input "$input_tokens" \
    --argjson output_tok "$output_tokens" \
    --argjson cache "$cache_read" \
    --argjson dur "$duration_ms" \
    --argjson dur_api "$duration_api" \
    --argjson turns "$num_turns" \
    --arg model "$MODEL" \
    --argjson max_turns "$MAX_TURNS" \
    --argjson max_budget "$MAX_BUDGET" \
    '{
      timestamp: $ts,
      plan: $plan,
      section: $section,
      section_title: $section_title,
      phase: $phase,
      subtype: $subtype,
      billing: $billing,
      total_cost_usd: $cost,
      input_tokens: $input,
      output_tokens: $output_tok,
      cache_read_tokens: $cache,
      duration_ms: $dur,
      duration_api_ms: $dur_api,
      num_turns: $turns,
      model: $model,
      max_turns_configured: $max_turns,
      max_budget_configured: $max_budget
    }' >> "$METRICS_FILE"

  log "Metrics: billing=$BILLING | ${num_turns} turns | ${duration_ms}ms ($phase)"
}
```

#### 4. Main loop
**File**: `scripts/ralph.sh`
**Changes**: Add the main loop that ties everything together.

```bash
# ── Main Loop ─────────────────────────────────────────────

setup_worktree
setup_portless
setup_neon
sanity_gate

log "Starting main loop"

while true; do
  # Parse plan from the worktree copy (Claude edits this)
  local worktree_plan="$WORKTREE_DIR/$PLAN_PATH"

  result=$(find_next_section "$worktree_plan") || {
    log "All sections complete!"
    break
  }

  read -r SECTION_ID SECTION_TITLE SECTION_STATE <<< "$result"
  log "Section $SECTION_ID: $SECTION_TITLE ($SECTION_STATE)"

  # Implement phase (skip if already implemented, i.e., state=validate)
  if [[ "$SECTION_STATE" == "implement" ]]; then
    log "Phase: implement"
    run_claude "implement" "$SECTION_ID" "$SECTION_TITLE"
    record_metrics "implement" "$SECTION_ID" "$SECTION_TITLE"

    if ! check_success "implement" "$SECTION_ID"; then
      err "Implement failed for section $SECTION_ID"
      log "Check progress notes in the plan file"
      break
    fi

    log "Implement succeeded for section $SECTION_ID"
  fi

  # Validate phase
  log "Phase: validate"
  run_claude "validate" "$SECTION_ID" "$SECTION_TITLE"
  record_metrics "validate" "$SECTION_ID" "$SECTION_TITLE"

  if ! check_success "validate" "$SECTION_ID"; then
    err "Validate failed for section $SECTION_ID"
    log "Check progress notes in the plan file"
    break
  fi

  log "Section $SECTION_ID complete"
done

log "Ralph loop finished"
```

### Success Criteria:

#### Automated Verification:
- [x] `jq` can parse every line in a sample JSONL metrics file
- [x] JSONL records include `billing` field with value `"max"` or `"api"`
- [x] `make check` passes
- [x] The script handles the case where Claude exits non-zero gracefully (logs error, doesn't crash)
- [x] Quota exhaustion (rate limit error) triggers hard exit with resume guidance, not a section failure

#### Manual Verification:
- [ ] Running ralph against a small plan (e.g., 1-2 sections) produces:
  - Git worktree with commits on the ralph branch
  - JSONL metrics file with implement + validate records per section
  - Plan file with `[x]` markers for completed sections
- [ ] Resume works: re-running ralph on a partially-complete plan skips `[x]` sections
- [ ] Failure path works: if Claude fails, script stops with error and plan has progress notes
- [ ] In max mode, `total_cost_usd` is `0` in metrics (subscription, not metered)

---

## Phase 5: Teardown & Signal Handling

### Overview
Add cleanup functions that run on exit (success, failure, or interrupt), plus a summary of the run.

### Changes Required:

#### 1. Teardown function
**File**: `scripts/ralph.sh`
**Changes**: Add cleanup function and trap it to exit signals. Place this early in the script (after variable declarations, before setup functions are called).

```bash
# ── Cleanup ───────────────────────────────────────────────
PORTLESS_PID=""
NEON_BRANCH=""

cleanup() {
  local exit_code=$?
  log "Cleaning up..."

  # Stop Portless dev server
  if [[ -n "$PORTLESS_PID" ]] && kill -0 "$PORTLESS_PID" 2>/dev/null; then
    log "Stopping Portless (PID: $PORTLESS_PID)"
    kill "$PORTLESS_PID" 2>/dev/null || true
    wait "$PORTLESS_PID" 2>/dev/null || true
  fi

  # Delete Neon branch
  if [[ -n "$NEON_BRANCH" ]] && [[ -n "${NEON_PROJECT_ID:-}" ]]; then
    log "Deleting Neon branch: $NEON_BRANCH"
    neon branches delete "$NEON_BRANCH" \
      --project-id "$NEON_PROJECT_ID" 2>/dev/null || true
  fi

  # Print summary
  if [[ -f "$METRICS_FILE" ]]; then
    local total_cost total_sections
    total_cost=$(jq -s '[.[].total_cost_usd] | add // 0' "$METRICS_FILE")
    total_sections=$(jq -s '[.[].section] | unique | length' "$METRICS_FILE")
    log "Summary: $total_sections sections, \$$total_cost total cost"
    log "Metrics: $METRICS_FILE"
  fi

  log "Worktree preserved at: $WORKTREE_DIR"
  log "Branch: $BRANCH_NAME"
  log "To merge: git merge $BRANCH_NAME"
  log "To remove: git worktree remove $WORKTREE_DIR && git branch -d $BRANCH_NAME"

  exit $exit_code
}

trap cleanup EXIT INT TERM
```

**Note**: The worktree is intentionally NOT removed on cleanup. The user reviews the work on the ralph branch and decides whether to merge, cherry-pick, or discard. Only the ephemeral resources (Portless, Neon) are cleaned up.

#### 2. Copy plan to worktree
**File**: `scripts/ralph.sh`
**Changes**: After worktree setup, ensure the plan file exists in the worktree. The worktree is created from the current branch, so the plan file should already be there. But if the plan was just written and not committed, we need to copy it.

```bash
# Ensure plan file exists in worktree
if [[ ! -f "$WORKTREE_DIR/$PLAN_PATH" ]]; then
  log "Copying plan to worktree"
  cp "$PLAN_PATH" "$WORKTREE_DIR/$PLAN_PATH"
fi
```

Add this after `setup_worktree` but before `sanity_gate`.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] Sending SIGINT to the script triggers cleanup (Portless stop, summary print)

#### Manual Verification:
- [ ] After a successful run, worktree and branch are preserved for review
- [ ] After Ctrl+C, cleanup runs and Portless is stopped
- [ ] Summary prints total cost and section count from metrics file
- [x] If plan wasn't committed, it's copied to the worktree before execution starts

---

## Phase 6: PR Creation for Human Review

### Overview
After the loop completes all sections, push the ralph branch to the remote, create a GitHub Pull Request, and invoke a Claude session to generate a rich PR description following the repository's PR template (`docs/pr_template.md`). This gives the human a review artifact with full context — motivation from the plan, a summary of every change, test results, and metrics. Skipped with `--no-pr`.

### Changes Required:

#### 1. Create `ralph-describe-pr.md`
**File**: `.claude/prompts/ralph-describe-pr.md` (new)
**Changes**: System prompt for the PR description phase. Adapted from `.claude/commands/describe_pr.md` for headless execution inside a Ralph session.

```markdown
# Ralph: Describe Pull Request

You are generating a pull request description for work completed by the Ralph automated loop. The shell script that invoked you will tell you the PR number and the plan file path.

## Your Task

1. Read the PR template at `docs/pr_template.md`
2. Read the plan file completely — understand the motivation, phases, and scope
3. Run `gh pr diff {number}` to see the full diff
4. Run `gh pr view {number} --json commits` to see all commits
5. Analyze the changes thoroughly — understand what was built and why
6. Run verification commands: `make check`, `make test`
7. Generate the PR description following the template structure
8. Save to `thoughts/prs/{number}_description.md`
9. Update the PR: `gh pr edit {number} --body-file thoughts/prs/{number}_description.md`

## Description Guidelines

### Context/Motivation
- Pull from the plan's Overview section — explain the *why*
- Reference the plan file path for traceability

### Description of Changes
- Summarize each phase's changes concisely
- Organize by component/area if the plan touched multiple parts
- Call out any deviations from the plan (Ralph progress notes)

### Testing Information
- Run `make check` and `make test` and report results
- Mark checkboxes based on actual results
- Note any manual verification items from the plan that need human testing

### Relevant Links
- Link the plan file: `thoughts/plans/{plan-name}.md`
- Link the metrics file if it exists
- Add `[ralph]` tag to indicate automated generation

## Rules

### Do:
- Read the full diff — don't summarize from commit messages alone
- Be specific about what changed and why
- Mark test checkboxes based on actual command results
- Include a `[ralph]` tag in the description footer
- Mention the model and section count in the description footer

### Don't:
- Fabricate test results — run the commands
- Include the full diff in the description
- Add co-author attribution
- Skip reading the PR template
```

#### 2. PR creation functions
**File**: `scripts/ralph.sh`
**Changes**: Add functions after the `check_success` function to handle branch push, PR creation, and description generation.

```bash
# ── PR Creation ──────────────────────────────────────────

DESCRIBE_PR_PROMPT=".claude/prompts/ralph-describe-pr.md"
DESCRIBE_PR_TOOLS="Read,Grep,Glob,Bash(make\ *),Bash(gh\ *),Bash(git\ diff*),Bash(git\ log*),Bash(git\ status*),Bash(mkdir\ *),Write"

push_and_create_pr() {
  if $NO_PR; then
    log "PR creation: skipped (--no-pr)"
    return 0
  fi

  if ! command -v gh &>/dev/null; then
    err "gh CLI not installed — skipping PR creation"
    err "Install with: brew install gh"
    log "Branch is ready for manual PR: $BRANCH_NAME"
    return 0
  fi

  # Push branch to remote
  log "Pushing branch to remote: $BRANCH_NAME"
  (cd "$WORKTREE_DIR" && git push -u origin "$BRANCH_NAME")

  # Create PR with placeholder body
  log "Creating pull request..."
  local pr_url
  pr_url=$(cd "$WORKTREE_DIR" && gh pr create \
    --title "$(pr_title)" \
    --body "$(pr_placeholder_body)" \
    --base main \
    --head "$BRANCH_NAME" \
    2>&1) || {
    err "Failed to create PR: $pr_url"
    log "Branch pushed — create PR manually"
    return 0
  }

  log "PR created: $pr_url"

  # Extract PR number from URL
  local pr_number
  pr_number=$(echo "$pr_url" | grep -oE '[0-9]+$')

  # Run Claude to generate rich description
  log "Generating PR description..."
  local prompt_text="Describe PR #${pr_number} for plan $PLAN_PATH. The plan file is at $PLAN_PATH."

  local budget_flags=""
  if [[ "$BILLING" == "api" ]]; then
    budget_flags="--max-budget-usd $MAX_BUDGET"
  fi

  local env_prefix=""
  if [[ "$BILLING" == "max" ]]; then
    env_prefix="env -u ANTHROPIC_API_KEY"
  fi

  (cd "$WORKTREE_DIR" && $env_prefix claude -p \
    "$prompt_text" \
    --append-system-prompt-file "$DESCRIBE_PR_PROMPT" \
    --output-format json \
    --max-turns "$MAX_TURNS" \
    $budget_flags \
    --model "$MODEL" \
    --allowedTools "$DESCRIBE_PR_TOOLS" \
    --permission-mode "bypassPermissions" \
    2>&1) || {
    err "PR description generation failed — PR exists with placeholder body"
    log "Run /describe_pr manually to update the description"
  }

  log "PR ready for review: $pr_url"
  PR_URL="$pr_url"
}

pr_title() {
  # Generate a conventional commit-style PR title from the plan name
  # e.g., "2026-04-01-dashboard-app-shell" → "feat: dashboard app shell [ralph]"
  local title
  title=$(echo "$PLAN_NAME" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | tr '-' ' ')
  echo "feat: $title [ralph]"
}

pr_placeholder_body() {
  cat <<EOF
## Context/Motivation
Automated implementation of plan: \`$PLAN_PATH\`

_Generating full description..._

---
\`[ralph]\` automated PR — description will be updated shortly.
EOF
}
```

#### 3. Wire into main loop
**File**: `scripts/ralph.sh`
**Changes**: After the "All sections complete!" log in the main loop, call `push_and_create_pr`.

Update the main loop's completion path:

```bash
  result=$(find_next_section "$worktree_plan") || {
    log "All sections complete!"
    push_and_create_pr
    break
  }
```

Also initialize `PR_URL=""` in the variable declarations section (alongside `PORTLESS_PID=""` and `NEON_BRANCH=""`).

#### 4. Update cleanup summary
**File**: `scripts/ralph.sh`
**Changes**: Update the `cleanup` function to include the PR URL if one was created.

Add after the metrics summary in `cleanup()`:

```bash
  # Print PR link if created
  if [[ -n "$PR_URL" ]]; then
    log "PR: $PR_URL"
  fi
```

And update the final guidance to be conditional — if a PR was created, don't print the manual merge instructions:

```bash
  if [[ -n "$PR_URL" ]]; then
    log "Review and merge the PR: $PR_URL"
  else
    log "Worktree preserved at: $WORKTREE_DIR"
    log "Branch: $BRANCH_NAME"
    log "To merge: git merge $BRANCH_NAME"
    log "To remove: git worktree remove $WORKTREE_DIR && git branch -d $BRANCH_NAME"
  fi
```

### Success Criteria:

#### Automated Verification:
- [x] `.claude/prompts/ralph-describe-pr.md` exists and is non-empty
- [x] `make check` passes
- [x] `scripts/ralph.sh --help` documents the `--no-pr` flag
- [x] `--no-pr` flag is parsed and prevents PR creation

#### Manual Verification:
- [ ] After a successful full run (without `--no-pr`), a PR is created on GitHub
- [ ] PR has a placeholder body initially, then gets updated with a rich description
- [ ] PR description follows the `docs/pr_template.md` structure
- [ ] PR description includes plan reference, `[ralph]` tag, and test results
- [ ] If `gh` is not installed, the script warns but doesn't fail
- [ ] If PR creation fails (e.g., no remote), the script warns and continues to cleanup
- [ ] The cleanup summary prints the PR URL

---

## Performance Considerations

- Each Claude session is independent — no context sharing between implement and validate. This is by design (stateless, resumable) but means Claude re-reads the plan each time.
- **Max mode (default)**: `--max-turns` is the sole runaway prevention. No dollar-based budget cap — Max subscription uses a rolling 5-hour quota window shared across all Claude surfaces (web, interactive CLI, `claude -p`). If quota is exhausted, the script exits cleanly and resumes from the same section on re-run.
- **API mode**: Both `--max-turns` and `--max-budget-usd` are active. Defaults (15 turns, $5.00) should handle most sections; tune down for simpler sections or up for complex ones.
- Portless adds ~5-10 seconds of startup time. Plans that don't reference E2E tests skip it automatically.
- JSONL metrics accumulate over time. Each line is ~500 bytes, so even 1000 sections would be <500KB.
- PR description generation adds one extra Claude session after the loop completes. This is a one-time cost per run, not per section. Skip with `--no-pr` if not needed.
- In max mode, `total_cost_usd` in metrics will be `0` since Max doesn't meter per-token cost. Token counts (`input_tokens`, `output_tokens`) are still recorded and useful for understanding session size.

## References

- Design doc: `thoughts/designs/2026-04-01-ralph-loop.md`
- Implement skill lineage: `.claude/commands/implement_plan.md`
- Validate skill lineage: `.claude/commands/validate_plan.md`
- Describe PR skill lineage: `.claude/commands/describe_pr.md`
- PR template: `docs/pr_template.md`
- Commit skill lineage: `.claude/skills/commit/SKILL.md`
- Claude Code CLI reference: `code.claude.com/docs/en/cli-reference`
- Claude Code authentication: `code.claude.com/docs/en/authentication`
- Portless: `github.com/vercel-labs/portless`
- Neon CLI: `neon.com/docs/guides/branching-neon-cli`
