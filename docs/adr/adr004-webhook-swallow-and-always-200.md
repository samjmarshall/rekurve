---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# HubSpot webhook handler swallows per-event errors and always returns 200

## Context and Problem Statement

The HubSpot webhook handler at `POST /api/hubspot/webhook` validates the v3 signature and 5-minute timestamp window, then dispatches the events array across handlers per subscription type (`contact.creation`, `contact.propertyChange`, `contact.deletion`, `object.creation` for emails). HubSpot's retry policy resends the entire batch — not just a failed event — whenever the response is 5xx, so a single poison event that throws can re-execute the side effects of every successful event in the batch on each retry.

How should the handler respond when an individual event fails: surface the error to HubSpot, queue it for retry, or swallow it?

## Decision Drivers

- **Pilot delivery reliability assumptions** — at one consultant and one HubSpot account, observed delivery is reliable; we have no evidence that adding retry infrastructure pays off before pilot data shows real loss.
- **Idempotency requirement** — every handler must be safe against duplicate delivery (HubSpot occasionally re-delivers after network partitions), and the chosen option must not let that property silently rot.
- **Cost of building a durable retry queue** — DLQ + replay + alerting tooling is multi-day work whose value is bounded by HubSpot's actual reliability.
- **Blast radius of a poison event** — a single consistently-failing event must not re-execute the side effects of its successful batch neighbours.

## Considered Options

1. Swallow per-event errors with try/catch and always return 200 once the signature passes
2. Return 5xx on event-handler failure → let HubSpot retry the whole batch
3. Per-event retry queue with a dead-letter table
4. Throw and accept the retry storm

## Decision Outcome

Chosen option: "1. Swallow per-event errors and always return 200", because it is the only option that bounds the blast radius of a poison event without committing to durable-queue infrastructure that pilot evidence does not yet justify. The handler loops events with a per-event try/catch, logs failures with `[HubSpot Webhook] Failed to process …`, and returns 200 OK once signature and timestamp pass. The rule binds the entire handler — every subscription type the route dispatches and any future addition.

### Positive Consequences

- **Idempotency is a hard requirement of every event handler.** Because retries don't exist, the handler must be safe to receive the same event twice — HubSpot does occasionally re-deliver after network partitions. All current handlers satisfy this: `contact.creation` upserts on `hubspot_contact_id`, `contact.propertyChange` writes a single field by primary key, `contact.deletion` is a `DELETE WHERE` no-op on missing rows, `object.creation` for emails reconciles via an `isNull(hubspotActivityId)` guard. New handlers must continue this pattern; throwing on a "duplicate" event is a bug, not a defence.
- **Signature and timestamp validation are the only hard rejections.** This is the explicit boundary of the always-200 rule. A request that fails the v3 signature check or arrives outside the 5-minute window returns 401; everything past that gate is best-effort. Future hardening (e.g. payload schema validation) has to decide which side of the gate it sits on — pre-gate failures must remain 4xx, post-gate failures must remain 200.

### Negative Consequences

- **A failed event is silently lost. The only signal is a console log.** No retry, no queue, no alert. If HubSpot delivery becomes unreliable or a handler bug ships, divergence accumulates and the next operator notices via a customer report, not a metric. Mitigation lives outside this ADR (logging dashboards, future alerts on `[HubSpot Webhook] Failed to process …`).
- **Adding a new subscription type means consciously copying the try/catch dispatch shape.** A handler that throws breaks the contract and re-introduces retry storms. The current `route.ts` structure makes this mistake easy to spot in review (one switch arm per type, one try/catch outside the switch), but there is no compile-time enforcement.

## Pros and Cons of the Options

### 1. Swallow per-event errors with try/catch and always return 200

Wrap each event in try/catch, log failures, return 200 once the signature passes.

| Pros                                                                            | Cons                                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bounds blast radius — a poison event cannot re-execute its successful neighbours | Failed events are silently lost; the only signal is a console log                  |
| No infrastructure to build; ships with the handler                              | New subscription types must consciously copy the try/catch shape                    |
| Forces idempotency on every handler, which we want regardless                   | No compile-time enforcement that future handlers don't throw                        |
| Easy to layer a DLQ on later if pilot evidence shows real loss                  | Operator notices delivery loss via customer reports, not metrics                    |

### 2. Return 5xx on event-handler failure → let HubSpot retry the whole batch

Throw out of the handler, return 5xx, rely on HubSpot's batch-retry mechanism.

| Pros                                                              | Cons                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Free retries from HubSpot's delivery infrastructure               | HubSpot retries the entire batch, not just the failed event                                                     |
| Failed events are not silently dropped                            | A single poison event re-executes successful neighbours' side effects on every retry until manually fixed       |
|                                                                   | Idempotency reduces the damage but doesn't eliminate it — flooded logs and amplified DB load during incidents   |

### 3. Per-event retry queue with a dead-letter table

Persist failed events to a queue, retry with backoff, surface poison events through a DLQ.

| Pros                                                              | Cons                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Failed events are durably tracked, not lost                       | Multi-day build for queue, retry, DLQ, and replay tooling                             |
| Operator has a real surface for diagnosing poison events          | Value is bounded by HubSpot's actual delivery reliability — no evidence it is bad      |
| Most defensible long-term shape; easy to layer on later            | Pre-PMF cost not justified; revisit if `[HubSpot Webhook] Failed to process …` shows real loss |

### 4. Throw and accept the retry storm

Throw out of the handler without try/catch, take HubSpot's batch retries as-is.

- Bad, because it is the worst of both worlds — silent loss *and* duplicated work on every retry.
- Bad, because it bakes the retry-storm failure mode into the shape of the code rather than rejecting it.
- Documented only because someone reading the catch-and-log pattern might "fix" it to throw; we want to stop that fix at code review.

## Consequence update — 2026-05-04 (ADR-013 / ADR-014)

Under [ADR-013](adr013-local-db-canonical-for-lead-data.md), the local DB is canonical for Lead data and HubSpot is downstream. Two of the four event arms change shape:

- **`contact.propertyChange`** — log-and-drop. The local DB is canonical; honouring HubSpot direct edits would be bidirectional sync, which we deferred to post-PMF. The handler returns the event to the always-200 path without applying any change.
- **`contact.deletion`** — log-and-drop. Same reasoning.
- **`contact.creation`** — unchanged in posture, but now writes through the [outbox](adr014-outbox-pattern-for-inngest-delivery.md) instead of calling `scoreLead` and `startOrUpdateSequence` directly. The local row is inserted in a transaction that also inserts a `lead.captured` outbox row; Inngest workers then pick up scoring and Follow-up plan start.
- **`object.creation`** for emails — unchanged. ADR-007's reconciliation surface stays.

The always-200 rule, signature-as-only-hard-rejection rule, and idempotency-required-for-every-handler rule are all preserved. The handler shrinks but the contract does not.

## Links

- Refined by [ADR013](adr013-local-db-canonical-for-lead-data.md)
- Refined by [ADR014](adr014-outbox-pattern-for-inngest-delivery.md)
