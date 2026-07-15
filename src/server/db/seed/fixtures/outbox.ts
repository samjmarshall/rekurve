import "server-only";

import type { Faker } from "@faker-js/faker";
import type { db } from "~/server/db";

type DB = typeof db;

export async function seed(_db: DB, _faker: Faker) {
  return [];
}
