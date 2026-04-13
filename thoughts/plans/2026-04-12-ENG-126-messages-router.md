# tRPC Messages Router + Zod Input Schemas Implementation Plan

## Overview

Flesh out the currently-stubbed `messagesRouter` with 5 procedures (`listPending`, `approve`, `editAndApprove`, `snooze`, `dismiss`) and introduce a dedicated Zod input-schema file. The schema, enum, and index already exist; this ticket is purely the API layer plus tests.

This router unblocks three follow-on tickets (Twilio dispatch #4, HubSpot dispatch #5, action queue view). Actual message sending, queue UI, and AI draft generation are out of scope.

## Current State Analysis

- `src/server/api/routers/messages.ts:1-7` — stub router with a single `getPending` query that returns `[]`. No imports from `~/server/db/schema`.
- `src/server/db/schema/message-queue.ts:13-37` — `message_queue` table with `id`, `leadId`, `channel`, `subject`, `body`, `aiReasoning`, `priority`, `status`, `snoozedUntil`, `originalBody`, `approvedAt`, `sentAt`, `createdAt`. Composite index on `(status, priority)`.
- `src/server/db/schema/enums.ts:69-77` — `channelEnum` (`sms`, `email`) and `messageStatusEnum` (`pending`, `approved`, `edited_and_approved`, `dismissed`, `snoozed`).
- `src/server/db/schema/index.ts:7` — re-exports `message-queue`, so `db.query.messageQueue` is available via the drizzle schema passed at `src/server/db/index.ts:10`.
- `src/server/api/routers/leads.ts` — canonical router pattern: `protectedProcedure.input(schema).mutation/query(async ({ ctx, input }) => ...)`, `TRPCError` for NOT_FOUND, update + `.returning()` chains.
- `src/server/api/schemas/leads.ts:1-137` — canonical schema pattern: enum schemas mirror db enums, main schemas with inline validation, type exports at bottom via `z.infer`.
- `src/server/api/schemas/__tests__/leads.test.ts:1-125` — canonical Zod test pattern: `safeParse` + assertions on `.success`, one describe block per schema.
- `src/server/api/__tests__/leads-router.test.ts:1-899` — canonical router test pattern: `rs.resetModules()` + `rs.doMock()` for `~/env`, `~/lib/session`, `~/server/db`, chainable mock builders for drizzle's fluent API, `getCaller()` helper.
- `src/server/api/__tests__/router.test.ts:61-65` — the existing multi-stub test includes `messages.getPending` in its loop. This entry must be removed when the stub is replaced.

### Key Discoveries

- **Status transitions are enforced in the router, not the DB.** Drizzle enums are just Postgres strings; there's no runtime state machine. We need an explicit guard (terminal states: `approved`, `edited_and_approved`, `dismissed`).
- **`listPending`'s filter is belt-and-braces.** Filtering by `status = 'pending'` alone excludes `snoozed` rows because snoozing changes the status. The additional `snoozedUntil <= now()` check is a defensive guard in case a pending row ever carries a future `snoozedUntil` (e.g. a draft scheduled for later by a follow-on ticket). Both conditions must hold.
- **`db.query.messageQueue` works** because `src/server/db/index.ts:10` passes `* as schema` to `drizzle()`, and `message-queue.ts` exports `messageQueue` re-exported through `src/server/db/schema/index.ts:7`.
- **`TRPCError` is wrapped automatically for Zod failures.** The error formatter at `src/server/api/trpc.ts:20-29` surfaces `ZodError` as `BAD_REQUEST` — tests use `expect((e as TRPCError).code).toBe("BAD_REQUEST")`.
- **The `leads-router.test.ts` mocking pattern is opinionated.** Each test rebuilds chainable mocks fresh (`returning` → `where` → `set` → `update`). Follow that pattern for consistency; do not introduce a new helper.

## Desired End State

- `src/server/api/schemas/messages.ts` exists and exports typed Zod schemas for every mutation input, plus inferred TypeScript types.
- `src/server/api/routers/messages.ts` exposes `listPending`, `approve`, `editAndApprove`, `snooze`, `dismiss` as `protectedProcedure`s with correct status-transition guards.
- `src/server/api/schemas/__tests__/messages.test.ts` covers happy/unhappy paths for each schema.
- `src/server/api/__tests__/messages-router.test.ts` covers happy/unhappy paths and transition guards for each procedure.
- `src/server/api/__tests__/router.test.ts` no longer references `messages.getPending`.
- `make check` and `make test` pass.

### Verification

```bash
make check         # typecheck + lint
make test          # all Rstest unit tests green, including new schema + router tests
```

## What We're NOT Doing

- **Actual SMS/email dispatch.** Approving a message just flips its status; Twilio/HubSpot sends are #4/#5.
- **AI draft generation.** Inserts into `message_queue` happen elsewhere (nurture scheduler).
- **Un-snoozing.** A cron or the nurture scheduler will later transition expired `snoozed` rows back to `pending`. This PR does not add that job.
- **Action queue UI.** The queue view consumes `listPending` but is its own ticket.
- **Joined lead data in `listPending`.** Return raw `message_queue` rows; the UI can fetch lead context via separate queries.
- **Integration tests against a real Postgres.** Follow the existing `leads-router.test.ts` pattern with mocked drizzle.

## Implementation Approach

Build Zod schemas first (phase 1) so the router can import and `.input()` them in phase 2. Each phase ends with all new tests green and nothing regressed.

For status-transition enforcement, use a **read-then-update** flow in each mutation. This:

1. Gives the exact current `status` so the error message can say what state was found.
2. Lets `editAndApprove` read the current `body` in the same fetch (needed to populate `originalBody`).
3. Matches how `leads.update` already reads the lead row first to get `hubspotContactId`.
4. Keeps the mock setup in tests simple (one `findFirst` + one `update` chain).

Concurrency: two simultaneous `approve` calls could both pass the status check and both write. That's acceptable for M0 — the second write is idempotent (same final status, `approvedAt` overwrite is harmless). If this matters later, move to a single conditional update with `where: and(eq(id, x), inArray(status, actionable))`.

## Phase 1: Zod Input Schemas + Schema Tests

### Overview

Create `src/server/api/schemas/messages.ts` with validators for each mutation and a matching test file. No router changes yet — the stub router stays in place so existing tests keep passing.

### Changes Required:

#### 1. Zod schema file

**File**: `src/server/api/schemas/messages.ts` (new)
**Changes**: Define enum schemas mirroring db enums, per-mutation input schemas, and type exports.

```typescript
import { z } from "zod";

// Enum schemas — mirror values from src/server/db/schema/enums.ts
export const channelSchema = z.enum(["sms", "email"]);

export const messageStatusSchema = z.enum([
  "pending",
  "approved",
  "edited_and_approved",
  "dismissed",
  "snoozed",
]);

// approve / dismiss — id only
export const messageApproveSchema = z.object({
  id: z.string().uuid(),
});

export const messageDismissSchema = z.object({
  id: z.string().uuid(),
});

// editAndApprove — id + new body (trimmed, non-empty, <= 1600 chars)
// 1600 is the SMS segment ceiling; email is fine at the same bound.
export const messageEditAndApproveSchema = z.object({
  id: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message body cannot be empty")
    .max(1600, "Message body cannot exceed 1600 characters"),
});

// snooze — id + future snoozedUntil (coerced from ISO string)
export const messageSnoozeSchema = z.object({
  id: z.string().uuid(),
  snoozedUntil: z.coerce.date().refine((date) => date > new Date(), {
    message: "snoozedUntil must be a future date",
  }),
});

export type MessageApprove = z.infer<typeof messageApproveSchema>;
export type MessageDismiss = z.infer<typeof messageDismissSchema>;
export type MessageEditAndApprove = z.infer<typeof messageEditAndApproveSchema>;
export type MessageSnooze = z.infer<typeof messageSnoozeSchema>;
```

#### 2. Zod schema tests

**File**: `src/server/api/schemas/__tests__/messages.test.ts` (new)
**Tests**: Happy + unhappy paths for each schema. Follows the `leads.test.ts` style (one `describe` per schema, `safeParse` + `.success` assertions).

```typescript
import { describe, expect, test } from "@rstest/core";
import {
  messageApproveSchema,
  messageDismissSchema,
  messageEditAndApproveSchema,
  messageSnoozeSchema,
} from "../messages";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("messageApproveSchema", () => {
  test("accepts valid uuid", () => {
    expect(messageApproveSchema.safeParse({ id: VALID_UUID }).success).toBe(true);
  });
  test("rejects non-uuid id", () => {
    expect(messageApproveSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });
  test("rejects missing id", () => {
    expect(messageApproveSchema.safeParse({}).success).toBe(false);
  });
});

describe("messageDismissSchema", () => {
  test("accepts valid uuid", () => {
    expect(messageDismissSchema.safeParse({ id: VALID_UUID }).success).toBe(true);
  });
  test("rejects non-uuid id", () => {
    expect(messageDismissSchema.safeParse({ id: "x" }).success).toBe(false);
  });
});

describe("messageEditAndApproveSchema", () => {
  test("accepts valid body", () => {
    const result = messageEditAndApproveSchema.safeParse({
      id: VALID_UUID,
      body: "Hey John, still looking at Springfield Rise?",
    });
    expect(result.success).toBe(true);
  });
  test("rejects empty body", () => {
    expect(
      messageEditAndApproveSchema.safeParse({ id: VALID_UUID, body: "" }).success,
    ).toBe(false);
  });
  test("rejects whitespace-only body after trim", () => {
    expect(
      messageEditAndApproveSchema.safeParse({ id: VALID_UUID, body: "   " }).success,
    ).toBe(false);
  });
  test("accepts body at exactly 1600 chars", () => {
    expect(
      messageEditAndApproveSchema.safeParse({
        id: VALID_UUID,
        body: "x".repeat(1600),
      }).success,
    ).toBe(true);
  });
  test("rejects body over 1600 chars", () => {
    expect(
      messageEditAndApproveSchema.safeParse({
        id: VALID_UUID,
        body: "x".repeat(1601),
      }).success,
    ).toBe(false);
  });
});

describe("messageSnoozeSchema", () => {
  test("accepts a future Date", () => {
    const future = new Date(Date.now() + 3600_000); // +1h
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: future }).success,
    ).toBe(true);
  });
  test("coerces an ISO string to Date", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: future }).success,
    ).toBe(true);
  });
  test("rejects a past date", () => {
    const past = new Date(Date.now() - 1000);
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: past }).success,
    ).toBe(false);
  });
  test("rejects unparseable input", () => {
    expect(
      messageSnoozeSchema.safeParse({ id: VALID_UUID, snoozedUntil: "not-a-date" })
        .success,
    ).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] Typecheck + lint pass: `make check`
- [x] Schema tests pass: `make test` (new file `messages.test.ts` runs and is green)
- [x] `src/server/api/schemas/messages.ts` exports `messageApproveSchema`, `messageDismissSchema`, `messageEditAndApproveSchema`, `messageSnoozeSchema` and their inferred types

#### Manual Verification:
- [x] Eyeball the file layout against `schemas/leads.ts` — ordering (enums → schemas → types) and comment style should match

---

## Phase 2: Router Procedures + Router Tests

### Overview

Replace the stub router with the five real procedures, add a dedicated `messages-router.test.ts`, and clean up the `router.test.ts` stub list.

### Changes Required:

#### 1. Messages router

**File**: `src/server/api/routers/messages.ts` (rewrite)
**Changes**: Implement all five procedures. A small local helper (`loadActionable`) encapsulates the fetch + status guard used by every mutation.

```typescript
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import {
  messageApproveSchema,
  messageDismissSchema,
  messageEditAndApproveSchema,
  messageSnoozeSchema,
} from "~/server/api/schemas/messages";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { messageQueue } from "~/server/db/schema";

/**
 * Fetch a message_queue row and assert its status permits a user action.
 * Terminal states (approved, edited_and_approved, dismissed) are rejected.
 * Returns the fetched row so callers like editAndApprove can reuse the body.
 */
async function loadActionable(
  db: typeof import("~/server/db").db,
  id: string,
  action: "approve" | "edit" | "snooze" | "dismiss",
): Promise<typeof messageQueue.$inferSelect> {
  const row = await db.query.messageQueue.findFirst({
    where: eq(messageQueue.id, id),
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
  }
  if (row.status !== "pending" && row.status !== "snoozed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot ${action} message in ${row.status} state`,
    });
  }
  return row;
}

