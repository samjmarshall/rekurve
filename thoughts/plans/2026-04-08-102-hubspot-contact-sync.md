# HubSpot Contact Sync on Lead Create/Update — Implementation Plan

## Overview

Wire HubSpot as the source of truth for contact data. The tRPC `create` and `update` procedures currently write directly to the local DB — this plan inserts HubSpot as the first write target and implements inbound webhook processing so contacts created or changed directly in HubSpot stay in sync with the local `leads` table.

## Current State Analysis

- **HubSpot client**: Singleton `@hubspot/api-client` instance with 3 retries (`src/server/hubspot/client.ts`)
- **Property map**: 13 fields mapped bidirectionally (`src/server/hubspot/properties.ts:6-20`). Missing: `preferredContactTime`, `landWidth`, `landDepth`, `leadScore`, `leadStage`, `notes`, `leadSource`
- **Contact CRUD**: `createContact`, `getContact`, `updateContact`, `searchContacts` exist (`src/server/hubspot/contacts.ts`) but are not called by any tRPC procedure
- **Webhook handler**: Validates signatures, logs events, no processing (`src/app/api/hubspot/webhook/route.ts:38-47`)
- **Leads router**: All 6 procedures write directly to DB with no HubSpot involvement (`src/server/api/routers/leads.ts`)
- **DB schema**: `hubspotContactId` column exists on leads table (`src/server/db/schema/leads.ts:26`) but is never populated
- **Existing tests**: Property tests at `src/server/hubspot/__tests__/properties.test.ts:64-77` already assert `leadScore`/`leadStage` mapping but the map entries don't exist yet — these tests are currently failing

### Key Discoveries

- The `searchContacts` function (`contacts.ts:64-74`) uses a text query with empty `filterGroups` — not suitable for exact email/phone dedup. A filter-based search is needed.
- `fromHubSpotProperties` returns all values as strings — boolean and integer fields need type coercion before writing to the DB from webhooks.
- `REVERSE_MAP` (`properties.ts:26-28`) is not exported. The webhook handler needs a way to map HubSpot property names back to app field names.
- The webhook event payload is a JSON array. `contact.creation` events do NOT include property values — a separate `getContact` call is required. `contact.propertyChange` events DO include the new value in `propertyValue`.
- No service layer exists — router procedures hit the DB directly. HubSpot calls will be added inline in the router, consistent with the existing pattern.

## Desired End State

After implementation:

1. `leads.create` writes to HubSpot first (with email/phone dedup), stores `hubspotContactId`, then writes to local DB
2. `leads.update` writes mapped fields to HubSpot first (if lead has `hubspotContactId`), then updates local DB
3. Webhook handler processes `contact.creation`, `contact.propertyChange`, and `contact.deletion` events
4. All 20 fields in the property map sync bidirectionally between HubSpot and the local DB
5. Custom HubSpot properties exist in a "Rekurve" group for all non-standard fields

### Verification

- `make check` passes (lint + typecheck)
- `make test` passes (all unit tests)
- Creating a lead via the app produces a HubSpot contact with matching data
- Editing a lead in HubSpot triggers a webhook that updates the local record
- Deleting a contact in HubSpot removes the local lead

## What We're NOT Doing

- **Scheduled reconciliation** — deferred until data consistency becomes an issue
- **`preferredEstates` / `preferredSuburbs` sync** — arrays with no HubSpot equivalent
- **`referrerName` sync** — will use HubSpot associations post-MVP
- **Programmatic custom property creation** — manual setup documented instead
- **Webhook loop prevention via `changeSource`** — idempotent handlers make this unnecessary
- **Retry queue for failed webhook processing** — log and move on for pilot; revisit if needed

---

## Phase 1: Extend Property Map

### Overview

Add 7 new fields to `PROPERTY_MAP` and export a `toAppField` helper so the webhook handler can map HubSpot property names back to app field names. Add a `coerceFromHubSpot` utility for type conversion on inbound data.

### Changes Required

#### 1. Property Map

**File**: `src/server/hubspot/properties.ts`

Add new entries to `PROPERTY_MAP` (after line 19):

