# Layout-level auth gates instead of `middleware.ts`

**Status:** accepted

Every authenticated route group gates access in its own `layout.tsx` via `await getSession()` + `redirect()`. We do not use `middleware.ts` for auth, and we do not plan to. The two reasons that drove this: (1) each route group has fundamentally different auth needs — `(application)` requires a session, `(login)` requires the absence of one, and `(website)` must have no auth at all — which a single middleware can only express through path-prefix branching; (2) past experience with `middleware.ts` is that it grows complex, is hard to test, and behaves in surprising ways under the Edge runtime.

## Considered options

- **`middleware.ts`** — rejected. Forces opposite rules for `(application)` and `(login)` into one file gated by path prefixes, runs on the Edge runtime (which complicates session/DB access), and historically becomes a hard-to-test choke point.

## Consequences

- **Forgetting to gate a new route group is silent.** A new `(admin)/layout.tsx` without `await getSession()` ships unprotected — there is no middleware safety net. Adding a route group means consciously copying the gate.
- **The 5-minute `cookieCache.maxAge` is load-bearing for performance.** Without it, every layout render hits the DB for `getSession()`. See `src/lib/auth.ts:22-28`.
- **API routes and webhooks are out of scope of this pattern.** They gate via tRPC `protectedProcedure` or per-route session checks. Layouts cover page renders only.
