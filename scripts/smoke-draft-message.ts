/**
 * Smoke test for `draftMessage` — dev-only script, not imported by the app.
 *
 * Usage:
 *   yarn smoke:draft <leadId>
 *
 * (Not `yarn tsx` directly — the script imports `server-only`-marked modules,
 * so it needs the baked `NODE_OPTIONS=--conditions=react-server`.)
 *
 * Loads a lead by id from the dev DB, invokes `draftMessage`, and prints
 * the output so operators can eyeball message quality, priority math, and
 * channel selection against the acceptance criteria in #127.
 */
import { eq } from "drizzle-orm";

import { draftMessage } from "~/server/ai";
import { db } from "~/server/db";
import { leads } from "~/server/db/schema";

const leadId = process.argv[2];
if (!leadId) {
  console.error("usage: yarn smoke:draft <leadId>");
  process.exit(1);
}

const lead = await db.query.leads.findFirst({
  where: eq(leads.id, leadId),
});
if (!lead) {
  throw new Error(`no lead with id ${leadId}`);
}

const result = await draftMessage({ lead });
console.dir(result, { depth: null });
