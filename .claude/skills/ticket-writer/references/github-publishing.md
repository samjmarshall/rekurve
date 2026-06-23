# Publishing tickets to GitHub Issues

System-specific guidance for the GitHub Issues + GitHub Projects backend.

## Linking and field assignment are part of "create"

After plan approval, create tickets, wire sub-issue relationships, add to the project, and set fields in one turn. Don't pause mid-flow to ask about linking. Set labels/assignees/milestone via `gh issue create` flags (`--label`, `--assignee`, `--milestone`); set project fields via `gh project item-add` plus a GraphQL mutation per item. Sub-issue wiring is only relevant during epic publishing — see **[epic-breakdown.md](epic-breakdown.md)**.

## GitHub Projects integration

When an issue is added to the project, set these fields. There is **no Priority field and no Estimate field** on this board — do not try to set them.

| Field | Required? | Values |
|-------|-----------|--------|
| **Status** | yes | Todo \| In progress \| Done (single-select) |
| **Start date** | **required** | YYYY-MM-DD |
| **Target date** | **required** | YYYY-MM-DD — this is the field name, **not** "End date" |
| **Milestone** | when one applies | e.g. "M1.5 — Production assessor build" |
| **Team** | optional | Squad 1 \| Squad 2 \| Squad 3 (single-select) |
| **Iteration** / **Quarter** | n/a | fields exist but no iterations are configured — leave unset |

**Start date and Target date are mandatory and drive the date-driven roadmap** — an item missing either does not render on the timeline. Derive them from the dependency graph and the milestone due date, in working days:

- Order each issue after its `Blocked by` predecessors (topological order).
- Walk forward from the earliest start, allotting each issue its estimated working days (skip weekends).
- The last issue's Target date must land on or before the milestone's due date. If it can't, the slice plan is too big for the milestone — re-scope; don't fudge the dates.

**Setting fields via CLI:** `gh project item-add` to attach the issue, then `gh project item-list 4 --owner <OWNER> --format json` to capture the item id, then one `gh api graphql updateProjectV2ItemFieldValue` mutation per field. Run `gh project field-list 4 --owner <OWNER>` first to get field ids. Date fields take a `date` value; single-selects (Status, Team) take a `singleSelectOptionId`:

```bash
# date field (Start date / Target date)
gh api graphql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$d:Date!){
  updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{date:$d}}){projectV2Item{id}}}' \
  -f p=<PROJECT_ID> -f i=<ITEM_ID> -f f=<DATE_FIELD_ID> -f d=2026-06-30

# single-select field (Status / Team)
# … value:{ singleSelectOptionId:"<OPTION_ID>" } instead of value:{ date:… }
```

Set Status, Start date, Target date, and Milestone (when one applies) at creation. Start date and Target date are required.

After publishing, run the **post-publish validation gate** (see `SKILL.md`) — `yarn tsx .claude/skills/ticket-writer/scripts/validate-ticket.ts --epic <P>` (or `<issue>` for a single ticket) — and gate on exit 0.

## Related tickets

At the bottom of the issue body, link related tickets:
- **For all tickets:** Link the parent ticket if one exists (`Part of #N`).
- **For epics:** Link all child tickets (the sub-issue API does most of this automatically — see `epic-breakdown.md`).
