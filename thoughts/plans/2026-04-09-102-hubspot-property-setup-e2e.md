# HubSpot Property Provisioning & E2E Sync Tests — Implementation Plan

## Overview

Automate the creation of custom HubSpot properties (currently a manual 7-step process) and add E2E tests that verify the full HubSpot contact sync pipeline — outbound (app creates lead, contact appears in HubSpot) and inbound (contact changed in HubSpot, local lead updates via webhook).

## Current State Analysis

- **Property creation**: Manual — documented in `thoughts/guides/hubspot-manual-setup.md` steps 1-3. Seven custom properties + one property group created by hand in the HubSpot UI.
- **Properties API**: `hubspot.crm.properties.coreApi.create()` and `groupsApi.create()` are available on the installed `@hubspot/api-client` v13.5.0 (`client.ts:4-7`). HubSpot returns 409 on duplicate, enabling an idempotent `ensure*` pattern.
- **Webhook subscriptions**: NOT programmable for private apps — stays manual (Step 4 of setup guide).
- **E2E test infrastructure**: Mature Playwright setup with page objects (`e2e/pages/sections/lead-form.section.ts`), direct DB session creation (`e2e/utils/auth-helper.ts`), and env-gated `test.skip()` (`leads-crud.spec.ts:13-16`).
- **Existing lead form E2E**: `e2e/features/leads-crud.spec.ts` covers form submission, validation, and quick capture — but does not verify HubSpot side effects.
- **Unit test coverage**: All HubSpot sync logic (dedup, create, update, webhook handlers) covered by unit tests with mocked API calls.

### Key Discoveries

- E2E tests use their own `@neondatabase/serverless` client (`auth-helper.ts:9-12`), not the app's DB module — the HubSpot helper must similarly create its own `Client` instance from env vars
- `deleteTestLeads()` in `auth-helper.ts:76-82` cleans up by email pattern (`e2e-%@test.rekurve.dev`) — HubSpot cleanup needs to follow the same pattern
- The Playwright config skips `webServer` in CI and tests against a deployed URL (`playwright.config.ts:40-47`) — inbound webhook tests only work against a deployed environment
- `PropertyCreate` requires: `name`, `label`, `type`, `fieldType`, `groupName`; optional `options` for enumerations, `description`

## Desired End State

1. A `src/server/hubspot/setup.ts` module with an idempotent `ensureAllProperties()` function that provisions the "Rekurve" property group and all 7 custom properties
2. A `make hubspot_setup` target that runs the provisioning
3. E2E tests in `e2e/features/hubspot-sync.spec.ts` that verify:
   - Creating a lead in the app produces a HubSpot contact with correct properties
   - Creating a lead with an existing HubSpot email dedup-updates instead of duplicating
   - Updating a contact's phone in HubSpot updates the local lead via webhook
   - Deleting a contact in HubSpot removes the local lead via webhook
4. `thoughts/guides/hubspot-manual-setup.md` updated: property creation replaced with `make hubspot_setup`, webhook config stays manual

### Verification

- `make check` passes
- `make test` passes (new unit tests for setup module)
- `make test_e2e` passes (new E2E tests skip gracefully when HubSpot credentials are absent)
- Running `make hubspot_setup` against a live HubSpot account creates the properties idempotently

## What We're NOT Doing

- **Programmatic webhook subscription** — private apps don't support this via API
- **Provisioning existing Epic 1 properties** — the 9 properties from Epic 1 (`has_land`, `land_registered`, etc.) are already created; the setup module only handles the 7 new ones
- **CI integration for HubSpot E2E tests** — these require live HubSpot credentials and (for inbound) the production deployment; they run locally/manually
- **Multi-environment webhook configuration** — the HubSpot webhook target URL is manually configured to point to production only. Inbound sync tests can only run against production.
- **HubSpot sandbox/test account management** — uses the real HubSpot account with test-prefixed data

---

## Phase 1: HubSpot Property Provisioning Module

### Overview

