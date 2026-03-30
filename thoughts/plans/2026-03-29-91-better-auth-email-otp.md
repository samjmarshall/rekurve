# better-auth — Email OTP Authentication Implementation Plan

## Overview

Implement better-auth with email OTP plugin and Drizzle adapter, replacing the existing NextAuth-style auth schema. Configure cached session access for server components and layout-level auth gates for the `(application)` and `(login)` route groups.

## Current State Analysis

- **Auth schema** (`src/server/db/schema/auth.ts`): Contains NextAuth-style tables (`users`, `accounts`, `sessions`, `verificationTokens`) with incompatible column names and relationships
- **Database**: Drizzle + Neon HTTP client at `src/server/db/index.ts`, already has one migration applied (`0000_modern_fallen_one.sql`)
- **Route groups**: `(application)` and `(login)` exist with TODO auth gate comments at `src/app/(application)/layout.tsx:33-35`
- **Env validation**: `src/env.js` has no auth-related vars
- **No auth packages installed**: neither `better-auth` nor `resend` in `package.json`

### Key Discoveries:
- Existing auth schema is fully NextAuth-style — needs complete replacement, not modification
- `emailVerified` is `timestamp` in current schema vs `boolean` in better-auth
- Session table uses `sessionToken` as PK vs better-auth's `id` PK + unique `token`
- Account table uses composite PK `(provider, providerAccountId)` vs better-auth's `id` PK with `accountId`/`providerId`
- Migration `0000_modern_fallen_one.sql` already created these tables in the DB — needs a destructive migration to replace them
- DB uses `neon()` HTTP client — Drizzle adapter takes the `db` instance directly, so this is compatible

## Desired End State

- `better-auth` and `resend` installed
- Auth schema replaced with better-auth's expected tables (generated via `npx auth generate`)
- Drizzle migration generated and ready to apply
- `src/lib/auth.ts` configures better-auth with Drizzle adapter, email OTP, cookie cache, nextCookies
- `src/app/api/auth/[...all]/route.ts` handles all auth API routes
- `src/lib/session.ts` exports `getSession` wrapped in React `cache()` for request deduplication
- `src/lib/auth-client.ts` exports client-side auth hooks with email OTP client plugin
- `(application)/layout.tsx` redirects unauthenticated users to `/login`
- `(login)/layout.tsx` redirects authenticated users to `/dashboard`
- `src/env.js` validates `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`
- `make build` succeeds and `/api/auth/ok` responds

### Verification:
- `make build` passes
- `/api/auth/ok` returns a response (better-auth health check endpoint)
- TypeScript types are correct — `getSession()` returns typed session

## What We're NOT Doing

- Login page UI (separate issue #92)
- Google OAuth or social providers (future, post-pilot)
- Multi-user / role-based access (future)
- Custom email templates (nice-to-have, not blocking)
- Middleware-based route protection (using layout-level checks per issue spec)
- tRPC `protectedProcedure` integration (separate issue #93)

## Implementation Approach

1. Install packages first so types are available
2. Create auth config (`src/lib/auth.ts`) before schema generation — the CLI reads this config
3. Run `npx auth generate --adapter drizzle` to produce the correct schema
4. Replace the old auth schema with the generated one
5. Generate Drizzle migration to handle the table replacement
6. Create remaining files (route handler, session helper, auth client)
7. Wire up layout auth gates
8. Update env validation and `.env.example`

---

## Phase 1: Install Packages

### Overview
Install `better-auth` and `resend` dependencies.

### Changes Required:

```bash
yarn add better-auth resend
```

### Success Criteria:

#### Automated Verification:
- [x] `better-auth` appears in `package.json` dependencies
- [x] `resend` appears in `package.json` dependencies
- [x] `yarn install` completes without errors

---

## Phase 2: Auth Configuration & Schema Generation

### Overview
Create the auth config file so the better-auth CLI can read it, then generate the correct Drizzle schema.

### Changes Required:

#### 1. Create `src/lib/auth.ts`

**File**: `src/lib/auth.ts` (new)

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "~/server/db";
import * as authSchema from "~/server/db/schema/auth";
import { Resend } from "resend";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await resend.emails.send({
          from: "Rekurve <noreply@rekurve.ai>",
          to: email,
          subject: `Your verification code: ${otp}`,
          html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
        });
      },
    }),
    nextCookies(), // must be last
  ],
});
```

#### 2. Update env validation FIRST (needed for auth.ts to import)

**File**: `src/env.js`

Add to the `server` object:
```javascript
BETTER_AUTH_SECRET: z.string().min(32),
BETTER_AUTH_URL: z.string().url(),
RESEND_API_KEY: z.string(),
```

Add to `runtimeEnv`:
```javascript
BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
RESEND_API_KEY: process.env.RESEND_API_KEY,
```

#### 3. Generate better-auth schema

Run the CLI to generate the schema based on the auth config:

```bash
npx auth generate --adapter drizzle --output src/server/db/schema/auth.ts
```

This replaces the existing NextAuth-style schema with better-auth's expected tables: `user`, `session`, `account`, `verification`.

> **Note:** Review the generated schema to confirm it uses `text` IDs (not UUID), includes `createdAt`/`updatedAt` timestamps, and has the email OTP plugin fields if any.

#### 4. Re-export from schema index

**File**: `src/server/db/schema/index.ts`

The `export * from "./auth"` line already exists — no change needed as long as the generated file exports the tables.

#### 5. Generate Drizzle migration

```bash
yarn drizzle-kit generate
```

This will produce a migration that drops the old NextAuth tables and creates the new better-auth tables. Review the generated SQL to confirm it's a clean drop-and-recreate for the auth tables only (should not touch `leads`, `lots`, etc.).

### Success Criteria:

#### Automated Verification:
- [x] `src/lib/auth.ts` exists and imports compile
- [x] `src/server/db/schema/auth.ts` contains better-auth tables (`user`, `session`, `account`, `verification`)
- [x] New Drizzle migration SQL generated in `drizzle/` directory
- [x] `make check` passes (lint + typecheck)

#### Manual Verification:
- [x] Review generated schema matches better-auth docs expectations
- [x] Review migration SQL only touches auth tables, not domain tables

---

## Phase 3: Auth Route Handler & Session Helper

### Overview
Create the API route handler for better-auth and the cached session helper for server components.

### Changes Required:

#### 1. Create API route handler

**File**: `src/app/api/auth/[...all]/route.ts` (new)

```typescript
import { auth } from "~/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

