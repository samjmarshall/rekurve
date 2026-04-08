import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import type { createCaller } from "../root";

type Caller = ReturnType<typeof createCaller>;

const mockLead = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  hubspotContactId: null,
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "0412345678",
  preferredContactTime: null,
  hasLand: true,
  landRegistered: null,
  landAddress: null,
  landSizeSqm: null,
  landWidth: null,
  landDepth: null,
  propertyType: "first_home_buyer" as const,
  budget: null,
  seenBroker: null,
  constructionTimeline: null,
  leadScore: 0,
  leadStage: "unqualified" as const,
  preferredEstates: null,
  preferredSuburbs: null,
  leadSource: null,
  referrerName: null,
  notes: null,
  resolveFinanceOptedIn: false,
  scoreMetadata: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  lastContactedAt: null,
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

  // Build a mock db — methods are configured per test
  mockDb = {
    insert: rs.fn(),
    update: rs.fn(),
    delete: rs.fn(),
    select: rs.fn(),
    query: {
      leads: {
        findFirst: rs.fn(),
        findMany: rs.fn(),
      },
    },
  };

  rs.doMock("~/server/db", () => ({ db: mockDb }));

  rs.doMock("~/server/ai/scoring", () => ({
    qualifyAndScore: rs.fn().mockResolvedValue({
      score: 45,
      stage: "nurture",
      breakdown: {
        land: { score: 15, maxScore: 30, reasoning: "test" },
        finance: { score: 15, maxScore: 25, reasoning: "test" },
        timeline: { score: 12, maxScore: 20, reasoning: "test" },
        budget: { score: 0, maxScore: 10, reasoning: "test" },
        propertyType: { score: 3, maxScore: 10, reasoning: "test" },
        engagement: { score: 0, maxScore: 5, reasoning: "test" },
      },
      gaps: [],
      nextQuestion: "test question",
    }),
  }));

  rs.doMock("~/server/hubspot/contacts", () => ({
    updateContact: rs.fn().mockResolvedValue({}),
  }));
});

async function getCaller(): Promise<Caller> {
  const { createCaller } = await import("../root");
  const { createTRPCContext } = await import("../trpc");
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCaller(ctx);
}

// --- leads.create ---

