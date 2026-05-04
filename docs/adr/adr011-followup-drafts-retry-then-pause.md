# Follow-up message drafts retry; persistent failures pause the plan

**Status:** proposed (2026-05-04)

When a Follow-up plan's rhythm fires, the runner attempts to draft the outbound message via `step.run("draft-followup", …)`. On failure, Inngest retries up to 8 times with exponential backoff capped at ~6 hours total. If all retries are exhausted, the function instance moves to Inngest's DLQ, the `nurture.plan-paused` event is emitted, and the Lead's Follow-up plan is paused until an operator clears it. A retry that succeeds within the 6-hour window drafts the message and the plan continues on its normal rhythm; the rhythm boundary is not advanced past the retry window. The rule replaces ADR-009's "advance even on failure" posture: instead of bounding the cost of any single failure to one missed message, the new rule bounds the *time* a transient failure can lose (≤6 h) and surfaces persistent failures as visible-and-paused rather than silent-and-lost.

## Considered options

- **Set retries to zero; preserve ADR-009's "advance even on failure."** Rejected. Throws away the central reason to migrate to Inngest on this surface. An Anthropic outage of even a few minutes that overlaps the rhythm fire would still cost every active Lead a missed message under retries=0; the new shape exists precisely to convert that into a few-minute delay. Setting retries=0 says "I want durability for code crashes but not for upstream outages," which is incoherent.

- **Classify errors transient-vs-permanent: retry on Anthropic 5xx / timeout / rate-limit, advance-on-failure on Zod-rejection / DB-constraint.** The eventual destination, but rejected as the migration target. Classification adds a new code surface (which exception classes are which) and forces decisions we have no evidence for — is a Neon connection timeout transient? Is a Zod rejection always permanent? Ship the simple rule, observe what actually fails in pilot, then decide whether the classification is worth its complexity. Marked as future work; revisit when the `nurture.plan-paused` stream shows a recurring permanent-class failure that doesn't deserve 8 retries.

- **Aggressive retries (16+ attempts, 24 h+ horizon) with no DLQ pause.** Rejected. Stretches the "Lead is silent" window past where an operator would want it to be; an Anthropic outage that stays >6 h is an Anthropic incident, not a transient blip, and at that point Rekurve should know about it via Inngest's pause signal rather than continuing to pile retries against a known-down service.

## Consequences

- **Transient outages become latency, not lost touches.** An Anthropic outage of <6 h is fully covered by retries; affected Leads get their Follow-up message late instead of losing it. This is a strict improvement on ADR-009's bound for the common failure case (which the deferred-job spike #153 was the leading candidate to deliver).

- **Persistent failures pause the Lead and emit `nurture.plan-paused`.** A Lead with malformed data that consistently throws inside `draftMessage` (Zod rejection on a missing field, a prompt that the schema validator rejects every retry) accumulates 8 failed attempts over ~6 h, then pauses. The paused state is visible in Inngest's dashboard and in the `nurture.plan-paused` event stream. Operator action — fix the data and replay the function — restarts the plan from the same rhythm boundary it paused on. This is a strict improvement on ADR-009's "silent forever" failure mode, which depended on the consultant noticing an empty action queue.

- **The two-cadence-systems objection from ADR-009 evaporates.** ADR-009 rejected retries because reasoning about "when is this Lead next touched?" required understanding both retry timing and rhythm timing. Inngest's dashboard collapses that — the displayed next-fire time *includes* any active retry. There is no separate retry calendar to track. Reasoning stays single-cadence per Lead.

- **A retry that succeeds at hour 5 lands the Follow-up message at hour 5 of the rhythm boundary, not at the next boundary.** Acceptable: the boundary is a guideline, not a contract, and a Lead getting a message a few hours after the rhythm hit is not visibly different from one getting it on time. If hour-precision ever becomes load-bearing (some future "do not message after 6 pm local time" rule), the rhythm contract has to evolve — not this ADR.

- **An Anthropic outage spanning >6 h costs paused plans, not a backlog.** When the outage clears, the operator replays the paused functions; each picks up at the rhythm boundary it paused on and the next rhythm fires normally. No compounding effect — same operational shape as ADR-009 promised, with visibility added.

- **The `failed_count` column ADR-009 rejected is now Inngest's responsibility, not ours.** Inngest tracks attempt counts and pause state per function instance. We don't add that column; we read it from Inngest if we ever need it.

- **Anthropic cost increases on the failed-then-retried path.** Eight attempts on a poison row before pause is 8× the prompt-cache prefix cost. At pilot scale (a poison-row event maybe once a quarter), this is in the cents-per-quarter range. If the cost ever becomes meaningful — e.g. a deployment ships a prompt change that causes every active Lead to fail — the response is "operator pauses the function definition," not "lower the retry count."

- **Supersedes ADR-009.** The "advance even on failure" rule and its `failed * 1 missed touch each` bound are replaced. The new bound is "transient failures ≤6 h; persistent failures paused-and-visible."

## Links

- ADR-009 — superseded by this ADR
- ADR-010 — the source-of-truth rule this ADR sits on top of
- Future work: error classification (Considered option 2 above) — defer until pilot evidence justifies the new code surface