#### 2. Create session helper

**File**: `src/lib/session.ts` (new)

```typescript
import { cache } from "react";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
```

#### 3. Create auth client

**File**: `src/lib/auth-client.ts` (new)

```typescript
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
```

### Success Criteria:

#### Automated Verification:
- [x] All three new files exist
- [x] `make check` passes (lint + typecheck)

---

## Phase 4: Layout Auth Gates

### Overview
Wire up session checks in the `(application)` and `(login)` route group layouts.

### Changes Required:

#### 1. `(application)/layout.tsx` — Protect authenticated routes

**File**: `src/app/(application)/layout.tsx`

Replace the TODO comment block (lines 33-35) with an actual auth gate. The layout function needs to become `async`:

```diff
+import { redirect } from "next/navigation";
+import { getSession } from "~/lib/session";

-export default function ApplicationLayout({
+export default async function ApplicationLayout({
   children,
 }: Readonly<{ children: React.ReactNode }>) {
-  // TODO: Auth gate — redirect to /login if no session
-  // const session = await auth()
-  // if (!session?.user) redirect("/login")
+  const session = await getSession();
+  if (!session) redirect("/login");
```

#### 2. `(login)/layout.tsx` — Redirect authenticated users

**File**: `src/app/(login)/layout.tsx`

Add session check to redirect authenticated users away from login. The layout function needs to become `async`:

```diff
+import { redirect } from "next/navigation";
+import { getSession } from "~/lib/session";

-export default function LoginLayout({
+export default async function LoginLayout({
   children,
 }: Readonly<{ children: React.ReactNode }>) {
+  const session = await getSession();
+  if (session) redirect("/dashboard");
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (lint + typecheck)
- [x] `make build` succeeds

#### Manual Verification:
- [x] Unauthenticated visit to `/dashboard` redirects to `/login`
- [ ] Authenticated visit to `/login` redirects to `/dashboard`

---

## Phase 5: Environment Variables & Cleanup

### Overview
Update `.env.example` with auth variable placeholders.

### Changes Required:

#### 1. Update `.env.example`

**File**: `.env.example`

Add:
```
# better-auth
BETTER_AUTH_SECRET=           # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Resend (email delivery for OTP)
RESEND_API_KEY=
```

### Success Criteria:

#### Automated Verification:
- [x] `make build` succeeds
- [x] better-auth API route responds at `/api/auth/ok` (in dev with valid env vars)

#### Manual Verification:
- [ ] OTP email received when triggering sign-in (requires #92 login UI or manual API call)
- [ ] Session persists across page refreshes

---

## Testing Strategy

### Automated:
- `make build` — confirms everything compiles and builds
- `make check` — lint + typecheck pass
- TypeScript verifies `getSession()` return type

### Manual Testing Steps:
1. Start dev server with valid `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY` env vars
2. Hit `/api/auth/ok` — should return a response confirming better-auth is running
3. Visit `/dashboard` unauthenticated — should redirect to `/login`
4. Visit `/login` authenticated — should redirect to `/dashboard`
5. Full OTP flow (send code, verify, session created) — requires login UI from #92 or direct API calls via curl/Postman

## Migration Notes

- The old NextAuth-style auth tables (`users`, `accounts`, `sessions`, `verification_tokens`) will be dropped and replaced
- No real user data exists in these tables (pre-MVP) — destructive migration is safe
- Domain tables (`leads`, `lots`, `lot_matches`, etc.) are untouched
- Run `yarn drizzle-kit push` or `yarn drizzle-kit migrate` against dev/staging after merging

## Performance Considerations

- Cookie cache (5min TTL) avoids a DB round-trip on every request — JWT-like performance with server-side session security
- `getSession()` wrapped in React `cache()` deduplicates within a single request — multiple components calling it only hit the cache once

## References

- GitHub issue: #91
- Dependencies: #89 (Route Group Scaffold — done), #90 (Database Setup — done)
- Blocked by this: #92 (Login Page UI), #93 (tRPC integration)
- better-auth docs: https://www.better-auth.com/docs
- better-auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
