---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-05-31'
# prettier-ignore
---

# Local DB is the canonical store for Lead data; HubSpot is downstream via outbox

## Context and Problem Statement

[adr003](adr003-hubspot-source-of-truth-for-contacts.md) placed the canonical record for Lead identity, qualification answers, score, and stage in HubSpot, with the local `leads` table as a mirror carrying app-derived fields. That posture was chosen because no durable retry surface existed: a DB-first path with synchronous fan-out would silently produce orphan local rows on a HubSpot outage, and there was nowhere to durably queue the deferred HubSpot push.

[adr010](adr010-inngest-source-of-truth-for-followup-plan.md) introduced Inngest as the durable workflow layer for Follow-up plans, and [adr014](adr014-outbox-pattern-for-inngest-delivery.md) defines the outbox contract that makes "publish to Inngest atomically with the canonical DB write" actually safe. The retry surface adr003 was missing now exists. The constraint that justified HubSpot-first writes is gone.

Which store is canonical for Lead identity, qualification, score, and stage — HubSpot Contacts, or the local Postgres `leads` table?

## Decision Drivers

- **A durable retry surface now exists.** Inngest plus the outbox closes the orphan-on-local-fail gap that was adr003's only remaining justification. The architectural premise of adr003 no longer holds.
- **Mutation latency on the consultant capture path.** Every `leads.create` / `leads.update` runs on the consultant's request path. A 200–500 ms HubSpot round-trip per save is the dominant latency component today; sub-100 ms is achievable only if HubSpot moves off the hot path.
- **Orphan failure mode direction.** Either direction produces orphans, but they are not symmetric. "Lead in local DB, HubSpot push pending" is recoverable by a worker against a row visible in the dashboard; "Contact in HubSpot, no local row" requires the operator to re-run the lead form to heal.
- **Composition with adr006, adr007, adr010.** Scoring stays synchronous (adr006), Outlook send keeps its identity/BCC choice (adr007), Follow-up plan start is the canonical at-least-once consumer (adr010). The chosen option has to preserve those decisions, not silently break them.
- **Pilot-scale operational simplicity.** One consultant, ~20–50 active Leads. Inbound HubSpot direct edits are not part of the pre-PMF workflow; bidirectional sync is not justified before observing the need.

## Considered Options

1. Local Postgres `leads` table is canonical; HubSpot Contacts are downstream via the outbox
2. Keep adr003 as-is — HubSpot-first synchronous write with local mirror
3. DB-first with synchronous HubSpot fan-out (no outbox)
4. Bidirectional sync with origin-tagged loop guard
5. Split canonical store — local DB canonical for app-derived fields, HubSpot canonical for identity

## Decision Outcome

Chosen option: "1. Local Postgres `leads` table is canonical; HubSpot Contacts are downstream via the outbox", because it is the only option that removes HubSpot from the consultant's hot write path while preserving idempotency and bounded orphan-recovery — and the architectural prerequisite (durable retry via Inngest + outbox) that justified adr003's opposite posture no longer holds.

Lead writes commit to the local DB synchronously inside the tRPC mutation alongside `qualifyAndScore()` and the outbox insert, all in one Postgres transaction. The mutation returns the scored row to the consultant before any external system is touched. Post-commit fan-out (HubSpot push, Follow-up plan start, MS Graph drafts, Twilio sends, analytics) is delivered through outbox rows and Inngest functions.

### Positive Consequences

- **The mutation is no longer HubSpot-blocking.** `leads.create` and `leads.update` complete on the local DB plus `qualifyAndScore()` plus outbox insert — all inside one Postgres transaction. Typical mutation latency drops from ~300–600 ms to ~30–80 ms. The consultant's capture flow is faster and immune to HubSpot outages on the request path.
- **The orphan failure mode flips direction and shrinks.** Today's orphan ("contact in HubSpot, no local row") is replaced by "Lead in local DB, HubSpot push pending." The new orphan is bounded — the outbox + cron sweep deliver to Inngest within ~30 s typical, and Inngest's retries cover Anthropic-shaped or HubSpot-shaped outages on the worker side. A persistent failure surfaces as a stuck outbox row visible in the operator dashboard, not as a "you saved to HubSpot but not locally" error toast for the consultant.
- **`contact.creation` from HubSpot is still honoured as an ingest path.** A Lead originating in HubSpot (marketing form fill, manual creation by another user) still creates a local row, gets scored, and gets a Follow-up plan. This is one-way ingest, not bidirectional sync; no loop guard is needed because the local row's creation does not insert an outbox row for HubSpot push (the contact already exists in HubSpot — the worker just finds it).
- **adr006 survives untouched.** Scoring is still synchronous. The mutation still returns the scored row. The dashboard's `invalidate → refetch` pattern is unchanged. The only thing that became async is the side-effect fan-out (HubSpot push, Follow-up plan start, future MS Graph / Twilio sends).
- **The webhook handler shrinks.** Per adr004, signature/timestamp validation stays, the always-200 rule stays, but the `contact.propertyChange` and `contact.deletion` arms become log-and-drop. adr004 gets a consequence-update note; the rule itself does not change.
- **adr008's swallow rule no longer has a referent on the Follow-up surface.** Under adr010, auto-start is published as a `lead.captured` event; under this ADR, that send goes through the outbox first. The end-to-end at-least-once contract is the same; the path is more durable.

