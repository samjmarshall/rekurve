#!/usr/bin/env bash
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
BILLING="max"            # "max" (subscription) or "api" (API key, metered)
MAX_TURNS=30
MAX_BUDGET="5.00"        # Only enforced in api mode
IMPLEMENT_MODEL="sonnet"
VALIDATE_MODEL="opus"
IMPLEMENT_PROMPT=".claude/prompts/ralph-implement.md"
VALIDATE_PROMPT=".claude/prompts/ralph-validate.md"
GRANULARITY="section"    # "section" or "checkbox"
NO_DEVSERVER=false
NO_NEON=false
NO_PR=false
DRY_RUN=false

# ── Usage ─────────────────────────────────────────────────
usage() {
  cat <<'EOF'
Usage: scripts/ralph.sh <plan-path|spec-path> [options]

Drive Claude Code through an implementation plan one section at a time.
Accepts a .md plan (auto-detects sibling .spec.json) or a .spec.json directly.

Options:
  --billing MODE           "max" (subscription, default) or "api" (API key, metered)
  --max-turns N            Max Claude agent turns per session (default: 30)
  --max-budget USD         Max USD per session, api mode only (default: 5.00)
  --implement-model MODEL  Claude model for implement phase (default: haiku)
  --validate-model MODEL   Claude model for validate phase (default: sonnet)
  --implement-prompt PATH  Override implement prompt (default: .claude/prompts/ralph-implement.md)
  --validate-prompt PATH   Override validate prompt (default: .claude/prompts/ralph-validate.md)
  --granularity MODE       "section" or "checkbox" (default: section)
  --no-devserver           Skip dev server (yarn dev) for plans without e2e/UI
  --no-neon                Skip Neon branch even if migrations detected
  --no-pr                  Skip PR creation after loop completes
  --dry-run                Parse plan and print sections without running Claude
  -h, --help               Show this help

Environment:
  NEON_PROJECT_ID          Required for Neon branching (skipped if unset)

Examples:
  scripts/ralph.sh thoughts/plans/2026-04-01-code-review.md
  scripts/ralph.sh thoughts/plans/2026-04-01-code-review.spec.json
  scripts/ralph.sh thoughts/plans/2026-04-01-schema.md --implement-model sonnet --max-turns 10
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
    --implement-model) IMPLEMENT_MODEL="$2"; shift 2 ;;
    --validate-model)  VALIDATE_MODEL="$2"; shift 2 ;;
    --implement-prompt) IMPLEMENT_PROMPT="$2"; shift 2 ;;
    --validate-prompt)  VALIDATE_PROMPT="$2"; shift 2 ;;
    --granularity)   GRANULARITY="$2"; shift 2 ;;
    --no-devserver)  NO_DEVSERVER=true; shift ;;
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

# Resolve PLAN_PATH and SPEC_PATH from whichever the user provides
if [[ "$PLAN_PATH" == *.spec.json ]]; then
  SPEC_PATH="$PLAN_PATH"
  PLAN_PATH="${SPEC_PATH%.spec.json}.md"
elif [[ "$PLAN_PATH" == *.md ]]; then
  SPEC_PATH="${PLAN_PATH%.md}.spec.json"
else
  echo "Error: unsupported file type: $PLAN_PATH (expected .md or .spec.json)" >&2
  exit 1
fi

if [[ ! -f "$SPEC_PATH" ]]; then
  echo "Error: spec file not found: $SPEC_PATH" >&2
  echo "Run: /plan-to-ralph-spec $PLAN_PATH" >&2
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
REPO_ROOT=$(git rev-parse --show-toplevel)
PLAN_NAME=$(basename "$PLAN_PATH" .md)
PLAN_SLUG=$(slugify "$PLAN_NAME")
WORKTREE_DIR=".worktrees/ralph-$PLAN_SLUG"
BRANCH_NAME="ralph/$PLAN_SLUG/$(date +%Y-%m-%d)"
METRICS_DIR=".ralph/metrics"
METRICS_FILE="$METRICS_DIR/${PLAN_SLUG}-$(date +%Y-%m-%d).jsonl"

# Resolve prompt paths to absolute (they may not be committed/in worktree)
IMPLEMENT_PROMPT="$REPO_ROOT/$IMPLEMENT_PROMPT"
VALIDATE_PROMPT="$REPO_ROOT/$VALIDATE_PROMPT"
DESCRIBE_PR_PROMPT="$REPO_ROOT/.claude/prompts/ralph-describe-pr.md"