describe("leads.create", () => {
  test("creates a lead with full form data", async () => {
    const returning = rs.fn().mockResolvedValue([mockLead]);
    const values = rs.fn().mockReturnValue({ returning });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "0412345678",
      hasLand: true,
      propertyType: "first_home_buyer",
    });

    expect(result.firstName).toBe("John");
    expect(result.leadStage).toBe("unqualified");
    expect(result.leadScore).toBe(0);
  });

  test("creates a lead with quick capture data", async () => {
    const quickLead = { ...mockLead, email: null, notes: "Met at BBQ" };
    const returning = rs.fn().mockResolvedValue([quickLead]);
    const values = rs.fn().mockReturnValue({ returning });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      phone: "0412345678",
      notes: "Met at BBQ",
    });

    expect(result.firstName).toBe("John");
    expect(result.notes).toBe("Met at BBQ");
  });

  test("rejects invalid input", async () => {
    const caller = await getCaller();

    try {
      // @ts-expect-error — intentionally invalid input
      await caller.leads.create({ firstName: "" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

// --- leads.getById ---

describe("leads.getById", () => {
  test("returns a lead when found", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue(mockLead);

    const caller = await getCaller();
    const result = await caller.leads.getById({ id: mockLead.id });

    expect(result.id).toBe(mockLead.id);
    expect(result.firstName).toBe("John");
  });

  test("throws NOT_FOUND when lead does not exist", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue(undefined);

    const caller = await getCaller();

    try {
      await caller.leads.getById({
        id: "00000000-0000-0000-0000-000000000000",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});

// --- leads.list ---

describe("leads.list", () => {
  test("returns paginated results with defaults", async () => {
    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue([mockLead]);

    const mockFrom = rs.fn().mockReturnValue({
      where: rs.fn().mockResolvedValue([{ count: 1 }]),
    });
    (mockDb.select as ReturnType<typeof rs.fn>).mockReturnValue({
      from: mockFrom,
    });

    const caller = await getCaller();
    const result = await caller.leads.list({});

    expect(result.items).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  test("returns empty results", async () => {
    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue([]);

    const mockFrom = rs.fn().mockReturnValue({
      where: rs.fn().mockResolvedValue([{ count: 0 }]),
    });
    (mockDb.select as ReturnType<typeof rs.fn>).mockReturnValue({
      from: mockFrom,
    });

    const caller = await getCaller();
    const result = await caller.leads.list({});

    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  test("accepts filter parameters", async () => {
    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue([]);

    const mockFrom = rs.fn().mockReturnValue({
      where: rs.fn().mockResolvedValue([{ count: 0 }]),
    });
    (mockDb.select as ReturnType<typeof rs.fn>).mockReturnValue({
      from: mockFrom,
    });

    const caller = await getCaller();
    const result = await caller.leads.list({
      stage: "hot",
      page: 2,
      limit: 10,
      sortBy: "leadScore",
      sortOrder: "desc",
    });

    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
  });
});

// --- leads.update ---

describe("leads.update", () => {
  test("updates a lead with partial fields", async () => {
    const updatedLead = { ...mockLead, budget: "$700K" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    const result = await caller.leads.update({
      id: mockLead.id,
      budget: "$700K",
    });

    expect(result.budget).toBe("$700K");
  });

  test("throws NOT_FOUND when lead does not exist", async () => {
    const returning = rs.fn().mockResolvedValue([]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();

    try {
      await caller.leads.update({
        id: "00000000-0000-0000-0000-000000000000",
        firstName: "Ghost",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  test("rejects invalid uuid", async () => {
    const caller = await getCaller();

    try {
      await caller.leads.update({ id: "not-a-uuid", firstName: "Test" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

// --- leads.delete ---

describe("leads.delete", () => {
  test("deletes a lead successfully", async () => {
    const returning = rs.fn().mockResolvedValue([{ id: mockLead.id }]);
    const where = rs.fn().mockReturnValue({ returning });
    (mockDb.delete as ReturnType<typeof rs.fn>).mockReturnValue({ where });

    const caller = await getCaller();
    const result = await caller.leads.delete({ id: mockLead.id });

    expect(result.id).toBe(mockLead.id);
  });

  test("throws NOT_FOUND when lead does not exist", async () => {
    const returning = rs.fn().mockResolvedValue([]);
    const where = rs.fn().mockReturnValue({ returning });
    (mockDb.delete as ReturnType<typeof rs.fn>).mockReturnValue({ where });

    const caller = await getCaller();

    try {
      await caller.leads.delete({
        id: "00000000-0000-0000-0000-000000000000",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});

// --- leads.create — scoring integration ---

describe("leads.create — scoring integration", () => {
  test("returns lead immediately without waiting for scoring", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10_000)),
    );

    const returning = rs.fn().mockResolvedValue([mockLead]);
    const values = rs.fn().mockReturnValue({ returning });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
    });

    // Should return immediately, not wait for scoring
    expect(result.firstName).toBe("John");
  });

  test("create succeeds even when scoring throws", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockRejectedValue(
      new Error("API down"),
    );

    const returning = rs.fn().mockResolvedValue([mockLead]);
    const values = rs.fn().mockReturnValue({ returning });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
    });

    expect(result.firstName).toBe("John");
    expect(result.leadScore).toBe(0);
  });
});

// --- leads.update — scoring integration ---

describe("leads.update — scoring integration", () => {
  test("triggers re-scoring when qualification fields change", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    const updatedLead = { ...mockLead, budget: "$700K" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, budget: "$700K" });

    // Give the microtask queue a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(qualifyAndScore).toHaveBeenCalled();
  });

  test("does not re-score when only non-qualification fields change", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    const updatedLead = { ...mockLead, referrerName: "Bob" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, referrerName: "Bob" });

    await new Promise((r) => setTimeout(r, 0));
    expect(qualifyAndScore).not.toHaveBeenCalled();
  });
});

// --- leads.getByStage ---

describe("leads.getByStage", () => {
  test("groups leads into stage buckets", async () => {
    const leadsData = [
      { ...mockLead, id: "1", leadStage: "unqualified" as const },
      { ...mockLead, id: "2", leadStage: "warm" as const },
      { ...mockLead, id: "3", leadStage: "hot" as const },
      { ...mockLead, id: "4", leadStage: "nurture" as const },
      { ...mockLead, id: "5", leadStage: "hot" as const },
    ];

    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue(leadsData);

    const caller = await getCaller();
    const result = await caller.leads.getByStage();

    expect(result.unqualified).toHaveLength(1);
    expect(result.nurture).toHaveLength(1);
    expect(result.warm).toHaveLength(1);
    expect(result.hot).toHaveLength(2);
  });

  test("returns empty buckets when no leads exist", async () => {
    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue([]);

    const caller = await getCaller();
    const result = await caller.leads.getByStage();

    expect(result.unqualified).toHaveLength(0);
    expect(result.nurture).toHaveLength(0);
    expect(result.warm).toHaveLength(0);
    expect(result.hot).toHaveLength(0);
  });
});