Create a module that provisions the "Rekurve" property group and 7 custom contact properties in HubSpot. Uses an idempotent pattern: attempt create, catch 409 (already exists), log result.

### Changes Required

#### 1. Setup Module

**File**: `src/server/hubspot/setup.ts`

```typescript
import { hubspot } from "./client";

interface PropertyDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "enumeration";
  fieldType: "text" | "textarea" | "number" | "select";
  description?: string;
  options?: Array<{ label: string; value: string; displayOrder: number }>;
}

const GROUP_NAME = "rekurve";

const CUSTOM_PROPERTIES: PropertyDefinition[] = [
  {
    name: "preferred_contact_time",
    label: "Preferred Contact Time",
    type: "enumeration",
    fieldType: "select",
    options: [
      { label: "Weekdays", value: "weekdays", displayOrder: 0 },
      { label: "Weekends", value: "weekends", displayOrder: 1 },
      { label: "Anytime", value: "anytime", displayOrder: 2 },
    ],
  },
  {
    name: "land_width",
    label: "Land Width (m)",
    type: "string",
    fieldType: "text",
  },
  {
    name: "land_depth",
    label: "Land Depth (m)",
    type: "string",
    fieldType: "text",
  },
  {
    name: "lead_score",
    label: "Rekurve Lead Score",
    type: "number",
    fieldType: "number",
  },
  {
    name: "lead_stage",
    label: "Rekurve Lead Stage",
    type: "enumeration",
    fieldType: "select",
    options: [
      { label: "Unqualified", value: "unqualified", displayOrder: 0 },
      { label: "Nurture", value: "nurture", displayOrder: 1 },
      { label: "Warm", value: "warm", displayOrder: 2 },
      { label: "Hot", value: "hot", displayOrder: 3 },
    ],
  },
  {
    name: "notes",
    label: "Rekurve Notes",
    type: "string",
    fieldType: "textarea",
  },
  {
    name: "lead_source",
    label: "Rekurve Lead Source",
    type: "enumeration",
    fieldType: "select",
    options: [
      { label: "Walk-in", value: "walk_in", displayOrder: 0 },
      { label: "Referral", value: "referral", displayOrder: 1 },
      { label: "Social", value: "social", displayOrder: 2 },
      { label: "Web", value: "web", displayOrder: 3 },
      { label: "Other", value: "other", displayOrder: 4 },
    ],
  },
];

async function ensurePropertyGroup(): Promise<void> {
  try {
    await hubspot.crm.properties.groupsApi.create("contacts", {
      name: GROUP_NAME,
      label: "Rekurve",
    });
    console.log(`[HubSpot Setup] Created property group: ${GROUP_NAME}`);
  } catch (err: unknown) {
    if (isConflict(err)) {
      console.log(`[HubSpot Setup] Property group already exists: ${GROUP_NAME}`);
      return;
    }
    throw err;
  }
}

async function ensureProperty(def: PropertyDefinition): Promise<void> {
  try {
    await hubspot.crm.properties.coreApi.create("contacts", {
      name: def.name,
      label: def.label,
      type: def.type,
      fieldType: def.fieldType,
      groupName: GROUP_NAME,
      ...(def.description && { description: def.description }),
      ...(def.options && {
        options: def.options.map((o) => ({ ...o, hidden: false })),
      }),
    });
    console.log(`[HubSpot Setup] Created property: ${def.name}`);
  } catch (err: unknown) {
    if (isConflict(err)) {
      console.log(`[HubSpot Setup] Property already exists: ${def.name}`);
      return;
    }
    throw err;
  }
}

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 409
  );
}

/** Provision the Rekurve property group and all custom properties. Idempotent. */
export async function ensureAllProperties(): Promise<void> {
  await ensurePropertyGroup();
  for (const def of CUSTOM_PROPERTIES) {
    await ensureProperty(def);
  }
  console.log("[HubSpot Setup] All properties ensured.");
}

// Allow running as a standalone script: npx tsx src/server/hubspot/setup.ts
if (
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("setup.ts")
) {
  ensureAllProperties()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[HubSpot Setup] Failed:", err);
      process.exit(1);
    });
}
```