log "Plan: $PLAN_PATH"
log "Spec: $SPEC_PATH"
log "Slug: $PLAN_SLUG"
log "Worktree: $WORKTREE_DIR"
log "Branch: $BRANCH_NAME"
log "Metrics: $METRICS_FILE"
log "Billing: $BILLING | Implement: $IMPLEMENT_MODEL | Validate: $VALIDATE_MODEL | Max turns: $MAX_TURNS"
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
    if ! claude auth status 2>&1 | jq -e '.loggedIn == true' &>/dev/null; then
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

# ── Spec Parsing ─────────────────────────────────────────

# Find the next incomplete section in the spec.
# Returns: prints "SECTION_ID\tSECTION_TITLE\tSTATE" (tab-separated) to stdout.
# Exit 0 if found, exit 1 if all sections complete.
find_next_section() {
  local spec="$1"
  local result
  result=$(jq -r '
    [.sections[] | select(.state == "pending" or .state == "implemented")][0] // empty |
    [.id, .title, (if .state == "pending" then "implement" else "validate" end)] |
    @tsv
  ' "$spec") || return 1
  if [[ -z "$result" ]]; then
    return 1
  fi
  echo "$result"
}

count_sections() {
  local spec="$1"
  local total complete
  total=$(jq '.sections | length' "$spec")
  complete=$(jq '[.sections[] | select(.state == "validated")] | length' "$spec")
  echo "$complete/$total"
}

# Write a state transition to the spec file.
# Usage: update_section_state <spec-path> <section-id> <new-state>
update_section_state() {
  local spec="$1"
  local section_id="$2"
  local new_state="$3"
  local tmp="${spec}.tmp"
  jq --arg id "$section_id" --arg state "$new_state" '
    .sections |= map(if .id == $id then .state = $state else . end)
  ' "$spec" > "$tmp" && mv "$tmp" "$spec"
}

# ── Dry Run ───────────────────────────────────────────────
if $DRY_RUN; then
  log "Dry run — sections from spec:"
  echo ""

  jq -r '.sections[] |
    "  " +
    (if .state == "pending" then "[ ]"
     elif .state == "implemented" then "[/]"
     else "[x]" end) +
    " " + .id + " " + .title
  ' "$SPEC_PATH"

  echo ""
  progress=$(count_sections "$SPEC_PATH")
  log "Progress: $progress sections complete"

  if result=$(find_next_section "$SPEC_PATH"); then
    IFS=$'\t' read -r sid stitle sstate <<< "$result"
    log "Next target: $sid $stitle ($sstate)"
  else
    log "All sections complete"
  fi

  exit 0
fi

# ── Cleanup & Signal Handling ─────────────────────────────
DEVSERVER_PID=""
NEON_BRANCH=""
PR_URL=""

cleanup() {
  local exit_code=$?
  log "Cleaning up..."

  # Stop dev server
  if [[ -n "$DEVSERVER_PID" ]] && kill -0 "$DEVSERVER_PID" 2>/dev/null; then
    log "Stopping dev server (PID: $DEVSERVER_PID)"
    kill "$DEVSERVER_PID" 2>/dev/null || true
    wait "$DEVSERVER_PID" 2>/dev/null || true
  fi

  # Delete Neon branch
  if [[ -n "$NEON_BRANCH" ]] && [[ -n "${NEON_PROJECT_ID:-}" ]]; then
    log "Deleting Neon branch: $NEON_BRANCH"
    neon branches delete "$NEON_BRANCH" \
      --project-id "$NEON_PROJECT_ID" 2>/dev/null || true
  fi

  # Print summary
  if [[ -f "$METRICS_FILE" ]]; then
    local api_cost total_sections
    api_cost=$(jq -s '[.[].api_equivalent_cost_usd] | add // 0' "$METRICS_FILE")
    total_sections=$(jq -s '[.[].section] | unique | length' "$METRICS_FILE")
    if [[ "$BILLING" == "max" ]]; then
      log "Summary: $total_sections sections, \$$api_cost API-equivalent cost (covered by Max subscription)"
    else
      log "Summary: $total_sections sections, \$$api_cost total API cost"
    fi
    log "Metrics: $METRICS_FILE"
  fi

  if [[ -n "$PR_URL" ]]; then
    log "PR: $PR_URL"
    log "Review and merge the PR: $PR_URL"
  else
    log "Worktree preserved at: $WORKTREE_DIR"
    log "Branch: $BRANCH_NAME"
    log "To merge: git merge $BRANCH_NAME"
    log "To remove: git worktree remove $WORKTREE_DIR && git branch -d $BRANCH_NAME"
  fi

  exit $exit_code
}

trap cleanup EXIT INT TERM

# ── Environment Setup ─────────────────────────────────────

setup_worktree() {
  if [[ -d "$WORKTREE_DIR" ]]; then
    log "Worktree exists: $WORKTREE_DIR"
    # Sync BRANCH_NAME with the worktree's actual branch
    BRANCH_NAME=$(cd "$WORKTREE_DIR" && git branch --show-current)
    log "Resuming on branch: $BRANCH_NAME"
  else
    mkdir -p "$(dirname "$WORKTREE_DIR")"

    # Check if branch already exists
    if git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
      git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
    else
      git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME"
    fi

    log "Created worktree: $WORKTREE_DIR on $BRANCH_NAME"
  fi

  # Copy .env from main worktree (secrets aren't committed)
  if [[ -f "$REPO_ROOT/.env" ]]; then
    cp "$REPO_ROOT/.env" "$WORKTREE_DIR/.env"
    log "Copied .env to worktree"
  fi

  # Ensure dependencies are installed
  if [[ ! -d "$WORKTREE_DIR/node_modules" ]]; then
    log "Installing dependencies in worktree..."
    (cd "$WORKTREE_DIR" && yarn install --frozen-lockfile --silent)
    log "Dependencies installed"
  fi
}

needs_devserver() {
  if $NO_DEVSERVER; then return 1; fi
  grep -qE 'make test_e2e|test:e2e|browser|page\.' "$PLAN_PATH"
}

setup_devserver() {
  if ! needs_devserver; then
    log "Dev server: skipped (no e2e/UI references in plan)"
    return 0
  fi

  log "Starting dev server (yarn dev) in worktree..."
  (cd "$WORKTREE_DIR" && exec yarn dev) &
  DEVSERVER_PID=$!

  # Get the worktree-aware URL from portless (respects branch prefix)
  local app_url
  app_url=$(cd "$WORKTREE_DIR" && yarn portless get www 2>/dev/null) || app_url="http://localhost:3000"

  # Wait for server to be ready
  local retries=30
  while [[ $retries -gt 0 ]]; do
    if curl -sf "$app_url" &>/dev/null; then
      break
    fi
    sleep 1
    retries=$((retries - 1))
  done

  if [[ $retries -eq 0 ]]; then
    err "Dev server failed to start at $app_url"
    exit 1
  fi

  log "Dev server ready at $app_url (PID: $DEVSERVER_PID)"
}

needs_neon() {
  if $NO_NEON; then return 1; fi
  if [[ -z "${NEON_PROJECT_ID:-}" ]]; then return 1; fi
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
    --project-id "$NEON_PROJECT_ID" 2>/dev/null || true  # Idempotent

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

# ── Claude Invocation ─────────────────────────────────────

IMPLEMENT_TOOLS='Read,Edit,Write,Grep,Glob,Bash(make\ *),Bash(git\ diff*),Bash(git\ status*)'
VALIDATE_TOOLS='Read,Edit,Grep,Glob,Bash(make\ *),Bash(git\ diff*),Bash(git\ status*),Bash(git\ add\ *),Bash(git\ commit\ *),Bash(git\ check-ignore\ *),Bash(git\ log\ *)'

LAST_EXIT_CODE=0
LAST_DURATION_MS=0
LAST_OUTPUT=""
LAST_COMMIT_SHA=""

run_claude() {
  local phase="$1"    # "implement" or "validate"
  local section_id="$2"
  local section_title="$3"
  local prompt_file tools prompt_text model
  local worktree_spec="$WORKTREE_DIR/$SPEC_PATH"

  if [[ "$phase" == "implement" ]]; then
    prompt_file="$IMPLEMENT_PROMPT"
    tools="$IMPLEMENT_TOOLS"
    model="$IMPLEMENT_MODEL"
  else
    prompt_file="$VALIDATE_PROMPT"
    tools="$VALIDATE_TOOLS"
    model="$VALIDATE_MODEL"
  fi

  # Inline section content from the spec into the prompt
  prompt_text=$(jq -r --arg id "$section_id" --arg phase "$phase" --arg plan "$PLAN_PATH" '
    .sections[] | select(.id == $id) |
    (if $phase == "implement" then "Implement" else "Validate" end) +
    " section \(.id): \(.title)\n\n" +
    "Plan: \($plan)\n\n" +
    "Tasks:\n" + (.tasks | map("- " + .) | join("\n")) + "\n\n" +
    "Files to read first:\n" + (.files | map("- " + .) | join("\n")) + "\n\n" +
    "Verify:\n" + (.verify | map("- " + .) | join("\n"))
  ' "$worktree_spec")

  local start_time
  start_time=$(date +%s000)

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
    --model "$model" \
    --allowedTools "$tools" \
    --permission-mode "bypassPermissions" \
    2>&1) || exit_code=$?

  local end_time
  end_time=$(date +%s000)
  local duration_ms=$((end_time - start_time))

  LAST_EXIT_CODE=$exit_code
  LAST_DURATION_MS=$duration_ms
  LAST_OUTPUT="$output"
}

# ── Success Detection ─────────────────────────────────────

check_success() {
  local phase="$1"
  local section_id="$2"
  local output="$LAST_OUTPUT"
  local exit_code=$LAST_EXIT_CODE
  local worktree_spec="$WORKTREE_DIR/$SPEC_PATH"

  # Layer 1 — Non-zero exit code
  if [[ $exit_code -ne 0 ]]; then
    if echo "$output" | grep -qiE 'rate.limit|quota|capacity|too many requests|429'; then
      err "Max plan quota exhausted — wait for your rolling window to reset"
      err "Re-run ralph when quota is available; it will resume from this section"
      exit 1
    fi
    err "Claude process exited with code $exit_code"
    return 1
  fi

  # Layer 2 — JSON error fields
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

  # Layer 3 — Run verify commands from spec
  local verify_cmd
  while IFS= read -r verify_cmd; do
    if [[ -z "$verify_cmd" ]]; then continue; fi
    log "Verify: $verify_cmd"
    if ! (cd "$WORKTREE_DIR" && eval "$verify_cmd"); then
      err "Verify command failed: $verify_cmd"
      return 1
    fi
  done < <(jq -r --arg id "$section_id" '
    .sections[] | select(.id == $id) | .verify[]
  ' "$worktree_spec")

  return 0
}

# ── Metrics Recording ─────────────────────────────────────

record_metrics() {
  local phase="$1"
  local section_id="$2"
  local section_title="$3"
  local output="$LAST_OUTPUT"
  local duration_ms="$LAST_DURATION_MS"
  local exit_code=$LAST_EXIT_CODE

  mkdir -p "$METRICS_DIR"

  # Extract fields from Claude's JSON output
  # Note: total_cost_usd is always the API-equivalent price, even in max (subscription) mode.
  # In max mode this is NOT actual billing — it's useful for cost comparison across models.
  local api_cost input_tokens output_tokens cache_read num_turns subtype duration_api
  api_cost=$(echo "$output" | jq -r '.total_cost_usd // 0' 2>/dev/null) || api_cost=0
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
    --argjson cost "$api_cost" \
    --argjson input "$input_tokens" \
    --argjson output_tok "$output_tokens" \
    --argjson cache "$cache_read" \
    --argjson dur "$duration_ms" \
    --argjson dur_api "$duration_api" \
    --argjson turns "$num_turns" \
    --arg model "$(if [[ "$phase" == "implement" ]]; then echo "$IMPLEMENT_MODEL"; else echo "$VALIDATE_MODEL"; fi)" \
    --argjson max_turns "$MAX_TURNS" \
    --argjson max_budget "$MAX_BUDGET" \
    --arg commit_sha "$LAST_COMMIT_SHA" \
    '{
      timestamp: $ts,
      plan: $plan,
      section: $section,
      section_title: $section_title,
      phase: $phase,
      subtype: $subtype,
      billing: $billing,
      api_equivalent_cost_usd: $cost,
      input_tokens: $input,
      output_tokens: $output_tok,
      cache_read_tokens: $cache,
      duration_ms: $dur,
      duration_api_ms: $dur_api,
      num_turns: $turns,
      model: $model,
      max_turns_configured: $max_turns,
      max_budget_configured: $max_budget,
      commit_sha: (if $commit_sha == "" then null else $commit_sha end)
    }' >> "$METRICS_FILE"

  log "Metrics: billing=$BILLING | ${num_turns} turns | ${duration_ms}ms ($phase)$(if [ -n "$LAST_COMMIT_SHA" ]; then echo " | commit: ${LAST_COMMIT_SHA:0:8}"; fi)"
}

# ── PR Creation ───────────────────────────────────────────

DESCRIBE_PR_TOOLS='Read,Grep,Glob,Bash(make\ *),Bash(gh\ *),Bash(git\ diff*),Bash(git\ log*),Bash(git\ status*),Bash(mkdir\ *),Write'

pr_title() {
  # Generate a conventional commit-style PR title from the plan name
  # e.g., "2026-04-01-dashboard-app-shell" -> "feat: dashboard app shell [ralph]"
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
    --model "haiku" \
    --allowedTools "$DESCRIBE_PR_TOOLS" \
    --permission-mode "bypassPermissions" \
    2>&1) || {
    err "PR description generation failed — PR exists with placeholder body"
    log "Run /describe_pr manually to update the description"
  }

  log "PR ready for review: $pr_url"
  PR_URL="$pr_url"
}

# ── Main ──────────────────────────────────────────────────

setup_worktree

# Ensure plan file exists in worktree (may not be committed yet)
if [[ ! -f "$WORKTREE_DIR/$PLAN_PATH" ]]; then
  log "Copying plan to worktree"
  mkdir -p "$(dirname "$WORKTREE_DIR/$PLAN_PATH")"
  cp "$PLAN_PATH" "$WORKTREE_DIR/$PLAN_PATH"
fi

# Ensure spec file exists in worktree
if [[ ! -f "$WORKTREE_DIR/$SPEC_PATH" ]]; then
  log "Copying spec to worktree"
  mkdir -p "$(dirname "$WORKTREE_DIR/$SPEC_PATH")"
  cp "$SPEC_PATH" "$WORKTREE_DIR/$SPEC_PATH"
fi

setup_devserver
setup_neon
sanity_gate

log "Starting main loop"

LOOP_FAILED=false

while true; do
  worktree_spec="$WORKTREE_DIR/$SPEC_PATH"

  result=$(find_next_section "$worktree_spec") || {
    log "All sections complete!"
    push_and_create_pr
    break
  }

  IFS=$'\t' read -r SECTION_ID SECTION_TITLE SECTION_STATE <<< "$result"
  log "Section $SECTION_ID: $SECTION_TITLE ($SECTION_STATE)"

  # Implement phase (skip if already implemented)
  if [[ "$SECTION_STATE" == "implement" ]]; then
    log "Phase: implement"
    LAST_COMMIT_SHA=""
    run_claude "implement" "$SECTION_ID" "$SECTION_TITLE"
    record_metrics "implement" "$SECTION_ID" "$SECTION_TITLE"

    if ! check_success "implement" "$SECTION_ID"; then
      err "Implement failed for section $SECTION_ID"
      LOOP_FAILED=true
      break
    fi

    update_section_state "$worktree_spec" "$SECTION_ID" "implemented"
    log "Implement succeeded for section $SECTION_ID"
  fi

  # Validate phase
  log "Phase: validate"
  LAST_COMMIT_SHA=""
  run_claude "validate" "$SECTION_ID" "$SECTION_TITLE"

  if ! check_success "validate" "$SECTION_ID"; then
    record_metrics "validate" "$SECTION_ID" "$SECTION_TITLE"
    err "Validate failed for section $SECTION_ID"
    LOOP_FAILED=true
    break
  fi

  # Capture commit SHA after successful validation (validate agent commits on success)
  LAST_COMMIT_SHA=$(cd "$WORKTREE_DIR" && git rev-parse HEAD)
  record_metrics "validate" "$SECTION_ID" "$SECTION_TITLE"

  update_section_state "$worktree_spec" "$SECTION_ID" "validated"
  log "Section $SECTION_ID complete (commit: ${LAST_COMMIT_SHA:0:8})"
done

if $LOOP_FAILED; then
  log "Ralph loop finished with errors"
  exit 1
fi

log "Ralph loop finished"
