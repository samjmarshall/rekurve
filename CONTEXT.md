# Rekurve

Rekurve is an AI sales assistant for QLD new home builders. The pilot user is one Creation Homes sales consultant who captures, qualifies, nurtures, and follows up with prospective buyers. The local Postgres `leads` table is the canonical store for Lead data; HubSpot is downstream, synced post-commit by the `lead-hubspot-sync` outbox worker.

## Language

**Lead**:
A row in the local `leads` table. The canonical record for identity, qualification answers, score, and stage. Carries the link to a HubSpot contact (`hubspot_contact_id`, nullable — null for a brief window after capture while the outbox worker runs) plus app-derived fields the CRM does not own (`scoreMetadata`, `preferredEstates`, `preferredSuburbs`, `referrerName`, `lastContactedAt`, `nextActionAt`).
_Avoid_: "row", "record", "prospect" when the HubSpot side is what you mean.

**Contact**:
A record in HubSpot. A downstream mirror of Lead data — created or updated by the `lead-hubspot-sync` outbox worker after each Lead write. One Contact maps to at most one Lead via `hubspotContactId`. The Contact is not the canonical source; the Lead is.
_Avoid_: "lead in HubSpot", "HubSpot row".

**Consultant**:
The pilot user — a Creation Homes QLD sales consultant. Sole human operator of the app today.
_Avoid_: "agent" (overloaded with the AI agent), "user" (overloaded with `better-auth` user record), "rep".

**Score**:
The 0–100 number `qualifyAndScore()` produces. Lives on the Lead as `leadScore`. The Lead is the canonical source — HubSpot's `lead_score` property is an eventually-consistent mirror written by the outbox worker after each qualifying edit.

**Stage**:
One of `unqualified | nurture | warm | hot`. Derived from the Score, persisted on the Lead as `leadStage`, mirrored to HubSpot's `lead_stage` property by the worker, and recomputed on every qualifying edit.

**Qualifying field**:
A field that, when changed, triggers `qualifyAndScore()` to re-run. Defined as `SCORING_FIELDS` in `src/server/leads/intake.ts`. Out-of-band edits to non-qualifying fields skip re-scoring but still publish a `lead.updated` outbox event so the worker PATCHes HubSpot.

**Follow-up plan**:
A Lead's active autopilot follow-up. Carries the rhythm (3-day for unqualified, 7-day for warm, 14-day for nurture) and the timing of the next outbound message. One Lead has at most one active Follow-up plan at a time. Run state is owned by Inngest (one function instance per active plan); the local DB owns the *outputs* of the plan (drafted Follow-up messages in `message_queue`) but not the plan's control state.
_Avoid_: "sequence" in prose (legacy term, on its way out with the `nurture_sequences` table).

**Follow-up message**:
One drafted outbound message produced by a Follow-up plan when its rhythm fires — written by Claude, dropped into `message_queue` for the Consultant to approve. The unit ADR-009's "one missed touch, never more" bound was framed in.
_Avoid_: "step" (collides with Inngest's `step.run` primitive once the migration lands).

## Relationships

- A **Consultant** captures **Leads** through the app; every Lead eventually has one **Contact** in HubSpot (stamped post-commit by the outbox worker).
- A **Lead** is the canonical record; the **Contact** is a downstream HubSpot mirror. The Lead owns identity, qualification, score, and stage.
- The **Score** and **Stage** are computed synchronously from a Lead's qualifying fields and returned immediately to the Consultant. HubSpot is updated asynchronously via the outbox worker.

## Example dialogue

> **Dev**: "When the Consultant edits a phone number in the app, who writes first?"
> **Domain expert**: "The local DB. The mutation commits the Lead (+ score + outbox row) atomically and returns the scored row immediately. The `lead-hubspot-sync` outbox worker PATCHes the Contact post-commit. If HubSpot is down, the Lead is still updated and the outbox row queues the sync for retry."

> **Dev**: "What if a sales manager edits the Score directly in HubSpot?"
> **Domain expert**: "It survives until the next outbound sync from the app. The next time any Lead field is saved, the worker overwrites HubSpot from the local Lead. Manual HubSpot edits are not a supported feature pre-PMF."

## Flagged ambiguities

- "Lead" was used to mean both the local row and the HubSpot record. Resolved: **Lead** is the local row, **Contact** is the HubSpot record. See [adr013](docs/adr/adr013-local-db-canonical-for-lead-data.md) (supersedes [adr003](docs/adr/adr003-hubspot-source-of-truth-for-contacts.md)).
