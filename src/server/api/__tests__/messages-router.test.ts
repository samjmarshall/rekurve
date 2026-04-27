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

const emailMessage = {
  ...baseMessage,
  channel: "email" as const,
  subject: "Follow-up on your enquiry",
};

const baseLead = {
  id: LEAD_ID,
  email: "lead@example.com",
  firstName: "Jane",
  lastName: "Doe",
};

let mockDb: Record<string, unknown>;
let mockDispatchEmail: ReturnType<typeof rs.fn>;

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
    select: rs.fn(),
    query: {
      messageQueue: {
        findFirst: rs.fn(),
      },
      leads: {
        findFirst: rs.fn(),
      },
    },
  };

  rs.doMock("~/server/db", () => ({ db: mockDb }));

  mockDispatchEmail = rs.fn().mockResolvedValue(undefined);
  rs.doMock("~/server/dispatch/email-dispatch", () => ({
    dispatchEmail: mockDispatchEmail,
  }));
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

// Helper — wire up the chainable select()/from()/innerJoin()/where()/orderBy()
// pipeline that listPending uses, resolving to the given rows.
function mockSelectListPending(rows: unknown[]) {
  const orderBy = rs.fn().mockResolvedValue(rows);
  const where = rs.fn().mockReturnValue({ orderBy });
  const innerJoin = rs.fn().mockReturnValue({ where });
  const from = rs.fn().mockReturnValue({ innerJoin });
  const select = rs.fn().mockReturnValue({ from });
  (mockDb.select as ReturnType<typeof rs.fn>).mockImplementation(select);
  return { select, from, innerJoin, where, orderBy };
}

// --- messages.listPending ---

describe("messages.listPending", () => {
  const joinedRow = {
    ...baseMessage,
    lead: {
      id: LEAD_ID,
      firstName: "Jane",
      lastName: "Doe",
      leadScore: 75,
      leadStage: "warm" as const,
    },
  };

  test("returns rows with joined lead context", async () => {
    mockSelectListPending([joinedRow]);

    const caller = await getCaller();
    const result = await caller.messages.listPending();

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(MSG_ID);
    expect(result[0]?.lead).toEqual({
      id: LEAD_ID,
      firstName: "Jane",
      lastName: "Doe",
      leadScore: 75,
      leadStage: "warm",
    });
  });

  test("returns empty array when no pending rows", async () => {
    mockSelectListPending([]);

    const caller = await getCaller();
    const result = await caller.messages.listPending();

    expect(result).toEqual([]);
  });

  test("inner-joins leads and filters by status + snoozedUntil", async () => {
    const { innerJoin, where, orderBy } = mockSelectListPending([]);

    const caller = await getCaller();
    await caller.messages.listPending();

    expect(innerJoin).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalled();
  });

  test("includes status=snoozed rows whose snoozedUntil has elapsed", async () => {
    const elapsed = {
      ...joinedRow,
      status: "snoozed" as const,
      snoozedUntil: new Date(Date.now() - 60 * 60 * 1000),
    };
    mockSelectListPending([elapsed]);

    const caller = await getCaller();
    const result = await caller.messages.listPending();

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("snoozed");
  });
});

// --- messages.approve ---

