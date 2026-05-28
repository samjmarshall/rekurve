import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";

describe("captureLead — DB failure after HubSpot success", () => {
  const HS_ID = "hs-unit-test-123";

  let mockDb: {
    insert: ReturnType<typeof rs.fn>;
    query: { leads: { findFirst: ReturnType<typeof rs.fn> } };
  };

  beforeEach(() => {
    rs.resetModules();

    rs.doMock("~/env", () => ({
      env: {
        DATABASE_URL: "postgres://mock",
        HUBSPOT_ACCESS_TOKEN: "mock-token",
        HUBSPOT_CLIENT_SECRET: "mock-secret",
      },
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn().mockResolvedValue(null),
      createContact: rs.fn().mockResolvedValue({
        id: HS_ID,
        properties: {},
        createdAt: "",
        updatedAt: "",
      }),
      updateContact: rs.fn().mockResolvedValue({
        id: HS_ID,
        properties: {},
        createdAt: "",
        updatedAt: "",
      }),
      toContactProperties: rs.fn().mockReturnValue({}),
    }));

    rs.doMock("~/server/scoring", () => ({
      qualifyAndScore: rs.fn().mockReturnValue({
        score: 0,
        stage: "unqualified",
        breakdown: {
          land: { score: 0, maxScore: 30, reasoning: "" },
          finance: { score: 0, maxScore: 25, reasoning: "" },
          timeline: { score: 0, maxScore: 20, reasoning: "" },
          budget: { score: 0, maxScore: 10, reasoning: "" },
          propertyType: { score: 0, maxScore: 10, reasoning: "" },
          engagement: { score: 0, maxScore: 5, reasoning: "" },
        },
        gaps: [],
        nextQuestion: "",
      }),
    }));

    rs.doMock("~/server/nurture/scheduler", () => ({
      startOrUpdateSequence: rs.fn().mockResolvedValue(undefined),
    }));

    mockDb = {
      insert: rs.fn().mockReturnValue({
        values: rs.fn().mockReturnValue({
          onConflictDoUpdate: rs.fn().mockReturnValue({
            returning: rs
              .fn()
              .mockRejectedValue(new Error("DB constraint violation")),
          }),
        }),
      }),
      query: { leads: { findFirst: rs.fn().mockResolvedValue(undefined) } },
    };

    rs.doMock("~/server/db", () => ({ db: mockDb }));
  });

  test("throws INTERNAL_SERVER_ERROR containing the HubSpot contact ID", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    let thrown: unknown;
    try {
      await captureLead(
        mockDb as never,
        { firstName: "John", lastName: "Smith" },
        { db: mockDb as never, userId: "user-1" },
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(TRPCError);
    expect((thrown as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    expect((thrown as TRPCError).message).toContain(HS_ID);
  });
});
