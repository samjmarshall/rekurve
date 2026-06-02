---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-06-02'
# prettier-ignore
---

# Inngest is the source of truth for Follow-up plan run state

## Context and Problem Statement

A Lead's active Follow-up plan — the rhythm (3-day discovery / 7-day warm / 14-day nurture) and the timing of the next outbound message — is live workflow state. It can live in the local Postgres `nurture_sequences` table, in Inngest as one function instance per active Lead, or in both with a sync contract. Inputs to the runner (a Lead's stage) flow from `lead.captured` and `lead.stage-changed` events; outputs (`message_queue` rows the consultant approves, `conversations` rows that record sent messages) are queried from the consultant dashboard.

Where does the live Follow-up-plan run state live: local DB, Inngest, or both?

## Decision Drivers

- **Single canonical store.** Two stores require a sync contract for every state transition and a recovery contract for every drift. The dual-source-of-truth bug pattern is the same one [adr003](adr003-hubspot-source-of-truth-for-contacts.md) was written to avoid on the Contact surface.
- **Operator visibility without new tooling.** "How many Leads are in the warm rhythm right now?" must be answerable today, not after building an admin UI.
- **Constraint enforcement layer.** "One active plan per Lead" is a workflow-execution constraint, not a row-uniqueness constraint. It belongs at whichever layer most naturally enforces it.
- **What Inngest is for.** Inngest's value is the durable state machine; using it merely as a dispatcher leaves the durability investment on the table.
- **Pilot scale and recovery cost.** ~20–50 active Leads. A Lead's correct rhythm is fully derivable from its current `leadStage`, so cutover and recovery costs are bounded.
- **Output-state locality.** `message_queue` and `conversations` are queried by the consultant dashboard joined to `leads` — they must stay local regardless of where control state lives.

## Considered Options

1. Inngest owns control state, local DB owns output state (`message_queue`, `conversations`)
2. Local DB holds run state, Inngest is just a worker
3. Hybrid: thin local row keyed by Inngest run ID for analytics
4. Keep `nurture_sequences` as a write-only audit log

## Decision Outcome

Chosen option: "1. Inngest owns control state, local DB owns output state", because it is the only option with a single canonical store for the live workflow state, places the "one active plan per Lead" constraint at the workflow layer where it belongs, and uses Inngest's durable state machine for the durability it was selected to provide.

### Positive Consequences

- **The `nurture_sequences` table and `nurture_active_one_per_lead_uidx` index are dropped in the migration.** No data migration is required: pilot scale is ~20–50 active Leads, and a Lead's correct rhythm is fully derivable from its current `leadStage`. The cutover sends one `lead.stage-changed` event per active Lead and Inngest spins up the right runner.
- **"One active plan per Lead" is enforced at the workflow layer, not the data layer.** Inngest's `concurrency: { key: leadId, limit: 1 }` queues a second `lead.stage-changed` event for the same Lead behind the first runner. When the first exits via the cancellation branch, the second starts. This is the correct layer for the constraint — the constraint is about workflow execution, not row uniqueness, and trying to enforce it twice is what creates dual-source-of-truth bugs in the first place.
- **Operator-facing "show me current Follow-up plans" is answered by Inngest's dashboard.** No Rekurve-built admin UI for this surface. If a future consultant-facing surface ever needs the answer in-app (e.g. "next follow-up in 4 days" on the lead profile), it makes a single Inngest API call from the loader — no local cache, no sync.
- **Supersedes [adr008](adr008-nurture-auto-start-is-best-effort.md) with an at-least-once contract.** Auto-start of a Follow-up plan after `leads.create` is no longer a best-effort `console.error` swallow — it is published as a `lead.captured` event through the [outbox](adr014-outbox-pattern-for-inngest-delivery.md), atomic with the local DB write per [adr013](adr013-local-db-canonical-for-lead-data.md). The new contract is "the outbox row exists; the cron sweep guarantees Inngest sees it." A post-commit `inngest.send` failure is allowed to fail silently (logged to BetterStack) because the sweep covers it. The adr008 site-scoped swallow rule no longer has a referent on this surface; the new equivalent is the explicit "fail silently after commit" rule of adr014, applied uniformly across every outbox publisher rather than carved out per call site.

### Negative Consequences

