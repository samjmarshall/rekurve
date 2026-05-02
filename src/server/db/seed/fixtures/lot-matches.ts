import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";
import type { leads } from "~/server/db/schema/leads";
import { lotMatches } from "~/server/db/schema/lot-matches";
import type { lots } from "~/server/db/schema/lots";

type DB = NeonHttpDatabase<typeof schema>;
type Lead = typeof leads.$inferSelect;
type Lot = typeof lots.$inferSelect;

const MATCH_STRENGTHS = ["strong", "partial", "stretch"] as const;
const REASONINGS = [
  "Budget aligns well with lot price and preferred estate.",
  "Suburb preference matches and lot size suits property type.",
  "Good fit on timeline and estate preference.",
  "Lot size within range; budget slightly stretched.",
  "Secondary suburb preference; worth presenting.",
  "Strong match across all key criteria.",
];

export async function seed(
  db: DB,
  faker: Faker,
  allLeads: Lead[],
  allLots: Lot[],
) {
  const activeLeads = allLeads.filter((l) =>
    ["nurture", "warm", "hot"].includes(l.leadStage),
  );

  const seen = new Set<string>();
  const values: Array<{
    lotId: string;
    leadId: string;
    matchStrength: "strong" | "partial" | "stretch";
    matchReasoning: string;
  }> = [];

  for (const lead of activeLeads) {
    const count = faker.number.int({ min: 1, max: 3 });
    const shuffled = faker.helpers.shuffle([...allLots]);
    let added = 0;
    for (const lot of shuffled) {
      if (added >= count) break;
      const key = `${lot.id}:${lead.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push({
        lotId: lot.id,
        leadId: lead.id,
        matchStrength:
          MATCH_STRENGTHS[
            faker.number.int({ min: 0, max: MATCH_STRENGTHS.length - 1 })
          ]!,
        matchReasoning:
          REASONINGS[faker.number.int({ min: 0, max: REASONINGS.length - 1 })]!,
      });
      added++;
    }
  }

  if (values.length === 0) return [];
  return db.insert(lotMatches).values(values).returning();
}
