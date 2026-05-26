# Outbox

See [ADR-014](../../../docs/adr/adr014-outbox-pattern-for-inngest-delivery.md) for the design rationale.

## Post-commit publisher pattern

Every write that needs a downstream side effect inserts an outbox row inside the same DB transaction as the canonical state change. After commit, attempt `inngest.send` immediately. On failure, log and swallow — the sweep cron delivers the event later.

```ts
const id = await db.transaction(async (tx) => {
  // ... canonical state writes ...
  return outbox.publish(tx, "lead.captured", { leadId: lead.id });
});
try {
  await inngest.send({ id, name: "lead.captured", data: { leadId } });
} catch (err) {
  console.error("[outbox] post-commit send failed; sweep will retry:", err);
}
```

**A thrown `inngest.send` must never propagate to the caller.** The mutation's success contract is "the canonical state was committed", not "every downstream system has been notified". Propagating the error is a code-review-blocking pattern per ADR-014.

## neon-http transaction caveat

`drizzle-orm/neon-http` transactions are non-interactive: all queries inside the callback are batched into a single HTTP request, so `.returning()` mid-callback does not surface values. Generate any id you need *before* the insert — which is exactly what `outbox.publish` does internally via `crypto.randomUUID()`.

If a future call-site needs a transactional `.returning()`, that is the trigger for evaluating a `neon-serverless` swap (see ADR-014 "Out of scope").

## Local development

Run the Next.js dev server and the Inngest dev server in two separate shells:

```sh
make start       # shell 1 — Next.js via Vercel Portless
make inngest_dev # shell 2 — Inngest dev UI at http://localhost:8288
```

The Inngest dev UI auto-discovers the serve endpoint at `https://rekurve.localhost/api/inngest` and lists the registered functions (`outbox-sweep`, `outbox-prune`).
