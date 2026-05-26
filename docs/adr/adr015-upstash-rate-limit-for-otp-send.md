---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-05-18'
# prettier-ignore
---

# Rate-limit the OTP-send endpoint with Upstash, email-keyed, via a better-auth before-hook

Technical Story: S1 (HIGH) + S2 (MEDIUM) of the deferred security remediation —
[samjmarshall/rekurve#267](https://github.com/samjmarshall/rekurve/issues/267). Design:
`thoughts/designs/2026-05-18-otp-send-rate-limiting.md`.

## Context and Problem Statement

`POST /api/auth/email-otp/send-verification-otp` (better-auth `emailOTP`
plugin, `src/lib/auth.ts`) has no rate limiting. Each call dispatches a Resend
email. It is the only externally reachable, unauthenticated, cost-bearing
endpoint — an attacker can loop it with arbitrary emails for cost
amplification and inbox-flooding of third parties (S1). The verify endpoint's
`allowedAttempts: 3` per-OTP cap can be reset by requesting unlimited fresh
OTPs (S2). The endpoint was enumerated in a security checklist that was
publicly exposed while the repo was public — treat as known-to-attackers, not
deferred debt.

Three premises in #267 are factually wrong and must not be carried into
implementation: it names the *verify* path as "the send endpoint"; it
recommends a `better-auth/plugins` `rateLimit` plugin that does not exist
(rate limiting is a top-level config option); and better-auth's built-in
limiter defaults to in-process memory (not shared across Vercel lambdas), is
IP-only with no custom-key hook, and has an open bug where it does not fire
for email-OTP.

The decision-maker's stated criteria, in priority order: **(1) cost**,
**(2) code-level per-route/custom-key configurability**. Neon/Postgres as the
rate-limit store is explicitly excluded.

How should the OTP-send endpoint be rate-limited?

## Decision Drivers

- **Cost** (primary) — must be ~$0 at pre-PMF traffic, with *predictable,
  documented* scaling (an opaque overage is itself a cost risk).
- **Code-level configurability** (secondary) — per-route limits and a
  **custom key** in application code; the real abuse is one *email address*
  hammered, so the limiter must key on the submitted email, not just IP.
- **Testability** — #267 requires an E2E test asserting the throttle fires;
  `make test_e2e` runs locally (`next build && next start`), so the mechanism
  must run under local `next start`, not deployed Vercel only.
- **Architectural consistency** — honour ADR-002 (no `middleware.ts`; gate in
  the auth/layout layer).
- **Operational simplicity / lock-in** — minimal new infra and secrets for a
  pre-PMF app.

## Considered Options

1. **`@upstash/ratelimit` called directly, email-keyed, via a better-auth
   `hooks.before` middleware** (chosen).
2. **Vercel WAF / Firewall rate-limit rule** (native, IP/JA4-keyed).
3. **better-auth built-in `rateLimit` with Upstash secondary storage.**
4. **Neon/Postgres-backed better-auth `rateLimit`** — excluded by constraint
   (store must not be Neon); recorded for completeness.

## Decision Outcome

Chosen option: **"1. `@upstash/ratelimit` called directly, email-keyed, via a
better-auth `hooks.before` middleware"**, because it is the only option that
keys on the submitted email (the real abuse vector) while running unchanged
under local `next start` — so #267's E2E acceptance test is deterministic — at
$0 pre-PMF cost and with no `middleware.ts` (honouring ADR-002).

Use `@upstash/ratelimit` + `@upstash/redis` on the Upstash free tier, invoked
from a better-auth `createAuthMiddleware` **`before`** hook in `src/lib/auth.ts`
matched to `ctx.path === "/email-otp/send-verification-otp"`.

- **Two fixed-window limiters**, checked before the email dispatches:
  **email** (normalized `trim().toLowerCase()`) at **3 / 15 min** (primary —
  the threat model); **client IP** (`x-forwarded-for` first hop) at
  **50 / 15 min** (backstop). `ephemeralCache` enabled. Limits are named
  constants in one module.
- **Over limit → HTTP 429** with body `{ error: { message } }` (matches the
  existing `/login` error path + `e2e/utils/auth-mock.ts` contract) and a
  `Retry-After` header; Resend is never called.
- **Fail-open**: on Upstash error/timeout (~1 s) allow the send and emit a
  metric. The endpoint's risk is cost/spam, not account takeover; a Redis blip
  must not cause a total login outage.
- **S2**: no second mechanism — the email-keyed send limiter bounds the
  verify-loop (≤ 3 OTPs × 3 guesses per window); `/sign-in/email-otp` and
  `allowedAttempts: 3` are unchanged. Proven by an E2E test.
- Secrets (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) validated via
  `~/env`; added to Vercel (`--sensitive` for the token), never hand-edited
  into `.env.local`.

### Positive Consequences

- Defends the actual abuse vector (one email → many Resend sends); IP-only
  options cannot.
- $0 at pre-PMF with transparent, modellable scaling; no Neon write load.
- Runs identically local and on Vercel — #267's E2E acceptance criterion is
  satisfiable deterministically.
- No `middleware.ts`; consistent with ADR-002. Future per-route limits are
  pure code (a new `Ratelimit` instance), no dashboard/Terraform coupling.

### Negative Consequences

- Fail-open: an Upstash outage is a bounded, logged protection gap on this one
  route (accepted over a total login outage).
- New vendor surface: Upstash account + 2 secrets; low–moderate lock-in
  (Redis-compatible, swappable).
- A ≤1 s-bounded REST round-trip on the send path (mitigated by
  `ephemeralCache`).
- Couples to better-auth 1.6.9 `ctx` shape — pin the version; re-verify the
  hook `ctx` accessors and the 429 body shape at implementation.
- Follow-up work required: `/create_plan` against #267 drives implementation
  (env wiring, `auth.ts` hook, `src/lib/rate-limit.ts`, the E2E spec); a
  correction comment on #267 is recommended (the wrong endpoint + non-existent
  plugin will otherwise mislead the implementer) — pending approval; revisit
  if a second pilot needs per-tenant limits (currently one constant set, per
  #267 scope).

## Pros and Cons of the Options

| Criterion | 1. Upstash direct + hook | 2. Vercel WAF | 3. better-auth + Upstash store |
|---|---|---|---|
| Cost, pre-PMF | $0 (≤500K cmds/mo) | $0 (≤1M reqs on Pro) | $0 |
| Cost scaling | $0.20/100K, **documented**, no minimum | region-based, **undocumented/opaque** | $0.20/100K |
| Custom key (email) | **Yes** | No (IP/JA4 only < Enterprise) | No (IP-only, no hook) |
| Per-route config in code | **Yes** | Dashboard/Terraform | per-path window/max only |
| Local `next start` / E2E | **Yes** | No documented local path | Yes |
| Honours ADR-002 | **Yes** (in `auth.ts`, no middleware) | n/a (edge) | Yes |
| New infra / lock-in | Upstash acct + 2 secrets / low–mod | none / high | Upstash + bug #1891 / mod |

**Option 2 (Vercel WAF)** fails the local-E2E criterion (no documented local
path; per-region counters) and the cost-predictability driver (opaque
overage), and cannot key on email below Enterprise. **Option 3 (better-auth +
Upstash store)** inherits IP-only keying (defeats the threat model), a
secondary-storage TTL/memory footgun, and open bug #1891. **Option 4
(Neon-backed)** is excluded by the no-Neon constraint.

## Related

- **ADR-016** (`docs/adr/adr016-trpc-ai-procedure-rate-limit.md`) — extends
  this pattern to the tRPC AI surface with a third `rl:ai` limiter keyed by
  `userId` and a `responseMeta` callback that threads `Retry-After` through
  `TRPCError.cause.reset`.

## Revisions

### 2026-05-25 — IP backstop raised 10 → 50 / 15 min

`OTP_SEND_IP_MAX` in `src/lib/rate-limit.ts` raised from **10** to **50** per
15-min window. The email-keyed primary limiter (`OTP_SEND_EMAIL_MAX = 3`) is
unchanged — the threat model is unaffected.

Why: the `otp-rate-limit.spec.ts` canary issues ~13 real
`POST /email-otp/send-verification-otp` calls from a single CI-runner IP
within ~10 seconds (each case uses a unique email, but the IP key is shared).
At 10 / 15 min the backstop trips part-way through the spec — see post-deploy
run [26272636618](https://github.com/samjmarshall/rekurve/actions/runs/26272636618/job/77329542386)
where `case 4 s1` and `case 1` retries got 429 from the IP key while their
fresh email keys were still empty. The same shared-IP pattern is also a real
production case (corporate NAT, mobile carrier CGNAT, family/office Wi-Fi).
50 / 15 min ≈ 3.3 sends/min from one IP is still a meaningful backstop against
loop-style abuse while removing the canary-trip and the shared-IP false
positive.
