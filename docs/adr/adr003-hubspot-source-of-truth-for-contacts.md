# HubSpot is the source of truth for contact data

**Status:** superseded by [adr013](adr013-local-db-canonical-for-lead-data.md) (proposed 2026-05-04)

HubSpot is the source of truth for contact data. The app writes to HubSpot first on every `leads.create` and `leads.update`, then mirrors the result to the local `leads` table; HubSpot pushes inbound changes through a webhook that upserts the same table. The local row exists only to attach app-derived fields (`scoreMetadata`, `preferredEstates`, `preferredSuburbs`, `referrerName`, `lastContactedAt`, `nextActionAt`) to a HubSpot contact ID — it is never the canonical record for identity, address, or qualification answers. `leadScore` and `leadStage` round-trip through HubSpot but are recomputed by `scoreLead()` on every qualifying edit, so an out-of-band HubSpot edit to either survives only until the next score run.

## Considered options

- **DB-first with async HubSpot fan-out** — write the local row, then push to HubSpot in a background job or webhook handler. Rejected because a HubSpot push failure leaves the local row pointing at no contact, and the local row is now the canonical record while HubSpot lags — which contradicts "HubSpot is source of truth."
- **Bidirectional sync with `changeSource` loop guard** — tag every write with origin metadata so the system can suppress its own echoes. Rejected because handlers are idempotent (a same-value PATCH is a no-op), so the loop guard solves a problem we don't have. Adds permanent complexity to every write site.
- **Scheduled reconciliation cron** — periodically reconcile divergence. Rejected (deferred) because at pilot scale the consultant runs one HubSpot account and webhook delivery is reliable; the cost of building a reconciliation pipeline before observing actual divergence is not justified.

## Consequences

- **Every `leads.create` and `leads.update` adds 1–2 HubSpot round-trips on the synchronous request path.** The mutation cannot return until HubSpot has accepted the write. Expect ~200–500ms added per call. If a future feature needs sub-100ms lead writes (e.g. high-volume web-form intake), the contract has to be revisited — not just the implementation.
- **HubSpot outage fails the request by design.** A 5xx from HubSpot on `leads.create` or `leads.update` propagates as a tRPC error and the local row is not written. The alternative — write locally and queue the HubSpot push — would silently produce orphan local rows during outages, which violates the source-of-truth rule. The one exception is `scoreLead()`, which swallows HubSpot errors so a HubSpot outage doesn't fail a scoring re-run; the local score remains correct and the next qualifying edit pushes again.
- **HubSpot-success / DB-fail produces an "orphan in HubSpot."** A contact exists in HubSpot with no local row. The TRPC error message includes the HubSpot contact ID and the `[leads.create] local insert failed for HubSpot contact {id}` log captures it. Recovery is manual — the operator looks up the contact in HubSpot and re-runs the lead form, which the upsert-on-conflict pattern then heals.
- **A HubSpot manual edit to `lead_score` or `lead_stage` survives only until the next qualifying edit.** Intentional but surprising — a sales manager who tweaks the score in HubSpot will see it revert. If "manual override" ever becomes a requirement, the rule (HubSpot owns identity, app owns score) has to flip for those fields specifically.