```typescript
export const PROPERTY_MAP = {
  firstName: "firstname",
  lastName: "lastname",
  email: "email",
  phone: "phone",
  hasLand: "has_land",
  landRegistered: "land_registered",
  landAddress: "land_address",
  landSizeSqm: "land_size_sqm",
  propertyType: "property_type",
  budget: "budget",
  seenBroker: "seen_broker",
  constructionTimeline: "construction_timeline",
  resolveFinanceOptedIn: "resolve_finance_opted_in",
  // New fields
  preferredContactTime: "preferred_contact_time",
  landWidth: "land_width",
  landDepth: "land_depth",
  leadScore: "lead_score",
  leadStage: "lead_stage",
  notes: "notes",
  leadSource: "lead_source",
} as const satisfies Record<string, string>;
```

Add `toAppField` export (after `fromHubSpotProperties`):

```typescript
/** Look up the app field name for a HubSpot property. Returns undefined if not mapped. */
export function toAppField(hubspotProperty: string): AppField | undefined {
  return REVERSE_MAP[hubspotProperty as HubSpotProperty];
}
```

Add `coerceFromHubSpot` for type conversion on inbound webhook/API data:

```typescript
const BOOLEAN_FIELDS: ReadonlySet<string> = new Set<AppField>([
  "hasLand",
  "landRegistered",
  "seenBroker",
  "resolveFinanceOptedIn",
]);

const INTEGER_FIELDS: ReadonlySet<string> = new Set<AppField>(["leadScore"]);

/** Coerce a HubSpot string value to the app's expected type for a given field. */
export function coerceFromHubSpot(
  field: AppField,
  value: string,
): string | boolean | number {
  if (BOOLEAN_FIELDS.has(field)) return value === "true";
  if (INTEGER_FIELDS.has(field)) return parseInt(value, 10);
  return value;
}
```

#### 2. Barrel Export

**File**: `src/server/hubspot/index.ts`

Add `toAppField` and `coerceFromHubSpot` to the properties re-export.

#### 3. Tests

**File**: `src/server/hubspot/__tests__/properties.test.ts`

The existing tests at lines 64-77 (`leadScore`/`leadStage` mapping) will now pass. Add tests for:

- New fields round-trip through `toHubSpotProperties` / `fromHubSpotProperties`
- `toAppField("lead_score")` returns `"leadScore"`, unknown returns `undefined`
- `coerceFromHubSpot("hasLand", "true")` returns `true` (boolean)
- `coerceFromHubSpot("hasLand", "false")` returns `false` (boolean)
- `coerceFromHubSpot("leadScore", "85")` returns `85` (number)
- `coerceFromHubSpot("firstName", "Jane")` returns `"Jane"` (string passthrough)

```typescript
describe("toAppField", () => {
  test("maps known HubSpot property to app field", () => {
    expect(toAppField("lead_score")).toBe("leadScore");
    expect(toAppField("preferred_contact_time")).toBe("preferredContactTime");
  });

  test("returns undefined for unknown property", () => {
    expect(toAppField("hs_analytics_source")).toBeUndefined();
  });
});

describe("coerceFromHubSpot", () => {
  test("coerces boolean fields from string", () => {
    expect(coerceFromHubSpot("hasLand", "true")).toBe(true);
    expect(coerceFromHubSpot("hasLand", "false")).toBe(false);
    expect(coerceFromHubSpot("seenBroker", "true")).toBe(true);
    expect(coerceFromHubSpot("resolveFinanceOptedIn", "false")).toBe(false);
  });

  test("coerces integer fields from string", () => {
    expect(coerceFromHubSpot("leadScore", "85")).toBe(85);
    expect(coerceFromHubSpot("leadScore", "0")).toBe(0);
  });

  test("passes string fields through unchanged", () => {
    expect(coerceFromHubSpot("firstName", "Jane")).toBe("Jane");
    expect(coerceFromHubSpot("leadStage", "hot")).toBe("hot");
  });
});
```

### Success Criteria

#### Automated Verification
- [x] Existing `leadScore`/`leadStage` property tests pass: `make test`
- [x] New `toAppField` and `coerceFromHubSpot` tests pass
- [x] `PROPERTY_MAP` has 20 entries (13 existing + 7 new)
- [x] `make check` passes

