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

const baseLead = {
  id: LEAD_ID,
  hubspotContactId: "hs-123",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "0400000000",
  leadScore: 50,
  leadStage: "warm" as const,
};

let mockDb: Record<string, unknown>;
let mockDispatchEmail: ReturnType<typeof rs.fn>;
let mockDispatchSms: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockDispatchEmail = rs.fn().mockResolvedValue({ conversationId: "conv-123" });
  mockDispatchSms = rs.fn().mockResolvedValue({ conversationId: "conv-456" });

  rs.doMock("~/env", () => ({
    env: {
      DATABASE_URL: "postgres://mock",
      HUBSPOT_ACCESS_TOKEN: "mock",
      HUBSPOT_CLIENT_SECRET: "mock",
      HUBSPOT_BCC_ADDRESS: "bcc@bcc.hubspot.com",
      MS_GRAPH_CLIENT_ID: "test-id",
      MS_GRAPH_CLIENT_SECRET: "test-secret",
      MS_GRAPH_REDIRECT_URI: "https://www.localhost/api/auth/ms-graph/callback",
      BETTER_AUTH_URL: "https://www.localhost",
      TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_FROM_NUMBER: "+14155551234",
      TWILIO_CONSULTANT_NUMBER: "+61400000000",
    },
  }));

  rs.doMock("~/lib/session", () => ({
    getSession: rs.fn().mockResolvedValue({
      user: { id: "test-user-id", email: "test@example.com", name: "Test" },
      session: { id: "test-session-id" },
    }),
  }));

  rs.doMock("~/server/dispatch/email-dispatch", () => ({
    dispatchEmail: mockDispatchEmail,
  }));

  rs.doMock("~/server/dispatch/sms-dispatch", () => ({
    dispatchSms: mockDispatchSms,
  }));

  mockDb = {
    update: rs.fn(),
    select: rs.fn(),
    query: {
      messageQueue: { findFirst: rs.fn() },
      leads: { findFirst: rs.fn().mockResolvedValue(baseLead) },
      msGraphTokens: {
        findFirst: rs.fn().mockResolvedValue({ userId: "test-user-id" }),
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

// --- email channel dispatch ---

type MockQuery = {
  messageQueue: { findFirst: ReturnType<typeof rs.fn> };
  leads: { findFirst: ReturnType<typeof rs.fn> };
  msGraphTokens: { findFirst: ReturnType<typeof rs.fn> };
};

const emailMessage = {
  ...baseMessage,
  channel: "email" as const,
  subject: "Hello",
};

describe("messages.approve — email channel", () => {
  test("happy path: dispatches and returns approved row", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    const approved = {
      ...emailMessage,
      status: "approved" as const,
      approvedAt: new Date(),
    };
    mockUpdateReturning(approved);

    const caller = await getCaller();
    const result = await caller.messages.approve({ id: MSG_ID });

    expect(result.status).toBe("approved");
    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({ lead: baseLead }),
    );
  });

  test("throws PRECONDITION_FAILED and skips dispatch when lead has no hubspotContactId", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    (mockDb.query as MockQuery).leads.findFirst.mockResolvedValue({
      ...baseLead,
      hubspotContactId: null,
    });

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
      expect(mockDispatchEmail).not.toHaveBeenCalled();
    }
  });

  test("throws PRECONDITION_FAILED and skips dispatch when lead has no email", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    (mockDb.query as MockQuery).leads.findFirst.mockResolvedValue({
      ...baseLead,
      email: null,
    });

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
      expect(mockDispatchEmail).not.toHaveBeenCalled();
    }
  });

  test("throws PRECONDITION_FAILED with connect message when Microsoft account not connected", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    (mockDb.query as MockQuery).msGraphTokens.findFirst.mockResolvedValue(
      undefined,
    );

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
      expect((e as TRPCError).message).toBe(
        "Connect your Microsoft account to send emails.",
      );
      expect(mockDispatchEmail).not.toHaveBeenCalled();
    }
  });

  test("dispatch fails → status update is never called", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    mockDispatchEmail.mockRejectedValue(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Graph 503" }),
    );

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect(mockDb.update).not.toHaveBeenCalled();
    }
  });

  test("dispatch succeeds → status update runs after dispatch", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    const approved = {
      ...emailMessage,
      status: "approved" as const,
      approvedAt: new Date(),
    };
    mockUpdateReturning(approved);

    const caller = await getCaller();
    await caller.messages.approve({ id: MSG_ID });

    const dispatchOrder = mockDispatchEmail.mock.invocationCallOrder[0]!;
    const updateOrder = (mockDb.update as ReturnType<typeof rs.fn>).mock
      .invocationCallOrder[0]!;
    expect(dispatchOrder).toBeLessThan(updateOrder);
  });

  test("sms channel: dispatch runs, then status flips", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      baseMessage,
    );
    const approved = {
      ...baseMessage,
      status: "approved" as const,
      approvedAt: new Date(),
    };
    mockUpdateReturning(approved);

    const caller = await getCaller();
    const result = await caller.messages.approve({ id: MSG_ID });

    expect(result.status).toBe("approved");
    expect(mockDispatchSms).toHaveBeenCalledOnce();
    expect(mockDispatchSms).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          id: MSG_ID,
          body: "Original draft body",
        }),
      }),
    );
    const dispatchOrder = mockDispatchSms.mock.invocationCallOrder[0]!;
    const updateOrder = (mockDb.update as ReturnType<typeof rs.fn>).mock
      .invocationCallOrder[0]!;
    expect(dispatchOrder).toBeLessThan(updateOrder);
  });

  test("sms channel: dispatch failure leaves row pending; status update is not called", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      baseMessage,
    );
    mockDispatchSms.mockRejectedValue(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send SMS. Please try again.",
      }),
    );

    const caller = await getCaller();
    try {
      await caller.messages.approve({ id: MSG_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect(mockDb.update).not.toHaveBeenCalled();
    }
  });

  test("approve sms + skipDispatch: true → dispatchSms not called, sentAt stamped, status flips", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      baseMessage,
    );
    const approved = {
      ...baseMessage,
      status: "approved" as const,
      approvedAt: new Date(),
      sentAt: new Date(),
    };
    const { set } = mockUpdateReturning(approved);

    const caller = await getCaller();
    const result = await caller.messages.approve({
      id: MSG_ID,
      skipDispatch: true,
    });

    expect(result.status).toBe("approved");
    expect(mockDispatchSms).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approvedAt: expect.any(Date),
        sentAt: expect.any(Date),
      }),
    );
  });
});

