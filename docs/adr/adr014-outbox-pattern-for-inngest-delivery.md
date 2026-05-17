---
Status: 'Proposed'
Deciders: 'Sam Marshall'
Date: '2026-05-05'
# prettier-ignore
---

# Transactional outbox + post-commit send + 30s cron sweep for at-least-once Inngest delivery

## Context and Problem Statement

[adr013](adr013-local-db-canonical-for-lead-data.md) places the canonical record for Lead state in the local Postgres DB and pushes all side-effect-shaped work (HubSpot push, Follow-up plan start, MS Graph drafts, Twilio sends, analytics) through Inngest. That posture depends on a guarantee the application code does not yet provide: every committed canonical write must result in its corresponding Inngest event being delivered at least once, and a network failure between `COMMIT` and `inngest.send()` cannot silently lose the side effect.

Inngest itself is durable once it has received the event. The fragile seam is the application's own publish path — the gap between "the DB transaction committed" and "Inngest acknowledged the event." Pre-PMF this runs on Vercel serverless functions, so any solution involving long-running listeners is operationally awkward.

How is at-least-once delivery to Inngest guaranteed atomically with the canonical DB write?

## Decision Drivers

- **At-least-once semantics with operator-visible recovery.** A side effect that should fire must eventually fire, and any stuck publish must be visible somewhere an operator can find it.
- **Strong consistency between the canonical store and the event bus.** The "the DB committed but Inngest never heard about it" failure mode is the one this ADR exists to prevent. The publish record must live in the same transaction as the canonical write.
- **Bounded delay tolerance.** Pre-PMF side effects in scope (HubSpot push, Follow-up plan start, analytics, MS Graph drafts, Twilio sends) tolerate ≤30 s of propagation delay. None of them are user-facing in a sub-30 s window.
- **Vercel serverless-friendly.** Long-running listener processes are operationally awkward on Vercel; the chosen mechanism should fit the serverless runtime without bespoke infrastructure.
- **Single routing seam through Inngest.** New downstream subscribers should attach to existing events with no write-site changes. Fan-out logic lives in Inngest, not in the outbox.
- **Idempotency in every worker.** Whatever the delivery mechanism, the worker side has to be safe against duplicate delivery — at-least-once is at-least-once, not exactly-once.

## Considered Options

1. Transactional outbox + post-commit `inngest.send` + 30 s cron sweep, with the outbox row id as the Inngest idempotency key
2. `inngest.send()` called directly from the mutation, no outbox
3. `inngest.send()` called inside the DB transaction, throw on failure
4. Postgres `LISTEN/NOTIFY`-driven outbox with a long-running listener
5. Per-worker outbox rows (one row per downstream consumer)
6. Drop the `outbox` table on success and rely on Inngest's own DLQ for stuck events

## Decision Outcome

Chosen option: "1. Transactional outbox + post-commit `inngest.send` + 30 s cron sweep, with the outbox row id as the Inngest idempotency key", because it is the only option that ties the publish record to the same transaction as the canonical write (closing the COMMIT-then-fail gap), keeps Inngest's availability off the consultant's request path, fits Vercel's serverless runtime without a long-running listener, and preserves Inngest as the single fan-out seam.

The writing tRPC mutation (or webhook handler, or background job) inserts one or more rows into a single `outbox` table inside the same Postgres transaction as the canonical state change. After the transaction commits, the writer attempts `inngest.send()` for each new row. On success, the writer sets `processed_at`. On `inngest.send` failure, the writer logs to BetterStack and returns the canonical mutation result to the user as if the send succeeded — the failure does not bubble up. A scheduled cron (every 30 s) sweeps rows where `processed_at IS NULL AND created_at < now() - interval '30 seconds'`, retries `inngest.send`, and increments `attempts`. The outbox row's `id` is the Inngest idempotency key, so a retry that races with the original send is a guaranteed no-op.

### Positive Consequences

