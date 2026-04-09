import { Client } from "@hubspot/api-client";

/**
 * Standalone HubSpot client for CLI setup scripts.
 *
 * Uses `process.env` directly (loaded via `dotenv/config`) instead of the app's
 * `~/env` module, so scripts do not need to satisfy the full app env schema.
 */
export const hubspot = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  numberOfApiCallRetries: 3,
});
