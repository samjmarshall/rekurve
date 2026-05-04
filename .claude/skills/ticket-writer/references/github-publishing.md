# Publishing tickets to GitHub Issues

System-specific guidance for the GitHub Issues + GitHub Projects backend.

## Linking and field assignment are part of "create"

After plan approval, create tickets, wire sub-issue relationships, add to the project, and set fields in one turn. Don't pause mid-flow to ask about linking. Set labels/assignees/milestone via `gh issue create` flags (`--label`, `--assignee`, `--milestone`); set project fields via `gh project item-add` plus a GraphQL mutation per item. Sub-issue wiring is only relevant during epic publishing — see **[epic-breakdown.md](epic-breakdown.md)**.

## GitHub Projects integration

When issues are added to a GitHub Project, set these fields:

| Field | Description | Values |
|-------|-------------|--------|
| **Priority** | Urgency/importance | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) |
| **Estimate** | Days of effort | Number (e.g., 0.5, 1, 2) — aim for ≤2 |
| **Iteration** | Sprint/cycle | Current iteration name or "Backlog" |
| **Start date** | When work begins | YYYY-MM-DD format |
| **End date** | Target completion | YYYY-MM-DD format |

**Setting fields via CLI:** `gh project item-add` to attach the issue, then `gh project item-list --format json` to capture the item ID, then a `gh api graphql` mutation against `updateProjectV2ItemFieldValue` per field. Run `gh project field-list <NUM> --owner <OWNER>` first to get field and option IDs.

Set Priority, Estimate, start/end date, Iteration, Milestone (optional), at creation; Estimate in days.

## Related tickets

At the bottom of the issue body, link related tickets:
- **For all tickets:** Link the parent ticket if one exists (`Part of #N`).
- **For epics:** Link all child tickets (the sub-issue API does most of this automatically — see `epic-breakdown.md`).
