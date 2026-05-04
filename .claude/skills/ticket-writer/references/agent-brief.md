---
name: agent-brief
description: How to write the body of a ticket so an AFK coding agent can pick it up days or weeks later and still produce the right work.
---

# Writing tickets for AFK coding agents

The ticket body **is the contract** the agent will work from. The original chat that produced the ticket, the design doc that backed it, and the implementer's mental model all evaporate. What stays is the body and its acceptance criteria.

## Principles

### Durability over precision

The ticket may sit in the backlog for days or weeks. The codebase will change in the meantime. Write the body so it stays useful even as files are renamed, moved, or refactored.

- **Do** describe interfaces, types, and behavioural contracts.
- **Do** name specific types, function signatures, or config shapes the agent should look for.
- **Don't** reference file paths — they go stale.
- **Don't** reference line numbers.
- **Don't** assume the current implementation structure will remain the same.

A `References` section at the bottom can name a representative file as a *starting point for exploration*, but the body must not depend on that path being correct.

### Behavioural, not procedural

Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.

- ✅ "The `SkillConfig` type should accept an optional `schedule` field of type `CronExpression`."
- ❌ "Open `src/types/skill.ts` and add a schedule field on line 42."
- ✅ "When a user runs `/triage` with no arguments, they should see a summary of issues needing attention."
- ❌ "Add a switch statement in the main handler function."

### Complete, testable acceptance criteria

The agent needs to know when it is done. Every criterion is independently verifiable — binary pass/fail. If a criterion includes a measurement, the measurement must be runnable from the criterion text alone (`make check passes`, `gh issue list --label X returns ≥1 result`, `the new ADR file exists at the conventional path`).

### Explicit scope boundaries

State what is **out of scope**. Without it, the agent gold-plates: refactors adjacent code, "improves" related modules, generalises a one-off into a framework. The Out-of-Scope list is a defensive contract, not optional polish.

## Body template (AFK-ready)

```markdown
**Work-readiness:** AFK    <!-- or HITL — <one-line reason> -->

## Purpose
One paragraph. Why this work matters. Connects to a user pain, a perf
target, an ADR, or a design doc.

## Current behaviour
What the system does today. For bugs, the broken behaviour. For
enhancements, the status quo the work builds on.

## Desired behaviour
What the system should do after this work merges. Specific about edge
cases and error conditions.

## Key interfaces
- `TypeName` — what changes and why
- `functionName()` — current return shape vs desired return shape
- Config shape — any new options

## Acceptance criteria
- [ ] Specific, binary pass/fail criterion 1
- [ ] Specific, binary pass/fail criterion 2
- [ ] `make check` passes / `make build` passes / relevant gate

## Out of scope
- Adjacent thing that should NOT be changed
- Related feature that might seem in-scope but is separate

## References
- Design: `thoughts/designs/YYYY-MM-DD-<name>.md`
- Domain glossary entry: `CONTEXT.md` § <Term>
- ADR: `docs/adr/adrNNN-<slug>.md`
- Representative file (starting point only — may have moved):
  `src/path/to/example.ts`

Part of #<parent-issue>     <!-- if a child of an epic -->
```

## What "good" looks like (real example)

```markdown
**Work-readiness:** AFK

## Purpose
`useSmsShare` holds four independent `useState` values that are always set
together in `openDrawer`. When `openDrawer` is called from a `.then()`
callback (outside React's automatic batching), each `setState` triggers a
separate render — up to four renders per drawer open.

## Current behaviour
Four `useState` calls, each holding one piece of drawer state, all updated
in the same `openDrawer` call.

## Desired behaviour
Single `useState` holding an object with all four fields. `openDrawer`
sets the whole object in one call.

## Acceptance criteria
- [ ] Four `useState` calls collapsed into one object state.
- [ ] Drawer opens, shows the correct message body and lead name.
- [ ] `make check` passes.

## Out of scope
- Refactoring sibling hooks in the same directory.
- Memoising the returned action functions.

## References
- `src/app/(application)/dashboard/_components/use-sms-share.ts` (starting point)

Part of #228
```

This works because: behaviour described not files patched, four AC are mechanically verifiable, scope boundary stops the agent refactoring nearby hooks, the file path is explicitly a "starting point" so a rename doesn't invalidate the ticket.

## Anti-patterns to refuse

- **"Fix the X bug"** with no current/desired behaviour split. The agent has to guess what "fixed" means.
- **"Edit `path/to/file.ts` line 42"**. Goes stale. Describe the change in terms of the type or function instead.
- **"Refactor X, improve Y, also clean up Z"**. Three jobs in one ticket — break it up.
- **No Out-of-Scope section on a ticket near other recent work**. The agent will sweep adjacent code unless explicitly told not to.
- **Acceptance criteria like "tests pass"** without naming what the test asserts. The agent will write a tautological test.
