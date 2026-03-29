import { neon } from "@neondatabase/serverless";
import { createHmac, randomUUID } from "crypto";

import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);
const secret = process.env.BETTER_AUTH_SECRET!;

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
  const signature = createHmac("sha256", secret)
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

  await sql`
    INSERT INTO "user" (id, name, email, email_verified)
    VALUES (${userId}, 'E2E Test User', ${email}, true)
  `;

  await sql`
    INSERT INTO "session" (id, token, expires_at, user_id)
    VALUES (${sessionId}, ${token}, ${expiresAt}, ${userId})
  `;

  return { userId, sessionId, token, signedToken: signCookieValue(token), email };
}

/**
 * Remove a test user and its cascaded session from the DB.
 */
export async function deleteTestSession(userId: string): Promise<void> {
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
}