describe("messages.editAndApprove — sms channel", () => {
  test("editAndApprove sms + skipDispatch: true → dispatchSms not called, edited body saved, sentAt stamped", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      baseMessage,
    );
    const edited = {
      ...baseMessage,
      status: "edited_and_approved" as const,
      body: "Edited body",
      originalBody: baseMessage.body,
      approvedAt: new Date(),
      sentAt: new Date(),
    };
    const { set } = mockUpdateReturning(edited);

    const caller = await getCaller();
    const result = await caller.messages.editAndApprove({
      id: MSG_ID,
      body: "Edited body",
      skipDispatch: true,
    });

    expect(result.status).toBe("edited_and_approved");
    expect(mockDispatchSms).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "edited_and_approved",
        body: "Edited body",
        sentAt: expect.any(Date),
      }),
    );
  });

  test("dispatches with input.body, not the existing row body", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      baseMessage,
    );
    const edited = {
      ...baseMessage,
      status: "edited_and_approved" as const,
      body: "Edited body",
      originalBody: baseMessage.body,
      approvedAt: new Date(),
    };
    mockUpdateReturning(edited);

    const caller = await getCaller();
    await caller.messages.editAndApprove({ id: MSG_ID, body: "Edited body" });

    expect(mockDispatchSms).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ body: "Edited body" }),
      }),
    );
  });

  test("dispatch failure → body and originalBody are not written", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      baseMessage,
    );
    mockDispatchSms.mockRejectedValue(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send SMS. Please try again.",
      }),
    );

    const caller = await getCaller();
    try {
      await caller.messages.editAndApprove({ id: MSG_ID, body: "Edited body" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect(mockDb.update).not.toHaveBeenCalled();
    }
  });
});

describe("messages.editAndApprove — email channel", () => {
  test("happy path: dispatches and returns edited_and_approved row", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    const edited = {
      ...emailMessage,
      status: "edited_and_approved" as const,
      body: "Rewritten",
      originalBody: emailMessage.body,
      approvedAt: new Date(),
    };
    mockUpdateReturning(edited);

    const caller = await getCaller();
    const result = await caller.messages.editAndApprove({
      id: MSG_ID,
      body: "Rewritten",
    });

    expect(result.status).toBe("edited_and_approved");
    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({ lead: baseLead }),
    );
  });

  test("throws PRECONDITION_FAILED when lead has no email", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    (mockDb.query as MockQuery).leads.findFirst.mockResolvedValue({
      ...baseLead,
      email: null,
    });

    const caller = await getCaller();
    try {
      await caller.messages.editAndApprove({ id: MSG_ID, body: "Rewritten" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
      expect(mockDispatchEmail).not.toHaveBeenCalled();
    }
  });

  test("dispatch failure → body and originalBody are not written", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    mockDispatchEmail.mockRejectedValue(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Graph 503" }),
    );

    const caller = await getCaller();
    try {
      await caller.messages.editAndApprove({ id: MSG_ID, body: "Rewritten" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect(mockDb.update).not.toHaveBeenCalled();
    }
  });

  test("dispatches with input.body, not the existing row body", async () => {
    (mockDb.query as MockQuery).messageQueue.findFirst.mockResolvedValue(
      emailMessage,
    );
    const edited = {
      ...emailMessage,
      status: "edited_and_approved" as const,
      body: "Rewritten",
      originalBody: emailMessage.body,
      approvedAt: new Date(),
    };
    mockUpdateReturning(edited);

    const caller = await getCaller();
    await caller.messages.editAndApprove({ id: MSG_ID, body: "Rewritten" });

    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ body: "Rewritten" }),
      }),
    );
  });
});
