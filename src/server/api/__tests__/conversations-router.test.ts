import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import type { createCaller } from "../root";

type Caller = ReturnType<typeof createCaller>;

const LEAD_ID = "660e8400-e29b-41d4-a716-446655440001";
const CONV_ID_1 = "770e8400-e29b-41d4-a716-446655440002";
const CONV_ID_2 = "880e8400-e29b-41d4-a716-446655440003";

const baseConversation = {
  id: CONV_ID_1,
  leadId: LEAD_ID,
  channel: "email" as const,
  direction: "outbound" as const,
  deliveryMethod: "email" as const,
  subject: "Hello there",
  body: "This is the sent body",
  createdAt: new Date("2026-04-10T02:00:00Z"),
  originalBody: null,
};

let mockDb: Record<string, unknown>;

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: {
      DATABASE_URL: "postgres://mock",
      HUBSPOT_ACCESS_TOKEN: "mock",
      HUBSPOT_CLIENT_SECRET: "mock",
      HUBSPOT_BCC_ADDRESS: "bcc@bcc.hubspot.com",
      MS_GRAPH_CLIENT_ID: "test-id",
      MS_GRAPH_CLIENT_SECRET: "test-secret",
      MS_GRAPH_REDIRECT_URI: "https://www.localhost/api/auth/ms-graph/callback",
    },
  }));

  rs.doMock("~/lib/session", () => ({
    getSession: rs.fn().mockResolvedValue({
      user: { id: "test-user-id", email: "test@example.com", name: "Test" },
      session: { id: "test-session-id" },
    }),
  }));

  mockDb = {
    select: rs.fn(),
  };

  rs.doMock("~/server/db", () => ({ db: mockDb }));
});

async function getCaller(): Promise<Caller> {
  const { createCaller } = await import("../root");
  const { createTRPCContext } = await import("../trpc");
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCaller(ctx);
}

// Wire up the chainable select().from().leftJoin().where().orderBy() pipeline
function mockSelectListConversations(rows: unknown[]) {
  const orderBy = rs.fn().mockResolvedValue(rows);
  const where = rs.fn().mockReturnValue({ orderBy });
  const leftJoin = rs.fn().mockReturnValue({ where });
  const from = rs.fn().mockReturnValue({ leftJoin });
  const select = rs.fn().mockReturnValue({ from });
  (mockDb.select as ReturnType<typeof rs.fn>).mockImplementation(select);
  return { select, from, leftJoin, where, orderBy };
}

// --- conversations.list ---

describe("conversations.list", () => {
  test("returns rows ordered newest-first", async () => {
    const newer = {
      ...baseConversation,
      id: CONV_ID_1,
      createdAt: new Date("2026-04-10T02:00:00Z"),
    };
    const older = {
      ...baseConversation,
      id: CONV_ID_2,
      createdAt: new Date("2026-04-10T00:00:00Z"),
    };
    mockSelectListConversations([newer, older]);

    const caller = await getCaller();
    const result = await caller.conversations.list({ leadId: LEAD_ID });

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(CONV_ID_1);
    expect(result[1]?.id).toBe(CONV_ID_2);
  });

  test("returns empty array when lead has no conversations", async () => {
    mockSelectListConversations([]);

    const caller = await getCaller();
    const result = await caller.conversations.list({ leadId: LEAD_ID });

    expect(result).toEqual([]);
  });

  test("surfaces originalBody when row was linked to an edited queue message", async () => {
    const editedRow = {
      ...baseConversation,
      body: "Edited sent body",
      originalBody: "Original AI draft",
    };
    mockSelectListConversations([editedRow]);

    const caller = await getCaller();
    const result = await caller.conversations.list({ leadId: LEAD_ID });

    expect(result[0]?.originalBody).toBe("Original AI draft");
    expect(result[0]?.body).toBe("Edited sent body");
  });

  test("originalBody is null when no messageQueueId link or no edit", async () => {
    const unlinkedRow = { ...baseConversation, originalBody: null };
    mockSelectListConversations([unlinkedRow]);

    const caller = await getCaller();
    const result = await caller.conversations.list({ leadId: LEAD_ID });

    expect(result[0]?.originalBody).toBeNull();
  });

  test("rejects non-uuid leadId with BAD_REQUEST", async () => {
    const caller = await getCaller();
    try {
      await caller.conversations.list({ leadId: "not-a-uuid" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("scopes where clause to the requested leadId", async () => {
    const { leftJoin, where, orderBy } = mockSelectListConversations([]);

    const caller = await getCaller();
    await caller.conversations.list({ leadId: LEAD_ID });

    expect(leftJoin).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalled();
  });
});
