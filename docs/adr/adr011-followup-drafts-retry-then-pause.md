---
Status: 'Proposed'
Deciders: 'Sam Marshall'
Date: '2026-05-05'
# prettier-ignore
---

# Retry Follow-up message drafts for ~6 h via Inngest, then pause the plan on DLQ

## Context and Problem Statement

The Follow-up plan runner ([adr010](adr010-inngest-source-of-truth-for-followup-plan.md)) drafts each outbound message via `step.run("draft-followup", …)`, which can fail for transient reasons (Anthropic 5xx, rate-limit, Neon connection timeout) or persistent ones (Zod rejection on malformed Lead data, a prompt-schema mismatch after a deployment). [adr009](adr009-nurture-advances-on-draft-failure.md) — written before the Inngest migration — bounded any single failure to one missed message by advancing the rhythm cursor even on failure. With Inngest now providing durable retries, that posture trades the wrong way: a few-minute Anthropic outage would still cost every active Lead a missed touch under `retries=0`, exactly the failure mode the migration is meant to absorb.

When a Follow-up plan's draft step fails, should the runner retry the step, or advance the rhythm cursor and accept the missed touch?

## Decision Drivers

- **Use Inngest for what it is.** Inngest was selected for the durable state machine ([adr010](adr010-inngest-source-of-truth-for-followup-plan.md)); using it without retries leaves the durability investment on the table for upstream outages, which are the dominant failure class.
- **Visible-and-paused beats silent-and-lost.** A persistently failing Lead should surface somewhere an operator can see it, not silently skip messages until the consultant notices an empty action queue.
- **Single-cadence reasoning per Lead.** adr009 rejected retries because reasoning about "when is this Lead next touched?" required tracking both a retry calendar and the rhythm calendar. Whatever rule replaces it must keep that property.
- **Bounded transient-outage window.** A retry window must be short enough that a Lead getting a message N hours late is not visibly different from on-time, and long enough to cover the longest realistic upstream outage we want to absorb invisibly.
- **No new code surface unless pilot evidence demands it.** Pre-PMF, a simple uniform rule beats an error-classification rule even when classification is the likely eventual destination.

## Considered Options

1. 8 retries with exponential backoff totalling ~6 h, then DLQ → `nurture.plan-paused` event
2. `retries=0` preserving [adr009](adr009-nurture-advances-on-draft-failure.md)'s "advance even on failure"
3. Classify errors transient-vs-permanent: retry on Anthropic 5xx / timeout / rate-limit, advance-on-failure on Zod-rejection / DB-constraint
4. Aggressive retries (16+ attempts, 24 h+ horizon) with no DLQ pause

## Decision Outcome

Chosen option: "1. 8 retries with exponential backoff totalling ~6 h, then DLQ → `nurture.plan-paused` event", because it is the only option that uses Inngest's durability for its intended purpose, converts transient outages into bounded latency, and surfaces persistent failures as visible-and-paused — all without adding a new error-classification code surface before pilot evidence justifies it.

### Positive Consequences

- **Transient outages become latency, not lost touches.** An Anthropic outage of <6 h is fully covered by retries; affected Leads get their Follow-up message late instead of losing it. Strict improvement on adr009's bound for the common failure case (which spike #153 was the leading candidate to deliver).
- **Persistent failures pause the Lead and emit `nurture.plan-paused`.** A Lead with malformed data that consistently throws inside `draftMessage` (Zod rejection on a missing field, a prompt that the schema validator rejects every retry) accumulates 8 failed attempts over ~6 h, then pauses. The paused state is visible in Inngest's dashboard and in the `nurture.plan-paused` event stream. Operator action — fix the data and replay the function — restarts the plan from the same rhythm boundary it paused on. Strict improvement on adr009's silent-forever failure mode, which depended on the consultant noticing an empty action queue.
- **The two-cadence-systems objection from adr009 evaporates.** adr009 rejected retries because reasoning about "when is this Lead next touched?" required understanding both retry timing and rhythm timing. Inngest's dashboard collapses that — the displayed next-fire time *includes* any active retry. There is no separate retry calendar to track. Reasoning stays single-cadence per Lead.
- **A retry that succeeds at hour 5 lands the Follow-up message at hour 5 of the rhythm boundary, not at the next boundary.** Acceptable: the boundary is a guideline, not a contract, and a Lead getting a message a few hours after the rhythm hit is not visibly different from one getting it on time. If hour-precision ever becomes load-bearing (some future "do not message after 6 pm local time" rule), the rhythm contract has to evolve — not this ADR.
- **An Anthropic outage spanning >6 h costs paused plans, not a backlog.** When the outage clears, the operator replays the paused functions; each picks up at the rhythm boundary it paused on and the next rhythm fires normally. No compounding effect — same operational shape adr009 promised, with visibility added.
- **The `failed_count` column adr009 rejected is now Inngest's responsibility, not ours.** Inngest tracks attempt counts and pause state per function instance. We don't add that column; we read it from Inngest if we ever need it.

