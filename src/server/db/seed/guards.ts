import { execSync } from "node:child_process";
import { env } from "~/env";

export function assertSafeToSeed(databaseUrl: string): void {
  if (env.NODE_ENV === "production") {
    throw new Error("[seed guard] Refusing to seed: NODE_ENV is production");
  }

  if (env.NEON_PROJECT_ID) {
    if (databaseUrl.includes(env.NEON_PROJECT_ID)) {
      throw new Error(
        "[seed guard] Refusing to seed: DATABASE_URL contains the production project ID",
      );
    }
  } else {
    console.warn(
      "[seed guard] NEON_PROJECT_ID is not set — cannot verify this is not a production database",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error(
      "[seed guard] Refusing to seed: DATABASE_URL is not a valid URL",
    );
  }
  if (!parsedUrl.hostname.endsWith(".neon.tech")) {
    throw new Error(
      `[seed guard] Refusing to seed: DATABASE_URL host "${parsedUrl.hostname}" is not a .neon.tech host`,
    );
  }

  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
    console.info(`[seed guard] Seeding against git branch: ${branch}`);
  } catch {
    console.warn("[seed guard] Could not determine current git branch");
  }
}
