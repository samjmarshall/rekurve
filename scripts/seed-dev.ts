// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { faker as fakerLib } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { seed as seedConversations } from "~/server/db/seed/fixtures/conversations";
import { seed as seedLeads } from "~/server/db/seed/fixtures/leads";
import { seed as seedLotMatches } from "~/server/db/seed/fixtures/lot-matches";
import { seed as seedLots } from "~/server/db/seed/fixtures/lots";
import { seed as seedMessageQueue } from "~/server/db/seed/fixtures/message-queue";
import { seed as seedOutbox } from "~/server/db/seed/fixtures/outbox";
import { seed as seedUser } from "~/server/db/seed/fixtures/user";
import { assertSafeToSeed } from "~/server/db/seed/guards";

function parseArgs() {
  const args = process.argv.slice(2);
  let seedNum = 42;
  for (const arg of args) {
    const m = arg.match(/^--seed=(\d+)$/);
    if (m) seedNum = parseInt(m[1]!, 10);
  }
  return { seedNum };
}

async function main() {
  const { seedNum } = parseArgs();
  const databaseUrl = process.env.DATABASE_URL ?? "";

  try {
    assertSafeToSeed(databaseUrl);
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }

  // Import db after guard passes (it also runs env validation, skipped via SKIP_ENV_VALIDATION=1)
  const { db } = await import("~/server/db");

  fakerLib.seed(seedNum);
  const faker = fakerLib;

  const start = Date.now();
  console.log(`[seed] Starting with seed=${seedNum}…`);

  await db.execute(
    sql`TRUNCATE message_queue, conversations, lot_matches, lots, leads, "user", outbox RESTART IDENTITY CASCADE`,
  );
  console.log("[seed] Tables truncated");

  await seedUser(db, faker);
  console.log("[seed] user: 1 row");

  const leads = await seedLeads(db, faker);
  console.log(`[seed] leads: ${leads.length} rows`);

  const lots = await seedLots(db, faker);
  console.log(`[seed] lots: ${lots.length} rows`);

  const lotMatchRows = await seedLotMatches(db, faker, leads, lots);
  console.log(`[seed] lot_matches: ${lotMatchRows.length} rows`);

  await seedConversations(db, faker, leads);
  console.log("[seed] conversations: inserted");

  await seedMessageQueue(db, faker, leads);
  console.log("[seed] message_queue: inserted");

  await seedOutbox(db, faker);
  console.log("[seed] outbox: 0 rows (event-driven, not seeded)");

  console.log(`[seed] Done in ${Date.now() - start}ms`);
}

main().catch((err) => {
  console.error("[seed] Fatal:", err);
  process.exit(1);
});
