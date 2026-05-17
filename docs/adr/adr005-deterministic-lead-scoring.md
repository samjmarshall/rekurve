---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# Lead scoring is a deterministic TypeScript engine

## Context and Problem Statement

The lead form collects six structured qualification fields (booleans, enums, a parsed budget number) that feed a 100-point rubric, and the rubric total derives the lead stage. The consultant sees the score and a per-factor breakdown on the lead profile, and the breakdown drives the "next question" prompt. The first implementation routed scoring through Claude Haiku; PR [#122](https://github.com/samjmarshall/www/pull/122) shipped that version in commit `7dc57dc` and ripped it out hours later in commit `25588bc`, replacing it with a pure TypeScript engine (`qualifyAndScore()` in `src/server/scoring/`).

Is lead scoring an LLM call or a TypeScript engine?

## Decision Drivers

- **Determinism is a product requirement.** The consultant sees a score and a per-factor breakdown on the lead profile. Re-saving a lead with the same inputs must produce the same score, or the breakdown card and "next question" prompt lose their meaning.
- **The rubric is a lookup table.** Six factors, all keyed off structured fields. No sentiment analysis, no intent classification, no unstructured interpretation. An LLM here is a `switch` statement with non-determinism bolted on.
- **Scoring runs on the synchronous write path.** `leads.create` and `leads.update` block on `qualifyAndScore()` and return the scored row in the same response. Sub-millisecond pure TS makes this possible; a network call would force async/background scoring and a "score pending" UI state.
- **Cost and uptime coupling.** Every qualifying edit was a paid Anthropic call (~$0.001–0.003) and a hard dependency on Anthropic uptime — for logic that has no AI in it.
- **The rubric is owned by the consultant.** Weights and thresholds change as the pilot learns. A TypeScript file is versioned in git, reviewed in PRs, and covered by tests; a prompt is harder to evolve safely.
- **Testability.** Pure functions allow direct input/output unit tests with no mocked `messages.parse()` and no fixture drift.

## Considered Options

1. Deterministic TypeScript engine (`qualifyAndScore()` in `src/server/scoring/`)
2. Claude Haiku scoring (shipped commit `7dc57dc`, reverted commit `25588bc` same PR)

## Decision Outcome

Chosen option: "1. Deterministic TypeScript engine", because the Claude Haiku version actually shipped in commit `7dc57dc` and was reverted hours later in the same PR (commit `25588bc`) once the cost, latency, and non-determinism of routing a lookup table through an LLM met production code review — the rejection is binding evidence, not a hypothetical comparison.

### Positive Consequences

- **The LLM boundary is downstream, by rule.** Scoring stays deterministic; LLMs live in SMS/email follow-up drafting and nurture. A future PR that adds "AI-generated reasoning strings" or "AI-tweaked weights" violates the rule even if it ships behind a flag — the moment scoring depends on a model, every consumer that assumes determinism becomes load-bearing on prompt stability.
- **`ANTHROPIC_API_KEY` is gone from this surface.** When a future feature needs Claude (HITL drafting will), it reintroduces the env var and the SDK for the messaging path — not the scoring path. The two must not share a code path.
- **Testing is unit tests, not an eval suite.** Deterministic scoring is verified by direct input/output assertions — fast, exhaustive, run on every PR, no fixtures to drift, no flakes. The LLM version would have needed a dedicated eval harness (golden datasets, score-stability thresholds, regression gates on prompt edits, periodic re-runs as models evolve) to catch the same regressions. That cost compounds with every rubric change. If a future change makes scoring non-deterministic, it inherits the eval-suite obligation — and that obligation is large enough to be its own rejection criterion.

### Negative Consequences

- **A regression in `score-factors.ts` mis-scores every lead, silently.** No API to mock and no model drift to blame — if the rubric is wrong, every score is wrong. Direct unit tests in `src/server/scoring/__tests__/score-factors.test.ts` are the only line of defence. Adding a factor without a test is a real risk, not a theoretical one.
- **Rubric changes don't backfill.** If weights or thresholds change, existing leads keep their old scores until the next qualifying edit. There is no batch re-score job. A future "reweight finance to 30 points" PR ships inconsistent scores across the lead table until each lead is touched. If that ever matters, build the backfill job — don't retrofit one under pressure.
- **The synchronous write path depends on scoring staying fast.** Sub-millisecond is what justifies running `qualifyAndScore()` inside `leads.create` / `leads.update` on the request thread. If a future factor pulls in I/O (a DB lookup, an external call, anything async), the contract breaks: the mutation latency degrades and the "score returned in the same response" guarantee goes with it. New factors must stay pure.

## Pros and Cons of the Options

### 1. Deterministic TypeScript engine (`qualifyAndScore()`)

Pure functions in `src/server/scoring/` that take the six structured inputs and return a score plus per-factor breakdown. Runs sub-millisecond on the synchronous request thread; rubric weights live in a TypeScript file in git.

- Good, because identical inputs always produce identical scores — the breakdown card and "next question" prompt stay coherent across re-saves.
- Good, because the rubric is versioned in git, reviewed in PRs, and covered by direct unit tests with no fixture drift.
- Good, because the mutation returns the scored row in the same response on the synchronous request thread — no "score pending" UI state.
- Good, because cost and Anthropic uptime are not coupled to lead writes; testing is unit tests, not an eval harness with golden datasets and stability thresholds.
- Bad, because a regression in `score-factors.ts` mis-scores every lead silently — the unit test suite is the only line of defence.
- Bad, because new factors must stay pure (no I/O) or the synchronous write-path contract breaks; rubric changes also don't backfill existing leads.

### 2. Claude Haiku scoring

Routed the same six structured inputs through Haiku via `messages.parse()`. Shipped first (commit `7dc57dc`) and ripped out hours later in the same PR (commit `25588bc`). Recorded here so the next engineer who suggests "what if we used an LLM for this?" finds the answer instead of relitigating it.

| Pros | Cons                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------- |
|      | The rubric is a set of lookup tables — Haiku functions as a `switch` statement with non-determinism bolted on |
|      | ~$0.001–0.003 per qualifying edit (paid Anthropic call for logic that has no AI in it)            |
|      | Network latency forces async/background scoring and a "score pending" UI state                    |
|      | Hard dependency on Anthropic uptime for a deterministic lookup                                    |
|      | Same inputs can produce different scores across re-saves — breaks the breakdown card             |
|      | Requires an eval harness (golden datasets, stability thresholds, prompt-edit regression gates)    |

## Links

- Shipping PR: [#122](https://github.com/samjmarshall/www/pull/122) — commits `7dc57dc` (AI engine) and `25588bc` (deterministic refactor)
- Plan: [Deterministic Lead Scoring Engine — Refactor Plan](../../thoughts/plans/2026-04-08-99-ai-qualification-scoring-engine.md)
- Feature doc: [AI qualification scoring](../feature/ai-qualification-scoring.md)
