import "server-only";

import type { Faker } from "@faker-js/faker";
import type { db } from "~/server/db";
import { user } from "~/server/db/shared.schema";

type DB = typeof db;

export async function seed(db: DB, _faker: Faker) {
  const [inserted] = await db
    .insert(user)
    .values({
      id: "user_sam_marshall",
      name: "Sam Marshall",
      email: "sam.marshall@v2.ai",
      emailVerified: true,
    })
    .returning();
  return inserted!;
}
