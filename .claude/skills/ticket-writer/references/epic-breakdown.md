# Breaking a plan into an epic with child issues

Use this workflow when the user brings a `thoughts/designs/*.md`, a `thoughts/plans/*.md`, a PRD, or an in-chat spec and wants it turned into a parent epic plus independently-grabbable child issues.

The single-ticket workflow in `SKILL.md` covers atomic issues. This sub-skill covers the breakdown.

## Vertical-slice rules

Vertical-slice rules are defined in **`SKILL.md` § Tracer-bullet vertical slices**. Every child issue follows them — refer to that section for the comparison table and the "thin slice through every layer" principle. This file covers the *publishing workflow* once you've sliced.

Per `SKILL.md` § Work-readiness, each slice carries an AFK or HITL — `<reason>` tag. A well-decomposed epic is mostly AFK with a few HITL slices gating the rest (the architectural call, the design review).

## Workflow

### 1. Gather context

- Read the source plan/design/PRD in full.
- If a parent issue already exists (the user passed an issue number/URL), `gh issue view <N>` it including comments.
- Skim the relevant area of the codebase enough to know which domain terms (`CONTEXT.md`) and ADRs (`docs/adr/`) apply. Slice titles must use the project's vocabulary.

### 2. Draft the slice list

Number each proposed slice. For each, show:

- **Title** — short, action-verb opening (`Add`, `Replace`, `Fix`, `Document`, `Lift`).
- **Type** — AFK or HITL — `<reason>`.
- **One-line summary** of the end-to-end behaviour delivered.
- **Blocked by** — which other slices (by number) must complete first. `None — can start immediately` if no blockers.

### 3. Quiz the user before publishing

Present the numbered list and ask **all four** in one round:

- Does the granularity feel right? Too coarse, too fine, mixed?
- Are the dependency relationships correct?
- Should any slices be merged or split?
- Are AFK / HITL marks correct?

Iterate until the user approves. **Do not publish anything before approval** — at this point you have not touched the issue tracker, so changes are free.

### 4. Publish in dependency order

Once the user approves:

1. Draft the **parent epic** body using the epic template in `references/epic-template.md`.
2. Create the parent issue first (`gh issue create --label epic`). Capture its number — call it `P`.
3. Draft all child bodies. The remaining children will be `P+1 … P+k` barring concurrent creates. Bake `Blocked by #N` and `Part of #P` references into the bodies up front.
4. Create the children **sequentially in dependency order** (blockers first), so each body's `#N` references resolve to a real issue. `gh issue create` per child.
5. Wire each child as a sub-issue of the parent (REST API, integer `sub_issue_id`):

   ```bash
   CHILD_ID=$(gh api /repos/OWNER/REPO/issues/<CHILD_NUM> --jq .id)
   gh api -X POST /repos/OWNER/REPO/issues/<PARENT_NUM>/sub_issues \
     -F "sub_issue_id=$CHILD_ID"
   ```

   Gotchas: must be `-F` (integer), not `-f` (string). Use the REST `.id`, not the GraphQL `node_id`.
6. Add each child to the GitHub Project (`gh project item-add`) and set fields (Priority, Estimate, Iteration) per the GitHub Projects table in `SKILL.md`.

Steps 2–6 are **one turn, no mid-flow prompts**. Linking and field assignment are part of "create".

### 5. Confirm and report

After all issues are created, report back:

- Parent epic URL and number.
- Bulleted list of child URLs in dependency order, each marked AFK / HITL.
- Any slice that needs human follow-up before an agent can grab it (HITL with reason).

## Body anatomy of a child slice

Each child must be **AFK-ready** — see `references/agent-brief.md` for the full principles. Required sections:

```markdown
**Work-readiness:** AFK    <!-- or HITL — reason -->

## Purpose
Why this slice exists, in one paragraph. References the parent epic
and the design doc.

## Current / Desired behaviour
What today does vs what this slice delivers. Behavioural — no file
paths in the spec.

## Acceptance criteria
- [ ] Binary, mechanically verifiable.
- [ ] Includes the relevant verification gate (`make check`, `make build`,
      or the spec-specific gate).

## Out of scope
- Adjacent slices in this epic (refer by number).
- Anything the design doc explicitly deferred.

## References
- Parent epic: #<P>
- Design: `thoughts/designs/YYYY-MM-DD-<name>.md`
- Representative file (starting point, may have moved):
  `src/path/to/example.ts`

Blocked by #<N>      <!-- omit if independent -->
Part of #<P>
```

## Anti-patterns to refuse

- **Layer-cake slices** ("schema PR", "API PR", "UI PR"). Reshape into vertical slices before publishing.
- **Hidden HITL** — a slice marked AFK that secretly needs an architectural call. Surface it explicitly.
- **Speculative slices for "future flexibility"**. If the design doc didn't ask for it, don't issue it.
- **One mega-issue with checkboxes for sub-tasks**. That's a planning doc, not an epic. Each checkbox should be a real child issue.
- **Publishing before user approval** of the slice list. The cost of edits before publish is zero; after publish it's a cleanup task.