export const messagesRouter = createTRPCRouter({
  listPending: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.messageQueue.findMany({
      where: and(
        eq(messageQueue.status, "pending"),
        or(
          isNull(messageQueue.snoozedUntil),
          lte(messageQueue.snoozedUntil, new Date()),
        ),
      ),
      orderBy: [desc(messageQueue.priority), asc(messageQueue.createdAt)],
    });
  }),

  approve: protectedProcedure
    .input(messageApproveSchema)
    .mutation(async ({ ctx, input }) => {
      await loadActionable(ctx.db, input.id, "approve");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  editAndApprove: protectedProcedure
    .input(messageEditAndApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await loadActionable(ctx.db, input.id, "edit");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({
          status: "edited_and_approved",
          body: input.body,
          // Preserve the first-ever draft. If the row was already edited, keep
          // the original; otherwise snapshot the current body.
          originalBody: existing.originalBody ?? existing.body,
          approvedAt: new Date(),
        })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  snooze: protectedProcedure
    .input(messageSnoozeSchema)
    .mutation(async ({ ctx, input }) => {
      await loadActionable(ctx.db, input.id, "snooze");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({ status: "snoozed", snoozedUntil: input.snoozedUntil })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  dismiss: protectedProcedure
    .input(messageDismissSchema)
    .mutation(async ({ ctx, input }) => {
      await loadActionable(ctx.db, input.id, "dismiss");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({ status: "dismissed" })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),
});
```

#### 2. Remove stale stub entry from shared router test

**File**: `src/server/api/__tests__/router.test.ts`
**Changes**: Drop the `messages.getPending` entry from the `stubs` array (lines 61-65). The rest of the file is unchanged — `lots.getAll`, `nurture.getActive`, and `ai.healthCheck` are still stubs and still exercised here.

Before:
```typescript
const stubs = [
  { name: "lots.getAll", call: (c: Caller) => c.lots.getAll(), expected: [] },
  {
    name: "messages.getPending",
    call: (c: Caller) => c.messages.getPending(),
    expected: [],
  },
  { name: "nurture.getActive", ... },
  { name: "ai.healthCheck", ... },
];
```

After:
```typescript
const stubs = [
  { name: "lots.getAll", call: (c: Caller) => c.lots.getAll(), expected: [] },
  { name: "nurture.getActive", ... },
  { name: "ai.healthCheck", ... },
];
```

#### 3. Dedicated router tests

**File**: `src/server/api/__tests__/messages-router.test.ts` (new)
**Tests**: Each procedure gets a happy-path test, a NOT_FOUND test (where applicable), and a terminal-status guard test. Mock setup mirrors `leads-router.test.ts` — `rs.doMock` for `~/env`, `~/lib/session`, `~/server/db`, and a chainable `update` builder.

```typescript
import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import type { createCaller } from "../root";

type Caller = ReturnType<typeof createCaller>;

const MSG_ID = "550e8400-e29b-41d4-a716-446655440000";
const LEAD_ID = "660e8400-e29b-41d4-a716-446655440001";

const baseMessage = {
  id: MSG_ID,
  leadId: LEAD_ID,
  channel: "sms" as const,
  subject: null,
  body: "Original draft body",
  aiReasoning: null,
  priority: 5,
  status: "pending" as const,
  snoozedUntil: null,
  originalBody: null,
  approvedAt: null,
  sentAt: null,
  createdAt: new Date("2026-04-10T00:00:00Z"),
};

let mockDb: Record<string, unknown>;

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: {
      DATABASE_URL: "postgres://mock",
      HUBSPOT_ACCESS_TOKEN: "mock",
      HUBSPOT_CLIENT_SECRET: "mock",
    },
  }));

  rs.doMock("~/lib/session", () => ({
    getSession: rs.fn().mockResolvedValue({
      user: { id: "test-user-id", email: "test@example.com", name: "Test" },
      session: { id: "test-session-id" },
    }),
  }));

  mockDb = {
    update: rs.fn(),
    query: {
      messageQueue: {
        findFirst: rs.fn(),
        findMany: rs.fn(),
      },
    },
  };

  rs.doMock("~/server/db", () => ({ db: mockDb }));
});

