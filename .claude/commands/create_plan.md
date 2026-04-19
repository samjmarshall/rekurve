---
skills: writing-clearly-and-concisely, tdd
---
# Implementation Plan

Produce a complete, actionable plan at `thoughts/plans/YYYY-MM-DD-ENG-XXXX-description.md` before writing code. If invoked without a ticket/task, ask once, then wait.

## Workflow

1. **Explore.** Read the ticket and cited files. For non-trivial scope, launch `Explore` subagents in parallel to find affected files, existing patterns, and test conventions. Capture `file:line` references. Reuse existing helpers before writing new ones.
2. **Align.** Share a 2–4 bullet design sketch and get explicit agreement. Ask only what code cannot answer.
3. **Write.** Save the plan to the path above using the template below and stop. The final plan must have zero open questions — resolve them before writing.

## Template

    # <Feature> Implementation Plan

    ## Context
    Problem, trigger, intended outcome. 2–4 sentences.

    ## Current State
    What exists today; key constraints. Cite `file:line`.

    ## Desired End State
    Verifiable description of the finished system.

    ## Out of Scope
    Explicit non-goals.

    ## Approach
    High-level strategy. 2–5 sentences.

    ## Phase 1: <name>
    ### Changes
    - `path/to/file.ext` — <change>
    - `path/to/file.test.ts` — <test covering this change>

    ### Success
    **Automated**
    - [ ] `make check` passes
    - [ ] `make test` passes

    **Manual**
    - [ ] <observable behaviour>

    ## Phase 2: …

    ## References
    - Ticket: <path/URL>
    - Related: `file:line`, prior plan, research doc

## Rules

- Tests ship in the phase that changes behaviour, not a trailing appendix.
- Automated criteria use `make` targets (`make check`, `make test`, `make build`, `make test_e2e`).
- UI phases add `/design_review` as a manual step.
- Refactors include characterization tests before the behaviour change.
- Every reference to existing code includes `file:line`.
- Non-trivial test work follows the TDD vertical-slice loop — one test → one impl → repeat. See the `tdd` skill.
