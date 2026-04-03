# tRPC Leads Router & Validation Schema — Implementation Plan

## Overview

Replace the stub `leadsRouter` with 6 real tRPC procedures backed by Drizzle queries against the existing `leads` table, plus Zod validation schemas for all input types. This is the data backbone for Epic 2 — every other issue (#97–#102) depends on these procedures and schemas.

## Current State Analysis

- **Router**: `src/server/api/routers/leads.ts` — stub with a single `getAll` procedure returning `[]`
- **DB schema**: `src/server/db/schema/leads.ts` — full table definition with all Creation Homes fields, indexes on `email` (partial unique) and `leadStage`
- **Enums**: `src/server/db/schema/enums.ts` — all lead-related enums defined as `pgEnum`
- **Tests**: `src/server/api/__tests__/router.test.ts` — Rstest with module mocking pattern, currently tests the stub
- **Type exports**: `RouterInputs`/`RouterOutputs` via `src/trpc/react.tsx`

### Key Discoveries:
- The `leads` table has no `deletedAt` column — hard delete confirmed (`src/server/db/schema/leads.ts:22-80`)
- All procedures must be `protectedProcedure` — auth middleware narrows `ctx.session.user` to non-nullable (`src/server/api/trpc.ts:53-64`)
- Zod error formatting is already wired — `error.cause instanceof ZodError` extracts `flatten()` onto `shape.data.zodError` (`src/server/api/trpc.ts:20-30`)
- DB uses `neon-http` driver (serverless, no connection pool) — queries are stateless HTTP calls (`src/server/db/index.ts:8-10`)
- `numeric` columns (`landSizeSqm`, `landWidth`, `landDepth`) come back as strings from Postgres — Zod schemas must accept string input for these fields

## Desired End State

Six working tRPC procedures with Zod input validation, backed by real Drizzle queries:

1. `leads.create` — creates a lead from full form or quick capture input
2. `leads.getById` — fetches a single lead by UUID
3. `leads.list` — paginated, filterable, sortable lead list
4. `leads.update` — partial update by ID
5. `leads.delete` — hard delete by ID
6. `leads.getByStage` — leads grouped by stage for the pipeline board

All schemas exported for form components. All procedures covered by unit tests.

### Verification:
- `make test` passes with all new tests
- `make check` passes (lint + typecheck)
- Types are importable from `~/server/api/schemas/leads` in form components

## What We're NOT Doing

- HubSpot sync on create/update — that's #102
- AI scoring on create/update — that's #99
- Form components — that's #97 and #98
- Webhook processing — that's #102
- Extended HubSpot property mapping — that's #102
- Cursor-based pagination — offset-based is sufficient for pilot volume

## Implementation Approach

Two phases: schemas first (the contract), then procedures (the implementation). Schemas go in a dedicated `src/server/api/schemas/` directory. Tests are written alongside each phase. The DB write logic is kept as clean, isolated Drizzle operations to make #102's HubSpot-first refactoring straightforward.

---

## Phase 1: Zod Validation Schemas

### Overview
Define all input validation schemas and enum types. These are the contract that forms (#97, #98) and procedures consume.

### Changes Required:

#### 1. Zod Enum Constants
**File**: `src/server/api/schemas/leads.ts` (new file)

Define Zod enums mirroring the Drizzle `pgEnum` values. These are the single source of truth for validation — the Drizzle enums define storage, these define input validation.

```ts
import { z } from "zod";

// Enum schemas — mirror values from src/server/db/schema/enums.ts
export const propertyTypeSchema = z.enum([
  "single_storey",
  "double_storey",
  "investment",
  "upsize",
  "downsize",
  "first_home_buyer",
]);

export const constructionTimelineSchema = z.enum([
  "ready_now",
  "3_6_months",
  "12_months_plus",
]);

export const leadStageSchema = z.enum([
  "unqualified",
  "nurture",
  "warm",
  "hot",
]);

export const leadSourceSchema = z.enum([
  "walk_in",
  "referral",
  "social",
  "web",
  "other",
]);

export const preferredContactTimeSchema = z.enum([
  "weekdays",
  "weekends",
  "anytime",
]);
```

#### 2. Lead Create Schema (Full Form)
**File**: `src/server/api/schemas/leads.ts`

Validates the full Creation Homes enquiry form. Required: `firstName`, `lastName`. Everything else optional — the form can be partially filled and the AI will identify gaps.

```ts
export const leadCreateSchema = z.object({
  // Contact — required
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  // Contact — optional
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  preferredContactTime: preferredContactTimeSchema.nullish(),
  // Land
  hasLand: z.boolean().nullish(),
  landRegistered: z.boolean().nullish(),
  landAddress: z.string().max(500).nullish(),
  landSizeSqm: z.string().nullish(), // numeric comes back as string from PG
  landWidth: z.string().nullish(),
  landDepth: z.string().nullish(),
  // Qualification
  propertyType: propertyTypeSchema.nullish(),
  budget: z.string().max(100).nullish(),
  seenBroker: z.boolean().nullish(),
  constructionTimeline: constructionTimelineSchema.nullish(),
  // Preferences
  preferredEstates: z.array(z.string()).nullish(),
  preferredSuburbs: z.array(z.string()).nullish(),
  // Source
  leadSource: leadSourceSchema.nullish(),
  referrerName: z.string().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
  // Resolve Finance
  resolveFinanceOptedIn: z.boolean().nullish(),
});
```

#### 3. Lead Quick Capture Schema
**File**: `src/server/api/schemas/leads.ts`

Minimal input for informal encounters. Name is a single field split on submit.

```ts
export const leadQuickCaptureSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  notes: z.string().max(5000).nullish(),
  leadSource: leadSourceSchema.nullish(),
});
```

#### 4. Lead Update Schema
**File**: `src/server/api/schemas/leads.ts`

Partial update — all fields optional except `id`.

```ts
export const leadUpdateSchema = leadCreateSchema.partial().extend({
  id: z.string().uuid(),
  // Allow updating scoring fields (set by AI, not user)
  leadScore: z.number().int().min(0).max(100).nullish(),
  leadStage: leadStageSchema.nullish(),
});
```

#### 5. Lead Filter Schema
**File**: `src/server/api/schemas/leads.ts`

Validates filter params for `leads.list`.

```ts
export const leadFilterSchema = z.object({
  stage: leadStageSchema.nullish(),
  constructionTimeline: constructionTimelineSchema.nullish(),
  preferredEstate: z.string().nullish(),
  fhogEligible: z.boolean().nullish(), // filters propertyType === "first_home_buyer"
  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  // Sorting
  sortBy: z.enum(["createdAt", "updatedAt", "leadScore", "lastName"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

#### 6. Type Exports
**File**: `src/server/api/schemas/leads.ts`

```ts
export type LeadCreate = z.infer<typeof leadCreateSchema>;
export type LeadQuickCapture = z.infer<typeof leadQuickCaptureSchema>;
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
export type LeadFilter = z.infer<typeof leadFilterSchema>;
```

#### 7. Schema Tests
**File**: `src/server/api/schemas/__tests__/leads.test.ts` (new file)

Test validation for each schema — valid input passes, invalid input fails with expected errors.

```ts
import { describe, expect, test } from "@rstest/core";
import {
  leadCreateSchema,
  leadQuickCaptureSchema,
  leadUpdateSchema,
  leadFilterSchema,
} from "../leads";

describe("leadCreateSchema", () => {
  test("accepts valid full form input", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "0412345678",
      hasLand: true,
      propertyType: "first_home_buyer",
    });
    expect(result.success).toBe(true);
  });

  test("accepts minimal input (name only)", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing firstName", () => {
    const result = leadCreateSchema.safeParse({ lastName: "Smith" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid propertyType enum value", () => {
    const result = leadCreateSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      propertyType: "mansion",
    });
    expect(result.success).toBe(false);
  });
});

