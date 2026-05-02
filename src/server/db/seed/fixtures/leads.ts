import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";
import { leads } from "~/server/db/schema/leads";

type DB = NeonHttpDatabase<typeof schema>;

const STAGES = [
  "unqualified",
  "unqualified",
  "unqualified",
  "unqualified",
  "unqualified",
  "nurture",
  "nurture",
  "nurture",
  "nurture",
  "nurture",
  "nurture",
  "warm",
  "warm",
  "warm",
  "warm",
  "warm",
  "hot",
  "hot",
  "hot",
  "hot",
] as const;

const ESTATES = ["Creation Park", "Aura Heights", "Sunshine Rise"];
const SUBURBS = [
  "Ripley",
  "Nirimba",
  "Redbank Plains",
  "Springfield",
  "Ipswich",
];
const BUDGETS = [
  "$350k-$450k",
  "$450k-$550k",
  "$550k-$650k",
  "$650k-$750k",
  "$750k+",
];
const PROPERTY_TYPES = [
  "single_storey",
  "double_storey",
  "first_home_buyer",
  "investment",
] as const;
const TIMELINES = ["ready_now", "3_6_months", "12_months_plus"] as const;

function ausPhone(faker: Faker): string {
  return `04${faker.number.int({ min: 10000000, max: 99999999 })}`;
}

export async function seed(db: DB, faker: Faker) {
  const values = STAGES.map((stage, i) => {
    const idx = String(i + 1).padStart(3, "0");
    const daysAgo = faker.number.int({ min: 1, max: 60 });
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000);
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phone: ausPhone(faker),
      hubspotContactId: `dev_stub_lead_${idx}`,
      leadStage: stage,
      propertyType:
        PROPERTY_TYPES[
          faker.number.int({ min: 0, max: PROPERTY_TYPES.length - 1 })
        ]!,
      budget: BUDGETS[faker.number.int({ min: 0, max: BUDGETS.length - 1 })]!,
      constructionTimeline:
        TIMELINES[faker.number.int({ min: 0, max: TIMELINES.length - 1 })]!,
      preferredEstates: faker.helpers.arrayElements(ESTATES, {
        min: 1,
        max: 2,
      }),
      preferredSuburbs: faker.helpers.arrayElements(SUBURBS, {
        min: 1,
        max: 2,
      }),
      createdAt,
      updatedAt: createdAt,
    };
  });

  return db.insert(leads).values(values).returning();
}
