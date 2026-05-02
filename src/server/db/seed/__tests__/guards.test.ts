import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const DEV_URL =
  "postgresql://neondb_owner:secret@ep-cool-pond-a1b2c3d4.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("assertSafeToSeed", () => {
  beforeEach(() => {
    rs.resetModules();
    rs.doMock("node:child_process", () => ({
      execSync: rs.fn().mockReturnValue("feat/some-branch\n"),
    }));
  });

  test("throws when NODE_ENV is production", async () => {
    rs.doMock("~/env", () => ({
      env: { NODE_ENV: "production", NEON_PROJECT_ID: undefined },
    }));
    const { assertSafeToSeed } = await import("../guards");
    expect(() => assertSafeToSeed(DEV_URL)).toThrow(/production/);
  });

  test("throws when NEON_PROJECT_ID is set and DATABASE_URL contains it", async () => {
    const prodProjectId = "tender-heart-12345678";
    const prodUrl = `postgresql://neondb_owner:secret@ep-xxx.${prodProjectId}.us-east-2.aws.neon.tech/neondb`;
    rs.doMock("~/env", () => ({
      env: {
        NODE_ENV: "development",
        NEON_PROJECT_ID: prodProjectId,
      },
    }));
    const { assertSafeToSeed } = await import("../guards");
    expect(() => assertSafeToSeed(prodUrl)).toThrow(/production project/);
  });

  test("warns (does not throw) when NEON_PROJECT_ID is unset", async () => {
    rs.doMock("~/env", () => ({
      env: { NODE_ENV: "development", NEON_PROJECT_ID: undefined },
    }));
    const warnSpy = rs.spyOn(console, "warn").mockImplementation(() => {});
    const { assertSafeToSeed } = await import("../guards");
    expect(() => assertSafeToSeed(DEV_URL)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("NEON_PROJECT_ID"),
    );
  });

  test("throws when host is not .neon.tech", async () => {
    rs.doMock("~/env", () => ({
      env: {
        NODE_ENV: "development",
        NEON_PROJECT_ID: undefined,
      },
    }));
    const { assertSafeToSeed } = await import("../guards");
    expect(() =>
      assertSafeToSeed("postgresql://user:pass@localhost:5432/mydb"),
    ).toThrow(/neon\.tech/);
  });

  test("passes when all checks succeed", async () => {
    rs.doMock("~/env", () => ({
      env: {
        NODE_ENV: "development",
        NEON_PROJECT_ID: "prod-project-id",
      },
    }));
    rs.spyOn(console, "warn").mockImplementation(() => {});
    rs.spyOn(console, "info").mockImplementation(() => {});
    const { assertSafeToSeed } = await import("../guards");
    expect(() =>
      assertSafeToSeed(
        "postgresql://neondb_owner:secret@ep-dev-branch.us-east-2.aws.neon.tech/neondb",
      ),
    ).not.toThrow();
  });
});
