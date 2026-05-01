import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";
import { user } from "~/server/db/schema/auth";

type DB = NeonHttpDatabase<typeof schema>;

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
