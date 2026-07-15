# Outbox

See [ADR-014](../../../docs/adr/adr014-outbox-pattern-for-inngest-delivery.md) for the design rationale,
[ADR-017](../../../docs/adr/adr017-atomic-outbox-writes-via-neon-http-batch.md) for the atomicity mechanism, and
[ADR-019](../../../docs/adr/adr019-system-wide-transactional-outbox-posture.md) for the system-wide posture (event registry, write doors, sweep contract).

## Surface

- **`core.ts` — `createOutboxHelpers({ db, inngest })`**: the DI seam. Every helper closes over the ONE injected `db`, so outbox inserts, the commit batch, and the `processedAt` stamp can never split across two clients. Construct it directly when you need a non-singleton binding (per-test Neon-branch client, faked Inngest delivery).
- **`commit.ts` — `makeCommitWithOutbox(db)`**: composition-root entry point for repository write paths (adr020). Returns the `commitWithOutbox(writes, events)` primitive behind every domain repository's `commit` door: canonical rows and their outbox rows land in ONE `db.batch`, then the post-commit send runs best-effort.
- **`index.ts` — `publish(events)`**: app-singleton binding of the write-less commit (adr019 clause 7), for emit-only surfaces with no canonical rows of their own (sole consumer: the HubSpot webhook's engagement-created emission, wired via `hubspot.module.ts`). This is the barrel's only export — the legacy `buildOutboxEvent`/`sendPostCommit` pair and the event-name maps were retired in #330.
- **`outbox.worker.ts` / `outbox.workers.ts`**: the sweep/prune Inngest workers (collapse rule: they hit the rows directly, no repository tier).

Event names and payload schemas live in `~/server/inngest/events` (`EVENT_REGISTRY`, adr019 clause 7 — the single naming + payload authority). Emit sites pin wire strings module-privately with `satisfies Record<string, EventName>`; payloads are Zod-parsed at WRITE time only.

## Write path

Every write that needs a downstream side effect goes through a repository `commit(writes, events)` (or `publish(events)` when there are no canonical writes):

1. Each event's payload is parsed against its `EVENT_REGISTRY` schema — a bad payload throws before anything commits.
2. Canonical statements and the outbox insert rows execute in ONE `db.batch` — Neon's array-transaction endpoint, never an interactive tx (ADR-017).
3. The post-commit fast path `inngest.send`s each event (keyed by the outbox row id) and stamps `processedAt`; failures are logged and swallowed.

**A thrown `inngest.send` must never propagate to the caller.** The mutation's success contract is "the canonical state was committed", not "every downstream system has been notified". Propagating the error is a code-review-blocking pattern per ADR-014.

## Sweep backstop

The `outbox-sweep` cron re-sends any unprocessed row older than a short grace window — the backstop for the rare event whose post-commit send failed. The cron schedules, grace window, and row filters live in `outbox.worker.ts` (the one source of truth — don't duplicate the literals here). It never re-parses payloads (a legacy in-flight row must not error-loop the backstop). The cadence is hourly-scale, not per-minute, so Neon's compute can autosuspend between sweeps; worst-case recovery for a failed publish is bounded by the interval (ADR-014 — cadence is "a tunable knob, not a contract"). The companion `outbox-prune` cron deletes processed rows past the retention window (also defined in `outbox.worker.ts`).

## neon-http batch caveat

`drizzle-orm/neon-http` does not support interactive transactions (`.transaction(async tx => ...)` throws). Use `db.batch([stmt1, stmt2])` instead — this maps to Neon's array-transaction endpoint, wrapping all statements in a single `BEGIN … COMMIT` on the server. See ADR-017.

The batch limitation is that statement-1's output cannot feed statement-2's inputs. Pre-resolve any ids (e.g. via a pre-read or `crypto.randomUUID()`) before building the batch.

## Local development

Run the Next.js dev server and the Inngest dev server in two separate shells:

```sh
make start       # shell 1 — Next.js via Vercel Portless
make inngest_dev # shell 2 — Inngest dev UI at http://localhost:8288
```

The Inngest dev UI auto-discovers the serve endpoint at `https://rekurve.localhost/api/inngest` and lists the registered functions (see `~/server/inngest/functions.ts` for the served set).
