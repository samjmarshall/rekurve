# Plan-to-Spec: JSON Spec Files for Ralph Loop

## Overview

Replace ralph.sh's brittle markdown regex parsing with a two-stage workflow: a `/plan-to-ralph-spec` Claude skill converts markdown plans to `.spec.json` files once, then ralph.sh reads JSON with `jq` for section discovery, state management, and prompt construction. This eliminates the root cause of ralph silently skipping sections when heading formats vary.

## Current State Analysis

- `find_next_section` (ralph.sh:158–239) uses `^####[[:space:]]+([0-9]+\.?[0-9]*)` — only matches `#### 1.1 Title` format
- `count_sections` (ralph.sh:241–280) has the same regex limitation
- `check_success` layer 3 (ralph.sh:607–624) reads plan checkboxes (`- [ ]`, `- [/]`) via `SECTION_START_LINE`/`SECTION_END_LINE` globals
- `run_claude` (ralph.sh:534) builds a minimal prompt: `"$phase section $section_id ($section_title) from the plan at $PLAN_PATH"`
- `ralph-implement.md` instructs Claude to read the plan, find sections, manage `- [ ]` → `- [/]` transitions
- `ralph-validate.md` instructs Claude to read the plan, find sections, manage `- [/]` → `- [x]` transitions, and revert on failure
- `jq` is already used throughout ralph.sh (check_success, record_metrics, cleanup, verify_auth)

### Key Discoveries:
- The EOF case in `find_next_section` (lines 227/230) uses `echo` (space-separated) instead of `printf '%s\t%s\t%s\n'` (tab-separated) — a latent bug that the JSON approach eliminates
- Dry-run (lines 283–347) duplicates the same regex parsing — another source of heading-format fragility
- `SECTION_START_LINE`/`SECTION_END_LINE` globals are only consumed by `check_success` layer 3 — removing that layer removes both globals

## Desired End State

After this plan is complete:

1. A `/plan-to-ralph-spec` skill exists at `.claude/skills/plan-to-ralph-spec/SKILL.md`
2. Running `/plan-to-ralph-spec thoughts/plans/some-plan.md` produces `thoughts/plans/some-plan.spec.json`
3. `scripts/ralph.sh` accepts `.spec.json` or `.md` (auto-detects sibling spec)
4. Ralph reads JSON for section discovery, state transitions, and prompt construction — zero markdown regex
5. `ralph-implement.md` and `ralph-validate.md` are simplified — no plan-file reading, no checkbox management
6. `*.spec.json` files are gitignored
7. All existing tests pass: `make check`

### Verification:
- `make check` passes
- `scripts/ralph.sh thoughts/plans/some-plan.spec.json --dry-run` lists sections from JSON
- `scripts/ralph.sh thoughts/plans/some-plan.md --dry-run` auto-detects the sibling `.spec.json`
- `/plan-to-ralph-spec` produces valid JSON matching the schema for any plan heading format

## What We're NOT Doing

