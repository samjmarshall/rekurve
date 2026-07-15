import { rs } from "@rstest/core";

/**
 * Shared import neutraliser for worker unit suites (dispatch-email / sms /
 * imessage, reconcile-engagement, nurture, hubspot): parts of the worker
 * files' import graphs (e.g. cross-domain type sources) can reach
 * ~/server/db (module-scope neon() needs DATABASE_URL) and ~/env (validates
 * at import). These doMocks neutralise that import-time graph ONLY —
 * behaviour is still asserted through fake deps objects, never module mocks
 * (adr020). Since #330 retired the workers' ~/server/outbox event-name
 * import (names are module-private consts now), this is mostly defensive.
 *
 * Call inside beforeAll BEFORE dynamically importing the module under test.
 * `env` merges suite-specific values (e.g. HUBSPOT_CLIENT_SECRET) into the
 * otherwise-empty env.
 */
export function neutraliseWorkerImports(
  env: Record<string, unknown> = {},
): void {
  rs.doMock("~/env", () => ({ env }));
  rs.doMock("~/server/db", () => ({ db: {} }));
}