#### 2. Barrel Export

**File**: `src/server/hubspot/index.ts`

Add `ensureAllProperties` to the exports:

```typescript
export { ensureAllProperties } from "./setup";
```

#### 3. Makefile Target

**File**: `Makefile`

Add after the existing targets:

```makefile
hubspot_setup:
	yarn tsx src/server/hubspot/setup.ts
```

#### 4. Tests

**File**: `src/server/hubspot/__tests__/setup.test.ts`

```typescript
import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockGroupCreate: ReturnType<typeof rs.fn>;
let mockPropertyCreate: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockGroupCreate = rs.fn().mockResolvedValue({});
  mockPropertyCreate = rs.fn().mockResolvedValue({});

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_ACCESS_TOKEN: "test-token",
      HUBSPOT_CLIENT_SECRET: "test-secret",
    },
  }));

  rs.doMock("../client", () => ({
    hubspot: {
      crm: {
        properties: {
          groupsApi: { create: mockGroupCreate },
          coreApi: { create: mockPropertyCreate },
        },
      },
    },
  }));
});

describe("ensureAllProperties", () => {
  test("creates property group and all 7 custom properties", async () => {
    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    expect(mockGroupCreate).toHaveBeenCalledTimes(1);
    expect(mockGroupCreate).toHaveBeenCalledWith("contacts", {
      name: "rekurve",
      label: "Rekurve",
    });

    expect(mockPropertyCreate).toHaveBeenCalledTimes(7);
    // Verify each property name was created
    const names = mockPropertyCreate.mock.calls.map(
      (call: [string, { name: string }]) => call[1].name,
    );
    expect(names).toEqual([
      "preferred_contact_time",
      "land_width",
      "land_depth",
      "lead_score",
      "lead_stage",
      "notes",
      "lead_source",
    ]);
  });

  test("swallows 409 conflicts for group", async () => {
    mockGroupCreate.mockRejectedValue({ code: 409 });

    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    // Should not throw — continues to create properties
    expect(mockPropertyCreate).toHaveBeenCalledTimes(7);
  });

  test("swallows 409 conflicts for properties", async () => {
    mockPropertyCreate.mockRejectedValue({ code: 409 });

    const { ensureAllProperties } = await import("../setup");
    // Should not throw
    await ensureAllProperties();
  });

  test("throws non-409 errors", async () => {
    mockGroupCreate.mockRejectedValue({ code: 500, message: "Server error" });

    const { ensureAllProperties } = await import("../setup");
    await expect(ensureAllProperties()).rejects.toEqual(
      expect.objectContaining({ code: 500 }),
    );
  });

  test("creates enumeration properties with options", async () => {
    const { ensureAllProperties } = await import("../setup");
    await ensureAllProperties();

    // lead_stage should have options
    const leadStageCall = mockPropertyCreate.mock.calls.find(
      (call: [string, { name: string }]) => call[1].name === "lead_stage",
    );
    expect(leadStageCall[1]).toEqual(
      expect.objectContaining({
        type: "enumeration",
        fieldType: "select",
        options: expect.arrayContaining([
          expect.objectContaining({ value: "hot", label: "Hot" }),
        ]),
      }),
    );
  });
});
```

### Success Criteria

#### Automated Verification
- [x] `make check` passes
- [x] `make test` passes — all new setup tests pass
- [x] `ensureAllProperties()` creates group + 7 properties
- [x] 409 conflicts are silently swallowed
- [x] Non-409 errors propagate

#### Manual Verification
- [ ] `make hubspot_setup` runs successfully against live HubSpot account
- [ ] Running it twice is idempotent (no errors on second run)
- [ ] Properties appear in HubSpot under the "Rekurve" group

---

## Phase 2: HubSpot E2E Test Helper

### Overview

Create a self-contained E2E utility (like `auth-helper.ts`) that provides HubSpot API operations for test setup, verification, and cleanup. Uses its own `Client` instance from `process.env.HUBSPOT_ACCESS_TOKEN`.

