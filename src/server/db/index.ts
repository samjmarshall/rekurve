import * as schema from "./schema"

import { drizzle } from "drizzle-orm/neon-http"
import { env } from "~/env"
import { neon } from "@neondatabase/serverless"

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
export const db = drizzle(neon(env.DATABASE_URL as string), { schema })
