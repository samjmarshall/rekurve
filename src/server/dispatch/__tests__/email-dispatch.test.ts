import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";

const LEAD_ID = "660e8400-e29b-41d4-a716-446655440001";
const MSG_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "test-user-id";

const mockLead = {
  id: LEAD_ID,
  email: "lead@example.com",
  hubspotContactId: "hs-123",
};

const mockMessage = {
  id: MSG_ID,
  leadId: LEAD_ID,
  channel: "email" as const,
  subject: "Following up",
  body: "Hi Jane, just checking in.",
  sentAt: null,
};

const mockCtx = {
  session: { user: { id: USER_ID } },
};

let mockSendEmail: ReturnType<typeof rs.fn>;
let mockInsert: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDb: Record<string, unknown>;

beforeEach(() => {
  rs.resetModules();

  mockSendEmail = rs.fn().mockResolvedValue({
    internetMessageId: "<abc@rekurve.com>",
    sentAt: new Date("2026-04-25T10:00:00Z"),
  });

  // Chainable db.insert().values().returning()
  const insertReturning = rs
    .fn()
    .mockResolvedValue([{ id: "conv-123", leadId: LEAD_ID }]);
  const insertValues = rs.fn().mockReturnValue({ returning: insertReturning });
  mockInsert = rs.fn().mockReturnValue({ values: insertValues });

  // Chainable db.update().set().where()
  const updateWhere = rs.fn().mockResolvedValue([]);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  mockDb = { insert: mockInsert, update: mockUpdate };

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_BCC_ADDRESS: "bcc@bcc.hubspot.com",
      MS_GRAPH_CLIENT_ID: "test-id",
      MS_GRAPH_CLIENT_SECRET: "test-secret",
      MS_GRAPH_REDIRECT_URI: "https://www.localhost/api/auth/ms-graph/callback",
    },
  }));

  rs.doMock("~/server/ms-graph", () => ({
    sendEmail: mockSendEmail,
    MsGraphNotConnectedError: class MsGraphNotConnectedError extends Error {
      constructor() {
        super("Microsoft account not connected");
        this.name = "MsGraphNotConnectedError";
      }
    },
  }));
});

describe("dispatchEmail", () => {
  test("calls sendEmail with correct userId, to, subject, body", async () => {
    const { dispatchEmail } = await import("../email-dispatch");

    await dispatchEmail({
      db: mockDb as never,
      ctx: mockCtx as never,
      message: mockMessage as never,
      lead: mockLead as never,
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        to: "lead@example.com",
        subject: "Following up",
        body: "Hi Jane, just checking in.",
      }),
    );
  });

  test("inserts conversations row on success", async () => {
    const { dispatchEmail } = await import("../email-dispatch");

    await dispatchEmail({
      db: mockDb as never,
      ctx: mockCtx as never,
      message: mockMessage as never,
      lead: mockLead as never,
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  test("stamps sentAt on messageQueue on success", async () => {
    const { dispatchEmail } = await import("../email-dispatch");

    await dispatchEmail({
      db: mockDb as never,
      ctx: mockCtx as never,
      message: mockMessage as never,
      lead: mockLead as never,
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("returns conversationId from insert", async () => {
    const { dispatchEmail } = await import("../email-dispatch");

    const result = await dispatchEmail({
      db: mockDb as never,
      ctx: mockCtx as never,
      message: mockMessage as never,
      lead: mockLead as never,
    });

    expect(result.conversationId).toBe("conv-123");
  });

  test("throws PRECONDITION_FAILED on MsGraphNotConnectedError (safety net)", async () => {
    const { MsGraphNotConnectedError } = await import("~/server/ms-graph");
    mockSendEmail.mockRejectedValue(new MsGraphNotConnectedError());

    const { dispatchEmail } = await import("../email-dispatch");

    try {
      await dispatchEmail({
        db: mockDb as never,
        ctx: mockCtx as never,
        message: mockMessage as never,
        lead: mockLead as never,
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
      expect((e as TRPCError).message).toBe(
        "Connect your Microsoft account to send emails.",
      );
    }
  });

  test("throws INTERNAL_SERVER_ERROR on any other Graph error", async () => {
    mockSendEmail.mockRejectedValue(new Error("503 Service Unavailable"));

    const { dispatchEmail } = await import("../email-dispatch");

    try {
      await dispatchEmail({
        db: mockDb as never,
        ctx: mockCtx as never,
        message: mockMessage as never,
        lead: mockLead as never,
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  test("does not insert or update when Graph send fails", async () => {
    mockSendEmail.mockRejectedValue(new Error("Network error"));

    const { dispatchEmail } = await import("../email-dispatch");

    try {
      await dispatchEmail({
        db: mockDb as never,
        ctx: mockCtx as never,
        message: mockMessage as never,
        lead: mockLead as never,
      });
    } catch {
      // expected
    }

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
