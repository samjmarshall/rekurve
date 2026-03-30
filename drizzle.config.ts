import { defineConfig } from "drizzle-kit";
import { env } from "~/env";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL_UNPOOLED,
  },
  verbose: true,
  strict: true,
});
