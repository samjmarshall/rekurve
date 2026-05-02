import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, rs } from "@rstest/core";

const specsDir = join(process.cwd(), "e2e/features");

describe("cleanup-coverage", () => {
  it("every uniquePhone() call is tracked by phones.push or leadIds.push within 5 lines", () => {
    const specFiles = readdirSync(specsDir).filter((f) =>
      f.endsWith(".spec.ts"),
    );

    const violations: string[] = [];

    for (const file of specFiles) {
      const src = readFileSync(join(specsDir, file), "utf-8");
      const lines = src.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i]!.includes("uniquePhone()")) continue;

        const window = lines.slice(i + 1, i + 6).join("\n");
        if (
          !window.includes("phones.push(") &&
          !window.includes("leadIds.push(")
        ) {
          violations.push(
            `${file}:${i + 1} — uniquePhone() not tracked within 5 lines`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("E2E_SKIP_GLOBAL_TEARDOWN=1 disables globalTeardown in playwright config", async () => {
    const saved = process.env.E2E_SKIP_GLOBAL_TEARDOWN;

    try {
      process.env.E2E_SKIP_GLOBAL_TEARDOWN = "1";
      rs.resetModules();
      const withSkip = await import("../../playwright.config");
      expect(withSkip.default.globalTeardown).toBeUndefined();

      delete process.env.E2E_SKIP_GLOBAL_TEARDOWN;
      rs.resetModules();
      const withoutSkip = await import("../../playwright.config");
      expect(withoutSkip.default.globalTeardown).toBe(
        "./e2e/utils/global-teardown.ts",
      );
    } finally {
      if (saved === undefined) delete process.env.E2E_SKIP_GLOBAL_TEARDOWN;
      else process.env.E2E_SKIP_GLOBAL_TEARDOWN = saved;
      rs.resetModules();
    }
  });
});