### Changes Required

#### 1. HubSpot Helper

**File**: `e2e/utils/hubspot-helper.ts`

```typescript
import { Client } from "@hubspot/api-client";
import { neon } from "@neondatabase/serverless";

import "dotenv/config";

// Lazy — only initialized when a function is called
let _hubspot: Client | undefined;
function hubspot() {
  _hubspot ??= new Client({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
    numberOfApiCallRetries: 3,
  });
  return _hubspot;
}

let _sql: ReturnType<typeof neon> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}

const ALL_PROPERTIES = [
  "firstname", "lastname", "email", "phone",
  "has_land", "land_registered", "land_address", "land_size_sqm",
  "property_type", "budget", "seen_broker", "construction_timeline",
  "resolve_finance_opted_in", "preferred_contact_time",
  "land_width", "land_depth", "lead_score", "lead_stage",
  "notes", "lead_source",
];

export interface TestContact {
  id: string;
  properties: Record<string, string | null>;
}

/** Search for a contact by email. Returns null if not found. */
export async function findContactByEmail(
  email: string,
): Promise<TestContact | null> {
  const response = await hubspot().crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          { propertyName: "email", operator: "EQ", value: email },
        ],
      },
    ],
    properties: ALL_PROPERTIES,
    limit: 1,
    after: "0",
    sorts: [],
  });
  if (response.results.length === 0) return null;
  const c = response.results[0]!;
  return { id: c.id, properties: c.properties as Record<string, string | null> };
}

/** Create a contact in HubSpot for test seeding. */
export async function createTestContact(
  properties: Record<string, string>,
): Promise<TestContact> {
  const response = await hubspot().crm.contacts.basicApi.create({
    properties,
    associations: [],
  });
  return {
    id: response.id,
    properties: response.properties as Record<string, string | null>,
  };
}

/** Update a contact's property in HubSpot. */
export async function updateTestContact(
  hubspotId: string,
  properties: Record<string, string>,
): Promise<void> {
  await hubspot().crm.contacts.basicApi.update(hubspotId, { properties });
}

/** Archive (soft-delete) a contact in HubSpot. */
export async function archiveTestContact(hubspotId: string): Promise<void> {
  await hubspot().crm.contacts.basicApi.archive(hubspotId);
}

/** Delete all HubSpot contacts matching the E2E test email pattern. */
export async function deleteTestContacts(): Promise<void> {
  const response = await hubspot().crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: "CONTAINS_TOKEN",
            value: "test.rekurve.dev",
          },
        ],
      },
    ],
    properties: ["email"],
    limit: 100,
    after: "0",
    sorts: [],
  });

  for (const contact of response.results) {
    try {
      await hubspot().crm.contacts.basicApi.archive(contact.id);
    } catch {
      // Already deleted — ignore
    }
  }
}

/**
 * Poll the local DB until a lead matching the email has the expected value,
 * or until the timeout expires. For verifying inbound webhook processing.
 */
export async function waitForLeadField(
  email: string,
  field: string,
  expected: string,
  timeoutMs = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await sql()`
      SELECT * FROM "leads" WHERE email = ${email} LIMIT 1
    `;
    if (rows.length > 0 && String(rows[0][field]) === expected) {
      return;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `Timed out waiting for leads.${field} = "${expected}" (email: ${email})`,
  );
}

/**
 * Poll the local DB until a lead matching the email no longer exists.
 * For verifying inbound webhook deletion.
 */
export async function waitForLeadDeletion(
  email: string,
  timeoutMs = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await sql()`
      SELECT id FROM "leads" WHERE email = ${email} LIMIT 1
    `;
    if (rows.length === 0) return;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `Timed out waiting for lead deletion (email: ${email})`,
  );
}

/** Read the hubspot_contact_id for a lead from the local DB. */
export async function getLeadHubSpotId(
  email: string,
): Promise<string | null> {
  const rows = await sql()`
    SELECT hubspot_contact_id FROM "leads" WHERE email = ${email} LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].hubspot_contact_id as string | null) : null;
}
```

### Success Criteria

#### Automated Verification
- [x] `make check` passes (the helper has no type errors)
- [x] Helper is importable from test files

#### Manual Verification
- [ ] None — utility module, exercised by Phase 3/4 tests

---

## Phase 3: E2E Outbound Sync Tests

### Overview

Verify that creating a lead in the app produces a correctly populated contact in HubSpot, and that the dedup logic updates existing contacts instead of creating duplicates.

### Changes Required

#### 1. Test File

**File**: `e2e/features/hubspot-sync.spec.ts`

```typescript
import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import {
  createTestSession,
  deleteTestLeads,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import {
  createTestContact,
  deleteTestContacts,
  findContactByEmail,
  getLeadHubSpotId,
} from "../utils/hubspot-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("HubSpot Outbound Sync — E2E", () => {
  test.skip(
    !process.env.HUBSPOT_ACCESS_TOKEN || !process.env.DATABASE_URL,
    "Requires HUBSPOT_ACCESS_TOKEN and DATABASE_URL — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
    // Clean up any leftover test contacts from previous runs
    await deleteTestContacts();
    await deleteTestLeads();
  });

  test.afterAll(async () => {
    await deleteTestContacts();
    await deleteTestLeads();
    await deleteTestSession(session.userId);
  });

  test("creating a lead produces a HubSpot contact with matching properties", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;

    await page.goto("/leads/new");
    const form = new LeadFormSection(page);

    // Step 1: Contact
    await form.fillStep1({
      firstName: "HubSpot",
      lastName: `Sync ${uniqueId}`,
      phone: "0412345678",
      email: testEmail,
    });
    await form.selectSegmented("Preferred contact time", "Anytime");
    await form.clickNext();

    // Step 2: Land
    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landAddressInput.fill("42 Test Ave");
    await form.landSqmInput.fill("500");
    await form.landWidthInput.fill("20");
    await form.landDepthInput.fill("25");
    await form.clickNext();

    // Step 3: Build
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$700,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    // Step 4: Additional
    await form.notesTextarea.fill("E2E HubSpot sync test");
    await form.clickSubmit();
    await form.expectSuccess(`HubSpot Sync ${uniqueId}`);

    // Verify: contact exists in HubSpot with correct properties
    // Allow a brief delay for the HubSpot API call to complete
    const contact = await findContactByEmail(testEmail);
    expect(contact).not.toBeNull();
    expect(contact!.properties.firstname).toBe("HubSpot");
    expect(contact!.properties.lastname).toBe(`Sync ${uniqueId}`);
    expect(contact!.properties.email).toBe(testEmail);
    expect(contact!.properties.phone).toBe("0412345678");
    expect(contact!.properties.has_land).toBe("true");
    expect(contact!.properties.land_address).toBe("42 Test Ave");
    expect(contact!.properties.land_size_sqm).toBe("500");
    expect(contact!.properties.land_width).toBe("20");
    expect(contact!.properties.land_depth).toBe("25");
    expect(contact!.properties.property_type).toBe("first_home_buyer");
    expect(contact!.properties.budget).toBe("$700,000");
    expect(contact!.properties.construction_timeline).toBe("ready_now");
    expect(contact!.properties.notes).toBe("E2E HubSpot sync test");
    expect(contact!.properties.preferred_contact_time).toBe("anytime");

    // Verify: local lead has hubspotContactId
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).toBe(contact!.id);
  });

  test("creating a lead with an existing HubSpot email updates instead of duplicating", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;

    // Seed: create a contact in HubSpot first
    const seeded = await createTestContact({
      firstname: "Existing",
      lastname: "Contact",
      email: testEmail,
      phone: "0400000000",
    });

    // Create a lead in the app with the same email
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);

    await form.fillStep1({
      firstName: "Updated",
      lastName: `Dedup ${uniqueId}`,
      phone: "0412345678",
      email: testEmail,
    });
    await form.clickNext();

    // Step 2: minimal land info
    await form.selectSegmented("Has land", "No");
    await form.clickNext();

    // Step 3: minimal build info
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();

    // Step 4: submit
    await form.clickSubmit();
    await form.expectSuccess(`Updated Dedup ${uniqueId}`);

    // Verify: the seeded contact was UPDATED, not a new one created
    const contact = await findContactByEmail(testEmail);
    expect(contact).not.toBeNull();
    expect(contact!.id).toBe(seeded.id); // Same contact ID — not a duplicate
    expect(contact!.properties.firstname).toBe("Updated");
    expect(contact!.properties.lastname).toBe(`Dedup ${uniqueId}`);

    // Verify: local lead references the same HubSpot contact
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).toBe(seeded.id);
  });
});
```

### Success Criteria

#### Automated Verification
- [x] `make check` passes
- [x] Tests skip gracefully when `HUBSPOT_ACCESS_TOKEN` is absent
- [x] `yarn test:e2e:features -- hubspot-sync` passes against a live environment

#### Manual Verification
- [ ] Confirm the created contact is visible in the HubSpot UI with all Rekurve properties populated
- [ ] Confirm the dedup test did not create a duplicate contact

---

## Phase 4: E2E Inbound Sync Tests

### Overview

Verify that changes made directly in HubSpot (property edits, contact deletion) propagate to the local leads table via webhook processing. These tests can only run against the **production deployment** — the HubSpot webhook target URL is manually configured to point to production only.

### Changes Required

#### 1. Inbound Tests (same file)

**File**: `e2e/features/hubspot-sync.spec.ts` (appended)

```typescript
import {
  archiveTestContact,
  updateTestContact,
  waitForLeadDeletion,
  waitForLeadField,
} from "../utils/hubspot-helper";

