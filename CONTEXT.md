# Rekurve

Rekurve is an AI sales assistant for QLD new home builders. The pilot user is one Creation Homes sales consultant who captures, qualifies, nurtures, and follows up with prospective buyers. HubSpot is the source of truth for contact data; the Rekurve app extends it with AI scoring, a draft-review queue, and outreach automation.

## Language

**Lead**:
A row in the local `leads` table. Carries the link to a HubSpot contact (`hubspot_contact_id`) plus app-derived fields the CRM does not own (`scoreMetadata`, `preferredEstates`, `preferredSuburbs`, `referrerName`, `lastContactedAt`, `nextActionAt`).
_Avoid_: "row", "record", "prospect" when the HubSpot side is what you mean.

**Contact**:
A record in HubSpot. The canonical store for identity, address, qualification answers, and the round-tripped `lead_score` / `lead_stage` values. One Contact maps to at most one Lead via `hubspotContactId`.
_Avoid_: "lead in HubSpot", "HubSpot row".

**Consultant**:
The pilot user — a Creation Homes QLD sales consultant. Sole human operator of the app today.
_Avoid_: "agent" (overloaded with the AI agent), "user" (overloaded with `better-auth` user record), "rep".

**Score**:
The 0–100 number `qualifyAndScore()` produces. Lives on the Lead as `leadScore` and round-trips to HubSpot's `lead_score` property; HubSpot is *not* the canonical source — `scoreLead()` overwrites HubSpot on every qualifying edit.

**Stage**:
One of `unqualified | nurture | warm | hot`. Derived from the Score, persisted on the Lead as `leadStage`, mirrored to HubSpot's `lead_stage` property, and recomputed on every qualifying edit.

**Qualifying field**:
A field that, when changed, triggers `scoreLead()` to re-run. Defined as `SCORING_FIELDS` in `src/server/api/routers/leads.ts`. Out-of-band edits to non-qualifying fields skip re-scoring.

## Relationships

- A **Consultant** captures **Leads** through the app; every Lead has exactly one **Contact** in HubSpot.
- A **Lead** is the local extension of a **Contact**; the Contact owns identity, the Lead owns AI-derived state.
- The **Score** and **Stage** are computed from a Lead's qualifying fields and round-trip to the Contact, but the Lead is the canonical source for both at any moment of read.

## Example dialogue

> **Dev**: "When the Consultant edits a phone number in the app, who writes first?"
> **Domain expert**: "HubSpot. The mutation PATCHes the Contact, then updates the Lead. If HubSpot is down, the Lead row is not touched — the request fails."

> **Dev**: "What if a sales manager edits the Score directly in HubSpot?"
> **Domain expert**: "It survives until the Consultant next edits a qualifying field on the Lead. Then `scoreLead()` recomputes the Score and overwrites HubSpot. Manual override is not a supported feature."

## Flagged ambiguities

- "Lead" was used to mean both the local row and the HubSpot record. Resolved: **Lead** is the local row, **Contact** is the HubSpot record. See [adr003](docs/adr/adr003-hubspot-source-of-truth-for-contacts.md).
