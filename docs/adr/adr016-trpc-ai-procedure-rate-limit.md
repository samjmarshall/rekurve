---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-05-26'
# prettier-ignore
---

# Rate-limit the tRPC AI surface with a per-user `aiProcedure` building block

Technical Story: S3 (LOW) of the deferred security remediation —
`thoughts/todos/2026-05-17-deferred-public-repo-remediation.md#S3`. Design:
`thoughts/designs/2026-05-25-trpc-ai-procedure-rate-limit.md`.

## Context and Problem Statement

`aiRouter` (`src/server/api/routers/ai.ts`) is the only tRPC surface where each
authenticated call has a direct Anthropic inference cost. `protectedProcedure`
bounds authentication but places no per-user ceiling on call volume — a single
authenticated user could loop an LLM procedure and drive unbounded Anthropic
spend.

This plan ships the rate-limit building block (`aiProcedure`) **before** the
first LLM procedure exists, so that procedure has nowhere correct to land except
the throttled helper. The pattern is intentionally narrow — keyed by `userId`,
one global `rl:ai` bucket — and is shipped as a convention enforced by code
review rather than the type system.

How should per-user cost amplification on the AI surface be prevented?

## Decision Drivers

- **Cost protection** (primary) — bound per-user Anthropic spend before the
  first LLM procedure lands; fixing this retroactively is harder once real
  procedures exist.
- **Consistency with ADR-015** — same Upstash Redis instance, same
  `@upstash/ratelimit` fixed-window algorithm, same `ephemeralCache` /
  `timeout: 1000` settings, same fail-open posture. Zero new infra.
- **Testability** — middleware is exercisable via the existing `createCallerFactory`
  harness without a real Redis connection; all three cases (under, exceeded,
  fail-open) covered in the unit test suite.
- **Simplicity** — single bucket keyed by `userId`; no per-procedure
  granularity until two procedures show materially different cost profiles.

## Considered Options

1. **`aiProcedure = protectedProcedure.use(aiRateLimitMiddleware)`** (chosen) —
   extends ADR-015's `@upstash/ratelimit` pattern with a third limiter keyed
   by `userId`.
2. **Vercel Edge middleware rate-limit** — IP-only below Enterprise; cannot key
   on `userId`; already excluded for the same reason in ADR-015.
3. **Per-procedure inline guards** — correct but fragile; requires every future
   LLM procedure author to remember to add the guard. Rejected in favour of a
   building block that makes the guarded path the path of least resistance.
4. **Environment-variable-driven limits** — YAGNI pre-PMF; constants in code
   match ADR-015 precedent and are easier to grep than env vars.

## Decision Outcome

Chosen option: **"1. `aiProcedure` building block"**, because it is the only
option that enforces cost protection at the procedure level, is keyed on the
authenticated user (the correct trust boundary on a protected surface), and
reuses ADR-015's proven infra with zero additional secrets or services.

- **`aiLimiter`** — new `Ratelimit` instance in `src/lib/rate-limit.ts`:
  `rl:ai` prefix, `10 / 15 m` fixed window, `ephemeralCache`, `timeout: 1000`,
  `analytics: true` (opted in for the new bucket). Constants exported as
  `AI_RATE_LIMIT_REQUESTS` and `AI_RATE_LIMIT_WINDOW`.
- **`aiRateLimitMiddleware`** — tRPC middleware in `src/server/api/trpc.ts`
  keyed on `ctx.session.user.id`. On cap: throws
  `TRPCError({ code: "TOO_MANY_REQUESTS", cause: { reset } })`. On Upstash
  error: logs `console.warn("[ai-rate-limit] ...")` and fails open (same
  posture as ADR-015).
- **`aiProcedure`** — exported as `protectedProcedure.use(aiRateLimitMiddleware)`.
  Chain order: `timingMiddleware → auth narrowing → aiRateLimitMiddleware`.
- **`Retry-After` header** — `responseMeta` extracted as a named
  export in `src/app/api/trpc/[trpc]/route.ts` and wired into
  `fetchRequestHandler`'s `responseMeta` callback. Reads `cause.reset` from
  the first error and emits `Math.ceil((reset - Date.now()) / 1000)` seconds.

### Positive Consequences

- Per-user cost ceiling: ~$0.36/user/day worst-case at Sonnet pricing
  (10 calls × 3 input+output tokens × current rate); bounded and predictable.
- Zero new infra — reuses the Upstash Redis instance provisioned for ADR-015.
- Consistent fail-open semantics: an Upstash outage is a bounded protection gap
  on this surface, not a total authentication outage.
- `Retry-After` header gives clients a precise back-off signal; no guessing.
- `aiProcedure` is a single search-point: any future AI procedure that bypasses
  it is immediately visible in code review.

### Negative Consequences

- Convention, not types: a developer can still write
  `protectedProcedure.query(anthropicCall)` and bypass the limiter. Relies on
  code review, not the compiler.
- Fail-open: an Upstash outage temporarily disables cost protection on this
  surface. Accepted pre-PMF; revisit if a second pilot drives meaningful AI
  traffic.
- `analytics: true` on `aiLimiter` (vs. `false` on OTP limiters) — intentional
  opt-in for the new bucket; no functional difference, adds Upstash dashboard
  visibility for AI usage.

## Pros and Cons of the Options

| Criterion | 1. aiProcedure + Upstash | 2. Vercel Edge | 3. Inline guards | 4. Env-var limits |
|---|---|---|---|---|
| Keys on userId | **Yes** | No (IP only) | **Yes** | n/a |
| Enforces at call site | **Building block** | No (network layer) | Fragile (per-author) | n/a |
| New infra / secrets | None | None | None | None |
| Consistent with ADR-015 | **Yes** | No | No | n/a |
| Testable without Redis | **Yes** | No | Yes | n/a |

## Revisions

_(none)_
