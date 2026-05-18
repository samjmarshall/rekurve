import { createHmac, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

import "dotenv/config";

import { TEST_FIRST_NAMES } from "./hubspot-helper";

// Lazy — only initialized when createTestSession/deleteTestSession are called,
// so the module can be safely imported even when DATABASE_URL is not set (CI).
let _sql: ReturnType<typeof neon> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}
function secret() {
  return process.env.BETTER_AUTH_SECRET!;
}

export interface TestSession {
  userId: string;
  sessionId: string;
  token: string;
  signedToken: string;
  email: string;
}

/**
 * Sign a cookie value the same way better-auth does (HMAC-SHA256, base64).
 */
function signCookieValue(value: string): string {
  const signature = createHmac("sha256", secret())
    .update(value)
    .digest("base64");
  return `${value}.${signature}`;
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
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await sql()`
    INSERT INTO "user" (id, name, email, email_verified)
    VALUES (${userId}, 'E2E Test User', ${email}, true)
  `;

  await sql()`
    INSERT INTO "session" (id, token, expires_at, user_id)
    VALUES (${sessionId}, ${token}, ${expiresAt}, ${userId})
  `;

  return {
    userId,
    sessionId,
    token,
    signedToken: signCookieValue(token),
    email,
  };
}

/**
 * Remove a test user and its cascaded session from the DB.
 */
export async function deleteTestSession(userId: string): Promise<void> {
  await sql()`DELETE FROM "user" WHERE id = ${userId}`;
}

/**
 * Generate a unique AU mobile-format phone for an E2E test.
 *
 * `leads.create` dedups by email OR phone — and the leads table enforces a
 * UNIQUE constraint on `hubspot_contact_id`. Tests that share a phone end up
 * pointing at the same HubSpot contact ID, causing duplicate-key violations
 * when they run in parallel. Each test must call this to get its own phone.
 */
export function uniquePhone(): string {
  const suffix = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0");
  return `04${suffix}`;
}

/**
 * Delete leads created by E2E tests. Two patterns:
 *   - Full-form tests: email matches `e2e-%@test.rekurve.dev`
 *   - All other tests: first_name in TEST_FIRST_NAMES (hubspot-helper.ts).
 */
export async function cleanupVerificationByIdentifier(
  emails: string[],
): Promise<void> {
  if (emails.length === 0) return;
  await sql()`DELETE FROM "verification" WHERE identifier = ANY(${emails})`;
}

export async function deleteTestLeads(): Promise<void> {
  await sql()`
    DELETE FROM "leads"
    WHERE email LIKE 'e2e-%@test.rekurve.dev'
       OR first_name = ANY(${TEST_FIRST_NAMES})
  `;
}
