---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# Layout-level auth gates instead of `middleware.ts`

## Context

Each route group has fundamentally different auth needs: `(application)` requires a session, `(login)` requires the absence of one, and `(website)` must have no auth at all. A single `middleware.ts` can only express opposite rules through path-prefix branching, runs on the Edge runtime (which complicates session/DB access), and historically becomes a hard-to-test choke point.

Where should authenticated route groups enforce their session gates?

## Decision

We will gate auth in each route group's `layout.tsx` via `await getSession()` + `redirect()`. We will not use `middleware.ts` for auth.

## Consequences

- **Forgetting to gate a new route group is silent.** A new `(admin)/layout.tsx` without `await getSession()` ships unprotected — there is no middleware safety net. Adding a route group means consciously copying the gate.
- **The 5-minute `cookieCache.maxAge` is load-bearing for performance.** Without it, every layout render hits the DB for `getSession()`. See `src/lib/auth.ts:22-28`.
- **API routes and webhooks are out of scope of this pattern.** They gate via tRPC `protectedProcedure` or per-route session checks. Layouts cover page renders only.