- **Lock-in to Inngest is real and accepted.** Switching to a different scheduler later means rebuilding the function-instance state from scratch. Mitigation: every state transition emits a domain event (`lead.captured`, `lead.stage-changed`, `nurture.followup-message-drafted`, `nurture.plan-paused`); these events are observable in Vercel logs and could in principle be replayed into a successor system. The lock-in is the price of having one canonical store; the alternative price is permanent dual-source-of-truth maintenance. Consistent with adr003's posture on HubSpot.
- **The output-state line is load-bearing.** `message_queue` and `conversations` stay local because the consultant interacts with them directly through the dashboard — they need to be queryable in the same transaction the dashboard read paths already use, joined to `leads`, and indexed for the approval queue. Pulling either of those into Inngest would be a much larger architectural shift than this ADR. Future ADRs that propose moving them have to argue against this carve-out explicitly.

## Pros and Cons of the Options

### 1. Inngest owns control state, local DB owns output state

One Inngest function instance per active Lead represents the active Follow-up plan. The function consumes `lead.captured` / `lead.stage-changed` events, sleeps to the next cadence boundary, and emits `nurture.followup-message-drafted` when it inserts into `message_queue`. The local DB holds the *outputs* of the plan (`message_queue`, `conversations`) and the canonical Lead row, but no row mirrors the live function-instance state.

| Pros                                                                                                                                                            | Cons                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Single canonical store for control state — no dual-source-of-truth drift                                                                                        | Lock-in to Inngest — switching schedulers means rebuilding function-instance state from scratch            |
| `concurrency: { key: leadId, limit: 1 }` enforces "one active plan per Lead" at the natural workflow layer                                                      | Output-state carve-out (`message_queue`, `conversations` stay local) is a contract future ADRs must honour |
| Inngest dashboard answers operator questions — no Rekurve-built admin UI                                                                                        |                                                                                                            |
| Output state stays local and joinable with `leads` for dashboard reads                                                                                          |                                                                                                            |
| Atomic with local DB writes via the outbox ([adr013](adr013-local-db-canonical-for-lead-data.md), [adr014](adr014-outbox-pattern-for-inngest-delivery.md))      |                                                                                                            |

### 2. Local DB holds run state, Inngest is just a worker

Keep `nurture_sequences`, keep the partial unique index, send Inngest events that read and update the row.

- Bad, because it deliberately recreates the dual-source-of-truth bug pattern [adr003](adr003-hubspot-source-of-truth-for-contacts.md) was written to avoid — every drift between the table and Inngest's function-instance state is a bug.
- Bad, because the "one active plan per Lead" constraint gets enforced twice (DB partial index + workflow-layer concurrency) with no contract for how to recover when they disagree.
- Bad, because the "Inngest is just a worker" framing misses what Inngest is for — its value is the durable state machine, not the dispatch.

### 3. Hybrid: thin local row keyed by Inngest run ID for analytics queries

A small mirror table for analytics queries while Inngest remains canonical for state.

- Bad, because Inngest's dashboard already answers the operator-facing questions ("how many Leads are in the warm rhythm right now?") pre-PMF — building a local mirror for one consultant's analytics curiosity buys nothing the dashboard doesn't already give.
- Bad, because the right time to revisit is when a *consultant-facing* view ever needs the answer in-app — at which point one Inngest API call from the lead-profile loader is cheaper than maintaining a mirror.
- Bad, because any mirror table carries an ongoing sync contract for every state transition — exactly the cost the chosen option is designed to avoid.

### 4. Keep `nurture_sequences` as a write-only audit log

Inngest holds the live truth, but every state transition appends a row for replay/recovery in case Inngest is later switched off.

- Bad, because it is speculative tooling for a switch-off we have no plan to perform.
- Bad, because the real recovery path — if the migration ever needs to be reversed — is to replay `lead.stage-changed` events from observability logs into a successor scheduler, not to maintain a parallel store on the off-chance.
- Bad, because an append-only table still carries migration, retention, and index-maintenance burden for a contingency that may never materialise.

## Links

- Parallel reasoning: [adr003](adr003-hubspot-source-of-truth-for-contacts.md) — one canonical store, no mirror, no sync (applied to HubSpot Contacts)
- Superseded by this ADR: [adr008](adr008-nurture-auto-start-is-best-effort.md) — auto-start best-effort swallow replaced by the outbox contract below
- Refined by [adr011](adr011-followup-drafts-retry-then-pause.md) — failure-handling rule that lives on top of this ADR
- Enabled by [adr014](adr014-outbox-pattern-for-inngest-delivery.md) — outbox pattern for at-least-once Inngest delivery, atomic with the canonical-store write per [adr013](adr013-local-db-canonical-for-lead-data.md)
