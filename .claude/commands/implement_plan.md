---
skills: tdd
model: sonnet
---
# Implement Plan

You are tasked with implementing an approved technical plan from `thoughts/plans/`. These plans contain phases with specific changes and success criteria.

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read the ticket linked under `## References` and every `file:line` anchor cited in `## Current State` and each phase's `### Changes` — these are load-bearing; the plan assumes you've seen them
- **Read files fully** - never use limit/offset parameters, you need complete context
- Think deeply about how the pieces fit together
- Create a todo list mirroring the plan's phases and per-phase `### Changes` entries
- Run the Pre-flight risk scan (next section) before writing code.

If no plan path provided, ask for one.

## Pre-flight: Risks & Gotchas

Before writing code, scan the plan for these risks and state findings in a short block:

1. **Schema changes** — name each migration step. Never use schema-push shortcuts that bypass the migrations log.
2. **CI trigger scope** — for any workflow change, state the trigger. `repository_dispatch`, `schedule`, and `workflow_dispatch` run from the default branch; changes on a feature branch take no effect until merged.
3. **Env vars** — list new variables and where to set them (local + deployment).
4. **Test data** — identify external records the plan creates and confirm each spec cleans them up in `afterAll`.

Wait for approval before editing files. If the plan has zero risks, say so and proceed.

## Implementation Philosophy

Plans are carefully designed, but reality can be messy. Your job is to:
- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

## TDD Loop

Plans list test files alongside implementation files under `### Changes` (e.g. `path/to/file.ts` + `path/to/file.test.ts`). For each such pair, follow the `tdd` skill's vertical-slice loop:

1. Write the test first — narrowest slice that exercises the behaviour
2. Run it and confirm it fails for the right reason
3. Implement the minimum to make it pass
4. Repeat for the next slice

For refactors, write characterization tests capturing current behaviour **before** changing any implementation.

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

If you encounter a mismatch:
- STOP and think deeply about why the plan can't be followed
- Present the issue clearly:
  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

## Verification Approach

After implementing a phase:
- Run **every** command listed under the phase's `**Automated**` checklist (typically some combination of `make check`, `make test`, `make test_e2e`) — don't assume one covers the others
- Fix any issues before proceeding
- Walk the phase's `**Manual**` checklist; check off only what you've actually observed
- Update checkboxes in the plan file using Edit as items are verified

Don't let verification interrupt your flow - batch it at natural stopping points.

## UI/Frontend Phases

When a phase modifies UI components, pages, or styles in `src/`:
- Use the `frontend-design` skill to guide implementation
- Follow `.claude/skills/frontend-design/design-checklist.md`
- Run `/design_review` after completing the phase

## Documentation

After all phases are complete, update docs so the next engineer picks up cold:

- **`docs/README.md`** — update when the plan adds an env var, integration, scheduled job, ADR, or Make target. Skip otherwise.
- **`/document-feature {slug}`** — run for user-visible features (new route, flow, or integration). Take `{slug}` from the ticket title. Skip for infra, refactors, bug fixes, or test-only changes.
- **`/domain-model`** — run when the plan adds or restructures a domain concept or entity boundary. Skip otherwise.

If a skill is unavailable, flag it in your summary. Don't hand-write the artefact.

## If You Get Stuck

When something isn't working as expected:
- First, make sure you've read and understood all the relevant code
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

Use sub-tasks sparingly - mainly for targeted debugging or exploring unfamiliar territory.

## Resuming Work

If the plan has existing checkmarks:
- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

Remember: You're implementing a solution, not just checking boxes. Keep the end goal in mind and maintain forward momentum.