- **The cron sweep is a single SQL query.** `SELECT ... FROM outbox WHERE processed_at IS NULL AND created_at < now() - interval '30 seconds' ORDER BY created_at LIMIT 100`. Each row's `inngest.send` is awaited; success sets `processed_at`, failure increments `attempts` and updates `last_error`. No DLQ table; rows that have been retrying for >24 h trip a BetterStack alert.
- **Adding a new outbound side effect is a one-event change.** Define a new Inngest function subscribed to an existing event (e.g. a new analytics worker on `lead.captured`). No outbox-side change, no mutation-side change. This is the leverage of the one-row-per-event shape (per the rejected per-worker option).
- **The 30-second sweep window is a tuning knob, not a contract.** Under typical load every event is delivered in the post-commit `inngest.send` and never reaches the sweep. The 30-second floor on the sweep filter exists only to avoid racing with the post-commit attempt. If pilot evidence ever shows that real-time-feeling fan-out matters more than sweep efficiency, the floor drops; if observability shows wasted work, the floor rises. The cadence is tunable per-deployment, not per-event.

### Negative Consequences

- **Inngest idempotency keys are non-negotiable.** Every event published from the outbox must use the row's `id` as the idempotency key. A worker that fires twice for the same event because of a race between the post-commit `inngest.send` and the cron sweep would double-write to HubSpot, send two SMS, draft two emails, etc. Inngest's idempotency contract makes the retry safe; relying on application-level idempotency in every worker would be much more error-prone.
- **The post-commit `inngest.send` is allowed to fail silently.** An exception from the SDK is caught, logged to BetterStack, and swallowed. The consultant sees a successful mutation. The cron sweep delivers the event later. This is the explicit rule and is reflected at every call site — direct propagation of `inngest.send` errors to the user is a code-review-blocking pattern. The justification is the same as adr013's: the mutation's success contract is "the canonical state was committed," not "every downstream system has been notified."
- **The outbox is the canonical surface for any DB-write that triggers a side effect.** New write sites — webhook ingest, future admin tools, background jobs — must use the outbox. Direct `inngest.send` outside a transaction is a violation of adr013 and is caught in code review. There is no compile-time enforcement; the rule is documented here and in adr013, and a future PR adding a typed `outbox.publish(tx, event, payload)` helper would make accidental violations harder.
- **Outbox table growth is bounded by the sweep cadence and a pruning policy.** A daily prune deletes `processed_at IS NOT NULL AND processed_at < now() - interval '7 days'` rows. Stuck rows (`processed_at IS NULL AND attempts > N`) are not auto-pruned — they stay visible until an operator clears them.
- **Retry semantics are governed by the cron cadence.** A truly persistent `inngest.send` failure (Inngest is down for hours) means rows accumulate in the outbox until the alerting threshold trips. Inngest itself has uptime SLAs; we treat their downtime the same way we treat Postgres downtime — visible, alertable, but not something we engineer around at the application level.

## Pros and Cons of the Options

### 1. Transactional outbox + post-commit `inngest.send` + 30 s cron sweep

The outbox row is written inside the canonical transaction; the post-commit `inngest.send` is best-effort fast-path; the cron sweep is the durable backstop. Row id doubles as the Inngest idempotency key.

| Pros                                                                                                                                              | Cons                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Publish record lives in the same transaction as the canonical write — no "DB committed but no record of intent to publish" gap                    | Two delivery paths (post-commit fast path + cron sweep) — workers must be safe against duplicate delivery via Inngest idempotency keys                 |
| Inngest's availability is not on the consultant's request path — outage degrades latency, not capture                                             | Every new write site must remember the outbox; enforcement is code review until a typed `outbox.publish(tx, ...)` helper lands                         |
| Cron sweep is a single SQL query on Vercel's existing scheduled-function surface — no long-running listener required                              | Outbox table needs a pruning policy (daily delete of processed rows >7 d old) and growth monitoring                                                     |
| Adding a subscriber is a new Inngest function definition with no write-site change — Inngest remains the single fan-out seam                      | Bounded ≤30 s typical delay on the cron-sweep path is acceptable for the side effects in scope, but rules the pattern out for sub-second propagation   |
| 30-second sweep window is a tunable knob, not a contract — cadence can move without breaking consumers                                            |                                                                                                                                                        |