- Modifying existing markdown plans
- Adding schema validation libraries or new dependencies (`jq` is already used)
- Building a spec editor or UI
- Auto-running the skill from ralph.sh (user runs it manually, reviews, then runs ralph)
- Versioning or diffing spec files (they're derived artifacts, regenerable from source)
- Changing `ralph-describe-pr.md` (it reads the original markdown for motivation/context, not sections)

## Implementation Approach

Phase 1 (skill) is independent. Phase 2 (ralph.sh) and Phase 3 (prompts) are tightly coupled but separated for readability. Phase 4 (gitignore) is trivial cleanup.

---

## Phase 1: `/plan-to-ralph-spec` Skill

### Overview
Create the Claude skill that converts a markdown plan to a `.spec.json` file. The skill leverages Claude's natural language understanding to find section boundaries regardless of heading format.

### Changes Required:

#### 1.1 Create skill file
**File**: `.claude/skills/plan-to-ralph-spec/SKILL.md` (new)
**Changes**: New skill following existing project patterns (YAML frontmatter + markdown body)

```markdown
---
name: plan-to-ralph-spec
description: Convert a markdown implementation plan to a JSON spec file for ralph.sh execution
---

# Plan to Spec

Convert a markdown implementation plan into a structured `.spec.json` file that ralph.sh uses for execution.

## Invocation

The user provides a path to a markdown plan:
```
/plan-to-ralph-spec thoughts/plans/2026-04-01-code-review-best-practices-checklist.md
```

## Steps

1. Read the markdown plan file completely
2. Identify all **leaf-level sections** that contain checkbox task items (`- [ ]` lines)
3. For each section, extract:
   - **id**: A normalized, stable, unique identifier derived from the heading structure (e.g., `"1.1"`, `"p2.cat1"`, `"task-1"`). Use numeric IDs when headings have numbers; use slugified IDs when they don't.
   - **title**: The human-readable section title (heading text without the `#` prefix or numbering)
   - **tasks**: Array of task strings from checkbox items (`- [ ]` lines), stripped of the `- [ ]` prefix
   - **files**: Array of file paths mentioned in the section body (backtick-quoted paths matching `src/`, `e2e/`, `scripts/`, `.claude/`, `.github/`, `thoughts/`, `docs/`, or common extensions)
   - **verify**: Array of make/shell commands from the section's success criteria. Default to `["make check"]` if none specified
4. Skip sections with zero checkbox items — log a warning for each
5. Phases or groups (e.g., "Phase 1", "Phase 2") become ID prefixes on their child sections, not sections themselves. Only leaf-level items with tasks become sections.
6. Set all `state` fields to `"pending"`
7. Write to the same directory as the plan, replacing `.md` with `.spec.json`
8. Print a summary: section count, any warnings

## Output Schema

```json
{
  "version": 1,
  "plan": "<relative path to source markdown plan>",
  "title": "<plan title from first H1>",
  "sections": [
    {
      "id": "1.1",
      "title": "Section Title",
      "tasks": ["Task description 1", "Task description 2"],
      "files": ["src/app/page.tsx", "src/lib/utils.ts"],
      "verify": ["make check"],
      "state": "pending"
    }
  ]
}
```

## Rules

- Do NOT modify the original markdown plan
- Heading format does not matter — handle `####`, `###`, `##`, `#####`, numbered (`1.1`), named (`Category 1:`), etc.
- The spec file must be valid JSON (use `jq .` to verify before writing)
- If a section's success criteria mention specific commands (`make test`, `make build`, `make test_e2e`), include those in `verify` instead of the default
- File paths in `files` should be relative to the repo root
- IDs must be unique across all sections in the spec
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (skill file is valid markdown)

#### Manual Verification:
- [ ] Running `/plan-to-ralph-spec thoughts/plans/2026-04-01-code-review-best-practices-checklist.md` produces a valid `.spec.json`
- [ ] Sections with varied heading formats (####, ###, ##, numbered, named) are all captured
- [ ] Sections with zero checkboxes are skipped with a warning

---

## Phase 2: Ralph.sh — JSON-Based Loop

### Overview
Replace all markdown parsing in ralph.sh with `jq`-based JSON reading. The spec file in the worktree becomes the state machine. Ralph owns state transitions (pending → implemented → validated).

### Changes Required:

#### 2.1 Input handling and spec resolution
**File**: `scripts/ralph.sh`
**Changes**: Add spec path resolution after argument parsing (after line 83), update derived values

Replace the file existence check and derived values block (lines 74–116) with logic that resolves both `PLAN_PATH` and `SPEC_PATH` regardless of which the user provides:

```bash
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

# ── Derived values ────────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel)
PLAN_NAME=$(basename "$PLAN_PATH" .md)
PLAN_SLUG=$(slugify "$PLAN_NAME")
# ... rest unchanged ...
```

Update usage text (line 21) and examples (lines 44–46) to mention `.spec.json`.

#### 2.2 Replace `find_next_section`
**File**: `scripts/ralph.sh`
**Changes**: Replace lines 148–239 (globals + function) with a jq one-liner

Remove globals `SECTION_START_LINE` and `SECTION_END_LINE` (lines 151–152). Replace `find_next_section`:

```bash
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
```

#### 2.3 Replace `count_sections`
**File**: `scripts/ralph.sh`
**Changes**: Replace lines 241–280

```bash
count_sections() {
  local spec="$1"
  local total complete
  total=$(jq '.sections | length' "$spec")
  complete=$(jq '[.sections[] | select(.state == "validated")] | length' "$spec")
  echo "$complete/$total"
}
```

#### 2.4 Add `update_section_state`
**File**: `scripts/ralph.sh`
**Changes**: New function after `count_sections`

```bash
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
```

#### 2.5 Replace dry-run block
**File**: `scripts/ralph.sh`
**Changes**: Replace lines 283–347

```bash
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
```

#### 2.6 Update `run_claude` prompt construction
**File**: `scripts/ralph.sh`
**Changes**: Replace prompt_text construction at line 534

```bash
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

  # ... rest of function unchanged from line 536 onward ...
```

#### 2.7 Replace `check_success` layer 3
**File**: `scripts/ralph.sh`
**Changes**: Replace lines 607–624 (plan marker check) with verify command execution

```bash
check_success() {
  local phase="$1"
  local section_id="$2"
  local output="$LAST_OUTPUT"
  local exit_code=$LAST_EXIT_CODE
  local worktree_spec="$WORKTREE_DIR/$SPEC_PATH"

  # Layer 1 — Non-zero exit code (unchanged, lines 581–590)
  if [[ $exit_code -ne 0 ]]; then
    if echo "$output" | grep -qiE 'rate.limit|quota|capacity|too many requests|429'; then
      err "Max plan quota exhausted — wait for your rolling window to reset"
      err "Re-run ralph when quota is available; it will resume from this section"
      exit 1
    fi
    err "Claude process exited with code $exit_code"
    return 1
  fi

  # Layer 2 — JSON error fields (unchanged, lines 593–605)
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
```

#### 2.8 Update main loop — spec copy and state transitions
**File**: `scripts/ralph.sh`
**Changes**: Update worktree setup block (lines 790–801) and main loop (lines 805–845)

Add spec file copy alongside the plan file copy (after line 797):

```bash
# Ensure spec file exists in worktree
if [[ ! -f "$WORKTREE_DIR/$SPEC_PATH" ]]; then
  log "Copying spec to worktree"
  mkdir -p "$(dirname "$WORKTREE_DIR/$SPEC_PATH")"
  cp "$SPEC_PATH" "$WORKTREE_DIR/$SPEC_PATH"
fi
```

Update main loop to use spec for section discovery and write state transitions:

```bash
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
    run_claude "implement" "$SECTION_ID" "$SECTION_TITLE"
    record_metrics "implement" "$SECTION_ID" "$SECTION_TITLE"

    if ! check_success "implement" "$SECTION_ID"; then
      err "Implement failed for section $SECTION_ID"
      break
    fi

    update_section_state "$worktree_spec" "$SECTION_ID" "implemented"
    log "Implement succeeded for section $SECTION_ID"
  fi

  # Validate phase
  log "Phase: validate"
  run_claude "validate" "$SECTION_ID" "$SECTION_TITLE"
  record_metrics "validate" "$SECTION_ID" "$SECTION_TITLE"

  if ! check_success "validate" "$SECTION_ID"; then
    err "Validate failed for section $SECTION_ID"
    break
  fi

  update_section_state "$worktree_spec" "$SECTION_ID" "validated"
  log "Section $SECTION_ID complete"
done
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [ ] `scripts/ralph.sh thoughts/plans/2026-04-01-code-review-best-practices-checklist.spec.json --dry-run` lists sections from JSON
- [ ] `scripts/ralph.sh thoughts/plans/2026-04-01-code-review-best-practices-checklist.md --dry-run` auto-detects the sibling `.spec.json`

#### Manual Verification:
- [ ] Passing `.spec.json` directly works
- [ ] Passing `.md` auto-detects sibling `.spec.json`
- [ ] Passing `.md` without a sibling `.spec.json` errors with a message to run `/plan-to-ralph-spec`
- [ ] Dry-run shows section states from JSON (pending/implemented/validated)

---

## Phase 3: Prompt Simplification

### Overview
Strip plan-reading, section-finding, and checkbox management instructions from `ralph-implement.md` and `ralph-validate.md`. Claude now receives tasks and files inline in the prompt — no plan parsing needed.

### Changes Required:

#### 3.1 Simplify `ralph-implement.md`
**File**: `.claude/prompts/ralph-implement.md`
**Changes**: Rewrite to remove plan reading, section finding, and checkbox management

```markdown
# Ralph: Implement Section

You are implementing a single section of an implementation plan. The tasks, files, and verification commands are provided in your prompt. You have no memory of previous sessions.

## Your Task

1. Read ALL files listed under "Files to read first" — read them fully, never use limit/offset
2. Implement each task listed under "Tasks"
3. Run the commands listed under "Verify"
4. If verification passes, you're done

## Rules

### Do:
- Read all referenced files completely before making changes
- Follow the task descriptions while adapting to what you actually find in the code
- Run all verification commands after implementation
- Stay focused on the listed tasks only

### Don't:
- Touch anything outside the listed tasks' scope
- Create todo lists — stay focused on the tasks
- Attempt to sequence multiple sections — the shell script handles that
- Create git commits — the validate phase handles that

## When Reality Diverges from the Tasks

If the codebase doesn't match what the tasks expect:

1. Try to fulfill the task's *intent* with the code as it exists now
2. If you can adapt without changing scope, do so
3. If the divergence is too large to resolve, stop and explain why

## Tool Usage

You have access to: Read, Edit, Write, Grep, Glob, and restricted Bash commands. Use `make` targets for builds and tests. Use `git diff` and `git status` to understand the current state.
```

**Removed:**
- "Read the plan file completely for context"
- "Find the target section by its ID and title"
- Checkbox management (`- [ ]` → `- [/]` transitions)
- Progress note format (ralph owns state now)

#### 3.2 Simplify `ralph-validate.md`
**File**: `.claude/prompts/ralph-validate.md`
**Changes**: Rewrite to remove plan reading, section finding, and checkbox management

```markdown
# Ralph: Validate & Commit Section

You are validating that a single section of an implementation plan was correctly implemented, then creating an atomic commit. The tasks and files are provided in your prompt. You have no memory of the implement session.

## Your Task

1. Read ALL files listed under "Files to read first" — understand what should exist
2. Run `git diff` to see what was changed
3. Run the commands listed under "Verify"
4. Validate that the changes match the task descriptions (not just that checks pass)
5. On success: create an atomic commit
6. On failure: do NOT commit — explain what went wrong

## Validation Steps

### 1. Review Changes
```bash
git diff          # Unstaged changes
git diff --cached # Staged changes (if any)
git status        # Overall state
```

Verify that:
- The right files were modified
- Changes match the task descriptions
- No unrelated changes leaked in
- No obvious bugs, security issues, or regressions

### 2. Run Verification Commands
Run every command listed under "Verify" in your prompt. Common ones:
- `make check` — lint + typecheck
- `make build` — full build
- `make test` — unit tests
- `make test_e2e` — E2E tests

### 3. Think Critically
- Were edge cases handled?
- Could these changes break existing functionality?
- Does the implementation match the tasks' *intent*, not just their letter?

## On Success

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
- Reference the plan in the commit body (shown as "Plan:" in your prompt)
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

Do NOT create a commit. Explain what failed and why.

## Tool Usage

You have access to: Read, Edit, Grep, Glob, and restricted Bash commands including git operations. Use `make` targets for builds and tests.
```

**Removed:**
- "Read the plan file completely for context"
- "Find the target section by its ID and title"
- Checkbox management (`- [/]` → `- [x]` transitions, revert `- [/]` → `- [ ]` on failure)
- Progress note format
- Failure revert instructions (ralph owns state now)

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (prompt files are valid markdown)

#### Manual Verification:
- [x] Implement prompt no longer references the plan file, checkboxes, or progress notes
- [x] Validate prompt no longer references the plan file, checkboxes, or progress notes
- [x] Validate prompt retains commit format with `[ralph]` tag and plan reference
- [x] Both prompts reference "Tasks", "Files to read first", and "Verify" — matching the inline prompt format from Phase 2

---

## Phase 4: Gitignore and Cleanup

### Overview
Add `*.spec.json` to `.gitignore` and remove any remaining dead code references.

### Changes Required:

#### 4.1 Update `.gitignore`
**File**: `.gitignore`
**Changes**: Add spec file pattern under the Ralph section

```diff
 # Ralph loop runtime
 /.worktrees/
 /.ralph/
+*.spec.json
```

#### 4.2 Remove dead code from ralph.sh
**File**: `scripts/ralph.sh`
**Changes**: Verify these are gone (should already be removed in Phase 2):
- `SECTION_START_LINE` / `SECTION_END_LINE` globals (lines 151–152)
- All markdown regex matching in `find_next_section`, `count_sections`, dry-run
- The `sed -n` plan-file read in `check_success` (line 610)
- Checkbox grep patterns in `check_success` (lines 613, 618)

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `echo "test.spec.json" | git check-ignore --stdin` confirms the pattern is ignored

#### Manual Verification:
- [x] No markdown regex patterns remain in ralph.sh (grep for `####` or `SECTION_.*LINE`)
- [x] `*.spec.json` files don't show in `git status`

---

## Performance Considerations

- The `/plan-to-ralph-spec` skill runs once per plan, not per loop iteration — no performance concern
- `jq` one-liners are faster than the bash `while read` loops they replace
- `update_section_state` writes the full spec on each transition (2× per section: implemented + validated). For typical plan sizes (5–20 sections), this is negligible

## References

- Design document: `thoughts/designs/2026-04-04-plan-to-spec-json.md`
- Current ralph.sh: `scripts/ralph.sh`
- Current prompts: `.claude/prompts/ralph-implement.md`, `.claude/prompts/ralph-validate.md`
- Skill pattern reference: `.claude/skills/zod/SKILL.md`, `.claude/skills/commit/SKILL.md`
