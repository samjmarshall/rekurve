# HubSpot API Client Setup — Implementation Plan

## Overview

Set up the HubSpot API client for contact CRUD operations. HubSpot is the source of truth for all contact data. The app reads and writes contacts via the HubSpot API; only AI-specific fields (scores, stages, preferences) live in Neon. This also introduces Rstest as the project's unit test framework.

## Current State Analysis

- The `leads` table already has a `hubspotContactId` column (`src/server/db/schema/leads.ts:26`)
- No HubSpot library or integration exists yet
- External API clients follow a singleton pattern: `src/lib/auth.ts` (Resend), `src/server/db/index.ts` (Neon)
- Env validation uses `@t3-oss/env-nextjs` + Zod in `src/env.js`
- Only Playwright e2e tests exist — no unit test framework is configured

### Key Discoveries
- `@hubspot/api-client` supports built-in retry via `numberOfApiCallRetries` (0-6), retrying on 429 with 10s delay and on 5xx with exponential backoff — no custom retry logic needed
- `@hubspot/api-client` exports `Signature.isValid()` for webhook v3 signature validation using HMAC-SHA256
- Webhook signature validation requires a separate `HUBSPOT_CLIENT_SECRET` (the private app's client secret), distinct from the `HUBSPOT_ACCESS_TOKEN`

## Desired End State

- `src/server/hubspot/client.ts` — singleton HubSpot client, initialized from validated env
- `src/server/hubspot/contacts.ts` — typed CRUD operations (`createContact`, `getContact`, `updateContact`, `searchContacts`) with property mapping
- `src/server/hubspot/properties.ts` — bidirectional property map between app field names and HubSpot property names
- `src/app/api/hubspot/webhook/route.ts` — POST endpoint that validates webhook signatures and returns 200 OK
- `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_CLIENT_SECRET` in env validation
- Rstest configured with unit tests for property mapping, webhook validation, and contact operations

### Verification
- `make build` succeeds
- `make check` passes (lint + typecheck)
- `rstest run` passes all unit tests
- Webhook endpoint returns 200 when POSTed to with a valid signature

## What We're NOT Doing

- Email sending via HubSpot (Epic 3)
- Deal/pipeline management
- HubSpot workflow automation
- Full webhook event processing (skeleton only — logs and returns 200)
- Custom property creation automation (manual HubSpot UI setup for now)
- Connecting the leads tRPC router to HubSpot (separate issue)

## Implementation Approach

Three phases, each independently testable:
1. **Foundation** — install deps, configure env, set up Rstest, create HubSpot client singleton
2. **Contact operations** — property mapping + typed CRUD wrappers with unit tests
3. **Webhook skeleton** — POST endpoint with signature validation and unit tests

---

## Phase 1: Foundation — Dependencies, Env, Rstest, Client

### Overview
Install `@hubspot/api-client` and Rstest, add env vars, create the singleton client.

### Changes Required

#### 1. Install dependencies
```bash
yarn add @hubspot/api-client
yarn add -D @rstest/core
```

#### 2. Environment variables
**File**: `src/env.js`
**Changes**: Add `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_CLIENT_SECRET` to the server schema and runtimeEnv.

```javascript
// In the server schema, add:
HUBSPOT_ACCESS_TOKEN: z.string().min(1),
HUBSPOT_CLIENT_SECRET: z.string().min(1),

// In runtimeEnv, add:
HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
```

**File**: `.env.example`
**Changes**: Add placeholders.

```bash
# HubSpot (private app)
HUBSPOT_ACCESS_TOKEN=          # HubSpot private app access token
HUBSPOT_CLIENT_SECRET=         # HubSpot private app client secret (for webhook validation)
```

#### 3. HubSpot client singleton
**File**: `src/server/hubspot/client.ts` (new)

```typescript
import { Client } from "@hubspot/api-client";
import { env } from "~/env";

export const hubspot = new Client({
  accessToken: env.HUBSPOT_ACCESS_TOKEN,
  numberOfApiCallRetries: 3,
});
```

Export the typed client, not the raw `Client` class. Retry is handled by the library (3 retries: 10s delay on 429, exponential backoff on 5xx).

#### 4. Rstest configuration
**File**: `rstest.config.ts` (new)

```typescript
import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["src/**/*.test.ts"],
  testEnvironment: "node",
  restoreMocks: true,
});
```

**File**: `package.json`
**Changes**: Add test scripts.

```json
"test": "rstest run",
"test:watch": "rstest watch"
```

**File**: `Makefile`
**Changes**: Add unit test target and update `check` if desired.

```makefile
test: ## Run unit tests
	yarn test
```

#### 5. Smoke test for Rstest
**File**: `src/server/hubspot/__tests__/client.test.ts` (new)

```typescript
import { describe, expect, test } from "@rstest/core";

describe("hubspot client module", () => {
  test("exports are defined", async () => {
    // Verify the module shape without hitting HubSpot API.
    // The actual client instantiation reads env at import time,
    // so we mock the env module.
    rs.mock("~/env", () => ({
      env: {
        HUBSPOT_ACCESS_TOKEN: "test-token",
        HUBSPOT_CLIENT_SECRET: "test-secret",
      },
    }));

    const { hubspot } = await import("../client");
    expect(hubspot).toBeDefined();
  });
});
```

### Success Criteria

#### Automated Verification
- [ ] `yarn add @hubspot/api-client` and `yarn add -D @rstest/core` install without errors
- [ ] `make build` succeeds with new env vars set (or `SKIP_ENV_VALIDATION=1`)
- [ ] `make check` passes
- [ ] `make test` passes the smoke test

#### Manual Verification
- [ ] `.env` has both HubSpot tokens populated
- [ ] `HUBSPOT_ACCESS_TOKEN=""` causes a clear Zod validation error at build time

---

## Phase 2: Contact Operations + Property Mapping

### Overview
Create the property map and typed CRUD wrappers for HubSpot contacts. Unit test the property mapping and mock the HubSpot client for operation tests.

### Changes Required

#### 1. Property mapping
**File**: `src/server/hubspot/properties.ts` (new)

Maps between the app's camelCase field names (from the `leads` schema) and HubSpot property names. Standard HubSpot properties use their built-in names; custom properties use a consistent prefix.

```typescript
/**
 * Bidirectional map between app field names and HubSpot contact property names.
 * Standard HubSpot properties (firstname, lastname, email, phone) use built-in names.
 * Custom properties match the names created in the HubSpot account.
 */
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
} as const satisfies Record<string, string>;

export type AppField = keyof typeof PROPERTY_MAP;
export type HubSpotProperty = (typeof PROPERTY_MAP)[AppField];

// Reverse map for reading HubSpot responses back to app fields
const REVERSE_MAP = Object.fromEntries(
  Object.entries(PROPERTY_MAP).map(([k, v]) => [v, k]),
) as Record<HubSpotProperty, AppField>;

/** Convert app field names to HubSpot property names. */
export function toHubSpotProperties(
  data: Partial<Record<AppField, string | boolean | null>>,
): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const hsKey = PROPERTY_MAP[key as AppField];
    if (hsKey && value != null) {
      properties[hsKey] = String(value);
    }
  }
  return properties;
}

/** Convert HubSpot properties back to app field names. */
export function fromHubSpotProperties(
  properties: Record<string, string | null>,
): Partial<Record<AppField, string>> {
  const result: Partial<Record<AppField, string>> = {};
  for (const [key, value] of Object.entries(properties)) {
    const appKey = REVERSE_MAP[key as HubSpotProperty];
    if (appKey && value != null) {
      result[appKey] = value;
    }
  }
  return result;
}

/** All HubSpot property names to request when fetching contacts. */
export const ALL_PROPERTIES = Object.values(PROPERTY_MAP);
```

#### 2. Contact operations
**File**: `src/server/hubspot/contacts.ts` (new)

```typescript
import { hubspot } from "./client";
import {
  ALL_PROPERTIES,
  type AppField,
  fromHubSpotProperties,
  toHubSpotProperties,
} from "./properties";

export type ContactData = Partial<Record<AppField, string | boolean | null>>;

export interface HubSpotContact {
  id: string;
  properties: Partial<Record<AppField, string>>;
  createdAt: string;
  updatedAt: string;
}

function mapContact(response: { id: string; properties: Record<string, string | null>; createdAt: Date; updatedAt: Date }): HubSpotContact {
  return {
    id: response.id,
    properties: fromHubSpotProperties(response.properties),
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}

/** Create a contact in HubSpot. Returns the HubSpot contact ID. */
export async function createContact(data: ContactData): Promise<HubSpotContact> {
  const response = await hubspot.crm.contacts.basicApi.create({
    properties: toHubSpotProperties(data),
    associations: [],
  });
  return mapContact(response);
}

/** Fetch a contact by HubSpot ID. */
export async function getContact(hubspotId: string): Promise<HubSpotContact> {
  const response = await hubspot.crm.contacts.basicApi.getById(
    hubspotId,
    ALL_PROPERTIES,
  );
  return mapContact(response);
}

/** Update a contact's properties. */
export async function updateContact(hubspotId: string, data: ContactData): Promise<HubSpotContact> {
  const response = await hubspot.crm.contacts.basicApi.update(hubspotId, {
    properties: toHubSpotProperties(data),
  });
  return mapContact(response);
}

/** Search contacts by email, name, or other query string. */
export async function searchContacts(query: string): Promise<HubSpotContact[]> {
  const response = await hubspot.crm.contacts.searchApi.doSearch({
    query,
    properties: ALL_PROPERTIES,
    limit: 20,
    after: "0",
    sorts: ["-createdate"],
    filterGroups: [],
  });
  return response.results.map(mapContact);
}
```

#### 3. Barrel export
**File**: `src/server/hubspot/index.ts` (new)

```typescript
export { hubspot } from "./client";
export {
  createContact,
  getContact,
  searchContacts,
  updateContact,
  type ContactData,
  type HubSpotContact,
} from "./contacts";
export {
  ALL_PROPERTIES,
  fromHubSpotProperties,
  PROPERTY_MAP,
  toHubSpotProperties,
} from "./properties";
```

#### 4. Tests — Property mapping
**File**: `src/server/hubspot/__tests__/properties.test.ts` (new)

```typescript
import { describe, expect, test } from "@rstest/core";
import {
  fromHubSpotProperties,
  PROPERTY_MAP,
  toHubSpotProperties,
} from "../properties";

describe("toHubSpotProperties", () => {
  test("maps app fields to HubSpot property names", () => {
    const result = toHubSpotProperties({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      hasLand: true,
    });
    expect(result).toEqual({
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
      has_land: "true",
    });
  });

  test("skips null and undefined values", () => {
    const result = toHubSpotProperties({
      firstName: "Jane",
      email: null,
    });
    expect(result).toEqual({ firstname: "Jane" });
  });
});

describe("fromHubSpotProperties", () => {
  test("maps HubSpot properties back to app fields", () => {
    const result = fromHubSpotProperties({
      firstname: "Jane",
      lastname: "Doe",
      has_land: "true",
    });
    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: "true",
    });
  });

  test("skips null values", () => {
    const result = fromHubSpotProperties({
      firstname: "Jane",
      lastname: null,
    });
    expect(result).toEqual({ firstName: "Jane" });
  });

  test("ignores unknown HubSpot properties", () => {
    const result = fromHubSpotProperties({
      firstname: "Jane",
      unknown_prop: "value",
    });
    expect(result).toEqual({ firstName: "Jane" });
  });
});

describe("PROPERTY_MAP", () => {
  test("round-trips all fields", () => {
    const input: Record<string, string> = {};
    for (const key of Object.keys(PROPERTY_MAP)) {
      input[key] = "test";
    }
    const hubspot = toHubSpotProperties(input as any);
    const roundTripped = fromHubSpotProperties(hubspot);
    expect(Object.keys(roundTripped).sort()).toEqual(
      Object.keys(PROPERTY_MAP).sort(),
    );
  });
});
```

#### 5. Tests — Contact operations (mocked)
**File**: `src/server/hubspot/__tests__/contacts.test.ts` (new)

```typescript
import { describe, expect, test } from "@rstest/core";

// Mock the client before importing contacts
rs.mock("../client", () => ({
  hubspot: {
    crm: {
      contacts: {
        basicApi: {
          create: rs.fn(),
          getById: rs.fn(),
          update: rs.fn(),
        },
        searchApi: {
          doSearch: rs.fn(),
        },
      },
    },
  },
}));

// Mock env to avoid validation
rs.mock("~/env", () => ({
  env: {
    HUBSPOT_ACCESS_TOKEN: "test-token",
    HUBSPOT_CLIENT_SECRET: "test-secret",
  },
}));

const MOCK_RESPONSE = {
  id: "123",
  properties: { firstname: "Jane", lastname: "Doe", email: "jane@example.com" },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

describe("createContact", () => {
  test("calls basicApi.create and maps response", async () => {
    const { hubspot } = await import("../client");
    const { createContact } = await import("../contacts");

    (hubspot.crm.contacts.basicApi.create as any).mockResolvedValue(MOCK_RESPONSE);

    const result = await createContact({ firstName: "Jane", lastName: "Doe" });

    expect(hubspot.crm.contacts.basicApi.create).toHaveBeenCalledWith({
      properties: { firstname: "Jane", lastname: "Doe" },
      associations: [],
    });
    expect(result.id).toBe("123");
    expect(result.properties.firstName).toBe("Jane");
  });
});

describe("getContact", () => {
  test("calls basicApi.getById with all properties", async () => {
    const { hubspot } = await import("../client");
    const { getContact } = await import("../contacts");
    const { ALL_PROPERTIES } = await import("../properties");

    (hubspot.crm.contacts.basicApi.getById as any).mockResolvedValue(MOCK_RESPONSE);

    const result = await getContact("123");

    expect(hubspot.crm.contacts.basicApi.getById).toHaveBeenCalledWith(
      "123",
      ALL_PROPERTIES,
    );
    expect(result.id).toBe("123");
  });
});

describe("searchContacts", () => {
  test("calls searchApi.doSearch and maps results", async () => {
    const { hubspot } = await import("../client");
    const { searchContacts } = await import("../contacts");

    (hubspot.crm.contacts.searchApi.doSearch as any).mockResolvedValue({
      results: [MOCK_RESPONSE],
    });

    const results = await searchContacts("jane@example.com");

    expect(results).toHaveLength(1);
    expect(results[0].properties.email).toBe("jane@example.com");
  });
});
```

### Success Criteria

#### Automated Verification
- [ ] `make check` passes
- [ ] `make test` — property mapping and contact operation tests pass

#### Manual Verification
- [ ] `createContact({ firstName: "Test", lastName: "User", email: "test@example.com" })` creates a contact in HubSpot and returns the ID
- [ ] `getContact(id)` retrieves the created contact with all mapped properties
- [ ] `updateContact(id, { phone: "0400000000" })` updates the contact in HubSpot
- [ ] `searchContacts("test@example.com")` finds the contact

---

## Phase 3: Webhook Endpoint Skeleton

### Overview
Create the HubSpot webhook POST endpoint with v3 signature validation. The handler logs incoming events and returns 200 OK — actual event processing is deferred to Epic 2+.

### Changes Required

#### 1. Webhook route
**File**: `src/app/api/hubspot/webhook/route.ts` (new)

```typescript
import { Signature } from "@hubspot/api-client";
import { NextResponse } from "next/server";
import { env } from "~/env";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hubspot-signature-v3");
  const timestamp = request.headers.get("x-hubspot-request-timestamp");

  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }

  // Reject requests older than 5 minutes
  if (Date.now() - Number(timestamp) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Timestamp expired" }, { status: 401 });
  }

  const url = request.url;
  const isValid = Signature.isValid({
    signatureVersion: "v3",
    signature,
    method: "POST",
    clientSecret: env.HUBSPOT_CLIENT_SECRET,
    requestBody: body,
    url,
    timestamp,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Log the event — actual processing deferred to Epic 2+
  const events = JSON.parse(body) as Array<{
    subscriptionType: string;
    objectId: number;
    propertyName?: string;
  }>;
  console.log(`[HubSpot Webhook] Received ${events.length} event(s):`, events.map((e) => e.subscriptionType));

  return NextResponse.json({ received: true });
}
```

#### 2. Tests — Webhook signature validation
**File**: `src/app/api/hubspot/webhook/__tests__/route.test.ts` (new)

Test the route handler by calling `POST()` directly with mocked request objects. Mock `Signature.isValid` to isolate the validation logic.

```typescript
import { describe, expect, test } from "@rstest/core";

rs.mock("~/env", () => ({
  env: {
    HUBSPOT_CLIENT_SECRET: "test-secret",
  },
}));

const mockIsValid = rs.fn();
rs.mock("@hubspot/api-client", () => ({
  Signature: { isValid: mockIsValid },
}));

function makeRequest(opts: {
  body?: string;
  signature?: string | null;
  timestamp?: string | null;
}): Request {
  const headers = new Headers();
  if (opts.signature !== null) {
    headers.set("x-hubspot-signature-v3", opts.signature ?? "sig");
  }
  if (opts.timestamp !== null) {
    headers.set("x-hubspot-request-timestamp", opts.timestamp ?? String(Date.now()));
  }
  return new Request("https://example.com/api/hubspot/webhook", {
    method: "POST",
    headers,
    body: opts.body ?? '[{"subscriptionType":"contact.creation","objectId":1}]',
  });
}

describe("POST /api/hubspot/webhook", () => {
  test("returns 401 when signature header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ signature: null }));
    expect(response.status).toBe(401);
  });

  test("returns 401 when timestamp header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ timestamp: null }));
    expect(response.status).toBe(401);
  });

  test("returns 401 when timestamp is older than 5 minutes", async () => {
    const { POST } = await import("../route");
    const oldTimestamp = String(Date.now() - 6 * 60 * 1000);
    const response = await POST(makeRequest({ timestamp: oldTimestamp }));
    expect(response.status).toBe(401);
  });

  test("returns 401 when signature is invalid", async () => {
    mockIsValid.mockReturnValue(false);
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
  });

  test("returns 200 when signature is valid", async () => {
    mockIsValid.mockReturnValue(true);
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
  });
});
```

### Success Criteria

#### Automated Verification
- [ ] `make check` passes
- [ ] `make test` — webhook route tests pass
- [ ] `make build` succeeds

#### Manual Verification
- [ ] `curl -X POST http://localhost:3000/api/hubspot/webhook` returns 401 (missing signature)
- [ ] Webhook endpoint returns 200 when called with a valid HubSpot signature

---

## Performance Considerations

- The HubSpot client is initialized once at module level (singleton). No per-request overhead.
- `numberOfApiCallRetries: 3` handles rate limiting transparently. On 429, retries after 10s. On 5xx, retries with 200ms * retryNumber backoff.
- Contact search is limited to 20 results per call — sufficient for the current use case, can be paginated later.

## Migration Notes

- No database migrations required. The `hubspotContactId` column already exists in the `leads` table.
- `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_CLIENT_SECRET` must be added to Vercel environment variables before deployment.
- The HubSpot private app must be created with **Contacts** read/write scope.
- Custom properties (`has_land`, `land_registered`, etc.) must be created in the HubSpot account before contact operations that use them.

## References

- GitHub issue: #95
- Parent epic: #85 (MVP Foundation)
- Dependency: #90 (Database Setup & Schema — completed)
- HubSpot Node.js client: `@hubspot/api-client`
- Existing singleton pattern: `src/lib/auth.ts:10` (Resend), `src/server/db/index.ts:8` (Neon)
- Leads schema: `src/server/db/schema/leads.ts`