test.describe("HubSpot Inbound Sync — E2E", () => {
  test.skip(
    !process.env.HUBSPOT_ACCESS_TOKEN ||
      !process.env.DATABASE_URL ||
      !process.env.HUBSPOT_WEBHOOK_ACTIVE,
    "Requires HUBSPOT_ACCESS_TOKEN, DATABASE_URL, and HUBSPOT_WEBHOOK_ACTIVE — only against production (webhook target is production-only)",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
    await deleteTestContacts();
    await deleteTestLeads();
  });

  test.afterAll(async () => {
    await deleteTestContacts();
    await deleteTestLeads();
    await deleteTestSession(session.userId);
  });

  test("editing a contact's phone in HubSpot updates the local lead", async ({
    context,
    page,
    baseURL,
  }) => {
    test.setTimeout(60_000); // Webhook latency

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;

    // Step 1: Create a lead via the app (establishes the HubSpot link)
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);
    await form.fillStep1({
      firstName: "Inbound",
      lastName: `Phone ${uniqueId}`,
      phone: "0412345678",
      email: testEmail,
    });
    await form.clickNext();
    await form.selectSegmented("Has land", "No");
    await form.clickNext();
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`Inbound Phone ${uniqueId}`);

    // Step 2: Get the hubspotContactId from the local DB
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).not.toBeNull();

    // Step 3: Update the contact's phone in HubSpot directly
    await updateTestContact(hubspotId!, { phone: "0499999999" });

    // Step 4: Wait for the webhook to update the local lead
    await waitForLeadField(testEmail, "phone", "0499999999");
  });

  test("deleting a contact in HubSpot removes the local lead", async ({
    context,
    page,
    baseURL,
  }) => {
    test.setTimeout(60_000); // Webhook latency

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;

    // Step 1: Create a lead via the app
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);
    await form.fillStep1({
      firstName: "Inbound",
      lastName: `Delete ${uniqueId}`,
      phone: "0412345678",
      email: testEmail,
    });
    await form.clickNext();
    await form.selectSegmented("Has land", "No");
    await form.clickNext();
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`Inbound Delete ${uniqueId}`);

    // Step 2: Get the hubspotContactId
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).not.toBeNull();

    // Step 3: Archive the contact in HubSpot
    await archiveTestContact(hubspotId!);

    // Step 4: Wait for the webhook to delete the local lead
    await waitForLeadDeletion(testEmail);
  });
});
```

### Success Criteria

#### Automated Verification
- [x] `make check` passes
- [x] Tests skip gracefully when `HUBSPOT_WEBHOOK_ACTIVE` is absent
- [x] Tests pass against the production deployment (the only environment with webhook delivery)

#### Manual Verification
- [ ] After the phone update test, verify the HubSpot webhook delivery log shows the event was sent
- [ ] After the deletion test, verify the lead is gone from both the app and the local DB

---

## Phase 5: Update Setup Guide

### Overview

Replace the manual property creation steps in the setup guide with `make hubspot_setup`. Keep the webhook subscription steps (still manual for private apps).

### Changes Required

#### 1. Setup Guide

**File**: `thoughts/guides/hubspot-manual-setup.md`

Replace Steps 1-3 (property group + custom properties + verify existing) with:

```markdown
## Step 1: Provision Custom Properties