### Negative Consequences

- **Anthropic cost increases on the failed-then-retried path.** Eight attempts on a poison row before pause is 8× the prompt-cache prefix cost. At pilot scale (a poison-row event maybe once a quarter), this is in the cents-per-quarter range. If the cost ever becomes meaningful — e.g. a deployment ships a prompt change that causes every active Lead to fail — the response is "operator pauses the function definition," not "lower the retry count."

## Pros and Cons of the Options

### 1. 8 retries with exponential backoff totalling ~6 h, then DLQ → `nurture.plan-paused`

Inngest's default retry policy with a DLQ branch that emits a domain event when retries are exhausted. The function instance enters the DLQ, the `nurture.plan-paused` event fires, and the Lead's Follow-up plan is paused until an operator replays the function from the Inngest dashboard.

| Pros                                                                                                                         | Cons                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Transient upstream outages of <6 h convert from missed touches to bounded latency                                            | 8× Anthropic prompt-cache prefix cost on poison rows (cents per quarter at pilot scale)             |
| Persistent failures surface in the Inngest dashboard and `nurture.plan-paused` event stream — no silent-forever failure mode | Retry window means a Lead is silent for up to 6 h before the pause signal reaches the operator     |
| Single-cadence reasoning preserved — Inngest dashboard shows the next-fire time including any active retry                   |                                                                                                     |
| No new error-classification code surface — the rule is uniform across exception types                                        |                                                                                                     |
| Operator replay restarts at the same rhythm boundary, no compounding backlog when an outage clears                           |                                                                                                     |

### 2. `retries=0` preserving adr009's "advance even on failure"

Keep the adr009 posture even after migrating to Inngest: a failing draft step advances the rhythm cursor and costs the Lead one missed message.

- Bad, because it throws away the central reason to migrate to Inngest on this surface. An Anthropic outage of even a few minutes that overlaps the rhythm fire would still cost every active Lead a missed message — the whole point of the migration is to convert that into a few-minute delay.
- Bad, because "I want durability for code crashes but not for upstream outages" is incoherent — upstream outages are the dominant failure class on this surface.
- Bad, because it preserves the silent-forever failure mode for genuinely persistent failures — a poison row continues to fail every rhythm with no surfacing signal.

### 3. Classify errors transient-vs-permanent

Retry on Anthropic 5xx / timeout / rate-limit; advance-on-failure on Zod-rejection / DB-constraint. The eventual destination once pilot evidence justifies the new code surface, but rejected as the migration target.

- Good, because it minimises Anthropic cost on poison rows (no retries on permanent-class errors) — the upside that will eventually pull us here.
- Bad, because classification adds a new code surface (which exception classes are which) and forces decisions we have no evidence for — is a Neon connection timeout transient? Is a Zod rejection always permanent?
- Bad, because pre-PMF the simple uniform rule beats the classification rule even if classification is where this ends up. Ship the simple rule, observe what actually fails in pilot, then decide whether the new code surface is worth its complexity.

### 4. Aggressive retries (16+ attempts, 24 h+ horizon) with no DLQ pause

Stretch the retry window further to absorb longer outages; accept that there is no visible-and-paused signal.

- Bad, because it stretches the "Lead is silent" window past where an operator would want it. An Anthropic outage that stays >6 h is an Anthropic incident, not a transient blip — at that point Rekurve should know about it via Inngest's pause signal rather than continuing to pile retries against a known-down service.
- Bad, because removing the DLQ removes the persistent-failure surfacing signal entirely; we are back to adr009's silent-forever failure mode for poison rows, just with more cost.
- Bad, because the marginal upstream outage absorbed by going from 6 h to 24 h is rare enough that paying it as an operator-visible pause is the better trade.

## Links

- Supersedes [adr009](adr009-nurture-advances-on-draft-failure.md) — the "advance even on failure" rule and its `failed * 1 missed touch each` bound are replaced by "transient failures ≤6 h; persistent failures paused-and-visible"
- Sits on top of [adr010](adr010-inngest-source-of-truth-for-followup-plan.md) — Inngest as the source of truth for Follow-up plan run state
- Future work: error classification (Considered Option 3 above) — defer until pilot evidence justifies the new code surface; revisit when the `nurture.plan-paused` stream shows recurring permanent-class failures that don't deserve 8 retries
