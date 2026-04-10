import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

import "dotenv/config";

// Lazy — only initialized when called, so the module can be imported even
// when DATABASE_URL is not set (CI).
let _sql: NeonQueryFunction<false, false> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}

/**
 * Look up a lead's id by phone number. Used by E2E tests that create leads
 * via quick capture (which has no id in its success toast) and need to
 * navigate to /leads/[id].
 *
 * Throws if no lead is found, to fail fast instead of navigating to a
 * bogus URL.
 */
export async function getLeadIdByPhone(phone: string): Promise<string> {
  const rows = await sql()`
    SELECT id FROM "leads" WHERE phone = ${phone} LIMIT 1
  `;
  if (rows.length === 0) {
    throw new Error(`No lead found with phone ${phone}`);
  }
  return rows[0]!.id as string;
}
