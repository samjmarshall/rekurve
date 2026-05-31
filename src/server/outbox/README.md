# Outbox

See [ADR-014](../../../docs/adr/adr014-outbox-pattern-for-inngest-delivery.md) for the design rationale.
See [ADR-017](../../../docs/adr/adr017-atomic-outbox-writes-via-neon-http-batch.md) for the atomicity mechanism.

## Post-commit publisher pattern

Every write that needs a downstream side effect:

1. Calls `buildOutboxEvent(eventName, payload)` to get a `{ id, eventName, payload, query }` bundle — the `query` is an unexecuted Drizzle `BatchItem`.
2. Commits the canonical state change **and** the outbox row atomically via `db.batch([canonicalStmt, outboxEvt.query])`.
3. Calls `sendPostCommit([{ id, name, data }])` after the batch — best-effort `inngest.send`; swallows failures.

The cron sweep (`outboxSweep`) is the durable backstop: it picks up any rows where `processed_at IS NULL AND created_at < now() - interval '30 seconds'`.

```ts
const existing = await db.query.leads.findFirst({ where: eq(leads.email, input.email), columns: { id: true } });
const leadId = existing?.id ?? crypto.randomUUID();
const stmt = existing
  ? db.update(leads).set({ ...fields }).where(eq(leads.id, leadId)).returning()
  : db.insert(leads).values({ id: leadId, ...fields }).returning();
const evt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_CAPTURED, { leadId, userId });
const [[lead]] = await db.batch([stmt, evt.query]);
await sendPostCommit([{ id: evt.id, name: evt.eventName, data: evt.payload }]);
```

**A thrown `inngest.send` must never propagate to the caller.** The mutation's success contract is "the canonical state was committed", not "every downstream system has been notified". Propagating the error is a code-review-blocking pattern per ADR-014.

## neon-http batch caveat

`drizzle-orm/neon-http` does not support interactive transactions (`.transaction(async tx => ...)` throws). Use `db.batch([stmt1, stmt2])` instead — this maps to Neon's array-transaction endpoint, wrapping all statements in a single `BEGIN … COMMIT` on the server. See ADR-017.

The batch limitation is that statement-1's output cannot feed statement-2's inputs. Pre-resolve any ids (e.g. via a pre-read or `crypto.randomUUID()`) before building the batch.

## Local development

Run the Next.js dev server and the Inngest dev server in two separate shells:

```sh
make start       # shell 1 — Next.js via Vercel Portless
make inngest_dev # shell 2 — Inngest dev UI at http://localhost:8288
```

The Inngest dev UI auto-discovers the serve endpoint at `https://rekurve.localhost/api/inngest` and lists the registered functions (`outbox-sweep`, `outbox-prune`, `lead-hubspot-sync`).