### 2. `inngest.send()` called directly from the mutation, no outbox

The mutation writes to the canonical DB and then calls `inngest.send()` in the same handler. No outbox table, no cron sweep.

- Bad, because a network failure on `inngest.send` after the DB transaction commits silently loses the event. With no record that the event was supposed to fire, there is no way to recover.
- Bad, because adr013's whole posture (DB-first, side effects asynchronous) depends on never losing a side effect; direct `inngest.send` breaks that contract.
- Bad, because the "publish was attempted" signal has nowhere to live — operator recovery is impossible because nothing knows what was meant to fire.

### 3. `inngest.send()` called inside the DB transaction, throw on failure

The mutation calls `inngest.send()` inside the same transaction as the canonical write; an `inngest.send` failure rolls the transaction back and surfaces to the user.

| Pros                                                                                                  | Cons                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strong all-or-nothing semantics — either both the DB write and the Inngest publish happen, or neither | Inngest's availability becomes part of the consultant's request path; an Inngest outage fails every Lead capture                                                |
| No outbox table, no cron sweep, no idempotency-key contract                                           | adr013 was designed to remove third-party dependencies from the request path; this option puts one back in                                                      |
|                                                                                                       | Network call inside a Postgres transaction holds the row lock for the duration — exactly the kind of long transaction that creates contention under any volume  |

### 4. Postgres `LISTEN/NOTIFY`-driven outbox with a long-running listener

The outbox is still transactional, but instead of post-commit `inngest.send` + cron sweep, a long-running process subscribes to `NOTIFY` events on the outbox table and pushes events to Inngest immediately.

- Bad, because the listener has to be a long-running process and Vercel's serverless runtime makes that awkward — running it on a separate platform (Fly.io, Railway, a dedicated worker box) is operational overhead pre-PMF cannot justify.
- Bad, because `LISTEN/NOTIFY` is best-effort within a single Postgres connection; if the listener drops the connection it has to fall back to a poll anyway. The cron sweep is the poll, made explicit.
- Good, because if a future side effect ever needs sub-second propagation, this is the path to revisit. The 30 s cron-sweep cadence is the only thing standing in the way; the outbox table shape is the same.

### 5. Per-worker outbox rows (one row per downstream consumer)

The outbox stores one row per downstream subscriber, not per event. Adding a new subscriber means writing additional rows from every write site.

- Bad, because the outbox would duplicate Inngest's fan-out logic in our DB; adding a new subscriber would require code changes at every write site.
- Bad, because one-row-per-event keeps Inngest as the single routing seam — a new subscriber is a new function definition, not a new outbox-write call site. Per-worker rows give that leverage up.
- Bad, because the row-count fan-out makes the outbox table several times larger for no gain in durability or visibility.

### 6. Drop the `outbox` table on success and rely on Inngest's own DLQ

Treat the outbox as transient: insert, attempt `inngest.send`, delete the row on success. Persistent failures end up in Inngest's DLQ and are recovered from there.

- Bad, because the outbox is the surface that proves `inngest.send` was attempted at all. Without it, a network failure between `COMMIT` and `inngest.send` leaves no trace anywhere — Inngest never received the event, and our DB has no record that an event was meant to fire.
- Bad, because Inngest's DLQ only covers events Inngest has accepted. The publish-side failure mode this ADR exists to close is exactly the case Inngest's DLQ cannot see.
- Bad, because keeping the row through `processed_at` is what makes the at-least-once contract enforceable; deleting it on success collapses two distinct states ("never published" and "published-and-cleaned-up") into one.

## Links

- Enables: [adr013](adr013-local-db-canonical-for-lead-data.md) — the canonical-store decision this pattern makes safe
- Consumer: [adr010](adr010-inngest-source-of-truth-for-followup-plan.md) — Inngest as source of truth for Follow-up plan run state; `lead.captured` events from this outbox feed the plan runner
- Runbook (TBD): BetterStack alert rules for stuck outbox rows (`processed_at IS NULL AND attempts > N`) and persistent `inngest.send` failures
