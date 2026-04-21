import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import type { createCaller } from "../root";

type Caller = ReturnType<typeof createCaller>;

const SEQ_ID = "550e8400-e29b-41d4-a716-446655440000";
const LEAD_ID = "660e8400-e29b-41d4-a716-446655440001";

const baseSeq = {
  id: SEQ_ID,
  leadId: LEAD_ID,
  sequenceType: "nurture" as const,
  status: "active" as const,
  nextStepAt: new Date(Date.now() + 14 * 86_400_000),
  createdAt: new Date("2026-04-01"),
  updatedAt: new Date("2026-04-01"),
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
    insert: rs.fn(),
    update: rs.fn(),
    query: {
      nurtureSequences: {
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

function mockInsertReturning(row: unknown) {
  const returning = rs.fn().mockResolvedValue([row]);
  const values = rs.fn().mockReturnValue({ returning });
  (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });
  return { values, returning };
}

function mockUpdateReturning(row: unknown) {
  const returning = rs.fn().mockResolvedValue([row]);
  const where = rs.fn().mockReturnValue({ returning });
  const set = rs.fn().mockReturnValue({ where });
  (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });
  return { set, where, returning };
}

// --- nurture.listActive ---

describe("nurture.listActive", () => {
  test("returns only active rows", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findMany: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findMany.mockResolvedValue([baseSeq]);

    const caller = await getCaller();
    const result = await caller.nurture.listActive();

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(SEQ_ID);
    expect(result[0]?.status).toBe("active");
  });

  test("returns empty array when none active", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findMany: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findMany.mockResolvedValue([]);

    const caller = await getCaller();
    const result = await caller.nurture.listActive();

    expect(result).toEqual([]);
  });
});

// --- nurture.startSequence ---

describe("nurture.startSequence", () => {
  test("inserts and returns new active sequence", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(undefined);

    const inserted = { ...baseSeq, sequenceType: "discovery" as const };
    mockInsertReturning(inserted);

    const caller = await getCaller();
    const result = await caller.nurture.startSequence({
      leadId: LEAD_ID,
      sequenceType: "discovery",
    });

    expect(result.leadId).toBe(LEAD_ID);
    expect(result.status).toBe("active");
  });

  test("rejects with BAD_REQUEST when active sequence already exists", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(baseSeq);

    const caller = await getCaller();
    try {
      await caller.nurture.startSequence({
        leadId: LEAD_ID,
        sequenceType: "nurture",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("rejects invalid leadId uuid", async () => {
    const caller = await getCaller();
    try {
      await caller.nurture.startSequence({
        leadId: "not-a-uuid",
        sequenceType: "nurture",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

// --- nurture.pauseSequence ---

describe("nurture.pauseSequence", () => {
  test("transitions active → paused and nulls nextStepAt", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(baseSeq);

    const paused = { ...baseSeq, status: "paused" as const, nextStepAt: null };
    const { set } = mockUpdateReturning(paused);

    const caller = await getCaller();
    const result = await caller.nurture.pauseSequence({ id: SEQ_ID });

    expect(result.status).toBe("paused");
    expect(result.nextStepAt).toBeNull();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paused", nextStepAt: null }),
    );
  });

  test("rejects with BAD_REQUEST when sequence is not active", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue({
      ...baseSeq,
      status: "completed" as const,
    });

    const caller = await getCaller();
    try {
      await caller.nurture.pauseSequence({ id: SEQ_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("throws NOT_FOUND when sequence does not exist", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(undefined);

    const caller = await getCaller();
    try {
      await caller.nurture.pauseSequence({ id: SEQ_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});

// --- nurture.resumeSequence ---

describe("nurture.resumeSequence", () => {
  test("transitions paused → active and sets nextStepAt to a future date", async () => {
    const paused = { ...baseSeq, status: "paused" as const, nextStepAt: null };
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(paused);

    const resumed = {
      ...paused,
      status: "active" as const,
      nextStepAt: new Date(Date.now() + 14 * 86_400_000),
    };
    const { set } = mockUpdateReturning(resumed);

    const caller = await getCaller();
    const result = await caller.nurture.resumeSequence({ id: SEQ_ID });

    expect(result.status).toBe("active");
    expect(result.nextStepAt).not.toBeNull();
    expect(result.nextStepAt!.getTime()).toBeGreaterThan(Date.now());
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        nextStepAt: expect.any(Date),
      }),
    );
  });

  test("rejects with BAD_REQUEST when sequence is not paused", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(baseSeq); // active, not paused

    const caller = await getCaller();
    try {
      await caller.nurture.resumeSequence({ id: SEQ_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("throws NOT_FOUND when sequence does not exist", async () => {
    (
      mockDb.query as {
        nurtureSequences: { findFirst: ReturnType<typeof rs.fn> };
      }
    ).nurtureSequences.findFirst.mockResolvedValue(undefined);

    const caller = await getCaller();
    try {
      await caller.nurture.resumeSequence({ id: SEQ_ID });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});
