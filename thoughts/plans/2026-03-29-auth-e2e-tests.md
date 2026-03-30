# Auth E2E Playwright Tests — Implementation Plan

## Overview

Write Playwright tests to cover the manual testing steps from PR #104 (better-auth setup). These tests verify the auth health endpoint, unauthenticated redirect guards, and authenticated redirect guards.

## Current State Analysis

- Playwright tests live in `e2e/` with fixtures in `e2e/fixtures/test.ts` and page objects in `e2e/pages/`
- Existing tests cover the marketing homepage only — no auth-related tests exist
- The `(application)` layout redirects to `/login` when `getSession()` returns null
- The `(login)` layout redirects to `/dashboard` when `getSession()` returns a session
- `/api/auth/ok` is a better-auth built-in health endpoint
- Session cookie name: `better-auth.session_token`, value is the raw `session.token` from the DB
- `dotenv` is available as a transitive dependency for loading `.env` in tests
- DB uses `@neondatabase/serverless` (HTTP driver) — usable from the test runner

### Key Discoveries:
- `src/app/(application)/layout.tsx:36` — `if (!session) redirect("/login")`
- `src/app/(login)/layout.tsx:36` — `if (session) redirect("/dashboard")`
- `src/lib/session.ts:5-8` — `getSession()` calls `auth.api.getSession({ headers })`
- `node_modules/better-auth/dist/cookies/index.mjs:173-176` — cookie name is `better-auth.session_token`

## Desired End State

A single test file `e2e/features/auth.spec.ts` with an auth helper `e2e/utils/auth-helper.ts` that:
1. Tests `/api/auth/ok` health check returns a successful response
2. Tests unauthenticated `/dashboard` redirects to `/login`
3. Tests unauthenticated `/login` renders the login page
4. Tests authenticated `/login` redirects to `/dashboard`
5. Cleans up test data after each run

### Verification:
```bash
make test_e2e
```

## What We're NOT Doing

- Testing the OTP email flow (blocked by #92 login UI)
- Testing session expiry or cookie cache behavior
- Adding page objects for login/dashboard pages (too simple — just placeholder text)
- Modifying the Playwright config or adding new projects

## Implementation Approach

Create a lightweight auth helper that connects directly to the DB to insert/remove test users and sessions. This avoids needing to exercise the OTP flow (which requires email sending) and gives us reliable, deterministic test setup.

## Phase 1: Auth Helper Utility

### Overview
Create a helper that can create and clean up authenticated sessions in the database for use in E2E tests.

### Changes Required:

#### 1. Auth Helper
**File**: `e2e/utils/auth-helper.ts`
**Purpose**: Create/teardown test users and sessions via direct DB access

```typescript
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

// Load .env for DATABASE_URL access in the test runner
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

export interface TestSession {
  userId: string;
  sessionId: string;
  token: string;
  email: string;
}

/**
 * Create a test user and session directly in the DB.
 * Returns the session token to set as a cookie.
 */
export async function createTestSession(
  email = `test-${randomUUID()}@e2e.local`,
): Promise<TestSession> {
  const userId = randomUUID();
  const sessionId = randomUUID();
  const token = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, 'E2E Test User', ${email}, true, ${now}, ${now})
  `;

  await sql`
    INSERT INTO "session" (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${sessionId}, ${token}, ${expiresAt}, ${userId}, ${now}, ${now})
  `;

  return { userId, sessionId, token, email };
}

/**
 * Remove a test user and its cascaded session from the DB.
 */
export async function deleteTestSession(userId: string): Promise<void> {
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
}
```

### Success Criteria:

#### Automated Verification:
- [x] Typecheck passes: `make check`

#### Manual Verification:
- [x] Helper can create/delete test data against the dev database

---

## Phase 2: Auth E2E Tests

### Overview
Write the test file covering all four auth scenarios from the PR's manual testing steps.

### Changes Required:

#### 1. Auth Test File
**File**: `e2e/features/auth.spec.ts`
**Purpose**: E2E tests for auth health check, redirect guards

```typescript
import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";

test.describe("Auth Health Check", () => {
  test("/api/auth/ok returns a successful response", async ({ request }) => {
    const response = await request.get("/api/auth/ok");
    expect(response.ok()).toBe(true);
  });
});

test.describe("Unauthenticated Redirects", () => {
  test("/dashboard redirects to /login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("/login renders the login page when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toHaveText("Login");
  });
});

test.describe("Authenticated Redirects", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  test("/login redirects to /dashboard when authenticated", async ({
    context,
    page,
  }) => {
    // Set the session cookie before navigating
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/login");
    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] Typecheck passes: `make check`
- [x] Tests pass: `make test_e2e`

#### Manual Verification:
- [x] `/api/auth/ok` test passes against the running dev server
- [x] Unauthenticated `/dashboard` test correctly observes the redirect to `/login`
- [x] Login page renders with "Login" heading
- [x] Authenticated `/login` test correctly observes the redirect to `/dashboard`
- [x] Test user is cleaned up from the database after the test run

---

## Testing Strategy

### Test Matrix:
All four tests run across all three Playwright projects (desktop, tablet, mobile) — auth redirects are viewport-independent, so no skips needed.

### Edge Cases Covered:
- Unauthenticated access to protected routes
- Authenticated access to public auth routes
- API endpoint availability

### Not Tested (out of scope):
- Session expiry behavior
- Cookie cache TTL
- OTP verification flow (needs login UI from #92)
- Invalid/expired session tokens

## References

- PR #104: `feat(auth): add better-auth with email OTP and Drizzle adapter`
- Implementation plan: `thoughts/plans/2026-03-29-91-better-auth-email-otp.md`
- Existing test patterns: `e2e/features/booking-form.spec.ts`
- Auth layout gates: `src/app/(application)/layout.tsx:36`, `src/app/(login)/layout.tsx:36`
