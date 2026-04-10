import "dotenv/config";
import { deletePipelineTestLeads, deleteTestLeads } from "./auth-helper";
import { deleteTestContacts } from "./hubspot-helper";

/**
 * Runs once after every worker and project finishes. Sweeps up any HubSpot
 * contacts and local leads created by e2e tests. Safe here (no race with
 * in-flight tests) in a way per-spec afterAll hooks are not.
 *
 * Failures are logged but not rethrown — cleanup errors must not mask real
 * test failures in CI output.
 */
export default async function globalTeardown() {
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    try {
      await deleteTestContacts();
    } catch (err) {
      console.error("[e2e teardown] deleteTestContacts failed:", err);
    }
  }

  if (process.env.DATABASE_URL) {
    try {
      await deleteTestLeads();
    } catch (err) {
      console.error("[e2e teardown] deleteTestLeads failed:", err);
    }
    try {
      await deletePipelineTestLeads();
    } catch (err) {
      console.error("[e2e teardown] deletePipelineTestLeads failed:", err);
    }
  }
}
