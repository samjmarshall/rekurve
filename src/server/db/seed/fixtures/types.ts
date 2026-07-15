import "server-only";

import type { db } from "~/server/db";

/** Shared db-handle type for seed fixtures (type-only — never binds the real client). */
export type DB = typeof db;
