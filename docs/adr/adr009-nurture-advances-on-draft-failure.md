---
Status: 'Superseded by [ADR011](adr011-followup-drafts-retry-then-pause.md)'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# Nurture scheduler advances `nextStepAt` even when `draftMessage` throws

## Context and Problem Statement

`runSchedulerTick` walks every active `nurture_sequences` row whose `nextStepAt` has passed and, for each one, attempts a `draftMessage` call. On success, the draft is inserted into `message_queue` with `status='pending'` and `drafted++`. On failure (Anthropic 5xx, timeout, schema-validation reject, `INSERT INTO message_queue` rejection, any throw inside the per-row `try` block), the error is logged with `[nurture-scheduler] draftMessage failed for sequence <id>:` and `failed++`.

When `draftMessage` throws inside `runSchedulerTick`, should the row's `nextStepAt` be advanced by the cadence or held back so the next tick re-attempts the same row?

## Decision Drivers

- **Bounded per-failure cost.** A single Claude failure should cost a known, fixed amount of touch-loss — never an unbounded retry storm or a growing backlog. The recovery contract should be readable from the cron response (`{ drafted, failed }`) without a DB query.
- **Poison-row containment.** A row whose lead has a malformed field that consistently throws inside `draftMessage` must not be able to block the tick or accumulate prompt-cache cost on a row that will always fail.
- **Backlog prevention.** A multi-hour Anthropic outage spanning the tick window must not compound — the next day's tick should be back to normal load, not yesterday's backlog plus today's due rows.
- **Single-cadence reasoning.** "When will this lead next be touched?" should be answerable by looking at one cadence (`+CADENCE_DAYS[sequenceType]`), not two interleaved cadences (sequence + retry) with precedence rules at edge cases.

## Considered Options

1. Advance `nextStepAt` even on failure; one missed touch is the bounded cost
2. Keep `nextStepAt` unchanged on failure; let the next tick re-attempt the same row
3. Add a `failed_count` column with retry-with-backoff (`+1h`, `+4h`, `+24h`, …)
4. Wrap per-row `draftMessage` + `INSERT message_queue` + `UPDATE nextStepAt` in a single transaction; on draft failure leave the cursor unchanged

## Decision Outcome

Chosen option: "1. Advance `nextStepAt` even on failure", because it is the only option that gives a bounded per-failure cost (`failed * 1 missed touch each`) without a poison-row trap or a backlog under outage, and it preserves single-cadence reasoning for the operator.

### Positive Consequences

- **The cost of any single Claude failure is bounded and known.** One missed touch on the failed lead's cadence boundary (`+3` / `+14` / `+7` days, depending on `sequenceType`). Never more than one — the next tick advances past the failed row, so a second tick on the same row would only fire after another full cadence period. The operator can read `{ drafted, failed }` from the cron response in Vercel logs and reason about touch-loss exactly: `failed * 1 missed touch each`. This bounded-cost property is the core trade and must not be weakened by future changes (e.g. adding a "retry within tick" loop) without revisiting this ADR.
- **Anthropic outages spanning a full tick window cost one touch per active sequence, not a backlog.** If Claude is down for the entire tick, every due row's `nextStepAt` advances by its cadence and the next day's tick is back to normal load. There is no compounding effect — this is the central operational benefit over option 2. The cost is concentrated on the day of the outage and recovers automatically.
- **The decision composes with [adr007](adr007-outlook-send-with-hubspot-bcc-reconciliation.md)'s "trust the 202" posture.** Both ADRs accept a known silent-failure surface in exchange for not building a retry/reconciliation pipeline pre-PMF. ADR-007 swallows SMTP bounces ([#154](https://github.com/samjmarshall/rekurve/issues/154)); this ADR swallows Claude failures. A future ADR that introduces durable retry ([#153](https://github.com/samjmarshall/rekurve/issues/153) Vercel Workflows spike is the leading candidate) likely supersedes both this ADR and adr007's bounce gap simultaneously — they share a successor, not a constraint.

### Negative Consequences

- **A poison row is invisible until its lead's queue stays quiet across multiple cadences.** A row whose lead consistently throws inside `draftMessage` (malformed lead data, prompt that triggers a schema-validation reject, etc.) will fail-and-advance on every tick that catches it due — `failed` increments in the cron response, but no per-row state records the streak. The lead silently never gets a draft. The signal is the consultant noticing this lead's action queue stays empty. Mitigation lives outside this ADR (a future "leads with N consecutive failures" report would close the gap); the rule itself accepts the trade.
- **The `INSERT INTO message_queue` failure path inherits the same swallow-and-advance rule, but the diagnostic signal is different.** A queue-insert throw indicates schema/migration drift in `message_queue`, not a Claude outage. Both surface as `[nurture-scheduler] draftMessage failed for sequence <id>:` (the log message is shared because both live inside the same `try`), so a future operator chasing a `failed` count cannot tell the two apart from logs alone — they have to inspect the inner error. If Claude-outage and DB-write failures need to be distinguished operationally, the log line splits into two before this ADR is revisited; the rule itself does not change.

## Pros and Cons of the Options

### 1. Advance `nextStepAt` even on failure; one missed touch is the bounded cost

