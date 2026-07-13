import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";

import { mockTrpcContextDeps } from "~/server/api/__tests__/caller-harness";
import { makeLead } from "./fixtures";

// Router tests: createCaller over makeLeadsRouter({ service }) — the real
// router + service + repository run over an injected fake db object literal
// (no rs.doMock of the leads seams); create/update swap in service fakes to
// assert delegation. rs.doMock survives only for the tRPC context deps
// (~/env, ~/lib/session, ~/server/db) that trpc.ts imports at module scope.
// Envelope/bucketing math lives in leads.service.test.ts — here we assert the
// transport seam: input validation, auth, delegation, domain-error mapping.

const mockLead = makeLead({
  id: "550e8400-e29b-41d4-a716-446655440000",
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "0412345678",
  hasLand: true,
  propertyType: "first_home_buyer",
});

let mockDb: Record<string, unknown>;
let mockCaptureLead: ReturnType<typeof rs.fn>;
let mockUpdateLead: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockTrpcContextDeps();

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

  mockCaptureLead = rs.fn().mockResolvedValue(mockLead);
  mockUpdateLead = rs.fn().mockResolvedValue(mockLead);
});

async function getCaller() {
  const { makeLeadsRepository } = await import(
    "~/server/leads/leads.repository"
  );
  const { makeLeadsService } = await import("~/server/leads/leads.service");
  const { makeLeadsRouter } = await import("~/server/leads/leads.router");
  const { createCallerFactory, createTRPCContext } = await import(
    "~/server/api/trpc"
  );

  const repo = makeLeadsRepository({
    db: mockDb as never,
    // Fake batch: resolve the (already-thenable, mock-built) statements in
    // place so `.returning()` rows flow back positionally like db.batch.
    commitWithOutbox: rs.fn((stmts: readonly unknown[]) =>
      Promise.all(stmts as Promise<unknown>[]),
    ) as never,
  });
  // Real service over the fake db for reads; create/update swap in fakes so
  // delegation (and only delegation) is asserted at the router seam.
  const service = {
    ...makeLeadsService({ repo }),
    captureLead: mockCaptureLead,
    updateLead: mockUpdateLead,
  };
  const router = makeLeadsRouter({ service: service as never });
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCallerFactory(router)(ctx);
}

// --- create ---

describe("leads.create", () => {
  test("rejects invalid input", async () => {
    const caller = await getCaller();
    try {
      // @ts-expect-error — intentionally invalid input
      await caller.create({ firstName: "" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("rejects unauthenticated request", async () => {
    mockTrpcContextDeps({ session: null });
    const caller = await getCaller();
    try {
      await caller.create({ firstName: "John", lastName: "Smith" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  test("delegates to service.captureLead and returns its result", async () => {
    const caller = await getCaller();

    const result = await caller.create({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "0412345678",
      hasLand: true,
      propertyType: "first_home_buyer",
    });

    expect(mockCaptureLead).toHaveBeenCalledOnce();
    expect(mockCaptureLead).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "John", lastName: "Smith" }),
      expect.objectContaining({ userId: "test-user-id" }),
    );
    expect(result).toEqual(mockLead);
  });
});

// --- update ---

describe("leads.update", () => {
  test("rejects invalid uuid", async () => {
    const caller = await getCaller();
    try {
      await caller.update({ id: "not-a-uuid", firstName: "Test" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  test("delegates to service.updateLead and returns its result", async () => {
    const caller = await getCaller();

    const result = await caller.update({
      id: mockLead.id,
      budget: "$700K",
    });

    expect(mockUpdateLead).toHaveBeenCalledOnce();
    expect(mockUpdateLead).toHaveBeenCalledWith(
      mockLead.id,
      expect.objectContaining({ budget: "$700K" }),
      expect.objectContaining({ userId: "test-user-id" }),
    );
    expect(result).toEqual(mockLead);
  });

  test("maps LeadNotFoundError to TRPCError NOT_FOUND / 'Lead not found'", async () => {
    const caller = await getCaller();
    // Same-registry import (post-resetModules) so the router's instanceof
    // check sees the same class the fake throws.
    const { LeadNotFoundError } = await import("~/server/leads/leads.errors");
    mockUpdateLead.mockRejectedValue(new LeadNotFoundError(mockLead.id));

    try {
      await caller.update({ id: mockLead.id, notes: "ghost" });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      // Byte-stable transport contract: code + message pinned exactly.
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).toBe("Lead not found");
    }
  });
});

// --- getById ---

describe("leads.getById", () => {
  test("returns a lead when found", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue(mockLead);

    const caller = await getCaller();
    const result = await caller.getById({ id: mockLead.id });

    expect(result.id).toBe(mockLead.id);
    expect(result.firstName).toBe("John");
  });

  test("throws NOT_FOUND when lead does not exist", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue(undefined);

    const caller = await getCaller();

    try {
      await caller.getById({
        id: "00000000-0000-0000-0000-000000000000",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).toBe("Lead not found");
    }
  });
});

// --- list ---

describe("leads.list", () => {
  test("returns the pagination envelope with schema defaults applied", async () => {
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
    const result = await caller.list({});

    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
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
    const result = await caller.list({
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

// --- delete ---

describe("leads.delete", () => {
  test("deletes a lead successfully (through the commit write door)", async () => {
    const returning = rs.fn().mockResolvedValue([{ id: mockLead.id }]);
    const where = rs.fn().mockReturnValue({ returning });
    (mockDb.delete as ReturnType<typeof rs.fn>).mockReturnValue({ where });

    const caller = await getCaller();
    const result = await caller.delete({ id: mockLead.id });

    expect(result.id).toBe(mockLead.id);
  });

  test("throws NOT_FOUND when lead does not exist", async () => {
    const returning = rs.fn().mockResolvedValue([]);
    const where = rs.fn().mockReturnValue({ returning });
    (mockDb.delete as ReturnType<typeof rs.fn>).mockReturnValue({ where });

    const caller = await getCaller();

    try {
      await caller.delete({
        id: "00000000-0000-0000-0000-000000000000",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).toBe("Lead not found");
    }
  });
});

// --- getByStage ---

describe("leads.getByStage", () => {
  test("returns the four stage lanes (bucketing math pinned in service tests)", async () => {
    (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany.mockResolvedValue([
      { ...mockLead, id: "1", leadStage: "hot" as const },
    ]);

    const caller = await getCaller();
    const result = await caller.getByStage();

    expect(Object.keys(result).sort()).toEqual([
      "hot",
      "nurture",
      "unqualified",
      "warm",
    ]);
    expect(result.hot).toHaveLength(1);
  });

  test("runs an unfiltered query when input is undefined", async () => {
    const findMany = (
      mockDb.query as { leads: { findMany: ReturnType<typeof rs.fn> } }
    ).leads.findMany;
    findMany.mockResolvedValue([]);

    const caller = await getCaller();
    await caller.getByStage();

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
    await caller.getByStage({ fhogEligible: true });

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
    await caller.getByStage({ constructionTimeline: "ready_now" });

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
    await caller.getByStage({ preferredEstate: "Springfield Rise" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() }),
    );
  });
});
