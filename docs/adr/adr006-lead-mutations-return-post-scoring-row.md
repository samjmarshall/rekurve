# Lead mutations return the post-scoring authoritative row

**Status:** accepted

`leads.create` and `leads.update` return the row produced by `scoreLead()`, so any consumer that calls `invalidateQueries(getById)` after the mutation gets a refetch that is guaranteed to reflect the new score, stage, and `scoreMetadata`. An earlier `scoreLeadAsync(…)` wrapper that used `void` was reverted because the mutation returned before the score write landed, racing every refetch — the contract is on the *response*, not the *thread*. The current implementation honours that contract by awaiting `scoreLead()` on the request path (`src/server/api/routers/leads.ts:139` and `:265`).

## Decision drivers

- **The edit-in-place UX is silently load-bearing on the contract.** [Lead profile](../feature/lead-profile.md) saves with `mutate → invalidateQueries(getById) → refetch`. If the mutation returns before scoring lands, the refetch reads the pre-score row and the user sees stale numbers until they reload. No error, no warning — just a wrong score.
- **The `scoreLeadAsync` regression actually shipped.** This is not a hypothetical alternative. Recording the contract here so the next engineer who reaches for `void scoreLead(...)` to "speed up the mutation" finds the answer instead of relitigating it.
- **Future consumers will inherit the contract by default.** Any feature that reads from `getById` after a `leads.update` (a future bulk-edit, a workflow trigger, an LLM agent that re-reads after writing) gets correctness for free *as long as the mutation returns the scored row*. Flipping to fire-and-forget breaks all of them at once, silently.

## Considered options

- **`void scoreLeadAsync(...)` — fire-and-forget re-scoring.** The original implementation. Rejected because it raced every consumer that refetches after a mutation. The fix awaits `scoreLead()` and returns the scored row.
- **Queue the score write to a worker; mutation awaits a completion handle.** Deferred. It would honour the contract but adds queue dispatch + worker pickup + the score write to every qualifying edit — minutes of latency budget vs the current ~ms. Only worth revisiting if a future scoring factor requires I/O, at which point [adr005](adr005-deterministic-lead-scoring.md)'s purity rule also has to flip.
- **Drop the contract; expose a separate `leads.scoreById` procedure clients call after `update`.** Rejected. Pushes a sequencing burden onto every consumer, multiplies round-trips, and makes correctness opt-in instead of default — the inverse of what the [pipeline-board](../feature/pipeline-board.md) and lead-profile flows need.

## Consequences

- **Sync execution on the request thread is the current implementation, and it is only cheap because [adr005](adr005-deterministic-lead-scoring.md) keeps `qualifyAndScore` pure.** A factor that introduces I/O breaks both ADRs at once: scoring stops being deterministic *and* the mutation latency budget blows out. New factors must stay pure TS over structured fields.
- **One extra `UPDATE leads` per qualifying edit.** `scoreLead()` issues a second write to persist `leadScore` / `leadStage` / `scoreMetadata`. Negligible vs the HubSpot round-trip already in the path; not negligible if scoring ever moves off the request thread.
- **HubSpot push inside `scoreLead()` is intentionally swallowed.** A CRM outage logs `[scoring] HubSpot sync failed for lead {id}` and the mutation still returns the scored row. The local score remains correct; the next qualifying edit re-pushes. Consistent with [adr003](adr003-hubspot-source-of-truth-for-contacts.md)'s carve-out for `scoreLead()`.
- **Mutation latency floor is set by HubSpot, not scoring.** The contract adds a few ms of pure-TS work to a request that already pays 200–500ms for the HubSpot PATCH. If a future feature ever needs sub-100ms lead writes, both this contract and [adr003](adr003-hubspot-source-of-truth-for-contacts.md) have to be revisited together.
- **Legacy rows with `scoreMetadata: null` heal on next edit.** No backfill job. The lead-profile page renders "Score pending…" until any qualifying edit triggers `scoreLead()`.

## Links

- Feature doc: [Lead profile](../feature/lead-profile.md) — primary consumer of the contract
- Related ADRs: [adr003](adr003-hubspot-source-of-truth-for-contacts.md) (HubSpot-first writes), [adr005](adr005-deterministic-lead-scoring.md) (purity rule that keeps the await cheap)
- Code: `src/server/api/routers/leads.ts:30-62` (`scoreLead`), `:139` (create call site), `:265` (update call site)
