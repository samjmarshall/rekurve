# Local DB is the source of truth for Lead data

**Status:** proposed (2026-05-04)

The local Postgres `leads` table is the canonical record for Lead data — name, email, phone, qualification answers, score, stage, and every other field the Consultant edits through the app. HubSpot Contacts are downstream consumers of this state, kept eventually-consistent via the outbox pattern (ADR-014). Lead writes commit to the local DB synchronously inside the tRPC mutation; the post-commit fan-out (HubSpot push, Follow-up plan start, analytics, MS Graph drafts, Twilio sends, anything else side-effect-shaped) is delivered through outbox rows and Inngest functions. The mutation returns the scored row to the Consultant before any external system is touched. ADR-003's posture — "HubSpot is source of truth" — flips: the local DB owns identity, qualification, score, and stage; HubSpot mirrors the subset of fields that the CRM is the consumer of, and a HubSpot direct edit to an existing contact is not honoured (per the carve-outs below).

## Considered options

- **Keep ADR-003 as-is.** Rejected. The synchronous HubSpot-first write blocks the Consultant's request path on a 200–500 ms third-party round-trip on every save, and the orphan-on-local-fail edge case (HubSpot success → DB fail → "you saved a contact in HubSpot but not locally; here's the ID, retry") was a known liability we accepted only because we did not yet have a durable retry surface. Inngest plus the outbox closes that gap and removes the only reason ADR-003's posture made sense at pilot stage.

- **DB-first with synchronous HubSpot fan-out (no outbox).** Rejected. Has the same orphan failure mode as ADR-003 in the opposite direction: DB success → HubSpot send fail → silent divergence with no record that the send was supposed to fire. Without a durable retry surface, the only mitigation is to fail the request, and we end up exactly where ADR-003 was. The outbox (ADR-014) is what makes "DB-first" actually safe.

- **Bidirectional sync with origin-tagged loop guard.** Considered for the inbound webhook problem. Deferred to post-PMF. Pre-PMF the Consultant does not edit Leads directly in HubSpot, so inbound `contact.propertyChange` events are dropped rather than applied. Revisit when an enterprise tier needs HubSpot-direct-edit support; the cost of the loop guard ADR-003 rejected becomes worth paying then.

- **Split canonical store: local DB canonical for app-derived fields, HubSpot canonical for identity.** Rejected. The Qualifying-field set crosses the split (e.g. `budget` is identity-shaped but the score depends on it), and consumers would have to know which fields come from which store on every read. A split canonical store is harder to reason about than either pure option.

## Consequences

- **The mutation is no longer HubSpot-blocking.** `leads.create` and `leads.update` complete on the local DB plus `qualifyAndScore()` plus outbox insert — all inside one Postgres transaction. Typical mutation latency drops from ~300–600 ms to ~30–80 ms. The Consultant's capture flow is faster and immune to HubSpot outages on the request path.

- **`hubspotContactId` is nullable for a brief window after Lead capture.** A new Lead lives in the local DB before its corresponding HubSpot contact exists. An Inngest worker runs dedup-or-create against HubSpot post-commit and stamps `hubspotContactId` when it finishes. The dashboard subscribes via Inngest Connect to a `lead.updated` event and refetches when the link lands. Consumers must tolerate `hubspotContactId === null` on a freshly-captured Lead. ADR-007's `conversations.hubspotActivityId` already follows the same nullable-then-stamped pattern; this generalises it to the contact link itself.

- **HubSpot direct edits to existing contacts are not honoured.** `contact.propertyChange` and `contact.deletion` webhooks are logged and dropped. The next outbound sync overwrites HubSpot from the local DB. The "edit-in-HubSpot survives until the next qualifying edit" behaviour described in ADR-003's example dialogue is gone — by design. The Consultant does not edit in HubSpot; the full bidirectional path is reserved for post-PMF.

- **`contact.creation` from HubSpot is still honoured as an ingest path.** A Lead originating in HubSpot (marketing form fill, manual creation by another user) still creates a local row, gets scored, and gets a Follow-up plan. This is one-way ingest, not bidirectional sync; no loop guard is needed because the local row's creation does not insert an outbox row for HubSpot push (the contact already exists in HubSpot — the worker just finds it).

- **The orphan failure mode flips direction and shrinks.** Today's orphan ("contact in HubSpot, no local row") is replaced by "Lead in local DB, HubSpot push pending." The new orphan is bounded — the outbox + cron sweep deliver to Inngest within ~30 s typical, and Inngest's retries cover Anthropic-shaped or HubSpot-shaped outages on the worker side. A persistent failure surfaces as a stuck outbox row visible in the operator dashboard, not as a "you saved to HubSpot but not locally" error toast for the Consultant.

- **ADR-006 survives untouched.** Scoring is still synchronous. The mutation still returns the scored row. The dashboard's `invalidate → refetch` pattern is unchanged. The only thing that became async is the side-effect fan-out (HubSpot push, Follow-up plan start, future MS Graph / Twilio sends).

- **ADR-008 stays superseded by ADR-010, with a small mechanism shift.** Under ADR-010 the swallow on Follow-up plan start was replaced by `inngest.send("lead.captured")` directly from the mutation. Under ADR-013 that send goes through the outbox first — atomic with the DB write — and the post-commit `inngest.send` is allowed to fail silently because the cron sweep catches it. The end-to-end at-least-once contract is the same; the path is more durable.

- **ADR-007 (Outlook send + BCC reconciliation) keeps its core decision but the mechanism becomes async.** The choice of Outlook + BCC over Resend / Single-Send / Engagements-direct-POST stands. The synchronous Graph call from the approve mutation moves into an outbox-driven Inngest worker; the BCC reconciliation flow becomes a `step.waitForEvent` correlation keyed by a generated correlation ID. ADR-007 gets a consequence-update note; the core decision is not superseded.

- **The webhook handler shrinks.** Per ADR-004, signature/timestamp validation stays, the always-200 rule stays, but the `contact.propertyChange` and `contact.deletion` arms become log-and-drop. ADR-004 gets a consequence-update note; the rule itself does not change.

- **Lock-in to the outbox pattern is real and accepted.** Every write site that needs a downstream side effect must remember to insert outbox rows in the same transaction. A future write that calls `inngest.send` directly outside a transaction breaks the at-least-once contract this ADR depends on. ADR-014 is the rule; code review is the enforcement mechanism.

## Links

- ADR-003 — superseded by this ADR
- ADR-004 — handler scope updates (consequence note)
- ADR-006 — preserved; scoring stays synchronous
- ADR-007 — mechanism update; core decision preserved (consequence note)
- ADR-010 — Inngest source of truth for Follow-up plan run state (parallel decision, different domain)
- ADR-014 — outbox pattern for at-least-once delivery to Inngest (the reliability layer this ADR sits on)
