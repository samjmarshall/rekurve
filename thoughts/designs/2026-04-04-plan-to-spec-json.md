# Plan-to-Spec: JSON Spec Files for Ralph Loop

## Problem

Ralph.sh parses markdown plans using a bash regex (`^####[[:space:]]+([0-9]+\.?[0-9]*)`) to discover sections. This regex only matches one heading format (`#### 1.1 Title`). Plans naturally use varied formats:

| Plan | Format | Matches regex? |
|------|--------|----------------|
| Code review Phase 1 | `#### 1.1 Prevent Waterfall Chains` | Yes |
| Code review Phase 2 | `#### Category 1: Eliminating Waterfalls` | No |
| Code review Phase 3 | `##### 1.1 Avoid Boolean Prop Proliferation` | No |
| Security review | `## Task 1: Authentication Configuration` | No |

After Phase 1 completes, `find_next_section` returns exit 1 (no match) and ralph reports "All sections complete!" with two-thirds of the work untouched.

The root cause: markdown is a human-authoring format, not a machine contract. Every new plan can introduce heading variants that break the parser. Making the regex more flexible just moves the fragility.

## Solution

Replace markdown parsing with a structured JSON spec file. A Claude Skill (`/plan-to-ralph-spec`) converts markdown plans to JSON once; the user reviews; ralph.sh reads JSON for execution.

```
thoughts/plans/2026-04-01-code-review.md           <- human plan (source)
thoughts/plans/2026-04-01-code-review.spec.json     <- machine spec (derived)
```

The skill leverages Claude's natural language understanding to find section boundaries regardless of heading format --- replacing brittle regex with AI comprehension, run once at conversion time rather than on every loop iteration.

## JSON Spec Schema

```json
{
  "version": 1,
  "plan": "thoughts/plans/2026-04-01-code-review-best-practices-checklist.md",
  "title": "Code Review Checklist: Next.js, React & Composition Best Practices",
  "sections": [
    {
      "id": "1.1",
      "title": "Prevent Waterfall Chains",
      "tasks": [
        "Review all async server components for sequential await chains",
        "Check API route handlers (src/app/api/) for sequential operations"
      ],
      "files": [
        "src/app/(application)/layout.tsx",
        "src/app/(application)/settings/page.tsx",
        "src/app/api/trpc/[trpc]/route.ts"
      ],
      "verify": ["make check"],
      "state": "pending"
    }
  ]
}
```

### Field definitions

- **`version`**: Schema version. Ralph.sh rejects specs with unsupported versions.
- **`plan`**: Path to the source markdown plan. Informational only.
- **`title`**: Plan title. Used in logs and PR descriptions.
- **`sections`**: Ordered array of executable sections.
  - **`id`**: Stable, unique identifier. Normalized from the plan heading (e.g., `"1.1"`, `"task-1"`, `"p2.cat1"`).
  - **`title`**: Human-readable section title.
  - **`tasks`**: Array of instruction strings --- the checkbox items from the plan, stripped of markdown syntax. These are the instructions Claude receives.
  - **`files`**: Array of file paths the section references. Claude reads these before making changes.
  - **`verify`**: Array of make targets to run after implementation. Defaults to `["make check"]` if the plan doesn't specify.
  - **`state`**: Managed by ralph.sh. Three states: `"pending"` -> `"implemented"` -> `"validated"`.

### State transitions

State is owned by ralph.sh, not Claude:

- Before implement phase: state stays `"pending"`
- After successful implement (verify commands pass + Claude exit 0): ralph writes `"implemented"`
- After successful validate: ralph writes `"validated"`
- On failure: state unchanged. Ralph stops the loop and resumes from the same section on next run.

## The Skill: `/plan-to-ralph-spec`

### Invocation

```
/plan-to-ralph-spec thoughts/plans/2026-04-01-code-review-best-practices-checklist.md
```

### Behavior

1. Read the markdown plan fully.
2. Identify all sections regardless of heading format --- `#### 1.1 Title`, `## Task N:`, `#### Category 1:`, `##### 1.1 Title`, etc.
3. For each section, extract:
   - A normalized ID (stable, unique, slug-like)
   - Title
   - Tasks from checkbox items (`- [ ]` lines)
   - File paths mentioned in the section body
   - Verification commands from success criteria
