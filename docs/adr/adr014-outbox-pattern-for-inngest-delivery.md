# Outbox pattern for at-least-once delivery to Inngest

**Status:** proposed (2026-05-04)

Every state change that needs to fan out to Inngest is published through a transactional outbox. The writing tRPC mutation (or webhook handler, or background job) inserts one or more rows into a single `outbox` table inside the same Postgres transaction as the canonical state change. After the transaction commits, the writer attempts `inngest.send()` for each new row. On success, the writer sets `processed_at` on the row. On `inngest.send` failure, the writer logs to BetterStack and returns the canonical mutation result to the user as if the send succeeded — the failure does not bubble up. A scheduled cron (every 30 s) sweeps `outbox` rows where `processed_at IS NULL AND created_at < now() - interval '30 seconds'`, retries `inngest.send` for each, and increments `attempts`. The outbox row's `id` is the Inngest idempotency key, so a retry that races with the original send is a guaranteed no-op. The pattern guarantees at-least-once delivery to Inngest with strong consistency between the canonical store and the event bus, at the cost of a bounded delay (≤30 s typical, longer if Inngest itself is degraded) on the downstream side effects.

## Considered options

- **`inngest.send()` called directly from the mutation, no outbox.** Rejected. A network failure on `inngest.send` after the DB transaction commits silently loses the event. With no record that the event was supposed to fire, there is no way to recover. ADR-013's whole posture (DB-first, side effects asynchronous) depends on never losing a side effect; direct `inngest.send` breaks that contract.

- **`inngest.send()` called inside the DB transaction, throw on failure.** Rejected. Makes Inngest's availability part of the Consultant's request path — an Inngest outage fails every Lead capture. ADR-013 was designed to remove third-party dependencies from the request path; coupling the mutation to Inngest's uptime puts one back in.

- **Postgres LISTEN/NOTIFY-driven outbox.** Considered. Rejected for pilot because the listener has to be a long-running process and Vercel's serverless runtime makes that awkward. The cron-sweep variant is simpler to operate and the latency cost (≤30 s) is acceptable for the side effects in scope (HubSpot push, Follow-up plan start, analytics, MS Graph drafts, Twilio sends — none of which are user-facing in a sub-30 s window). Revisit if a future side effect needs sub-second propagation.

- **Per-worker outbox rows (one row per downstream consumer).** Rejected. The outbox would duplicate Inngest's fan-out logic in our DB; adding a new subscriber would require code changes at every write site. One-row-per-event keeps Inngest as the single routing seam — a new subscriber is a new function definition, not a new outbox-write call site.

- **Drop the `outbox` table on success and rely on Inngest's own DLQ for stuck events.** Rejected. The outbox is the surface that proves `inngest.send` was attempted at all. Without it, a network failure between `COMMIT` and `inngest.send` leaves no trace anywhere — Inngest never received the event, and our DB has no record that an event was meant to fire. Keeping the row through `processed_at` is what makes the at-least-once contract enforceable.

## Consequences

- **The cron sweep is a single SQL query.** `SELECT ... FROM outbox WHERE processed_at IS NULL AND created_at < now() - interval '30 seconds' ORDER BY created_at LIMIT 100`. Each row's `inngest.send` is awaited; success sets `processed_at`, failure increments `attempts` and updates `last_error`. No DLQ table; rows that have been retrying for >24 h trip a BetterStack alert.

- **Inngest idempotency keys are non-negotiable.** Every event published from the outbox must use the row's `id` as the idempotency key. A worker that fires twice for the same event because of a race between the post-commit `inngest.send` and the cron sweep would double-write to HubSpot, send two SMS, draft two emails, etc. Inngest's idempotency contract makes the retry safe; relying on application-level idempotency in every worker would be much more error-prone.

- **The post-commit `inngest.send` is allowed to fail silently.** An exception from the SDK is caught, logged to BetterStack, and swallowed. The Consultant sees a successful mutation. The cron sweep delivers the event later. This is the explicit rule and is reflected at every call site — direct propagation of `inngest.send` errors to the user is a code-review-blocking pattern. The justification is the same as ADR-013's: the mutation's success contract is "the canonical state was committed," not "every downstream system has been notified."

- **Outbox table growth is bounded by the sweep cadence and a pruning policy.** A daily prune deletes `processed_at IS NOT NULL AND processed_at < now() - interval '7 days'` rows. Stuck rows (`processed_at IS NULL AND attempts > N`) are not auto-pruned — they stay visible until an operator clears them.

- **Adding a new outbound side effect is a one-event change.** Define a new Inngest function subscribed to an existing event (e.g. a new analytics worker on `lead.captured`). No outbox-side change, no mutation-side change. This is the leverage of the one-row-per-event shape (per the rejected per-worker option).

- **The outbox is the canonical surface for any DB-write that triggers a side effect.** New write sites — webhook ingest, future admin tools, background jobs — must use the outbox. Direct `inngest.send` outside a transaction is a violation of ADR-013 and is caught in code review. There is no compile-time enforcement; the rule is documented here and in ADR-013, and a future PR adding a typed `outbox.publish(tx, event, payload)` helper would make accidental violations harder.

- **Retry semantics are governed by the cron cadence.** A truly persistent `inngest.send` failure (Inngest is down for hours) means rows accumulate in the outbox until the alerting threshold trips. Inngest itself has uptime SLAs; we treat their downtime the same way we treat Postgres downtime — visible, alertable, but not something we engineer around at the application level.

- **The 30-second sweep window is a tuning knob, not a contract.** Under typical load every event is delivered in the post-commit `inngest.send` and never reaches the sweep. The 30-second floor on the sweep filter exists only to avoid racing with the post-commit attempt. If pilot evidence ever shows that real-time-feeling fan-out matters more than sweep efficiency, the floor drops; if observability shows wasted work, the floor rises. The cadence is tunable per-deployment, not per-event.

## Links

- ADR-013 — the canonical-store decision this pattern enables
- ADR-010 — Inngest as source of truth for Follow-up plan run state (the consumer of `lead.captured` events from this outbox)
- BetterStack runbook (TBD) — alert rules for stuck outbox rows and persistent `inngest.send` failures
