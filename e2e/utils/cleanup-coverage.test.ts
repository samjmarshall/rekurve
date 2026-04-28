import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";

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
});