Run the automated setup script. This creates the "Rekurve" property group and
all 7 custom contact properties. The script is idempotent — safe to run
multiple times.

\`\`\`bash
make hubspot_setup
\`\`\`

This provisions:

| Property | Type | Options |
|----------|------|---------|
| `preferred_contact_time` | Dropdown select | weekdays, weekends, anytime |
| `land_width` | Single-line text | — |
| `land_depth` | Single-line text | — |
| `lead_score` | Number | — |
| `lead_stage` | Dropdown select | unqualified, nurture, warm, hot |
| `notes` | Multi-line text | — |
| `lead_source` | Dropdown select | walk_in, referral, social, web, other |

### Verify Existing Properties

The following custom properties should already exist from Epic 1. If any are
missing, create them manually in the HubSpot UI under the **Rekurve** group:

- `has_land` — Dropdown select: `true` / `false`
- `land_registered` — Dropdown select: `true` / `false`
- `land_address` — Single-line text
- `land_size_sqm` — Single-line text
- `property_type` — Dropdown select: `single_storey`, `double_storey`, `investment`, `upsize`, `downsize`, `first_home_buyer`
- `budget` — Single-line text
- `seen_broker` — Dropdown select: `true` / `false`
- `construction_timeline` — Dropdown select: `ready_now`, `3_6_months`, `12_months_plus`
- `resolve_finance_opted_in` — Dropdown select: `true` / `false`
```

