---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-05-31'
# prettier-ignore
---

# Atomic outbox writes via `neon-http` `db.batch()`, rejecting the `neon-serverless` interactive-transaction swap

## Context and Problem Statement

[adr014](adr014-outbox-pattern-for-inngest-delivery.md) requires that the outbox row be written in the same transaction as the canonical state change. [adr013](adr013-local-db-canonical-for-lead-data.md) places the canonical record in the local Postgres `leads` table. The `intake.ts` `// TODO(#258)` flag proposed swapping the DB driver from `drizzle-orm/neon-http` to `drizzle-orm/neon-serverless` to unlock interactive transactions (`db.transaction(async tx => { ... })`), which would let statement-1's `.returning()` output feed statement-2's inputs.

[adr005](adr005-deterministic-lead-scoring.md) already guarantees that `qualifyAndScore()` is a pure function — it reads no DB state. This means the score and the lead id can both be resolved *before* any DB I/O. The interactive-transaction capability turns out not to be needed.

Which mechanism satisfies adr014's "publish record in the same transaction" requirement — `neon-http` `db.batch()`, or a switch to `neon-serverless` `Pool` interactive transactions?

## Decision Drivers

- **Serverless-friendliness.** The app runs on Vercel serverless functions. `neon-serverless` uses a WebSocket `Pool`; on Lambda/serverless, the pool lifecycle requires per-request connect/use/close and risks connection multiplication under concurrent invocations. `neon-http` is the Neon-recommended one-shot path for serverless.
- **ADR-014's atomicity guarantee.** The outbox insert must share a transaction boundary with the canonical write. `db.batch([q1, q2])` over `neon-http` maps to Neon's array-transaction endpoint, which the server wraps in a single `BEGIN … COMMIT` — fully atomic, one HTTP round-trip.
- **ADR-005 scoring purity.** `qualifyAndScore()` is pure. The lead id can be pre-resolved via a cheap pre-read (`SELECT id WHERE email = ?`) or `crypto.randomUUID()` before the batch. No mid-transaction `.returning()` value threading is needed.
- **No new dependency.** `@neondatabase/serverless@1.1.0` and `drizzle-orm@0.45.2` are already installed and both expose `db.batch()` with `.returning()` support inside a batch. The interactive-transaction form throws `"No transactions support in neon-http driver"` — only the non-interactive `batch` form is available on `neon-http`.

## Considered Options

1. Keep `neon-http`; use `db.batch([canonicalStmt, outboxInsert])` for atomic writes
2. Swap to `neon-serverless` `Pool`; use `db.transaction(async tx => { ... })` for interactive transactions
3. Post-commit `inngest.send` with no DB-level atomicity (no outbox insert in the transaction)

## Decision Outcome

Chosen option: "1. Keep `neon-http`; use `db.batch([canonicalStmt, outboxInsert])`", because it satisfies ADR-014's atomicity guarantee via Neon's array-transaction endpoint, preserves the stateless serverless model (no pool lifecycle), and makes the `neon-serverless` swap unnecessary given ADR-005's scoring purity. The batch limitation (no statement-to-statement data flow) is fully addressed by pre-resolving ids before the batch.

This decision **resolves** the `intake.ts:16` `// TODO(#258)` (driver swap rejected) and the `outbox/README.md` "evaluate a neon-serverless swap" note.

### Positive Consequences

- **No pool lifecycle concerns.** `neon-http` stays stateless — each mutation is one HTTP request to Neon. No zombie-socket or connection-multiplication failure modes under concurrent Vercel invocations.
- **ADR-014 atomicity satisfied without a driver swap.** `db.batch([leadUpsert, outboxInsert])` wraps both writes in a single `BEGIN … COMMIT`. The "publish record in the same transaction" guarantee holds.
- **Pre-read race is acceptable at pilot scale.** Resolving the lead id before the batch (via a pre-read or UUID) introduces a theoretical TOCTOU gap (a concurrent same-email insert between read and batch). At one-consultant scale this is impossible in practice and is strictly more robust than the previous non-transactional path. It is documented here so a future multi-consultant deployment can revisit.

### Negative Consequences

- **No statement-to-statement data flow inside a batch.** The batch limitation means we cannot feed statement-1's auto-generated id into statement-2. Pre-resolving ids (pre-read + UUID) is the mitigation; it is a deliberate design constraint, not an oversight.
- **`neon-serverless` interactive transactions remain unavailable.** Any future write site that genuinely needs mid-transaction `.returning()` output to feed the next statement would need a different strategy (e.g. application-level coordination, or a controlled move to `neon-serverless` for that specific path). This ADR does not preclude that; it rejects it for the current use case only.

## Pros and Cons of the Options

### 1. Keep `neon-http`; use `db.batch()`

| Pros | Cons |
| ---- | ---- |
| No pool lifecycle; truly stateless per-request | No statement-to-statement data flow; pre-read required |
| Atomic array-transaction via one HTTP round-trip | Pre-read introduces a theoretical TOCTOU window at multi-consultant scale |
| ADR-005 purity makes the limitation irrelevant for the current write sites | |
| Zero new dependencies; batch already supported in drizzle-orm 0.45.2 + @neondatabase/serverless 1.1.0 | |

### 2. Swap to `neon-serverless` `Pool` interactive transactions

| Pros | Cons |
| ---- | ---- |
| Full interactive transaction semantics; `.returning()` feeds next statement | Pool lifecycle on Lambda: per-request connect/use/close, risk of connection multiplication |
| Familiar `db.transaction(async tx => { ... })` pattern | More complex driver configuration; new env var for WebSocket URL if Neon's serverless endpoint differs |
| | Not needed — ADR-005 scoring purity means statement-to-statement data flow is not required |

### 3. Post-commit `inngest.send` with no DB-level atomicity

- Bad, because a network failure between `COMMIT` and `inngest.send` silently loses the event. ADR-014 exists precisely to prevent this failure mode.
- Bad, because the outbox insert is what gives the at-least-once guarantee. Removing it from the transaction collapses the delivery contract.

## Links

- Refinement of: [adr014](adr014-outbox-pattern-for-inngest-delivery.md) — specifies the atomicity mechanism that ADR-014 requires
- Enabled by: [adr005](adr005-deterministic-lead-scoring.md) — scoring purity makes the batch limitation irrelevant
- Context: [adr013](adr013-local-db-canonical-for-lead-data.md) — the DB-first canonical-store decision this atomicity mechanism enables
