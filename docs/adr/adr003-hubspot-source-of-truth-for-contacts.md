---
Status: 'Superseded by [ADR013](adr013-local-db-canonical-for-lead-data.md)'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# HubSpot is the source of truth for contact data

## Context and Problem Statement

The app captures lead contact data (identity, address, qualification answers) from the consultant's lead form. HubSpot is the existing CRM with built-in workflows, reporting, and the consultant's daily inbox view; the local Postgres `leads` table is needed to attach app-derived fields (score, preferences, contact timestamps) to each contact. Both stores can credibly hold the canonical record.

Which store owns the canonical record for lead contact data — HubSpot or the local DB?

## Decision Drivers

- **Canonical record clarity** — one store must be the source of truth or every read site has to reason about which side is fresher.
- **Idempotency** — repeat writes (replayed webhooks, retried mutations) must converge, not diverge.
- **Pilot-scale operational simplicity** — one consultant, one HubSpot account; building a reconciliation pipeline is not justified before observing actual divergence.
- **Orphan prevention** — the canonical record cannot point at a contact ID that doesn't exist in the source-of-truth store.

## Considered Options

1. HubSpot-first write with local mirror
2. DB-first with async HubSpot fan-out
3. Bidirectional sync with `changeSource` loop guard
4. Scheduled reconciliation cron

## Decision Outcome

Chosen option: "1. HubSpot-first write with local mirror", because it is the only option that keeps a single canonical store while letting the local row attach app-derived fields without contradicting source-of-truth posture. The app writes to HubSpot first on every `leads.create` and `leads.update`, then mirrors the result to the local `leads` table; HubSpot pushes inbound changes through a webhook that upserts the same table.

### Positive Consequences

- **The local row's role is unambiguous.** It exists only to attach app-derived fields (`scoreMetadata`, `preferredEstates`, `preferredSuburbs`, `referrerName`, `lastContactedAt`, `nextActionAt`) to a HubSpot contact ID — never the canonical record for identity, address, or qualification answers.
- **`leadScore` and `leadStage` round-trip cleanly.** They live in HubSpot but `scoreLead()` recomputes them on every qualifying edit, so an out-of-band HubSpot edit to either survives only until the next score run. Intentional: the rubric is app-owned, the store is HubSpot.

### Negative Consequences

- **Every `leads.create` and `leads.update` adds 1–2 HubSpot round-trips on the synchronous request path.** The mutation cannot return until HubSpot has accepted the write. Expect ~200–500ms added per call. If a future feature needs sub-100ms lead writes (e.g. high-volume web-form intake), the contract has to be revisited — not just the implementation.
- **HubSpot outage fails the request by design.** A 5xx from HubSpot on `leads.create` or `leads.update` propagates as a tRPC error and the local row is not written. The alternative — write locally and queue the HubSpot push — would silently produce orphan local rows during outages, which violates the source-of-truth rule. The one exception is `scoreLead()`, which swallows HubSpot errors so a HubSpot outage doesn't fail a scoring re-run; the local score remains correct and the next qualifying edit pushes again.
- **HubSpot-success / DB-fail produces an "orphan in HubSpot."** A contact exists in HubSpot with no local row. The tRPC error message includes the HubSpot contact ID and the `[leads.create] local insert failed for HubSpot contact {id}` log captures it. Recovery is manual — the operator looks up the contact in HubSpot and re-runs the lead form, which the upsert-on-conflict pattern then heals.
- **A HubSpot manual edit to `lead_score` or `lead_stage` survives only until the next qualifying edit.** Intentional but surprising — a sales manager who tweaks the score in HubSpot will see it revert. If "manual override" ever becomes a requirement, the rule (HubSpot owns identity, app owns score) has to flip for those fields specifically.

## Pros and Cons of the Options

### 1. HubSpot-first write with local mirror

Write to HubSpot first on every `leads.create` and `leads.update`, then mirror the result to the local `leads` table. HubSpot pushes inbound changes through a webhook that upserts the same table.

| Pros                                                                                | Cons                                                                              |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Single canonical store — no read-site decision about which side is fresher          | 1–2 HubSpot round-trips on the synchronous request path (~200–500ms)              |
| Idempotent — replayed webhooks and retried mutations converge                       | HubSpot outage fails the request by design                                        |
| Orphan failure mode is HubSpot-success / DB-fail, rare and manually recoverable     | Sub-100ms write contract not achievable without revisiting the rule               |
| App-derived fields attach cleanly to the canonical record via `hubspotContactId`    | Manual HubSpot edits to score/stage revert on next qualifying edit                |

### 2. DB-first with async HubSpot fan-out

Write the local row, then push to HubSpot in a background job or webhook handler.

| Pros                                                          | Cons                                                                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sub-100ms write latency on the user path                      | A HubSpot push failure leaves the local row pointing at no contact                                                                  |
| Tolerates HubSpot outage without failing user writes          | The local row becomes the canonical record while HubSpot lags — directly contradicts "HubSpot is source of truth"                   |
|                                                               | Read sites have to reason about freshness on both sides                                                                             |

### 3. Bidirectional sync with `changeSource` loop guard

Tag every write with origin metadata so the system can suppress its own echoes.

- Bad, because handlers are already idempotent (a same-value PATCH is a no-op), so the loop guard solves a problem we don't have.
- Bad, because origin tagging adds permanent complexity to every write site.
- Bad, because chained edits make the origin metadata fragile in ways that aren't obvious until production.

### 4. Scheduled reconciliation cron

Periodically reconcile divergence between HubSpot and the local DB.

| Pros                                                                       | Cons                                                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Catches drift without changing the hot write path                          | At pilot scale (one consultant, one HubSpot account, reliable webhook delivery) there's no observed divergence  |
| Deferrable — can be added later if divergence is observed in practice      | Building the pipeline before observing divergence is not pilot-justified                                        |

## Links

- Superseded by [ADR013](adr013-local-db-canonical-for-lead-data.md)