#### Manual Verification
- [ ] None required — pure logic changes

---

## Phase 2: Wire HubSpot into Lead Create

### Overview

Add email/phone dedup search to the HubSpot contacts module. Modify `leads.create` to write to HubSpot first, store `hubspotContactId`, then write to local DB. Handle partial failures.

### Changes Required

#### 1. Dedup Search Function

**File**: `src/server/hubspot/contacts.ts`

Add `findExistingContact` that searches by email first, then phone:

```typescript
/** Search for an existing HubSpot contact by email or phone (for dedup on create). */
export async function findExistingContact(
  email?: string | null,
  phone?: string | null,
): Promise<HubSpotContact | null> {
  if (email) {
    const match = await findByFilter("email", email);
    if (match) return match;
  }
  if (phone) {
    const match = await findByFilter("phone", phone);
    if (match) return match;
  }
  return null;
}

async function findByFilter(
  propertyName: string,
  value: string,
): Promise<HubSpotContact | null> {
  const response = await hubspot.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [{ propertyName, operator: "EQ", value }],
      },
    ],
    properties: ALL_PROPERTIES,
    limit: 1,
    after: "0",
    sorts: [],
  });
  return response.results.length > 0 ? mapContact(response.results[0]) : null;
}
```

#### 2. Barrel Export

**File**: `src/server/hubspot/index.ts`

Add `findExistingContact` to the contacts re-export.

#### 3. Leads Router — Create Procedure

**File**: `src/server/api/routers/leads.ts`

Replace the current `create` procedure (lines 13-25) with HubSpot-first flow:

```typescript
import {
  createContact,
  findExistingContact,
  updateContact as updateHubSpotContact,
} from "~/server/hubspot";
import { PROPERTY_MAP } from "~/server/hubspot";

// ...

create: protectedProcedure
  .input(leadCreateSchema)
  .mutation(async ({ ctx, input }) => {
    // 1. Extract HubSpot-mapped fields from input
    const hubspotData: Record<string, string | boolean | null> = {};
    for (const key of Object.keys(input) as Array<keyof typeof input>) {
      if (key in PROPERTY_MAP && input[key] != null) {
        hubspotData[key] = input[key] as string | boolean | null;
      }
    }

    // 2. Dedup: search HubSpot for existing contact by email/phone
    const existing = await findExistingContact(input.email, input.phone);
    let hubspotContact;
    if (existing) {
      hubspotContact = await updateHubSpotContact(existing.id, hubspotData);
    } else {
      hubspotContact = await createContact(hubspotData);
    }

    // 3. Write to local DB with hubspotContactId
    try {
      const [lead] = await ctx.db
        .insert(leads)
        .values({
          ...input,
          hubspotContactId: hubspotContact.id,
          leadStage: "unqualified",
          leadScore: 0,
        })
        .returning();
      return lead!;
    } catch (dbError) {
      // Partial failure: HubSpot succeeded, local DB failed
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Lead saved to HubSpot (contact ID: ${hubspotContact.id}) but local save failed. Retry or check HubSpot.`,
      });
    }
  }),
