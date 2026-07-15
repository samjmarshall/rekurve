import "server-only";

import type { Faker } from "@faker-js/faker";
import type { db } from "~/server/db";
import { lots } from "~/server/lots/lots.schema";

type DB = typeof db;

const ESTATES = [
  { name: "Creation Park", suburb: "Ripley" },
  { name: "Aura Heights", suburb: "Nirimba" },
  { name: "Sunshine Rise", suburb: "Redbank Plains" },
];

const AVAILABILITY_TYPES = [
  "first_come",
  "exclusive_territory",
  "developer_direct",
] as const;

const STATUSES = [
  "available",
  "available",
  "available",
  "matched",
  "sold",
] as const;

export async function seed(db: DB, faker: Faker) {
  const values = ESTATES.flatMap((estate, ei) =>
    Array.from({ length: 5 }, (_, li) => {
      const lotNum = ei * 100 + 101 + li;
      const availabilityType =
        AVAILABILITY_TYPES[
          faker.number.int({ min: 0, max: AVAILABILITY_TYPES.length - 1 })
        ]!;
      const status =
        STATUSES[faker.number.int({ min: 0, max: STATUSES.length - 1 })]!;
      const isExclusive = availabilityType === "exclusive_territory";
      const exclusiveUntil = isExclusive
        ? new Date(
            Date.now() + faker.number.int({ min: 7, max: 30 }) * 86_400_000,
          )
        : null;
      return {
        estateName: estate.name,
        suburb: estate.suburb,
        lotNumber: String(lotNum),
        landSizeSqm: String(faker.number.int({ min: 300, max: 700 })),
        frontageM: String(faker.number.int({ min: 10, max: 20 })),
        price: String(faker.number.int({ min: 200_000, max: 450_000 })),
        availabilityType,
        exclusiveUntil,
        status,
      };
    }),
  );

  return db.insert(lots).values(values).returning();
}
