import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";

import { TEST_FIRST_NAMES } from "./hubspot-helper";

const utilsDir = join(process.cwd(), "e2e/utils");
const specsDir = join(process.cwd(), "e2e/features");

describe("cleanup-whitelist", () => {
  it("TEST_FIRST_NAMES contains the 13 expected marker names", () => {
    expect([...TEST_FIRST_NAMES].sort()).toEqual(
      [
        "Approve",
        "Count",
        "Dismiss",
        "E2E",
        "Edit",
        "FHOG",
        "Nav",
        "Nurture",
        "Order",
        "Pipeline",
        "QC",
        "Quick",
        "Snooze",
      ].sort(),
    );
  });

  it("auth-helper references TEST_FIRST_NAMES instead of a hardcoded list", () => {
    const src = readFileSync(join(utilsDir, "auth-helper.ts"), "utf-8");
    expect(src).toContain("TEST_FIRST_NAMES");
    // The old 13-name inline array must be gone
    expect(src).not.toMatch(/'Approve'[^;]*'Nurture'[^;]*'Snooze'/s);
  });

  it("hubspot-helper Phase 1 references TEST_FIRST_NAMES instead of a hardcoded list", () => {
    const src = readFileSync(join(utilsDir, "hubspot-helper.ts"), "utf-8");
    // The old Phase 1 12-name array (missing Nurture) must be gone
    expect(src).not.toMatch(
      /'Nav',\s*'Order',\s*'Pipeline',\s*'QC',\s*'Quick',\s*'Snooze'/,
    );
  });

  it("covers every firstName used in spec files (or has an explicit exemption)", () => {
    // Firstnames covered by phone-based cleanup (cleanupTestLeadsByPhone) or
    // seedLead (bypasses HubSpot sync), or that never reach the DB.
    const EXEMPT = new Set([
      "HubSpot", // hubspot-sync.spec.ts — tracked by phone
      "Updated", // hubspot-sync.spec.ts — tracked by phone
      "Inbound", // hubspot-sync.spec.ts — tracked by phone
      "EmailDispatch", // email-dispatch.spec.ts — seedLead, no HubSpot sync
      "FailPath", // email-dispatch.spec.ts — seedLead, no HubSpot sync
      "Persist", // leads-crud.spec.ts — form persistence test, never submitted
      "Bad", // leads-crud.spec.ts — validation test, submission blocked by error
    ]);

    const specFiles = readdirSync(specsDir).filter((f) =>
      f.endsWith(".spec.ts"),
    );

    const uncovered: string[] = [];
    for (const file of specFiles) {
      const src = readFileSync(join(specsDir, file), "utf-8");
      for (const match of src.matchAll(/firstName:\s*["']([A-Za-z]+)["']/g)) {
        const name = match[1]!;
        if (!TEST_FIRST_NAMES.includes(name) && !EXEMPT.has(name)) {
          uncovered.push(`${name} (${file})`);
        }
      }
    }

    expect(uncovered).toEqual([]);
  });
});