```

#### 4. Tests — Dedup Search

**File**: `src/server/hubspot/__tests__/contacts.test.ts`

Add tests for `findExistingContact`:

```typescript
describe("findExistingContact", () => {
  test("finds contact by email first", async () => {
    mockDoSearch.mockResolvedValue({ results: [MOCK_RESPONSE] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact("jane@example.com", "0400000000");

    expect(result?.id).toBe("123");
    // Should have searched by email — only one search call
    expect(mockDoSearch).toHaveBeenCalledTimes(1);
    expect(mockDoSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterGroups: [
          { filters: [{ propertyName: "email", operator: "EQ", value: "jane@example.com" }] },
        ],
      }),
    );
  });

  test("falls back to phone when no email match", async () => {
    mockDoSearch
      .mockResolvedValueOnce({ results: [] }) // email miss
      .mockResolvedValueOnce({ results: [MOCK_RESPONSE] }); // phone hit

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact("nobody@example.com", "0400000000");

    expect(result?.id).toBe("123");
    expect(mockDoSearch).toHaveBeenCalledTimes(2);
  });

  test("returns null when no match found", async () => {
    mockDoSearch.mockResolvedValue({ results: [] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact("nobody@example.com", "0000000000");

    expect(result).toBeNull();
  });

  test("skips email search when email is null", async () => {
    mockDoSearch.mockResolvedValue({ results: [MOCK_RESPONSE] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact(null, "0400000000");

    expect(result?.id).toBe("123");
    expect(mockDoSearch).toHaveBeenCalledTimes(1);
    expect(mockDoSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterGroups: [
          { filters: [{ propertyName: "phone", operator: "EQ", value: "0400000000" }] },
        ],
      }),
    );
  });
});
```

#### 5. Tests — Leads Router Create

**File**: `src/server/api/__tests__/leads-router.test.ts`

The `beforeEach` must now also mock `~/server/hubspot`. Add:

```typescript
let mockFindExistingContact: ReturnType<typeof rs.fn>;
let mockCreateContact: ReturnType<typeof rs.fn>;
let mockUpdateHubSpotContact: ReturnType<typeof rs.fn>;

beforeEach(() => {
  // ... existing mocks ...

  mockFindExistingContact = rs.fn().mockResolvedValue(null);
  mockCreateContact = rs.fn().mockResolvedValue({
    id: "hs-123",
    properties: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  mockUpdateHubSpotContact = rs.fn().mockResolvedValue({
    id: "hs-123",
    properties: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  rs.doMock("~/server/hubspot", () => ({
    findExistingContact: mockFindExistingContact,
    createContact: mockCreateContact,
    updateContact: mockUpdateHubSpotContact,
    PROPERTY_MAP: {
      firstName: "firstname",
      lastName: "lastname",
      email: "email",
      phone: "phone",
      // ... include all 20 entries
    },
  }));
});
```

Update existing `leads.create` tests and add:

- Test that `createContact` is called when no dedup match
- Test that `updateContact` is called when dedup match found
- Test that `hubspotContactId` is included in the DB insert values
- Test partial failure: HubSpot succeeds but DB insert throws → `INTERNAL_SERVER_ERROR` with contact ID in message

### Success Criteria

#### Automated Verification
- [x] All new and existing unit tests pass: `make test`
- [x] `make check` passes

#### Manual Verification
- [ ] Create a lead via the full form → contact appears in HubSpot with matching fields
- [ ] Create a lead with the same email as an existing HubSpot contact → existing contact updated (not duplicated)
- [ ] `hubspotContactId` is populated on the local lead record after creation

---

## Phase 3: Wire HubSpot into Lead Update

### Overview

Modify `leads.update` to write mapped fields to HubSpot first (when the lead has a `hubspotContactId`), then update the local DB.

### Changes Required

#### 1. Leads Router — Update Procedure

**File**: `src/server/api/routers/leads.ts`

Replace the current `update` procedure (lines 94-109):

```typescript
update: protectedProcedure
  .input(leadUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    // Fetch the lead to get its hubspotContactId
    const existing = await ctx.db.query.leads.findFirst({
      where: eq(leads.id, id),
      columns: { hubspotContactId: true },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    }

    // Write mapped fields to HubSpot first (if linked)
    if (existing.hubspotContactId) {
      const hubspotData: Record<string, string | boolean | null> = {};
      for (const key of Object.keys(data) as Array<keyof typeof data>) {
        if (key in PROPERTY_MAP && data[key] !== undefined) {
          hubspotData[key] = data[key] as string | boolean | null;
        }
      }
      if (Object.keys(hubspotData).length > 0) {
        await updateHubSpotContact(existing.hubspotContactId, hubspotData);
      }
    }

    // Update local DB
    const [updated] = await ctx.db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    }
    return updated;
  }),
```

#### 2. Tests — Leads Router Update

**File**: `src/server/api/__tests__/leads-router.test.ts`

Add HubSpot mock for `getContact` (not needed — we read from local DB). Update existing update tests:

- Mock `db.query.leads.findFirst` to return `{ hubspotContactId: "hs-123" }`
- Verify `updateHubSpotContact` is called with the correct HubSpot ID and only mapped fields
- Test that non-mapped fields (e.g., `preferredEstates`) do NOT trigger a HubSpot call
- Test update on a lead with `hubspotContactId: null` → HubSpot update skipped, local update proceeds
- Test HubSpot API failure → error thrown, local DB NOT updated

```typescript
describe("leads.update — HubSpot sync", () => {
  test("updates HubSpot before local DB when linked", async () => {
    // findFirst returns a linked lead
    (mockDb.query as any).leads.findFirst.mockResolvedValue({
      hubspotContactId: "hs-123",
    });
    const returning = rs.fn().mockResolvedValue([{ ...mockLead, budget: "$700K" }]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, budget: "$700K" });

    expect(mockUpdateHubSpotContact).toHaveBeenCalledWith(
      "hs-123",
      expect.objectContaining({ budget: "$700K" }),
    );
  });

  test("skips HubSpot when lead has no hubspotContactId", async () => {
    (mockDb.query as any).leads.findFirst.mockResolvedValue({
      hubspotContactId: null,
    });
    const returning = rs.fn().mockResolvedValue([{ ...mockLead, budget: "$700K" }]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, budget: "$700K" });

    expect(mockUpdateHubSpotContact).not.toHaveBeenCalled();
  });
});
```

### Success Criteria

#### Automated Verification
- [x] All unit tests pass: `make test`
- [x] `make check` passes

#### Manual Verification
- [ ] Update a lead's phone number in the app → HubSpot contact's phone updates
- [ ] Update only `preferredEstates` (non-mapped) → no HubSpot API call made
- [ ] Update a lead that has no `hubspotContactId` → local update works, no HubSpot error

---

## Phase 4: Webhook Event Processing

### Overview

Implement processing for `contact.creation`, `contact.propertyChange`, and `contact.deletion` events in the webhook handler. Events are processed individually — failures are logged and swallowed to prevent HubSpot retry storms.

### Changes Required

#### 1. Webhook Event Types

**File**: `src/app/api/hubspot/webhook/route.ts`

Add a typed event interface and processing logic. Replace the current logging block (lines 38-47):

```typescript
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { leads } from "~/server/db/schema";
import {
  coerceFromHubSpot,
  getContact,
  toAppField,
} from "~/server/hubspot";

interface WebhookEvent {
  subscriptionType: string;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  eventId: number;
  occurredAt: number;
  attemptNumber: number;
}

export async function POST(request: Request) {
  // ... existing signature validation (lines 1-36 unchanged) ...

  const events = JSON.parse(body) as WebhookEvent[];

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      // Log and continue — return 200 to prevent HubSpot retry storm
      console.error(
        `[HubSpot Webhook] Failed to process ${event.subscriptionType} for objectId ${event.objectId}:`,
        error,
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function processEvent(event: WebhookEvent): Promise<void> {
  const hubspotId = String(event.objectId);

  switch (event.subscriptionType) {
    case "contact.creation":
      return handleContactCreation(hubspotId);
    case "contact.propertyChange":
      return handlePropertyChange(
        hubspotId,
        event.propertyName!,
        event.propertyValue!,
      );
    case "contact.deletion":
      return handleContactDeletion(hubspotId);
    default:
      console.log(
        `[HubSpot Webhook] Ignoring unhandled event: ${event.subscriptionType}`,
      );
  }
}
```

#### 2. Event Handlers

**File**: `src/app/api/hubspot/webhook/route.ts` (continued)

```typescript
async function handleContactCreation(hubspotId: string): Promise<void> {
  // Fetch full contact from HubSpot (creation events don't include properties)
  const contact = await getContact(hubspotId);

  // Build local record from HubSpot properties
  const record: Record<string, unknown> = {
    hubspotContactId: hubspotId,
    firstName: contact.properties.firstName ?? "Unknown",
    lastName: contact.properties.lastName ?? "Unknown",
    updatedAt: new Date(),
  };

  // Map all available properties with type coercion
  for (const [field, value] of Object.entries(contact.properties)) {
    if (value != null && field !== "firstName" && field !== "lastName") {
      record[field] = coerceFromHubSpot(field as any, value);
    }
  }

  // Upsert: insert or update if hubspotContactId already exists
  await db
    .insert(leads)
    .values(record as any)
    .onConflictDoUpdate({
      target: leads.hubspotContactId,
      set: record as any,
    });
}

async function handlePropertyChange(
  hubspotId: string,
  propertyName: string,
  propertyValue: string,
): Promise<void> {
  const appField = toAppField(propertyName);
  if (!appField) return; // Not a mapped property — ignore

  const coerced = coerceFromHubSpot(appField, propertyValue);

  await db
    .update(leads)
    .set({ [appField]: coerced, updatedAt: new Date() })
    .where(eq(leads.hubspotContactId, hubspotId));
}

async function handleContactDeletion(hubspotId: string): Promise<void> {
  await db.delete(leads).where(eq(leads.hubspotContactId, hubspotId));
}
```

#### 3. Tests — Webhook Event Processing

**File**: `src/app/api/hubspot/webhook/__tests__/route.test.ts`

Extend `beforeEach` to mock `~/server/db` and `~/server/hubspot`. Add test cases:

```typescript
let mockGetContact: ReturnType<typeof rs.fn>;
let mockInsert: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDbDelete: ReturnType<typeof rs.fn>;

beforeEach(() => {
  // ... existing mocks (env, @hubspot/api-client) ...

  mockGetContact = rs.fn();
  rs.doMock("~/server/hubspot", () => ({
    getContact: mockGetContact,
    toAppField: rs.fn((prop: string) => {
      const map: Record<string, string> = {
        firstname: "firstName",
        lastname: "lastName",
        email: "email",
        phone: "phone",
        lead_score: "leadScore",
      };
      return map[prop];
    }),
    coerceFromHubSpot: rs.fn((field: string, value: string) => {
      if (field === "leadScore") return parseInt(value, 10);
      return value;
    }),
  }));

  // Mock db with chainable methods
  const onConflictDoUpdate = rs.fn().mockResolvedValue(undefined);
  const insertValues = rs.fn().mockReturnValue({ onConflictDoUpdate });
  mockInsert = rs.fn().mockReturnValue({ values: insertValues });

  const updateWhere = rs.fn().mockResolvedValue(undefined);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = rs.fn().mockResolvedValue(undefined);
  mockDbDelete = rs.fn().mockReturnValue({ where: deleteWhere });

  rs.doMock("~/server/db", () => ({
    db: {
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDbDelete,
    },
  }));

  // Mock schema import
  rs.doMock("~/server/db/schema", () => ({
    leads: { hubspotContactId: "hubspot_contact_id" },
  }));
});

describe("Webhook event processing", () => {
  test("contact.creation fetches contact and upserts local lead", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetContact.mockResolvedValue({
      id: "456",
      properties: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          { subscriptionType: "contact.creation", objectId: 456, eventId: 1, occurredAt: Date.now(), attemptNumber: 0 },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGetContact).toHaveBeenCalledWith("456");
    expect(mockInsert).toHaveBeenCalled();
  });

  test("contact.propertyChange updates mapped field on local lead", async () => {
    mockIsValid.mockReturnValue(true);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.propertyChange",
            objectId: 456,
            propertyName: "email",
            propertyValue: "new@example.com",
            eventId: 2,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  test("contact.propertyChange ignores unmapped properties", async () => {
    mockIsValid.mockReturnValue(true);

    // toAppField returns undefined for unmapped property
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.propertyChange",
            objectId: 456,
            propertyName: "hs_analytics_source",
            propertyValue: "ORGANIC_SEARCH",
            eventId: 3,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("contact.deletion deletes local lead", async () => {
    mockIsValid.mockReturnValue(true);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          { subscriptionType: "contact.deletion", objectId: 456, eventId: 4, occurredAt: Date.now(), attemptNumber: 0 },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockDbDelete).toHaveBeenCalled();
  });

  test("processing failure for one event does not block others", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetContact
      .mockRejectedValueOnce(new Error("HubSpot API down")) // first event fails
      .mockResolvedValueOnce({                                // second event succeeds
        id: "789",
        properties: { firstName: "Ok", lastName: "Lead" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          { subscriptionType: "contact.creation", objectId: 456, eventId: 5, occurredAt: Date.now(), attemptNumber: 0 },
          { subscriptionType: "contact.creation", objectId: 789, eventId: 6, occurredAt: Date.now(), attemptNumber: 0 },
        ]),
      }),
    );

    // Should return 200 even though first event failed
    expect(response.status).toBe(200);
    expect(mockGetContact).toHaveBeenCalledTimes(2);
  });
});
```

### Success Criteria

#### Automated Verification
- [x] All unit tests pass: `make test`
- [x] `make check` passes

#### Manual Verification
- [ ] Create a contact directly in HubSpot → local lead appears
- [ ] Edit a contact's email in HubSpot → local lead's email updates
- [ ] Delete a contact in HubSpot → local lead is removed
- [ ] Contact created via the app does not produce duplicate local records when webhook arrives

---

## Phase 5: Manual HubSpot Setup Guide

### Overview

Document the manual configuration steps for creating custom HubSpot properties and subscribing to webhook events. This is a one-time setup per HubSpot account.

### Changes Required

#### 1. Setup Documentation

**File**: `thoughts/guides/hubspot-manual-setup.md`

```markdown
# HubSpot Manual Setup Guide

One-time setup steps for the HubSpot integration. These must be completed
before the contact sync features will work correctly.

## Prerequisites

- Admin access to the HubSpot account
- The Rekurve app's HubSpot private app already created (Epic 1)
- `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_CLIENT_SECRET` set in the environment

---

## Step 1: Create the "Rekurve" Property Group

1. Go to **Settings** (gear icon) → **Data Management** → **Properties**
2. Select the **Contact** object
3. Click **Create a group**
4. Name: `Rekurve`
5. Click **Save**

---

## Step 2: Create Custom Contact Properties

For each property below, go to **Settings** → **Data Management** → **Properties**
→ **Contact** → **Create property**.

Assign all custom properties to the **Rekurve** group.

### 2.1 preferred_contact_time

| Setting | Value |
|---------|-------|
| Label | Preferred Contact Time |
| Internal name | `preferred_contact_time` |
| Group | Rekurve |
| Field type | Dropdown select |
| Options | `weekdays` (Weekdays), `weekends` (Weekends), `anytime` (Anytime) |

### 2.2 land_width

| Setting | Value |
|---------|-------|
| Label | Land Width (m) |
| Internal name | `land_width` |
| Group | Rekurve |
| Field type | Single-line text |

### 2.3 land_depth

| Setting | Value |
|---------|-------|
| Label | Land Depth (m) |
| Internal name | `land_depth` |
| Group | Rekurve |
| Field type | Single-line text |

### 2.4 lead_score

| Setting | Value |
|---------|-------|
| Label | Rekurve Lead Score |
| Internal name | `lead_score` |
| Group | Rekurve |
| Field type | Number |

### 2.5 lead_stage

| Setting | Value |
|---------|-------|
| Label | Rekurve Lead Stage |
| Internal name | `lead_stage` |
| Group | Rekurve |
| Field type | Dropdown select |
| Options | `unqualified` (Unqualified), `nurture` (Nurture), `warm` (Warm), `hot` (Hot) |

### 2.6 notes

| Setting | Value |
|---------|-------|
| Label | Rekurve Notes |
| Internal name | `notes` |
| Group | Rekurve |
| Field type | Multi-line text |

### 2.7 lead_source

| Setting | Value |
|---------|-------|
| Label | Rekurve Lead Source |
| Internal name | `lead_source` |
| Group | Rekurve |
| Field type | Dropdown select |
| Options | `walk_in` (Walk-in), `referral` (Referral), `social` (Social), `web` (Web), `other` (Other) |

---

## Step 3: Verify Existing Custom Properties

The following custom properties should already exist from Epic 1. Verify they
are present and in the **Rekurve** group:

- `has_land` — Dropdown select: `true` / `false`
- `land_registered` — Dropdown select: `true` / `false`
- `land_address` — Single-line text
- `land_size_sqm` — Single-line text
- `property_type` — Dropdown select: `single_storey`, `double_storey`, `investment`, `upsize`, `downsize`, `first_home_buyer`
- `budget` — Single-line text
- `seen_broker` — Dropdown select: `true` / `false`
- `construction_timeline` — Dropdown select: `ready_now`, `3_6_months`, `12_months_plus`
- `resolve_finance_opted_in` — Dropdown select: `true` / `false`

If any are missing, create them following the same pattern as Step 2.

---

## Step 4: Configure Webhook Subscriptions

1. Go to **Settings** → **Integrations** → **Private Apps**
2. Select the Rekurve private app
3. Go to the **Webhooks** tab
4. Set the **Target URL** to: `https://<your-domain>/api/hubspot/webhook`

### 4.1 Subscribe to Contact Creation

1. Click **Create subscription**
2. Object: **Contact**
3. Event type: **Created**
4. Click **Save**

### 4.2 Subscribe to Contact Property Changes

1. Click **Create subscription**
2. Object: **Contact**
3. Event type: **Property changed**
4. Leave the property filter empty (subscribes to ALL property changes — the
   webhook handler filters to mapped properties server-side)
5. Click **Save**

### 4.3 Subscribe to Contact Deletion

1. Click **Create subscription**
2. Object: **Contact**
3. Event type: **Deleted**
4. Click **Save**

### 4.4 Activate Subscriptions

1. Ensure all three subscriptions show status **Active**
2. If using a staging environment, verify the target URL is reachable from
   the internet (HubSpot cannot reach localhost)

---

## Step 5: Verify the Integration

### Outbound (App → HubSpot)

1. Create a new lead in the app with all fields filled
2. Open HubSpot → Contacts → find the contact by name
3. Verify all Rekurve properties are populated
4. Check the lead record in the app has a `hubspotContactId`

### Inbound (HubSpot → App)

1. Edit the contact's phone number directly in HubSpot
2. Wait ~30 seconds for the webhook to fire
3. Refresh the lead in the app — phone number should be updated
4. Delete the contact in HubSpot
5. Verify the lead is removed from the app

---

## Troubleshooting

- **Webhook not firing**: Check the subscription is Active, and the target URL
  is publicly reachable. HubSpot shows delivery logs under the Webhooks tab.
- **401 on webhook**: Verify `HUBSPOT_CLIENT_SECRET` matches the app's client
  secret (not the access token).
- **Properties not syncing**: Verify the internal names match exactly (case-
  sensitive). Use the HubSpot API to check:
  `GET /crm/v3/properties/contacts/<property_name>`
- **Duplicate contacts**: The dedup check searches by email first, then phone.
  If a contact has neither, a duplicate may be created. Add email or phone to
  avoid this.
```

### Success Criteria

#### Automated Verification
- [x] None — documentation only

#### Manual Verification
- [ ] All 7 custom properties created in HubSpot
- [ ] All 3 webhook subscriptions active
- [ ] End-to-end test per Step 5 passes

---

## Performance Considerations

- **HubSpot API latency on create/update**: The tRPC mutations now include 1-2 HubSpot API calls (dedup search + create/update). Expect ~200-500ms added latency per mutation. Acceptable for pilot scale.
- **Webhook batching**: HubSpot sends up to 100 events per webhook POST. The handler processes them sequentially. If throughput becomes an issue, events could be queued — not needed for pilot.
- **No DB indexes on hubspotContactId for lookups**: The `hubspotContactId` column already has a `unique()` constraint which creates an index. Webhook lookups by this column will be fast.

## References

- GitHub issue: #102 (HubSpot Contact Sync on Lead Create/Update)
- Parent epic: #86 (Lead Management + AI Qualification Scoring)
- Dependency: #96 (tRPC Leads Router — complete)
- Dependency: #85 (Epic 1: HubSpot API connection — complete)
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- HubSpot Contacts API: https://developers.hubspot.com/docs/api/crm/contacts
- HubSpot Webhooks: https://developers.hubspot.com/docs/api/webhooks
- Existing property map: `src/server/hubspot/properties.ts`
- Existing webhook handler: `src/app/api/hubspot/webhook/route.ts`
- Existing leads router: `src/server/api/routers/leads.ts`
