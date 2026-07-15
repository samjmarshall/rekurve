import { rs } from "@rstest/core";
import type { createCaller } from "~/server/api/root";

/**
 * Shared tRPC router-test harness: the ~/env + ~/server/auth/session doMock scaffold
 * every router test needs before importing the app router, plus the root
 * caller builder. Call mockTrpcContextDeps() inside beforeEach AFTER
 * rs.resetModules(); mock ~/server/db per file (its shape is test-specific).
 */

export type RootCaller = ReturnType<typeof createCaller>;

/** The session identity router tests assert against ("test-user-id"). */
export const TEST_SESSION = {
  user: { id: "test-user-id", email: "test@example.com", name: "Test" },
  session: { id: "test-session-id" },
};

// Superset of the env keys the app-router module graph reads at import time —
// one edit here when the ~/env schema grows, instead of one per test file.
const MOCK_ENV = {
  DATABASE_URL: "postgres://mock",
  HUBSPOT_ACCESS_TOKEN: "mock",
  HUBSPOT_CLIENT_SECRET: "mock",
  HUBSPOT_BCC_ADDRESS: "bcc@bcc.hubspot.com",
  MS_GRAPH_CLIENT_ID: "test-id",
  MS_GRAPH_CLIENT_SECRET: "test-secret",
  MS_GRAPH_REDIRECT_URI: "https://rekurve.localhost/api/auth/ms-graph/callback",
  BETTER_AUTH_URL: "https://rekurve.localhost",
  TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  TWILIO_AUTH_TOKEN: "test-auth-token",
  TWILIO_FROM_NUMBER: "+14155551234",
  TWILIO_CONSULTANT_NUMBER: "+61400000000",
};

/** doMock ~/env and ~/server/auth/session. `session: null` ⇒ unauthenticated. */
export function mockTrpcContextDeps({
  env = {},
  session = TEST_SESSION,
}: {
  env?: Record<string, unknown>;
  session?: typeof TEST_SESSION | null;
} = {}): void {
  rs.doMock("~/env", () => ({ env: { ...MOCK_ENV, ...env } }));
  rs.doMock("~/server/auth/session", () => ({
    getSession: rs.fn().mockResolvedValue(session),
  }));
}

/** Import the (mock-wired) app router and build a caller over a fresh ctx. */
export async function getRootCaller(): Promise<RootCaller> {
  const { createCaller } = await import("~/server/api/root");
  const { createTRPCContext } = await import("~/server/api/trpc");
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCaller(ctx);
}