### Negative Consequences

- **`hubspotContactId` is nullable for a brief window after Lead capture.** A new Lead lives in the local DB before its corresponding HubSpot contact exists. An Inngest worker runs dedup-or-create against HubSpot post-commit and stamps `hubspotContactId` when it finishes. The dashboard subscribes via Inngest Connect to a `lead.updated` event and refetches when the link lands. Consumers must tolerate `hubspotContactId === null` on a freshly-captured Lead. adr007's `conversations.hubspotActivityId` already follows the same nullable-then-stamped pattern; this generalises it to the contact link itself.
- **HubSpot direct edits to existing contacts are not honoured pre-PMF.** `contact.propertyChange` and `contact.deletion` webhooks are logged and dropped. The next outbound sync overwrites HubSpot from the local DB. The "edit-in-HubSpot survives until the next qualifying edit" behaviour described in adr003's example dialogue is gone — by design. The consultant does not edit in HubSpot; the full bidirectional path is reserved for post-PMF.
- **adr007 (Outlook send + BCC reconciliation) keeps its core decision but the mechanism becomes async.** The choice of Outlook + BCC over Resend / Single-Send / Engagements-direct-POST stands. The synchronous Graph call from the approve mutation moves into an outbox-driven Inngest worker; the BCC reconciliation flow becomes a `step.waitForEvent` correlation keyed by a generated correlation ID. adr007 gets a consequence-update note; the core decision is not superseded.
- **Lock-in to the outbox pattern is real and accepted.** Every write site that needs a downstream side effect must remember to insert outbox rows in the same transaction. A future write that calls `inngest.send` directly outside a transaction breaks the at-least-once contract this ADR depends on. adr014 is the rule; code review is the enforcement mechanism.
- **Bidirectional sync is deferred to post-PMF.** When an enterprise tier needs HubSpot-direct-edit support, the loop-guard work adr003 rejected becomes worth paying for. Pre-PMF that cost is not justified.

## Pros and Cons of the Options

### 1. Local Postgres `leads` table is canonical; HubSpot Contacts are downstream via the outbox

Lead writes commit to the local DB synchronously inside the tRPC mutation, alongside `qualifyAndScore()` and an outbox row insert — all in one Postgres transaction. The mutation returns the scored row to the consultant before any external system is touched. Inngest workers consume the outbox row and push to HubSpot, start the Follow-up plan, and run any other side-effect-shaped fan-out.

| Pros                                                                                                                                                | Cons                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation latency drops from ~300–600 ms to ~30–80 ms — the consultant's capture flow is no longer HubSpot-bound                                     | `hubspotContactId` is nullable for a brief post-capture window; consumers must tolerate the gap                                       |
| HubSpot outage no longer fails the request — orphan failure mode becomes "stuck outbox row" with operator-visible recovery                          | HubSpot direct edits to existing contacts are dropped pre-PMF; bidirectional sync is deferred                                         |
| adr006 (scoring is synchronous, mutation returns the scored row) survives untouched                                                                 | Every new write site that needs side effects must remember to insert outbox rows — no compile-time enforcement                        |
| Composes with adr010 (Follow-up plan auto-start becomes durable) and adr014 (single outbox contract for all post-commit fan-out)                    | Lock-in to the outbox pattern is real and accepted as the price of at-least-once delivery                                             |
| Idempotent — the outbox row id is the natural idempotency key for downstream Inngest workers                                                        |                                                                                                                                       |

### 2. Keep adr003 as-is — HubSpot-first synchronous write with local mirror

Status quo: the tRPC mutation writes to HubSpot first, then mirrors the result to the local `leads` table. HubSpot pushes inbound changes through a webhook that upserts the same table.