describe("messages.approve", () => {
  test("transitions pending → approved and sets approvedAt", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const approved = {
      ...baseMessage,
      status: "approved" as const,
      approvedAt: new Date(),
    };
    const { set } = mockUpdateReturning(approved);

    const caller = await getCaller();
    const result = await caller.messages.approve({ id: MSG_ID });

    expect(result.status).toBe("approved");
    expect(result.approvedAt).not.toBeNull();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approvedAt: expect.any(Date),
      }),
    );
  });

  test("allows snoozed → approved", async () => {
    const snoozed = { ...baseMessage, status: "snoozed" as const };
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(snoozed);

    mockUpdateReturning({
      ...snoozed,
      status: "approved",
      approvedAt: new Date(),
    });

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
    ).messageQueue.findFirst.mockResolvedValue({
      ...baseMessage,
      status: "dismissed",
    });

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

// --- messages.approve + email dispatch ---

describe("messages.approve (email channel)", () => {
  function mockLeadQuery(lead: unknown) {
    (
      mockDb.query as {
        messageQueue: { findFirst: ReturnType<typeof rs.fn> };
        leads: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).leads.findFirst.mockResolvedValue(lead);
  }

  test("dispatches email BEFORE status flip and sets sentAt on success", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(emailMessage);
    mockLeadQuery(baseLead);

    const approved = {
      ...emailMessage,
      status: "approved" as const,
      approvedAt: new Date(),
      sentAt: new Date(),
    };
    const { set } = mockUpdateReturning(approved);

    const caller = await getCaller();
    const result = await caller.messages.approve({ id: MSG_ID });

    expect(mockDispatchEmail).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("approved");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approvedAt: expect.any(Date),
        sentAt: expect.any(Date),
      }),
    );
  });

  test("dispatch throws → status update never runs, row stays non-terminal", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(emailMessage);
    mockLeadQuery(baseLead);

    mockDispatchEmail.mockRejectedValue(
      new Error("Graph API 401 Unauthorized"),
    );

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }

    // The DB update should never have been called
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  test("sms channel does not call dispatch", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    mockUpdateReturning({
      ...baseMessage,
      status: "approved",
      approvedAt: new Date(),
    });

    const caller = await getCaller();
    await caller.messages.approve({ id: MSG_ID });

    expect(mockDispatchEmail).not.toHaveBeenCalled();
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

// --- messages.editAndApprove + email dispatch ---

describe("messages.editAndApprove (email channel)", () => {
  function mockLeadQuery(lead: unknown) {
    (
      mockDb.query as {
        messageQueue: { findFirst: ReturnType<typeof rs.fn> };
        leads: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).leads.findFirst.mockResolvedValue(lead);
  }

  test("dispatches email with edited body BEFORE status flip", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(emailMessage);
    mockLeadQuery(baseLead);

    const edited = {
      ...emailMessage,
      status: "edited_and_approved" as const,
      body: "Edited body",
      originalBody: emailMessage.body,
      approvedAt: new Date(),
      sentAt: new Date(),
    };
    const { set } = mockUpdateReturning(edited);

    const caller = await getCaller();
    const result = await caller.messages.editAndApprove({
      id: MSG_ID,
      body: "Edited body",
    });

    expect(mockDispatchEmail).toHaveBeenCalledTimes(1);
    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ body: "Edited body" }),
      }),
    );
    expect(result.status).toBe("edited_and_approved");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "edited_and_approved",
        sentAt: expect.any(Date),
      }),
    );
  });

  test("dispatch throws → status update never runs, row stays non-terminal", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(emailMessage);
    mockLeadQuery(baseLead);

    mockDispatchEmail.mockRejectedValue(new Error("Network failure"));

    const caller = await getCaller();
    try {
      await caller.messages.editAndApprove({
        id: MSG_ID,
        body: "Edited body",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }

    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

// --- messages.snooze ---

describe("messages.snooze", () => {
  test("sets snoozedUntil and transitions to snoozed", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const future = new Date(Date.now() + 3600_000);
    const snoozed = {
      ...baseMessage,
      status: "snoozed" as const,
      snoozedUntil: future,
    };
    const { set } = mockUpdateReturning(snoozed);

    const caller = await getCaller();
    const result = await caller.messages.snooze({
      id: MSG_ID,
      snoozedUntil: future,
    });

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

  test("rejects snoozedUntil inside the 15-minute buffer", async () => {
    const tooSoon = new Date(Date.now() + 14 * 60 * 1000);
    const caller = await getCaller();
    try {
      await caller.messages.snooze({ id: MSG_ID, snoozedUntil: tooSoon });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("accepts snoozedUntil at the 15-minute boundary", async () => {
    (
      mockDb.query as { messageQueue: { findFirst: ReturnType<typeof rs.fn> } }
    ).messageQueue.findFirst.mockResolvedValue(baseMessage);

    const atBoundary = new Date(Date.now() + 15 * 60 * 1000 + 1000);
    mockUpdateReturning({
      ...baseMessage,
      status: "snoozed",
      snoozedUntil: atBoundary,
    });

    const caller = await getCaller();
    const result = await caller.messages.snooze({
      id: MSG_ID,
      snoozedUntil: atBoundary,
    });
    expect(result.status).toBe("snoozed");
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
    ).messageQueue.findFirst.mockResolvedValue({
      ...baseMessage,
      status: "snoozed",
    });

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
    ).messageQueue.findFirst.mockResolvedValue({
      ...baseMessage,
      status: "dismissed",
    });

    const caller = await getCaller();
    try {
      await caller.messages.dismiss({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});