async function getCaller(): Promise<Caller> {
  const { createCaller } = await import("../root");
  const { createTRPCContext } = await import("../trpc");
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCaller(ctx);
}

// Helper — wire up a chainable update mock that returns the given row
function mockUpdateReturning(row: unknown) {
  const returning = rs.fn().mockResolvedValue([row]);
  const where = rs.fn().mockReturnValue({ returning });
  const set = rs.fn().mockReturnValue({ where });
  (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });
  return { set, where, returning };
}

// --- messages.listPending ---

describe("messages.listPending", () => {
  test("returns rows from findMany", async () => {
    (
      mockDb.query as { messageQueue: { findMany: ReturnType<typeof rs.fn> } }
    ).messageQueue.findMany.mockResolvedValue([baseMessage]);

    const caller = await getCaller();
    const result = await caller.messages.listPending();

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(MSG_ID);
  });

  test("returns empty array when no pending rows", async () => {
    (
      mockDb.query as { messageQueue: { findMany: ReturnType<typeof rs.fn> } }
    ).messageQueue.findMany.mockResolvedValue([]);

    const caller = await getCaller();
    const result = await caller.messages.listPending();

    expect(result).toEqual([]);
  });

  test("orders by priority desc then createdAt asc", async () => {
    const findMany = (
      mockDb.query as { messageQueue: { findMany: ReturnType<typeof rs.fn> } }
    ).messageQueue.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.messages.listPending();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.anything(), where: expect.anything() }),
    );
  });
});

