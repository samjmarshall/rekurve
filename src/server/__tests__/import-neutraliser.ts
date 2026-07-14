import { rs } from "@rstest/core";

/**
 * Shared import neutraliser for worker unit suites (dispatch-email / sms /
 * imessage, reconcile-engagement, nurture, hubspot): the worker files'
 * event-name import (~/server/outbox) pulls in ~/server/db (module-scope
 * neon() needs DATABASE_URL) and ~/env (validates at import). These doMocks
 * neutralise that import-time graph ONLY — behaviour is still asserted
 * through fake deps objects, never module mocks (adr020).
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
