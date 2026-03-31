# tRPC Dual-Client Setup with Router Stubs — Implementation Plan

## Overview

Set up tRPC v11 with the new `@trpc/tanstack-react-query` integration for Next.js App Router. Implements the dual-client pattern: RSC `createTRPCOptionsProxy` for server component data fetching + client `httpBatchStreamLink` for interactive mutations. Includes `protectedProcedure` with narrowed better-auth session types, SuperJSON serialization, Zod error formatting, and 5 router stubs.

## Current State Analysis

- **Auth**: better-auth v1.5.6 with `getSession()` in `src/lib/session.ts` — returns `{ session, user } | null`, already `cache()`-wrapped
- **Route groups**: `(website)`, `(login)`, `(application)` all exist. `(application)/layout.tsx:38` has a TODO for `TRPCReactProvider`
- **Database**: Drizzle ORM + Neon Postgres, `db` exported from `src/server/db/index.ts`
- **Env**: `@t3-oss/env-nextjs` in `src/env.js`, convention is `import { env } from "~/env"`
- **Zod 4.0.0**: Installed. tRPC v11 supports Zod 4 via standard-schema
- **No tRPC files exist** — clean slate

### Key Discoveries:
- `getSession()` (`src/lib/session.ts:5`) is already `cache()`-wrapped and calls `auth.api.getSession({ headers: await headers() })` internally
- `(application)/layout.tsx:38` has `// TODO: Wrap with TRPCReactProvider when tRPC is set up`
- Zod 4's `ZodError` still exports `flatten()`, compatible with tRPC's error formatter pattern
- Project uses biome (not ESLint), `yarn` package manager, `~/*` path alias to `src/*`

## Desired End State

All files below exist, `make build` and `make check` pass, and the tRPC API is functional at `/api/trpc`. Protected procedures return `UNAUTHORIZED` for unauthenticated requests. The `(application)` layout wraps children in `TRPCReactProvider`.

```
src/
  server/api/
    trpc.ts                        # Context, initTRPC, procedures
    root.ts                        # Root router, AppRouter type
    routers/
      leads.ts                     # Stub: getAll
      lots.ts                      # Stub: getAll
      messages.ts                  # Stub: getPending
      ai.ts                        # Stub: healthCheck
      nurture.ts                   # Stub: getActive
  trpc/
    query-client.ts                # QueryClient factory
    react.tsx                      # TRPCReactProvider, useTRPC, type helpers
    server.tsx                     # createTRPCOptionsProxy, HydrateClient, prefetch
  app/
    api/trpc/[trpc]/route.ts       # fetchRequestHandler
    (application)/layout.tsx       # Updated: wrap with TRPCReactProvider
e2e/
  features/
    trpc.spec.ts                   # tRPC API e2e tests (auth + unauth)
```

## What We're NOT Doing

- Actual data-fetching logic in routers (stubs only — Epic 2+)
- WebSocket subscriptions
- Rate limiting on tRPC endpoints
- `@trpc/react-query` (classic) — using new `@trpc/tanstack-react-query` per official recommendation

## Implementation Approach

Follow the official tRPC v11 App Router setup guide using `@trpc/tanstack-react-query` (the new, recommended integration). Adapt the reference project (`v2/aidlc-demo/`) patterns for better-auth session handling. Build `HydrateClient` and `prefetch` convenience helpers as recommended by tRPC docs.

---

## Phase 1: Package Installation

### Overview
Install all required tRPC and React Query packages.

### Changes Required:

```bash
yarn add @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query superjson server-only client-only
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn install` completes without errors
- [x] `make check` still passes (no type/lint regressions)

---

## Phase 2: Server Layer

### Overview
Create the tRPC core setup (context, procedures, error formatting) and all 5 router stubs.

### Changes Required:

#### 1. Core tRPC Setup
**File**: `src/server/api/trpc.ts` (new)

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { getSession } from "~/lib/session";
import { db } from "~/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();

  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
```

**Notes:**
- `getSession()` is already `cache()`-wrapped — safe to call from context without redundant caching
- `session` from better-auth is `{ session: Session, user: User } | null` — the `ctx.session?.user` check narrows correctly
- `ZodError` import from `zod` (v4) — still has `flatten()`, compatible with tRPC's error formatter

#### 2. Root Router
**File**: `src/server/api/root.ts` (new)

```typescript
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { aiRouter } from "./routers/ai";
import { leadsRouter } from "./routers/leads";
import { lotsRouter } from "./routers/lots";
import { messagesRouter } from "./routers/messages";
import { nurtureRouter } from "./routers/nurture";

