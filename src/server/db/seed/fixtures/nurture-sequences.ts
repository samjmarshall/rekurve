import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";
import type { leads } from "~/server/db/schema/leads";
import { nurtureSequences } from "~/server/db/schema/nurture-sequences";

type DB = NeonHttpDatabase<typeof schema>;
type Lead = typeof leads.$inferSelect;

const SEQUENCE_TYPES = [
  "discovery",
  "nurture",
  "warm_progression",
  "lot_alert",
] as const;

export async function seed(db: DB, faker: Faker, allLeads: Lead[]) {
  // Pick 6 distinct nurture-stage leads (unique active sequence per lead constraint)
  const nurtureLeads = allLeads
    .filter((l) => l.leadStage === "nurture")
    .slice(0, 6);

  if (nurtureLeads.length === 0) return [];

  const values = nurtureLeads.map((lead, i) => ({
    leadId: lead.id,
    sequenceType: SEQUENCE_TYPES[i % SEQUENCE_TYPES.length]!,
    status: "active" as const,
    nextStepAt: new Date(
      Date.now() + faker.number.int({ min: 1, max: 7 }) * 86_400_000,
    ),
  }));

  return db.insert(nurtureSequences).values(values).returning();
}
