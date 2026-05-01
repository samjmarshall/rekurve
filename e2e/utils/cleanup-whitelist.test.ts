import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, rs } from "@rstest/core";

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
      "StatusCb", // sms-dispatch.spec.ts — seedLead, no HubSpot sync
      "StatusCbBadSig", // sms-dispatch.spec.ts — seedLead, no HubSpot sync
      "SmsFailPath", // sms-dispatch.spec.ts — seedLead, no HubSpot sync
      "SmsHappyPath", // sms-dispatch.spec.ts — seedLead, no HubSpot sync
      "SmsShareMobile", // sms-share.spec.ts — seedLead, no HubSpot sync
      "SmsShareCancel", // sms-share.spec.ts — seedLead, no HubSpot sync
      "SmsShareCopy", // sms-share.spec.ts — seedLead, no HubSpot sync
      "SmsShareMessages", // sms-share.spec.ts — seedLead, no HubSpot sync
      "SmsShareClose", // sms-share.spec.ts — seedLead, no HubSpot sync
      "SmsEditMobile", // sms-share.spec.ts — seedLead, no HubSpot sync
      "SmsFlagOn", // sms-share.spec.ts — seedLead, no HubSpot sync
      "Persist", // leads-crud.spec.ts — form persistence test, never submitted
      "Bad", // leads-crud.spec.ts — validation test, submission blocked by error
      "Conv", // lead-profile.spec.ts (conversation history) — seedLead, no HubSpot sync
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

describe("deleteTestContacts Phase 2 pagination", () => {
  let mockDoSearch: ReturnType<typeof rs.fn>;
  let mockArchive: ReturnType<typeof rs.fn>;

  beforeEach(() => {
    rs.resetModules();

    mockDoSearch = rs.fn();
    mockArchive = rs.fn().mockResolvedValue(undefined);

    rs.doMock("@hubspot/api-client", () => ({
      Client: class {
        crm = {
          contacts: {
            searchApi: { doSearch: mockDoSearch },
            basicApi: { archive: mockArchive },
          },
        };
      },
    }));

    rs.doMock("@neondatabase/serverless", () => ({
      neon: () => () => Promise.resolve([]),
    }));
  });

  it("paginates through all pages and archives all 250 contacts", async () => {
    const makeContacts = (start: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({ id: `contact-${start + i}` }));

    mockDoSearch
      .mockResolvedValueOnce({
        results: makeContacts(0, 100),
        paging: { next: { after: "100" } },
      })
      .mockResolvedValueOnce({
        results: makeContacts(100, 100),
        paging: { next: { after: "200" } },
      })
      .mockResolvedValueOnce({
        results: makeContacts(200, 50),
      });

    const { deleteTestContacts } = await import("./hubspot-helper");
    await deleteTestContacts();

    expect(mockDoSearch).toHaveBeenCalledTimes(3);
    expect(mockArchive).toHaveBeenCalledTimes(250);
  });

  it("stops after a single page when there is no next cursor", async () => {
    mockDoSearch.mockResolvedValueOnce({
      results: [{ id: "only-1" }, { id: "only-2" }],
    });

    const { deleteTestContacts } = await import("./hubspot-helper");
    await deleteTestContacts();

    expect(mockDoSearch).toHaveBeenCalledTimes(1);
    expect(mockArchive).toHaveBeenCalledTimes(2);
  });
});
