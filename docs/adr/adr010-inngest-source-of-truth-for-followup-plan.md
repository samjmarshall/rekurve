# Inngest is the source of truth for Follow-up plan run state

**Status:** proposed (2026-05-04)

A Lead's active Follow-up plan — the rhythm (3-day discovery / 7-day warm / 14-day nurture) and the timing of the next outbound message — lives as one Inngest function instance per active Lead. The local DB does not mirror this state. The `nurture_sequences` table and its `nurture_active_one_per_lead_uidx` partial unique index are dropped as part of the migration; the "one active plan per Lead" constraint moves to Inngest's `concurrency: { key: leadId, limit: 1 }`. Inputs to the runner (a Lead's stage) are events Inngest consumes (`lead.captured`, `lead.stage-changed`); outputs of the runner — `message_queue` rows the consultant approves and `conversations` rows that record sent messages — stay in the local DB exactly as today. The line is: Inngest owns *control* state (what plan, when next, alive vs cancelled); the local DB owns *output* state (what has been drafted, what has been sent).

## Considered options

- **Local DB holds run state, Inngest is just a worker.** Keep `nurture_sequences`, keep the partial unique index, send Inngest events that read and update the row. Rejected because it deliberately recreates the dual-source-of-truth bug pattern ADR-003 was written to avoid: every drift between the table and Inngest's function-instance state is a bug, and the "one active plan per Lead" constraint gets enforced twice with no contract for how to recover when they disagree. The "Inngest is just a worker" framing also misses what Inngest is for — Inngest's value is the durable state machine, not the dispatch.

- **Hybrid: a thin local row keyed by Inngest run ID for analytics queries.** Rejected pre-PMF. Inngest's dashboard already answers the operator-facing questions ("how many Leads are in the warm rhythm right now?"); building a local mirror for one consultant's analytics curiosity buys nothing the dashboard doesn't already give. Revisit only if a *consultant-facing* view ever needs the answer in-app — at which point one Inngest API call from the lead-profile loader is cheaper than maintaining a mirror.

- **Keep `nurture_sequences` as a write-only audit log.** Inngest holds the live truth, but every state transition appends a row for replay/recovery in case Inngest is later switched off. Rejected: speculative tooling for a switch-off we have no plan to perform. If the migration ever needs to be reversed, the recovery is to replay `lead.stage-changed` events from observability logs into a successor scheduler — not to maintain a parallel store on the off-chance.

## Consequences

- **The `nurture_sequences` table and `nurture_active_one_per_lead_uidx` index are dropped in the migration.** No data migration is required: pilot scale is ~20–50 active Leads, and a Lead's correct rhythm is fully derivable from its current `leadStage`. The cutover sends one `lead.stage-changed` event per active Lead and Inngest spins up the right runner.

- **Lock-in to Inngest is real and accepted.** Switching to a different scheduler later means rebuilding the function-instance state from scratch. Mitigation: every state transition emits a domain event (`lead.captured`, `lead.stage-changed`, `nurture.followup-message-drafted`, `nurture.plan-paused`); these events are observable in Vercel logs and could in principle be replayed into a successor system. The lock-in is the price of having one canonical store; the alternative price is permanent dual-source-of-truth maintenance. Consistent with ADR-003's posture on HubSpot.

- **"One active plan per Lead" is enforced at the workflow layer, not the data layer.** Inngest's `concurrency: { key: leadId, limit: 1 }` queues a second `lead.stage-changed` event for the same Lead behind the first runner. When the first exits via the cancellation branch, the second starts. This is the correct layer for the constraint — the constraint is about workflow execution, not row uniqueness, and trying to enforce it twice is what creates dual-source-of-truth bugs in the first place.

- **Operator-facing "show me current Follow-up plans" is answered by Inngest's dashboard.** No Rekurve-built admin UI for this surface. If a future consultant-facing surface ever needs the answer in-app (e.g. "next follow-up in 4 days" on the lead profile), it makes a single Inngest API call from the loader — no local cache, no sync.

- **The output-state line is load-bearing.** `message_queue` and `conversations` stay local because the consultant interacts with them directly through the dashboard — they need to be queryable in the same transaction the dashboard read paths already use, joined to `leads`, and indexed for the approval queue. Pulling either of those into Inngest would be a much larger architectural shift than this ADR. Future ADRs that propose moving them have to argue against this carve-out explicitly.

- **Supersedes ADR-008.** Auto-start of a Follow-up plan after `leads.create` is no longer a best-effort `console.error` swallow — it is published as a `lead.captured` event through the [outbox](adr014-outbox-pattern-for-inngest-delivery.md), atomic with the local DB write per [ADR-013](adr013-local-db-canonical-for-lead-data.md). The new at-least-once contract is "the outbox row exists; the cron sweep guarantees Inngest sees it." A post-commit `inngest.send` failure is allowed to fail silently (logged to BetterStack) because the sweep covers it. The ADR-008 site-scoped swallow rule no longer has a referent on this surface; the new equivalent is the explicit "fail silently after commit" rule of ADR-014, applied uniformly across every outbox publisher rather than carved out per call site.

## Links

- ADR-003 — parallel reasoning: one canonical store, no mirror, no sync
- ADR-008 — superseded by this ADR
- ADR-011 — the failure-handling rule that lives on top of this ADR
