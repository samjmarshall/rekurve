import * as schema from "./schema";

import { drizzle } from "drizzle-orm/neon-http";
import { env } from "~/env";
import { neon } from "@neondatabase/serverless";

export const db = drizzle(neon(env.DATABASE_URL), { schema });