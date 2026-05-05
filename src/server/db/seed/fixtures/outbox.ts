import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";

type DB = NeonHttpDatabase<typeof schema>;

export async function seed(_db: DB, _faker: Faker) {
  return [];
}
