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
      HUBSPOT_ACCESS_TOKEN: "mock-token",
      HUBSPOT_CLIENT_SECRET: "mock-secret",
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

  // The router now delegates create/update to the intake module
  rs.doMock("~/server/leads/intake", () => ({
    captureLead: rs.fn().mockResolvedValue(mockLead),
    updateLead: rs.fn().mockResolvedValue(mockLead),
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

  test("rejects unauthenticated request", async () => {
    rs.doMock("~/lib/session", () => ({
      getSession: rs.fn().mockResolvedValue(null),
    }));
    const caller = await getCaller();
    try {
      await caller.leads.create({ firstName: "John", lastName: "Smith" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  test("delegates to captureLead and returns its result", async () => {
    const { captureLead } = await import("~/server/leads/intake");
    const caller = await getCaller();

    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "0412345678",
      hasLand: true,
      propertyType: "first_home_buyer",
    });

    expect(captureLead).toHaveBeenCalledOnce();
    expect(captureLead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ firstName: "John", lastName: "Smith" }),
      expect.objectContaining({ userId: "test-user-id" }),
    );
    expect(result).toEqual(mockLead);
  });
});

// --- leads.update ---

describe("leads.update", () => {
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

  test("delegates to updateLead and returns its result", async () => {
    const { updateLead } = await import("~/server/leads/intake");
    const caller = await getCaller();

    const result = await caller.leads.update({
      id: mockLead.id,
      budget: "$700K",
    });

    expect(updateLead).toHaveBeenCalledOnce();
    expect(updateLead).toHaveBeenCalledWith(
      expect.anything(),
      mockLead.id,
      expect.objectContaining({ budget: "$700K" }),
      expect.objectContaining({ userId: "test-user-id" }),
    );
    expect(result).toEqual(mockLead);
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

  test("runs an unfiltered query when input is undefined", async () => {
    const findMany = (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.leads.getByStage();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  test("applies fhogEligible filter", async () => {
    const findMany = (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.leads.getByStage({ fhogEligible: true });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() }),
    );
  });

  test("applies constructionTimeline filter", async () => {
    const findMany = (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.leads.getByStage({ constructionTimeline: "ready_now" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() }),
    );
  });

  test("applies preferredEstate filter", async () => {
    const findMany = (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.leads.getByStage({ preferredEstate: "Springfield Rise" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() }),
    );
  });
});