- Bad, because the synchronous HubSpot-first write blocks the consultant's request path on a 200–500 ms third-party round-trip on every save, and there is no longer an architectural reason to accept that latency floor.
- Bad, because the "HubSpot success → DB fail" orphan ("you saved a contact in HubSpot but not locally; here's the ID, retry") was accepted only because no durable retry surface existed. Inngest plus the outbox closes that gap and removes the only justification.
- Bad, because every consequence-update relationship on adr004 / adr007 / adr008 / adr010 already assumes this ADR is in place — the consequence-note network is pulling in this direction, not toward keeping adr003.
- Good, because adr003 is in production today and works for one consultant. Inaction is cheap until volume or latency budgets demand otherwise; the option is recorded so a future reader can see why we did not simply do nothing.

### 3. DB-first with synchronous HubSpot fan-out (no outbox)

Write the local row inside the tRPC mutation, then synchronously POST to HubSpot in the same handler. No outbox row, no Inngest worker — just a sequential write.

| Pros                                                                                                                | Cons                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simpler than the outbox path — no new table, no cron sweep                                                          | Same orphan failure mode as adr003 in the opposite direction: DB success → HubSpot send fail → silent divergence with no record that the send was supposed to fire                    |
| No new lock-in beyond the existing HubSpot dependency                                                               | The only mitigation for "HubSpot fan-out failed" is to fail the request — which puts the consultant back on the HubSpot-blocking latency floor adr003 already accepted                |
|                                                                                                                     | Removes the single routing seam through Inngest that adr010 and adr014 depend on — additional subscribers (MS Graph drafts, Twilio sends, analytics) would each need their own retry  |

### 4. Bidirectional sync with origin-tagged loop guard

Tag every write with origin metadata so the system can suppress its own echoes. Honour HubSpot direct edits inbound; honour app edits outbound. Same loop-guard pattern adr003 rejected, reconsidered now that the outbox provides a durable channel.

- Bad, because pre-PMF the consultant does not edit Leads directly in HubSpot — there is no observed inbound-edit traffic to justify the loop guard's permanent cost.
- Bad, because origin tagging adds complexity to every write site (set the tag, read the tag, decide whether to re-emit). The outbox contract becomes harder to reason about, not easier.
- Bad, because chained edits make the origin metadata fragile in ways that aren't obvious until production; this was the original adr003 rejection reasoning and it still applies.
- Good, because if an enterprise tier ever needs HubSpot-direct-edit support, this is the path to revisit. Deferred to post-PMF rather than rejected outright.

### 5. Split canonical store — local DB canonical for app-derived fields, HubSpot canonical for identity

Each field gets a canonical home: identity fields (name, email, phone, address) in HubSpot; app-derived fields (score, qualification answers, stage, preferences) in the local DB. Reads merge across stores.

- Bad, because the qualifying-field set crosses the split — `budget` is identity-shaped but the score depends on it. Every read site has to know which fields come from which store, and the mapping drifts as fields evolve.
- Bad, because a split canonical store is harder to reason about than either pure option; the dual-source-of-truth bug pattern adr003 was written to avoid simply gets moved to the field-mapping layer.
- Bad, because the mutation has to write to both stores in some order to keep a coherent Lead view — putting the latency floor back on the consultant's request path for the identity fields, exactly what option 1 is designed to avoid.

## Links

- Superseded by this ADR: [adr003](adr003-hubspot-source-of-truth-for-contacts.md) — the original HubSpot-canonical posture this ADR flips
- Refined by this ADR: [adr004](adr004-webhook-swallow-and-always-200.md) — `contact.propertyChange` / `contact.deletion` arms become log-and-drop (consequence note in adr004)
- Preserved: [adr006](adr006-lead-mutations-return-post-scoring-row.md) — scoring stays synchronous, mutation still returns the scored row
- Refined by this ADR: [adr007](adr007-outlook-send-with-hubspot-bcc-reconciliation.md) — mechanism update; core Outlook + BCC decision preserved (consequence note in adr007)
- Refined by this ADR: [adr008](adr008-nurture-auto-start-is-best-effort.md) — already superseded by [adr010](adr010-inngest-source-of-truth-for-followup-plan.md); the swallow rule no longer has a referent on this surface
- Parallel decision: [adr010](adr010-inngest-source-of-truth-for-followup-plan.md) — Inngest is canonical for Follow-up plan run state, different domain, same posture
- Enabled by [adr014](adr014-outbox-pattern-for-inngest-delivery.md) — outbox pattern for at-least-once delivery to Inngest, the reliability layer this ADR sits on
