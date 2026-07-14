import type { HubSpotContact } from "../contacts";

/**
 * Shared fixtures for the hubspot suites (worker unit/integration, webhook
 * service, HTTP route). Import-safe everywhere: type-only/dynamic imports
 * only, so pulling this in never evaluates ~/env or ~/server/db.
 */

/** The one place that lists the HubSpotContact wire shape: a field change is
 * made HERE once, not per test file. */
export function makeHsContact(
  id: string,
  overrides: Partial<HubSpotContact> = {},
): HubSpotContact {
  return { id, properties: {}, createdAt: "", updatedAt: "", ...overrides };
}

/**
 * Signed-webhook request builder — pins the `x-hubspot-signature-v3` /
 * `x-hubspot-request-timestamp` wire format ONCE for the webhook service test
 * and the route test (a signature-scheme migration lands here, not in two
 * copies). Pass `signature`/`timestamp` as `null` to omit that header;
 * `undefined` gets a valid-looking default.
 */
export function makeWebhookRequest(opts: {
  body?: string;
  signature?: string | null;
  timestamp?: string | null;
}): Request {
  const headers = new Headers();
  if (opts.signature !== null) {
    headers.set("x-hubspot-signature-v3", opts.signature ?? "sig");
  }
  if (opts.timestamp !== null) {
    headers.set(
      "x-hubspot-request-timestamp",
      opts.timestamp ?? String(Date.now()),
    );
  }
  return new Request("https://example.com/api/hubspot/webhook", {
    method: "POST",
    headers,
    body: opts.body ?? '[{"subscriptionType":"contact.creation","objectId":1}]',
  });
}

/**
 * afterAll Neon cleanup for integration suites that insert ad-hoc `leads`
 * rows: push created ids during the test, hand the array here. Dynamic
 * imports so unit runs (no INTEGRATION_DB) never evaluate the real env;
 * no-op on an empty list.
 */
export async function cleanupLeads(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const { inArray } = await import("drizzle-orm");
  const { db } = await import("~/server/db");
  const { leads } = await import("~/server/leads/leads.schema");
  await db.delete(leads).where(inArray(leads.id, [...ids]));
}