Renumber the remaining steps:
- Old Step 4 (webhook subscriptions) becomes Step 2
- Old Step 5 (verification) becomes Step 3

### Success Criteria

#### Automated Verification
- [x] `make check` passes
- [x] No broken markdown links or formatting

#### Manual Verification
- [ ] Guide is clear and actionable
- [ ] Steps flow logically with the new numbering

---

## Performance Considerations

- **E2E test duration**: Outbound tests add ~10-15s each (form fill + HubSpot API verification). Inbound tests add ~30-60s each due to webhook latency polling.
- **HubSpot API rate limits**: Test cleanup searches for test contacts by email pattern — a single search call per cleanup, well within HubSpot's 100 requests/10 seconds limit.
- **Parallel test execution**: The HubSpot sync tests use unique emails per test (`Date.now().toString(36)`), so parallel execution across Playwright workers is safe.

## References

- Parent issue: #102 (HubSpot Contact Sync on Lead Create/Update)
- Implementation plan: `thoughts/plans/2026-04-08-102-hubspot-contact-sync.md`
- Setup guide: `thoughts/guides/hubspot-manual-setup.md`
- Existing E2E patterns: `e2e/features/leads-crud.spec.ts`, `e2e/utils/auth-helper.ts`
- HubSpot Properties API: https://developers.hubspot.com/docs/reference/api/crm/properties
- `@hubspot/api-client` v13.5.0: `node_modules/@hubspot/api-client/lib/codegen/crm/properties/`
