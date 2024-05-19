import { type Config } from "drizzle-kit"

import { env } from "~/env"

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["rekurve_*"],
  verbose: true,
  strict: true,
} satisfies Config
