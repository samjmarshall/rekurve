---
name: plan-to-ralph-spec
description: Convert a markdown implementation plan to a JSON spec file for ralph.sh execution
---

# Plan to Spec

Convert a markdown implementation plan into a structured `.spec.json` file that ralph.sh uses for execution. Each checkbox task in the plan becomes its own entry in the spec — ralph processes one task at a time.

## Invocation

The user provides a path to a markdown plan:
```
/plan-to-ralph-spec thoughts/plans/2026-04-01-code-review-best-practices-checklist.md
```

## Steps

1. Read the markdown plan file completely
2. Identify all **leaf-level sections** that contain checkbox task items (`- [ ]` lines)
3. For each **individual checkbox task** within each section, create a separate entry:
   - **id**: A unique identifier using the section number plus a task index (e.g., `"1.1.1"`, `"1.1.2"`, `"1.2.1"`). The first two segments identify the section, the last segment is the 1-based task index within that section.
   - **title**: The section title with a task index suffix (e.g., `"Add test-mode branch (1/6)"`, `"Add test-mode branch (2/6)"`)
   - **task**: A single task string from one checkbox item (`- [ ]` line), stripped of the `- [ ]` prefix
   - **files**: Array of file paths mentioned in the parent section body (backtick-quoted paths matching `src/`, `e2e/`, `scripts/`, `.claude/`, `.github/`, `thoughts/`, `docs/`, or common extensions). Inherited by all tasks from the same section.
   - **verify**: Array of make/shell commands from the parent section's success criteria. Default to `["make check"]` if none specified. Inherited by all tasks from the same section.
4. Skip sections with zero checkbox items — log a warning for each
5. Phases or groups (e.g., "Phase 1", "Phase 2") become ID prefixes on their child sections, not entries themselves.
6. Set all `state` fields to `"pending"`
7. Write to the same directory as the plan, replacing `.md` with `.spec.json`
8. Print a summary: total task count, section count, any warnings

## Output Schema

```json
{
  "version": 2,
  "plan": "<relative path to source markdown plan>",
  "title": "<plan title from first H1>",
  "tasks": [
    {
      "id": "1.1.1",
      "title": "Add test-mode branch (1/6)",
      "task": "Open `src/instrumentation-client.ts` and add a global declaration block",
      "files": ["src/instrumentation-client.ts"],
      "verify": ["make check"],
      "state": "pending"
    },
    {
      "id": "1.1.2",
      "title": "Add test-mode branch (2/6)",
      "task": "Add the isE2E detection line after the global declaration",
      "files": ["src/instrumentation-client.ts"],
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
- IDs must be unique across all entries in the spec
- The top-level array key is `"tasks"`, not `"sections"`
- Each entry has a singular `"task"` field (string), not a plural `"tasks"` field (array)
- Do NOT include a `notes` field — ralph.sh populates this at runtime with progress updates from each attempt