export const appRouter = createTRPCRouter({
  ai: aiRouter,
  leads: leadsRouter,
  lots: lotsRouter,
  messages: messagesRouter,
  nurture: nurtureRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

#### 3. Router Stubs
**Directory**: `src/server/api/routers/` (new)

All stubs use `protectedProcedure` and return typed empty results.

**File**: `src/server/api/routers/leads.ts`
```typescript
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const leadsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(() => {
    return [];
  }),
});
```

**File**: `src/server/api/routers/lots.ts`
```typescript
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const lotsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(() => {
    return [];
  }),
});
```

**File**: `src/server/api/routers/messages.ts`
```typescript
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const messagesRouter = createTRPCRouter({
  getPending: protectedProcedure.query(() => {
    return [];
  }),
});
```

**File**: `src/server/api/routers/ai.ts`
```typescript
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const aiRouter = createTRPCRouter({
  healthCheck: protectedProcedure.query(() => {
    return { status: "ok" as const };
  }),
});
```

**File**: `src/server/api/routers/nurture.ts`
```typescript
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const nurtureRouter = createTRPCRouter({
  getActive: protectedProcedure.query(() => {
    return [];
  }),
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes — all router types infer correctly

---

## Phase 3: Client Layer

### Overview
Create the QueryClient factory, React provider with `@trpc/tanstack-react-query`, and RSC caller with `HydrateClient`/`prefetch` helpers.

### Changes Required:

#### 1. QueryClient Factory
**File**: `src/trpc/query-client.ts` (new)

```typescript
import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
```

**Note:** SuperJSON serialize/deserialize in dehydrate/hydrate ensures Dates and other non-JSON types survive the SSR boundary when using the dual-client pattern.

#### 2. React Provider (New Package API)
**File**: `src/trpc/react.tsx` (new)

```tsx
"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import superjson from "superjson";

import type { AppRouter } from "~/server/api/root";
import { makeQueryClient } from "./query-client";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchStreamLink({
          transformer: superjson,
          url: `${getBaseUrl()}/api/trpc`,
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
```

**Key differences from reference project (classic `@trpc/react-query`):**
- `createTRPCContext<AppRouter>()` replaces `createTRPCReact<AppRouter>()`
- Exports `TRPCProvider` + `useTRPC` instead of `api` object
- Uses `createTRPCClient` (from `@trpc/client`) instead of `api.createClient`
- `TRPCProvider` wraps inside `QueryClientProvider` (not the other way around)

**Note on `process.env` usage:** `VERCEL_URL` and `PORT` are system env vars inlined by Next.js at build time — not app env vars. Using them directly here is intentional and consistent with the official tRPC setup guide.

#### 3. RSC Caller + Hydration Helpers
**File**: `src/trpc/server.ts` (new)

```tsx
import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: async () =>
    createTRPCContext({
      headers: await headers(),
    }),
  router: appRouter,
  queryClient: getQueryClient,
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}
```

**Key differences from reference project:**
- `createTRPCOptionsProxy` replaces `createHydrationHelpers` from `@trpc/react-query/rsc`
- `HydrateClient` and `prefetch` are built as convenience helpers (per official tRPC App Router guide) rather than destructured from `createHydrationHelpers`
- The `trpc` export is used as `trpc.leads.queryOptions()` rather than `api.leads.getAll()`

**Note on naming:** Two different `createTRPCContext` functions exist — `~/server/api/trpc` (server context factory for db/session/headers) and `@trpc/tanstack-react-query` (React context factory for the provider). They never appear in the same file.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes — all client types resolve correctly

---

## Phase 4: Integration

### Overview
Create the tRPC API route handler and wire `TRPCReactProvider` into the `(application)` layout.

### Changes Required:

#### 1. API Route Handler
**File**: `src/app/api/trpc/[trpc]/route.ts` (new)

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

#### 2. Application Layout — Add TRPCReactProvider
**File**: `src/app/(application)/layout.tsx` (modify)

Add import:
```typescript
import { TRPCReactProvider } from "~/trpc/react";
```

Replace the TODO comment and wrap children:
```tsx
// Remove: // TODO: Wrap with TRPCReactProvider when tRPC is set up

// Wrap the body contents with TRPCReactProvider:
<TRPCReactProvider>
  <div className="flex min-h-screen">
    {/* TODO: App sidebar/nav */}
    <main className="flex-1">{children}</main>
  </div>
</TRPCReactProvider>
```

The `TRPCReactProvider` goes inside `ThemeProvider` and `AnalyticsProvider` but wraps the main content area.

### Success Criteria:

#### Automated Verification:
- [x] `make build` succeeds (compile + typecheck pass; page data collection requires DATABASE_URL)
- [x] `make check` passes

#### Manual Verification:
- [ ] SuperJSON correctly serializes/deserializes dates (stubs don't return dates — verify once real data flows)
- [ ] RSC direct caller works from a server component (test with temporary usage)
- [ ] Client-side tRPC calls work from a client component in `(application)` (no tRPC usage on dashboard yet)

---

## Phase 5: E2E Tests

### Overview
Add Playwright e2e tests covering the tRPC API layer. Follows the existing `auth.spec.ts` pattern: direct API requests via `request.get()`, DB session injection for authenticated calls, and a `DATABASE_URL` guard to safely skip in CI environments without direct DB access.

### Changes Required:

#### 1. tRPC E2E Tests
**File**: `e2e/features/trpc.spec.ts` (new)

```typescript
import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";

test.describe("tRPC — Unauthenticated", () => {
  test("protected procedure returns UNAUTHORIZED without session", async ({
    request,
  }) => {
    const response = await request.get("/api/trpc/leads.getAll");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error.data.code).toBe("UNAUTHORIZED");
  });
});

test.describe("tRPC — Authenticated", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  const stubs = [
    { endpoint: "leads.getAll", expected: [] },
    { endpoint: "lots.getAll", expected: [] },
    { endpoint: "messages.getPending", expected: [] },
    { endpoint: "nurture.getActive", expected: [] },
    { endpoint: "ai.healthCheck", expected: { status: "ok" } },
  ];

  for (const { endpoint, expected } of stubs) {
    test(`${endpoint} returns expected stub data`, async ({
      context,
      request,
    }) => {
      await context.addCookies([
        {
          name: "better-auth.session_token",
          value: session.signedToken,
          domain: "localhost",
          path: "/",
        },
      ]);

      const response = await request.get(`/api/trpc/${endpoint}`);
      expect(response.ok()).toBe(true);

      const body = await response.json();
      // tRPC wraps responses in { result: { data: ... } }
      // SuperJSON adds a json + meta structure
      expect(body.result.data.json).toEqual(expected);
    });
  }
});
```

**Pattern notes:**
- Mirrors `auth.spec.ts` structure: guard, `beforeAll`/`afterAll` session lifecycle, `context.addCookies()`
- The unauthenticated test does NOT need `DATABASE_URL` — no session creation needed
- Uses `request.get()` for direct API calls (no browser navigation required)
- Validates the SuperJSON response envelope (`result.data.json`) — this partially covers the SuperJSON verification item
- All 5 router stubs tested in a data-driven loop to keep the spec concise

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes with new test file
- [x] `make test_e2e` passes locally (with `DATABASE_URL` set)
- [x] Unauthenticated test passes in CI (no DB dependency)

---

## Testing Strategy

### Automated:
- `make build` — validates all imports resolve and types compile
- `make check` — lint + typecheck catches any biome or TS issues
- `make test_e2e` — e2e tests verify:
  - Unauthenticated requests get UNAUTHORIZED (runs in CI)
  - All 5 authenticated stub endpoints return correct data (requires `DATABASE_URL`)
  - SuperJSON response envelope structure is correct

### Manual Testing Steps:
1. Check console for `[TRPC]` timing logs in dev mode (`make start` → navigate to dashboard)
2. Once real data flows: verify SuperJSON date serialization roundtrips correctly
3. Once dashboard has tRPC usage: verify client-side mutations from `(application)` components

## Performance Considerations

- `staleTime: 30s` prevents unnecessary refetches after SSR hydration
- `httpBatchStreamLink` batches concurrent requests into a single HTTP call with streaming responses
- `cache(makeQueryClient)` ensures one QueryClient per server request (no cross-request leakage)
- `timingMiddleware` adds artificial delay in dev only — no production impact

## References

- GitHub issue: #93
- Reference project: `/Users/sam/workspace/v2/aidlc-demo/` (classic `@trpc/react-query` pattern)
- tRPC App Router setup guide: https://trpc.io/docs/client/nextjs/app-router-setup
- tRPC tanstack-react-query docs: https://trpc.io/docs/client/tanstack-react-query/setup
- tRPC server-components guide: https://trpc.io/docs/client/tanstack-react-query/server-components
- Migration guide (classic -> new): https://trpc.io/docs/client/tanstack-react-query/migrating
