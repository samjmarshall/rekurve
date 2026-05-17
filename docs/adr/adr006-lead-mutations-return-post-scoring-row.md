---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# Lead mutations return the post-scoring authoritative row

## Context and Problem Statement

`leads.create` and `leads.update` write the lead, then run `scoreLead()` to compute and persist the score, stage, and `scoreMetadata` for any qualifying edit. Consumers (the [lead profile](../feature/lead-profile.md) edit-in-place flow, the [pipeline board](../feature/pipeline-board.md)) call `invalidateQueries(getById)` after the mutation and refetch.

When the mutation returns, must its response — and the refetch a consumer kicks off — reflect the post-scoring row, or is it acceptable for scoring to land later on a background thread?

## Decision Drivers

- **The edit-in-place UX is silently load-bearing on the contract.** The [lead profile](../feature/lead-profile.md) saves with `mutate → invalidateQueries(getById) → refetch`. If the mutation returns before scoring lands, the refetch reads the pre-score row and the user sees stale numbers until they reload. No error, no warning — just a wrong score.
- **The `scoreLeadAsync` regression actually shipped.** This is not a hypothetical alternative. The first implementation used a `void scoreLeadAsync(...)` wrapper that returned the mutation before the score write landed, racing every refetch. Recording the contract here so the next engineer who reaches for `void scoreLead(...)` to "speed up the mutation" finds the answer instead of relitigating it.
- **Future consumers will inherit the contract by default.** Any feature that reads from `getById` after a `leads.update` (a future bulk-edit, a workflow trigger, an LLM agent that re-reads after writing) gets correctness for free *as long as the mutation returns the scored row*. Flipping to fire-and-forget breaks all of them at once, silently.

## Considered Options

1. Await `scoreLead()` on the request path and return the scored row
2. Fire-and-forget `void scoreLeadAsync(...)` — the original implementation
3. Queue the score write to a worker; mutation awaits a completion handle
4. Separate `leads.scoreById` procedure clients call after `update`

## Decision Outcome

Chosen option: "1. Await `scoreLead()` and return the scored row", because the `void scoreLeadAsync(...)` version actually shipped and was reverted once consumers refetching after a mutation hit the pre-score row — the rejection is binding evidence, not a hypothetical comparison. The current implementation honours the contract by awaiting `scoreLead()` on the request path (`src/server/api/routers/leads.ts:139` and `:265`); the contract is on the *response*, not the *thread*.

### Positive Consequences

- **Correctness by default for future consumers.** Any feature reading from `getById` after a `leads.update` gets correctness for free as long as the mutation returns the scored row. The HubSpot push inside `scoreLead()` is intentionally swallowed (a CRM outage logs `[scoring] HubSpot sync failed for lead {id}` and the mutation still returns the scored row), so the contract holds even when [adr003](adr003-hubspot-source-of-truth-for-contacts.md)'s downstream sync fails. Consistent with adr003's carve-out for `scoreLead()`.
- **Legacy rows with `scoreMetadata: null` heal on next edit.** No backfill job. The lead-profile page renders "Score pending…" until any qualifying edit triggers `scoreLead()`.

### Negative Consequences

- **Sync execution on the request thread depends on [adr005](adr005-deterministic-lead-scoring.md)'s purity rule.** Awaiting `scoreLead()` is only cheap because `qualifyAndScore` is pure TS over structured fields. A factor that introduces I/O breaks both ADRs at once: scoring stops being deterministic *and* the mutation latency budget blows out. New factors must stay pure.
- **One extra `UPDATE leads` per qualifying edit.** `scoreLead()` issues a second write to persist `leadScore` / `leadStage` / `scoreMetadata`. Negligible vs the HubSpot round-trip already in the path; not negligible if scoring ever moves off the request thread.
- **Mutation latency floor is set by HubSpot, not scoring.** The contract adds a few ms of pure-TS work to a request that already pays 200–500ms for the HubSpot PATCH. If a future feature ever needs sub-100ms lead writes, both this contract and [adr003](adr003-hubspot-source-of-truth-for-contacts.md) have to be revisited together.

## Pros and Cons of the Options

### 1. Await `scoreLead()` on the request path and return the scored row

The mutation handler awaits `scoreLead()` after the lead write, then returns the post-scoring row. Consumers calling `invalidateQueries(getById)` after the mutation always refetch into the new score.

- Good, because correctness is the default for every present and future consumer of `getById` — no per-consumer sequencing logic.
- Good, because the contract is on the response, not the thread — a future move to a different execution model (worker, queue) is allowed as long as the response still carries the scored row.
- Good, because the failure mode is loud at write time, not silent at read time — a `scoreLead()` throw surfaces in the mutation, not as stale numbers on the next refetch.
- Bad, because it is silently dependent on [adr005](adr005-deterministic-lead-scoring.md) keeping `qualifyAndScore` pure; introducing I/O into a scoring factor breaks the latency budget.
- Bad, because the mutation latency floor inherits HubSpot's 200–500ms PATCH on top of the extra `UPDATE leads`.

### 2. Fire-and-forget `void scoreLeadAsync(...)`

Wrap `scoreLead()` in a `void`-discarded promise so the mutation returns before scoring lands. The original implementation.

| Pros                                                                | Cons                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Mutation returns in ~HubSpot latency, no extra wait for scoring     | The refetch reads the pre-score row — the user sees stale numbers until they reload                |
| Scoring failures don't fail the mutation                            | Failures are invisible to the consumer; only signal is a server log                                 |
|                                                                     | Actually shipped and was reverted — recorded so the next engineer who suggests it finds the answer  |
|                                                                     | Breaks every present and future `invalidateQueries(getById)` consumer at once, silently             |

### 3. Queue the score write to a worker; mutation awaits a completion handle

The mutation enqueues a score job and awaits a worker-returned handle (or polls completion) before responding. Honours the contract but moves scoring off the request thread.

| Pros                                                                | Cons                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Allows a future scoring factor to do I/O without breaking adr005     | Adds queue dispatch + worker pickup + score write to every qualifying edit — minutes of latency budget vs the current ~ms                  |
| Decouples mutation latency from scoring complexity                  | Reintroduces async/background scoring infrastructure for a deterministic lookup table                                                      |
| Survives an I/O-bearing factor without touching consumers           | Only worth revisiting if a future scoring factor requires I/O, at which point [adr005](adr005-deterministic-lead-scoring.md)'s purity rule also has to flip |

### 4. Separate `leads.scoreById` procedure clients call after `update`

Drop the contract entirely; expose a separate `leads.scoreById` procedure that consumers call after `update` if they want the scored row.

| Pros                                                                | Cons                                                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mutation latency drops to pure HubSpot PATCH + lead write           | Pushes a sequencing burden onto every consumer — easy to forget, impossible to enforce at compile time            |
| Scoring becomes an explicit, opt-in operation                       | Multiplies round-trips on the [pipeline-board](../feature/pipeline-board.md) and lead-profile flows                |
|                                                                     | Makes correctness opt-in instead of default — the inverse of what every present consumer needs                    |

## Links

- Feature doc: [Lead profile](../feature/lead-profile.md) — primary consumer of the contract
- Related ADRs: [adr003](adr003-hubspot-source-of-truth-for-contacts.md) (HubSpot-first writes), [adr005](adr005-deterministic-lead-scoring.md) (purity rule that keeps the await cheap)
- Code: `src/server/api/routers/leads.ts:30-62` (`scoreLead`), `:139` (create call site), `:265` (update call site)