4. Set all states to `"pending"`.
5. Write to `<plan-path>` with `.md` replaced by `.spec.json`.
6. Print a summary: section count, any sections it was uncertain about.

### Edge cases

- Phases/groups (like "Phase 1", "Phase 2") become a prefix on the section ID (e.g., `"p1.1.1"`) but are not sections themselves. Only leaf-level items with tasks become sections.
- Sections with zero checkbox items are skipped with a warning.
- The skill does not modify the original markdown plan.

### File location

```
.claude/skills/plan-to-ralph-spec/SKILL.md
```

## Ralph.sh Changes

Ralph.sh switches from markdown parsing to JSON reading. The main loop structure stays the same; section discovery and state management use `jq` instead of bash regex.

### Input

Ralph accepts a `.spec.json` path:

```bash
scripts/ralph.sh thoughts/plans/2026-04-01-code-review.spec.json
```

Auto-detection: if the path ends in `.md`, ralph checks for a sibling `.spec.json` and uses that. If no spec exists, it errors with a message to run `/plan-to-ralph-spec` first.

### Replaced functions

| Current (markdown) | New (JSON) |
|---|---|
| `find_next_section` --- 80-line bash regex parser | `jq` one-liner: first section where `.state == "pending"` or `.state == "implemented"` |
| `count_sections` --- 30-line bash loop | `jq` one-liner: count by state |
| `check_success` --- reads plan line ranges for checkbox state | Runs verify commands from JSON; success = all pass + Claude exit 0 |
| Dry run section listing | `jq` pretty-print of sections with state indicators |

### Removed

- `SECTION_START_LINE` / `SECTION_END_LINE` globals
- All markdown regex matching
- Claude's responsibility to update checkboxes in the plan file

## Prompt Changes

### Current flow

Ralph tells Claude: "implement section 1.1 (Title) from the plan at path/to/plan.md." Claude reads the plan, hunts for the section, interprets what to do.

### New flow

Ralph inlines the section content into the prompt:

```bash
prompt_text=$(jq -r --arg id "$SECTION_ID" '
  .sections[] | select(.id == $id) |
  "Implement section \(.id): \(.title)\n\n" +
  "Tasks:\n" + (.tasks | map("- " + .) | join("\n")) + "\n\n" +
  "Files to read first:\n" + (.files | map("- " + .) | join("\n"))
' "$SPEC_PATH")
```

Claude receives:

```
Implement section 1.1: Prevent Waterfall Chains

Tasks:
- Review all async server components for sequential await chains
- Check API route handlers (src/app/api/) for sequential operations

Files to read first:
- src/app/(application)/layout.tsx
- src/app/(application)/settings/page.tsx
- src/app/api/trpc/[trpc]/route.ts
```

### Prompt file changes

`ralph-implement.md` and `ralph-validate.md` are simplified:

- Remove: instructions about reading the plan file and finding sections
- Remove: instructions about updating checkboxes (ralph owns state)
- Keep: scope discipline, progress notes, verification commands, commit format
- Implement prompt becomes: "You are implementing a section. The tasks and files are in your prompt. Implement each task, then run verification."
- Validate prompt: same simplification --- validate + commit, no checkbox marking

## Files Summary

### New

```
.claude/skills/plan-to-ralph-spec/SKILL.md
```

### Modified

```
scripts/ralph.sh                     --- JSON-based loop (replaces markdown parsing)
.claude/prompts/ralph-implement.md   --- simplified (no plan file reading)
.claude/prompts/ralph-validate.md    --- simplified (no checkbox marking)
.gitignore                           --- add *.spec.json under thoughts/plans/
```

### Generated at runtime

```
thoughts/plans/<name>.spec.json      --- sibling to the .md plan, gitignored
```

## What We're NOT Doing

- Modifying the original markdown plans
- Adding schema validation libraries or new dependencies (`jq` is already used)
- Building a spec editor or UI
- Auto-running the skill from ralph.sh (user runs it manually, reviews, then runs ralph)
- Versioning or diffing spec files (they're derived artifacts, regenerable from source)