describe("leadQuickCaptureSchema", () => {
  test("accepts valid quick capture", () => {
    const result = leadQuickCaptureSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "0498765432",
      notes: "Met at BBQ",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing phone", () => {
    const result = leadQuickCaptureSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });
});

describe("leadUpdateSchema", () => {
  test("requires id", () => {
    const result = leadUpdateSchema.safeParse({ firstName: "Updated" });
    expect(result.success).toBe(false);
  });

  test("accepts id with partial fields", () => {
    const result = leadUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      budget: "$700K",
    });
    expect(result.success).toBe(true);
  });

  test("accepts scoring fields", () => {
    const result = leadUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      leadScore: 75,
      leadStage: "warm",
    });
    expect(result.success).toBe(true);
  });

  test("rejects score out of range", () => {
    const result = leadUpdateSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      leadScore: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe("leadFilterSchema", () => {
  test("applies defaults for empty input", () => {
    const result = leadFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("createdAt");
    expect(result.sortOrder).toBe("desc");
  });

  test("accepts valid filters", () => {
    const result = leadFilterSchema.safeParse({
      stage: "hot",
      fhogEligible: true,
      page: 2,
      limit: 50,
    });
    expect(result.success).toBe(true);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] Schema tests pass: `make test`
- [x] Types compile: `make check`

#### Manual Verification:
- [x] Enum values match `src/server/db/schema/enums.ts` exactly (visual check)

---

## Phase 2: tRPC Procedures

### Overview
Replace the stub router with 6 real procedures. Each procedure uses Zod input validation and Drizzle queries. DB write logic is kept as clean, isolated operations to make #102's HubSpot-first refactoring straightforward.

### Changes Required:

#### 1. Leads Router
**File**: `src/server/api/routers/leads.ts` (replace existing stub)

```ts
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  leadCreateSchema,
  leadFilterSchema,
  leadQuickCaptureSchema,
  leadUpdateSchema,
} from "~/server/api/schemas/leads";
import { leads } from "~/server/db/schema";

export const leadsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(leadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db.insert(leads).values({
        ...input,
        leadStage: "unqualified",
        leadScore: 0,
      }).returning();
      return lead!;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: eq(leads.id, input.id),
      });
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      return lead;
    }),

  list: protectedProcedure
    .input(leadFilterSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, sortBy, sortOrder, stage, constructionTimeline, preferredEstate, fhogEligible } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (stage) conditions.push(eq(leads.leadStage, stage));
      if (constructionTimeline) conditions.push(eq(leads.constructionTimeline, constructionTimeline));
      if (fhogEligible) conditions.push(eq(leads.propertyType, "first_home_buyer"));
      if (preferredEstate) conditions.push(sql`${preferredEstate} = ANY(${leads.preferredEstates})`);

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderFn = sortOrder === "asc" ? asc : desc;

      const [items, countResult] = await Promise.all([
        ctx.db.query.leads.findMany({
          where,
          orderBy: orderFn(leads[sortBy]),
          limit,
          offset,
        }),
        ctx.db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  update: protectedProcedure
    .input(leadUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

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

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(leads)
        .where(eq(leads.id, input.id))
        .returning({ id: leads.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      return deleted;
    }),

  getByStage: protectedProcedure.query(async ({ ctx }) => {
    const allLeads = await ctx.db.query.leads.findMany({
      orderBy: desc(leads.leadScore),
    });

    return {
      unqualified: allLeads.filter((l) => l.leadStage === "unqualified"),
      nurture: allLeads.filter((l) => l.leadStage === "nurture"),
      warm: allLeads.filter((l) => l.leadStage === "warm"),
      hot: allLeads.filter((l) => l.leadStage === "hot"),
    };
  }),
});
```

**Note on `leads.create`**: Quick capture and full form both use this procedure. Quick capture sends `firstName`, `lastName`, `phone`, `notes`, and optionally `leadSource` — all valid against `leadCreateSchema` since only name is required. A separate `leadQuickCaptureSchema` exists for client-side form validation (stricter — requires `phone`), but the tRPC procedure accepts the superset schema. The quick capture form validates with `leadQuickCaptureSchema` on the client, then submits the data through the same `leads.create` procedure.

#### 2. Router Tests
**File**: `src/server/api/__tests__/leads-router.test.ts` (new file)

Separate file from the existing `router.test.ts` which tests stubs. This file tests the real leads procedures with a mocked Drizzle db.

```ts
import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import type { createCaller } from "../root";

type Caller = ReturnType<typeof createCaller>;

// Shared mock lead data
const mockLead = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "0412345678",
  leadStage: "unqualified",
  leadScore: 0,
  // ... remaining fields
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: {
      DATABASE_URL: "postgres://mock",
      HUBSPOT_ACCESS_TOKEN: "mock",
      HUBSPOT_CLIENT_SECRET: "mock",
    },
  }));

  // Authenticated session
  rs.doMock("~/lib/session", () => ({
    getSession: rs.fn().mockResolvedValue({
      user: { id: "test-user-id", email: "test@example.com", name: "Test" },
      session: { id: "test-session-id" },
    }),
  }));
});

// Tests for each procedure:
// - leads.create: valid full form, valid quick capture, rejects invalid input
// - leads.getById: found, not found (throws NOT_FOUND)
// - leads.list: default pagination, with filters, empty results
// - leads.update: valid partial update, not found, rejects invalid id
// - leads.delete: success, not found
// - leads.getByStage: groups leads correctly into 4 buckets
```

The mocked db will use `rs.doMock("~/server/db", ...)` providing a mock `db` object with mock query/insert/update/delete methods. Each test configures the mock return values for its scenario.

#### 3. Update Existing Router Tests
**File**: `src/server/api/__tests__/router.test.ts`

Update the stubs array — `leads.getAll` no longer exists. Replace with a reference to the new `leads-router.test.ts` or update the stub test to reflect the new procedure names. The simplest approach: remove the `leads.getAll` stub entry and the unauthenticated test that calls `leads.getAll`, replacing with `leads.getByStage` (the only parameterless procedure).

```ts
// In stubs array, replace:
// { name: "leads.getAll", call: (c: Caller) => c.leads.getAll(), expected: [] },
// With a reference that the leads router has its own dedicated test file.

// Update unauthenticated test to use leads.getByStage:
test("protected procedure throws UNAUTHORIZED without session", async () => {
  const { createCaller } = await import("../root");
  const { createTRPCContext } = await import("../trpc");
  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = createCaller(ctx);

  try {
    await caller.leads.getByStage();
    expect.unreachable("Should have thrown");
  } catch (e) {
    expect(e).toBeInstanceOf(TRPCError);
    expect((e as TRPCError).code).toBe("UNAUTHORIZED");
  }
});
```

### Success Criteria:

#### Automated Verification:
- [x] All unit tests pass: `make test`
- [x] Lint + typecheck pass: `make check`
- [x] No regressions in existing router tests

#### Manual Verification:
- [x] `leads.create` with full form data returns a valid lead with `stage: unqualified`
- [x] `leads.create` with quick capture data (name + phone + notes) returns a lead
- [x] `leads.list` returns paginated results with correct `totalPages` calculation
- [x] `leads.list` filters by stage correctly
- [x] `leads.getByStage` returns leads grouped into 4 stage buckets
- [x] `leads.getById` throws NOT_FOUND for non-existent UUID
- [x] `leads.update` with partial fields updates only those fields and sets `updatedAt`
- [x] `leads.delete` hard-deletes the record
- [x] Input validation rejects malformed data with clear Zod error messages

---

## Performance Considerations

- `leads.list` runs two parallel queries (items + count) via `Promise.all` — no sequential penalty for pagination
- `leads.getByStage` fetches all leads in a single query then filters in JS — acceptable for pilot volume (<1000 leads). If volume grows, refactor to 4 parallel queries with `WHERE lead_stage = ?` or a single grouped query
- The `leads_lead_stage_idx` index supports both `getByStage` and `list` filter by stage efficiently

## References

- GitHub issue: #96
- Parent epic: #86
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Data Model + Qualification Schema)
- Enquiry form spec: `docs/sales/Display-Client-Enquiry-Form-v1.2.md`
- HubSpot sync (next step): #102
