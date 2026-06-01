import { beforeEach, describe, expect, rs, test } from "@rstest/core";

describe("resolveLeadOwnerUserId — unit", () => {
  let mockFindFirst: ReturnType<typeof rs.fn>;
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

    mockFindFirst = rs.fn();
    mockDb = {
      query: {
        user: { findFirst: mockFindFirst },
      },
    };

    rs.doMock("~/server/db", () => ({ db: mockDb }));
  });

  test("returns the earliest user id when users exist", async () => {
    mockFindFirst.mockResolvedValue({ id: "user-earliest" });
    const { resolveLeadOwnerUserId } = await import("~/server/leads/owner");

    const id = await resolveLeadOwnerUserId(mockDb as never);

    expect(id).toBe("user-earliest");
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  test("throws when no consultant user found", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    const { resolveLeadOwnerUserId } = await import("~/server/leads/owner");

    await expect(resolveLeadOwnerUserId(mockDb as never)).rejects.toThrow(
      "[leads] resolveLeadOwnerUserId: no consultant user found",
    );
  });
});
