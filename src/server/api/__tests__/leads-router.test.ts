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

  // Default chainable mock for db.update used by synchronous re-scoring in
  // create/update. Tests can override this by calling mockReturnValue again.
  const defaultUpdateReturning = rs.fn().mockResolvedValue([mockLead]);
  const defaultUpdateWhere = rs
    .fn()
    .mockReturnValue({ returning: defaultUpdateReturning });
  const defaultUpdateSet = rs
    .fn()
    .mockReturnValue({ where: defaultUpdateWhere });
  (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({
    set: defaultUpdateSet,
  });

  rs.doMock("~/server/db", () => ({ db: mockDb }));

  rs.doMock("~/server/scoring", () => ({
    qualifyAndScore: rs.fn().mockReturnValue({
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

  rs.doMock("~/server/nurture/scheduler", () => ({
    startOrUpdateSequence: rs.fn().mockResolvedValue(undefined),
  }));

  rs.doMock("~/server/hubspot", () => ({
    findExistingContact: rs.fn().mockResolvedValue(null),
    createContact: rs.fn().mockResolvedValue({
      id: "hs-123",
      properties: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    updateContact: rs.fn().mockResolvedValue({
      id: "hs-123",
      properties: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    PROPERTY_MAP: {
      firstName: "firstname",
      lastName: "lastname",
      email: "email",
      phone: "phone",
      hasLand: "has_land",
      landRegistered: "land_registered",
      landAddress: "land_address",
      landSizeSqm: "land_size_sqm",
      propertyType: "property_type",
      budget: "budget",
      seenBroker: "seen_broker",
      constructionTimeline: "construction_timeline",
      resolveFinanceOptedIn: "resolve_finance_opted_in",
      preferredContactTime: "preferred_contact_time",
      landWidth: "land_width",
      landDepth: "land_depth",
      leadScore: "lead_score",
      leadStage: "lead_stage",
      notes: "notes",
      leadSource: "lead_source",
    },
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
    const onConflictDoUpdate = rs.fn().mockReturnValue({ returning });
    const values = rs.fn().mockReturnValue({ onConflictDoUpdate });
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
    const insertReturning = rs.fn().mockResolvedValue([quickLead]);
    const insertOnConflict = rs
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const values = rs
      .fn()
      .mockReturnValue({ onConflictDoUpdate: insertOnConflict });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    // scoreLead's db.update returns the scored version of the same row so
    // the router's response still carries the quick-capture fields.
    const updateReturning = rs.fn().mockResolvedValue([quickLead]);
    const where = rs.fn().mockReturnValue({ returning: updateReturning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

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

// --- leads.create — HubSpot sync ---

describe("leads.create — HubSpot sync", () => {
  test("creates HubSpot contact when no dedup match", async () => {
    const leadWithHs = { ...mockLead, hubspotContactId: "hs-123" };
    const returning = rs.fn().mockResolvedValue([leadWithHs]);
    const onConflictDoUpdate = rs.fn().mockReturnValue({ returning });
    const values = rs.fn().mockReturnValue({ onConflictDoUpdate });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const { createContact } = await import("~/server/hubspot");

    const caller = await getCaller();
    await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
    });

    expect(createContact).toHaveBeenCalled();
  });

  test("updates existing HubSpot contact when dedup match found", async () => {
    const { findExistingContact, updateContact } = await import(
      "~/server/hubspot"
    );
    (findExistingContact as ReturnType<typeof rs.fn>).mockResolvedValue({
      id: "hs-existing",
      properties: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const leadWithHs = { ...mockLead, hubspotContactId: "hs-existing" };
    const returning = rs.fn().mockResolvedValue([leadWithHs]);
    const onConflictDoUpdate = rs.fn().mockReturnValue({ returning });
    const values = rs.fn().mockReturnValue({ onConflictDoUpdate });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
    });

    expect(updateContact).toHaveBeenCalledWith(
      "hs-existing",
      expect.objectContaining({ firstName: "John" }),
    );
  });

  test("throws INTERNAL_SERVER_ERROR on DB failure after HubSpot success", async () => {
    const returning = rs.fn().mockRejectedValue(new Error("DB down"));
    const onConflictDoUpdate = rs.fn().mockReturnValue({ returning });
    const values = rs.fn().mockReturnValue({ onConflictDoUpdate });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();

    try {
      await caller.leads.create({
        firstName: "John",
        lastName: "Smith",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect((e as TRPCError).message).toContain("hs-123");
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
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue({ hubspotContactId: null });

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
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue(undefined);

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

// --- leads.update — HubSpot sync ---

describe("leads.update — HubSpot sync", () => {
  test("updates HubSpot before local DB when linked", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue({ hubspotContactId: "hs-123" });

    const updatedLead = { ...mockLead, budget: "$700K" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const { updateContact } = await import("~/server/hubspot");

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, budget: "$700K" });

    expect(updateContact).toHaveBeenCalledWith(
      "hs-123",
      expect.objectContaining({ budget: "$700K" }),
    );
  });

  test("skips HubSpot when lead has no hubspotContactId", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue({ hubspotContactId: null });

    const updatedLead = { ...mockLead, budget: "$700K" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const { updateContact } = await import("~/server/hubspot");

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, budget: "$700K" });

    expect(updateContact).not.toHaveBeenCalled();
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
  test("returns a scored lead when input contains qualifying data", async () => {
    const { qualifyAndScore } = await import("~/server/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockReturnValueOnce({
      score: 85,
      stage: "hot",
      breakdown: {
        land: { score: 30, maxScore: 30, reasoning: "registered" },
        finance: { score: 15, maxScore: 25, reasoning: "broker" },
        timeline: { score: 20, maxScore: 20, reasoning: "ready now" },
        budget: { score: 10, maxScore: 10, reasoning: "in range" },
        propertyType: { score: 10, maxScore: 10, reasoning: "clear intent" },
        engagement: { score: 0, maxScore: 5, reasoning: "no data" },
      },
      gaps: [],
      nextQuestion: "All good",
    });

    // Insert returns the unscored row
    const insertReturning = rs.fn().mockResolvedValue([mockLead]);
    const insertOnConflict = rs
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const values = rs
      .fn()
      .mockReturnValue({ onConflictDoUpdate: insertOnConflict });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    // scoreLead's db.update returns the fully-scored row
    const scoredLead = {
      ...mockLead,
      leadScore: 85,
      leadStage: "hot" as const,
      scoreMetadata: {
        score: 85,
        stage: "hot" as const,
        breakdown: {
          land: { score: 30, maxScore: 30, reasoning: "registered" },
          finance: { score: 15, maxScore: 25, reasoning: "broker" },
          timeline: { score: 20, maxScore: 20, reasoning: "ready now" },
          budget: { score: 10, maxScore: 10, reasoning: "in range" },
          propertyType: { score: 10, maxScore: 10, reasoning: "clear intent" },
          engagement: { score: 0, maxScore: 5, reasoning: "no data" },
        },
        gaps: [],
        nextQuestion: "All good",
        scoredAt: "2026-04-10T00:00:00.000Z",
      },
    };
    const updateReturning = rs.fn().mockResolvedValue([scoredLead]);
    const where = rs.fn().mockReturnValue({ returning: updateReturning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      hasLand: true,
      landRegistered: true,
      landSizeSqm: "450",
      seenBroker: true,
      constructionTimeline: "ready_now",
      budget: "$650000",
      propertyType: "first_home_buyer",
    });

    expect(result.leadScore).toBe(85);
    expect(result.leadStage).toBe("hot");
    expect(result.scoreMetadata).not.toBeNull();
    expect(result.scoreMetadata?.score).toBe(85);
    expect(result.scoreMetadata?.gaps).toHaveLength(0);
    expect(qualifyAndScore).toHaveBeenCalled();
  });

  test("returns an unqualified lead with 5 gaps for quick-capture input", async () => {
    const { qualifyAndScore } = await import("~/server/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockReturnValueOnce({
      score: 0,
      stage: "unqualified",
      breakdown: {
        land: { score: 0, maxScore: 30, reasoning: "none" },
        finance: { score: 0, maxScore: 25, reasoning: "unknown" },
        timeline: { score: 0, maxScore: 20, reasoning: "none" },
        budget: { score: 0, maxScore: 10, reasoning: "none" },
        propertyType: { score: 0, maxScore: 10, reasoning: "none" },
        engagement: { score: 0, maxScore: 5, reasoning: "no data" },
      },
      gaps: [
        { field: "land", impact: "high", description: "No land" },
        { field: "finance", impact: "high", description: "Unknown" },
        { field: "timeline", impact: "high", description: "No timeline" },
        { field: "budget", impact: "medium", description: "No budget" },
        { field: "propertyType", impact: "medium", description: "No type" },
      ],
      nextQuestion: "Do you have land?",
    });

    const quickLead = { ...mockLead, email: null };
    const insertReturning = rs.fn().mockResolvedValue([quickLead]);
    const insertOnConflict = rs
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const values = rs
      .fn()
      .mockReturnValue({ onConflictDoUpdate: insertOnConflict });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const scoredQuickLead = {
      ...quickLead,
      leadScore: 0,
      leadStage: "unqualified" as const,
      scoreMetadata: {
        score: 0,
        stage: "unqualified" as const,
        breakdown: {
          land: { score: 0, maxScore: 30, reasoning: "none" },
          finance: { score: 0, maxScore: 25, reasoning: "unknown" },
          timeline: { score: 0, maxScore: 20, reasoning: "none" },
          budget: { score: 0, maxScore: 10, reasoning: "none" },
          propertyType: { score: 0, maxScore: 10, reasoning: "none" },
          engagement: { score: 0, maxScore: 5, reasoning: "no data" },
        },
        gaps: [
          {
            field: "land",
            impact: "high" as const,
            description: "No land",
          },
          {
            field: "finance",
            impact: "high" as const,
            description: "Unknown",
          },
          {
            field: "timeline",
            impact: "high" as const,
            description: "No timeline",
          },
          {
            field: "budget",
            impact: "medium" as const,
            description: "No budget",
          },
          {
            field: "propertyType",
            impact: "medium" as const,
            description: "No type",
          },
        ],
        nextQuestion: "Do you have land?",
        scoredAt: "2026-04-10T00:00:00.000Z",
      },
    };
    const updateReturning = rs.fn().mockResolvedValue([scoredQuickLead]);
    const where = rs.fn().mockReturnValue({ returning: updateReturning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
      phone: "0412345678",
    });

    expect(result.leadScore).toBe(0);
    expect(result.leadStage).toBe("unqualified");
    expect(result.scoreMetadata?.gaps).toHaveLength(5);
  });
});

// --- leads.update — scoring integration ---

describe("leads.update — scoring integration", () => {
  test("re-scores and returns the new score when a scoring field changes", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue({ hubspotContactId: null });

    const { qualifyAndScore } = await import("~/server/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockReturnValueOnce({
      score: 20,
      stage: "unqualified",
      breakdown: {
        land: { score: 0, maxScore: 30, reasoning: "none" },
        finance: { score: 0, maxScore: 25, reasoning: "unknown" },
        timeline: { score: 20, maxScore: 20, reasoning: "ready now" },
        budget: { score: 0, maxScore: 10, reasoning: "none" },
        propertyType: { score: 0, maxScore: 10, reasoning: "none" },
        engagement: { score: 0, maxScore: 5, reasoning: "no data" },
      },
      gaps: [],
      nextQuestion: "All good",
    });

    // First call: main update returns the unscored edited row.
    // Second call: scoreLead's update returns the scored row.
    const editedLead = {
      ...mockLead,
      constructionTimeline: "ready_now" as const,
    };
    const scoredEditedLead = {
      ...editedLead,
      leadScore: 20,
      leadStage: "unqualified" as const,
      scoreMetadata: {
        score: 20,
        stage: "unqualified" as const,
        breakdown: {
          land: { score: 0, maxScore: 30, reasoning: "none" },
          finance: { score: 0, maxScore: 25, reasoning: "unknown" },
          timeline: { score: 20, maxScore: 20, reasoning: "ready now" },
          budget: { score: 0, maxScore: 10, reasoning: "none" },
          propertyType: { score: 0, maxScore: 10, reasoning: "none" },
          engagement: { score: 0, maxScore: 5, reasoning: "no data" },
        },
        gaps: [],
        nextQuestion: "All good",
        scoredAt: "2026-04-10T00:00:00.000Z",
      },
    };
    const returning = rs
      .fn()
      .mockResolvedValueOnce([editedLead])
      .mockResolvedValueOnce([scoredEditedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    const result = await caller.leads.update({
      id: mockLead.id,
      constructionTimeline: "ready_now",
    });

    expect(qualifyAndScore).toHaveBeenCalled();
    expect(result.leadScore).toBe(20);
    expect(result.scoreMetadata?.breakdown.timeline.score).toBe(20);
  });

  test("does not re-score or rewrite scoreMetadata for non-scoring fields", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue({ hubspotContactId: null });

    const { qualifyAndScore } = await import("~/server/scoring");
    const updatedLead = {
      ...mockLead,
      notes: "Met at BBQ",
      leadScore: 42,
      scoreMetadata: null,
    };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    const result = await caller.leads.update({
      id: mockLead.id,
      notes: "Met at BBQ",
    });

    expect(qualifyAndScore).not.toHaveBeenCalled();
    // Main update was called exactly once (no second score-write)
    expect(set).toHaveBeenCalledTimes(1);
    expect(result.leadScore).toBe(42);
    expect(result.scoreMetadata).toBeNull();
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

// --- leads.create — nurture auto-start ---

describe("leads.create — nurture auto-start", () => {
  test("calls startOrUpdateSequence with post-scoring stage after create", async () => {
    const returning = rs.fn().mockResolvedValue([mockLead]);
    const onConflictDoUpdate = rs.fn().mockReturnValue({ returning });
    const values = rs.fn().mockReturnValue({ onConflictDoUpdate });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const { startOrUpdateSequence } = await import(
      "~/server/nurture/scheduler"
    );

    const caller = await getCaller();
    await caller.leads.create({ firstName: "John", lastName: "Smith" });

    expect(startOrUpdateSequence).toHaveBeenCalledWith(
      expect.anything(),
      mockLead.id,
      mockLead.leadStage,
    );
  });
});

// --- leads.update — nurture auto-start ---

describe("leads.update — nurture auto-start", () => {
  test("calls startOrUpdateSequence when a qualification field changes", async () => {
    (
      mockDb.query as { leads: { findFirst: ReturnType<typeof rs.fn> } }
    ).leads.findFirst.mockResolvedValue({ hubspotContactId: null });

    const updatedLead = {
      ...mockLead,
      constructionTimeline: "ready_now" as const,
    };
    const returning = rs
      .fn()
      .mockResolvedValueOnce([updatedLead])
      .mockResolvedValueOnce([{ ...updatedLead, leadScore: 20 }]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const { startOrUpdateSequence } = await import(
      "~/server/nurture/scheduler"
    );

    const caller = await getCaller();
    await caller.leads.update({
      id: mockLead.id,
      constructionTimeline: "ready_now",
    });

    expect(startOrUpdateSequence).toHaveBeenCalledWith(
      expect.anything(),
      mockLead.id,
      expect.any(String),
    );
  });
});