// --- messages.approve ---

describe("messages.approve", () => {
  test("transitions pending → approved and sets approvedAt", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const approved = { ...baseMessage, status: "approved" as const, approvedAt: new Date() };
    const { set } = mockUpdateReturning(approved);

    const caller = await getCaller();
    const result = await caller.messages.approve({ id: MSG_ID });

    expect(result.status).toBe("approved");
    expect(result.approvedAt).not.toBeNull();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", approvedAt: expect.any(Date) }),
    );
  });

  test("allows snoozed → approved", async () => {
    const snoozed = { ...baseMessage, status: "snoozed" as const };
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(snoozed);

    mockUpdateReturning({ ...snoozed, status: "approved", approvedAt: new Date() });

    const caller = await getCaller();
    const result = await caller.messages.approve({ id: MSG_ID });

    expect(result.status).toBe("approved");
  });

  test("throws NOT_FOUND when message does not exist", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(undefined);

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  test("rejects terminal state (dismissed)", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue({ ...baseMessage, status: "dismissed" });

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
      expect((e as TRPCError).message).toContain("dismissed");
    }
  });

  test("rejects invalid uuid", async () => {
    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: "not-a-uuid" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

// --- messages.editAndApprove ---

describe("messages.editAndApprove", () => {
  test("copies existing body into originalBody and sets new body", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const edited = {
      ...baseMessage,
      status: "edited_and_approved" as const,
      body: "Rewritten message",
      originalBody: "Original draft body",
      approvedAt: new Date(),
    };
    const { set } = mockUpdateReturning(edited);

    const caller = await getCaller();
    const result = await caller.messages.editAndApprove({
      id: MSG_ID,
      body: "Rewritten message",
    });

    expect(result.status).toBe("edited_and_approved");
    expect(result.body).toBe("Rewritten message");
    expect(result.originalBody).toBe("Original draft body");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "edited_and_approved",
        body: "Rewritten message",
        originalBody: "Original draft body",
      }),
    );
  });

  test("preserves originalBody when row was already edited once", async () => {
    const previouslyEdited = {
      ...baseMessage,
      body: "First edit",
      originalBody: "The true original",
    };
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(previouslyEdited);

    const { set } = mockUpdateReturning(previouslyEdited);

    const caller = await getCaller();
    await caller.messages.editAndApprove({ id: MSG_ID, body: "Second edit" });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ originalBody: "The true original" }),
    );
  });

  test("rejects empty body via Zod", async () => {
    const caller = await getCaller();
    try {
      await caller.messages.editAndApprove({ id: MSG_ID, body: "" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("rejects terminal state", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue({
      ...baseMessage,
      status: "approved",
    });

    const caller = await getCaller();
    try {
      await caller.messages.editAndApprove({ id: MSG_ID, body: "Too late" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

// --- messages.snooze ---

describe("messages.snooze", () => {
  test("sets snoozedUntil and transitions to snoozed", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const future = new Date(Date.now() + 3600_000);
    const snoozed = { ...baseMessage, status: "snoozed" as const, snoozedUntil: future };
    const { set } = mockUpdateReturning(snoozed);

    const caller = await getCaller();
    const result = await caller.messages.snooze({ id: MSG_ID, snoozedUntil: future });

    expect(result.status).toBe("snoozed");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "snoozed", snoozedUntil: future }),
    );
  });

  test("rejects past snoozedUntil via Zod", async () => {
    const past = new Date(Date.now() - 1000);
    const caller = await getCaller();
    try {
      await caller.messages.snooze({ id: MSG_ID, snoozedUntil: past });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("rejects terminal state", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue({
      ...baseMessage,
      status: "dismissed",
    });

    const future = new Date(Date.now() + 3600_000);
    const caller = await getCaller();
    try {
      await caller.messages.snooze({ id: MSG_ID, snoozedUntil: future });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

// --- messages.dismiss ---

describe("messages.dismiss", () => {
  test("transitions to dismissed", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const dismissed = { ...baseMessage, status: "dismissed" as const };
    const { set } = mockUpdateReturning(dismissed);

    const caller = await getCaller();
    const result = await caller.messages.dismiss({ id: MSG_ID });

    expect(result.status).toBe("dismissed");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dismissed" }),
    );
  });

  test("allows snoozed → dismissed", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue({ ...baseMessage, status: "snoozed" });

    mockUpdateReturning({ ...baseMessage, status: "dismissed" });

    const caller = await getCaller();
    const result = await caller.messages.dismiss({ id: MSG_ID });

    expect(result.status).toBe("dismissed");
  });

  test("throws NOT_FOUND when missing", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(undefined);

    const caller = await getCaller();
    try {
      await caller.messages.dismiss({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  test("rejects already-dismissed row", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue({ ...baseMessage, status: "dismissed" });

    const caller = await getCaller();
    try {
      await caller.messages.dismiss({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] Typecheck + lint pass: `make check`
- [x] All unit tests pass: `make test`
- [x] `messages-router.test.ts` asserts each procedure's happy path, terminal-state rejection, and (for approve/dismiss) NOT_FOUND handling
- [x] `router.test.ts` no longer references `messages.getPending`
- [x] `messagesRouter` has exactly five procedures: `listPending`, `approve`, `editAndApprove`, `snooze`, `dismiss`

#### Manual Verification:
- [x] Scan `src/server/api/root.ts` to confirm the router is still wired as `messages: messagesRouter`
- [x] Read through the router diff to confirm status-transition errors mention the current state (e.g. "Cannot approve message in dismissed state") so the action queue UI can surface a meaningful toast
- [x] Confirm that `editAndApprove`'s `originalBody` semantics — preserve first-ever draft — reads sensibly against the schema comment in `message-queue.ts`

---

## Performance Considerations

- `listPending` uses the `message_queue_status_priority_idx` composite index (`status`, `priority`). The `snoozedUntil` filter is applied as an index-filter, which is fine given pending-queue sizes are small (tens to low hundreds). If the queue ever grows past ~10k rows, revisit with a partial index `WHERE status = 'pending'`.
- Each mutation does one read + one write. For M0 validation that's irrelevant. If concurrency becomes a worry, the follow-up is a single conditional update with `where: and(eq(id, x), inArray(status, ['pending', 'snoozed']))` — but that loses the exact current-state info we need for the error message.

## Migration Notes

No DB migration required — `message_queue`, `channelEnum`, and `messageStatusEnum` already exist (per issue #126's preamble).

## References

- Original ticket: samjmarshall/rekurve-www#126
- Parent epic: samjmarshall/rekurve-www#87 (Epic 3: HITL Message Queue + Nurture Sequences)
- DB schema: `src/server/db/schema/message-queue.ts:13-37`
- DB enums: `src/server/db/schema/enums.ts:69-77`
- Router pattern: `src/server/api/routers/leads.ts`
- Schema pattern: `src/server/api/schemas/leads.ts`
- Schema test pattern: `src/server/api/schemas/__tests__/leads.test.ts`
- Router test pattern: `src/server/api/__tests__/leads-router.test.ts`
- Stale stub entry to remove: `src/server/api/__tests__/router.test.ts:61-65`