The shipped mechanism (`scheduler.ts:125-132`): the per-row `try` block wraps `draftMessage` + `INSERT message_queue`; the `nextStepAt` advance happens unconditionally after the block. A failure logs `[nurture-scheduler] draftMessage failed for sequence <id>:`, increments `failed`, and the row is re-eligible on the next cadence boundary (`+CADENCE_DAYS[sequenceType]` from the failed tick).

| Pros                                                                                                 | Cons                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Bounded per-failure cost — `failed` from cron response equals missed touches exactly                 | Poison row is invisible until consultant notices empty queue for that lead                                    |
| Anthropic outage spanning a tick costs one touch per active sequence, not a compounding backlog      | Queue-insert failures share the log line with Claude failures — operator must inspect inner error to tell apart |
| Single cadence to reason about — `+CADENCE_DAYS[sequenceType]` is the only knob                     | Accepts a known silent-failure surface in exchange for not building durable retry pre-PMF                     |
| Composes with [adr007](adr007-outlook-send-with-hubspot-bcc-reconciliation.md)'s deferred-retry posture | No per-row failure count — streaks are not observable without log scraping                                  |

### 2. Keep `nextStepAt` unchanged on failure; let the next tick re-attempt the same row

The per-row `try` block wraps the entire write, including the `UPDATE nextStepAt`. On failure the row stays at the front of the due-rows queue (oldest `nextStepAt` first) and is re-selected next tick.

- Bad, because poison rows block the tick — a Zod validation reject on a malformed lead field would be re-selected every tick forever, burning the prompt-cache prefix on a row that will always fail.
- Bad, because backlogs grow — a multi-hour Anthropic outage spanning the tick window leaves every due row unadvanced; the next day's tick has yesterday's backlog plus today's due rows, and a second outage compounds. The failure mode shifts from "miss one touch" to "unbounded queue depth," which is a much worse posture for a daily-cron architecture.
- Bad, because the recovery contract is worse — `failed` from the cron response no longer equals missed touches; the operator has to query the DB to find rows whose `nextStepAt` is in the past after a tick ran.

### 3. Add a `failed_count` column with retry-with-backoff (`+1h`, `+4h`, `+24h`, …)

Add a column tracking consecutive failures per row, and a backoff schedule that retries the row independently of the sequence cadence; dead-letter after N attempts with an operator UI to reset `failed_count`.

| Pros                                                                                                            | Cons                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-row failure observability — `failed_count` makes streaks visible                                           | Multi-day work — backoff schedule + dead-letter + replay tooling + operator reset UI                                                                                                              |
| Transient outages eventually recover without missing a touch                                                   | Two interleaved cadences (retry vs sequence) — edge cases (a retry that succeeds *after* the next sequence boundary would have fired) need an explicit precedence rule                              |
|                                                                                                                 | Value is bounded by Claude-outage-on-this-row events; at pilot scale (one consultant, single-digit due rows per tick) this is a once-a-quarter event                                              |
|                                                                                                                 | Hand-rolled column duplicates the design space the [#153](https://github.com/samjmarshall/rekurve/issues/153) Vercel Workflows spike will explore — if pilot evidence justifies durable retry, investment goes there |

### 4. Wrap per-row `draftMessage` + `INSERT message_queue` + `UPDATE nextStepAt` in a single transaction; on draft failure leave the cursor unchanged

Open a Postgres transaction around the three writes; on any throw inside the block, roll back so the cursor stays at the failed boundary.

- Bad, because it collapses to option 2 — a draft failure rolls back the `nextStepAt` advance, so the row is re-selected next tick with the same poison-row and backlog problems.
- Bad, because there is no external transaction boundary to gain from — `draftMessage` is an Anthropic HTTP call and cannot be inside a Postgres transaction; the "transaction" only wraps the two DB writes, which already commit sequentially per `await`.
- Bad, because it costs concurrency — holding a row-level lock on `nurture_sequences` across an Anthropic call (~1–3 seconds) makes a future "parallelise the tick" change strictly harder. We are sequential by design today (prompt-cache reasons, see feature-doc trade-off), but locking the assumption into the schema is bad value.

## Links

- Feature doc: [Nurture scheduler](../feature/nurture-scheduler.md) — see `Choice made` and `Failure modes & fallback` for the cron tick semantics.
- Sibling ADR: [adr007 — Outlook send with HubSpot BCC reconciliation](adr007-outlook-send-with-hubspot-bcc-reconciliation.md) — same "defer durable retry" posture on a different surface (silent SMTP-bounce gap, [#154](https://github.com/samjmarshall/rekurve/issues/154)).
- Sibling ADR: [adr008 — Nurture auto-start is best-effort](adr008-nurture-auto-start-is-best-effort.md) — synchronous write-path swallow, distinct from this ADR's async cron-tick swallow.
- Superseded by [ADR011](adr011-followup-drafts-retry-then-pause.md) — Inngest retries-then-pause replaces this ADR's advance-on-failure posture once the durable-retry surface exists.
- Open spike: [#153](https://github.com/samjmarshall/rekurve/issues/153) — Vercel Workflows alternative; the leading candidate to introduce durable retry and likely supersede both this ADR and adr007's bounce gap.
