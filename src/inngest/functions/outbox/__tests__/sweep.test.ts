import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const ROW_A = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  eventName: "lead.captured",
  payload: { leadId: "lead-1" },
  processedAt: null,
};

const ROW_B = {
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  eventName: "lead.updated",
  payload: { leadId: "lead-2" },
  processedAt: null,
};

let mockSend: ReturnType<typeof rs.fn>;
let mockSelectWhere: ReturnType<typeof rs.fn>;
let mockUpdateWhere: ReturnType<typeof rs.fn>;
let mockDb: Record<string, unknown>;
let mockStep: { run: ReturnType<typeof rs.fn> };

beforeEach(() => {
  rs.resetModules();

  mockSend = rs.fn().mockResolvedValue([]);

  // SELECT chain: db.select().from().where().orderBy().limit()
  const mockLimit = rs.fn().mockResolvedValue([ROW_A, ROW_B]);
  const mockOrderBy = rs.fn().mockReturnValue({ limit: mockLimit });
  mockSelectWhere = rs.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = rs.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = rs.fn().mockReturnValue({ from: mockFrom });

  // UPDATE chain: db.update().set().where()
  mockUpdateWhere = rs.fn().mockResolvedValue([]);
  const mockSet = rs.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = rs.fn().mockReturnValue({ set: mockSet });

  // DELETE chain: db.delete().where()
  const mockDeleteWhere = rs.fn().mockResolvedValue([]);
  const mockDelete = rs.fn().mockReturnValue({ where: mockDeleteWhere });

  mockDb = {
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  };

  mockStep = {
    run: rs
      .fn()
      .mockImplementation((_id: string, fn: () => Promise<unknown>) => fn()),
  };

  rs.doMock("~/env", () => ({ env: {} }));
  rs.doMock("~/server/db", () => ({ db: mockDb }));
  rs.doMock("~/inngest/client", () => ({
    inngest: {
      createFunction: rs.fn().mockReturnValue({}),
      send: mockSend,
    },
  }));
});

describe("runSweep", () => {
  test("calls inngest.send for each unprocessed row with id, name, data", async () => {
    const { runSweep } = await import("../sweep");

    await runSweep(mockStep as never);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith({
      id: ROW_A.id,
      name: ROW_A.eventName,
      data: ROW_A.payload,
    });
    expect(mockSend).toHaveBeenCalledWith({
      id: ROW_B.id,
      name: ROW_B.eventName,
      data: ROW_B.payload,
    });
  });

  test("success branch: updates processedAt for each row", async () => {
    const { runSweep } = await import("../sweep");

    await runSweep(mockStep as never);

    expect(mockUpdateWhere).toHaveBeenCalledTimes(2);
  });

  test("failure branch: increments attempts and sets lastError, no processedAt update", async () => {
    mockSend.mockRejectedValue(new Error("Inngest unavailable"));
    const mockUpdateSet = rs.fn().mockReturnValue({ where: mockUpdateWhere });
    const mockUpdate = rs.fn().mockReturnValue({ set: mockUpdateSet });
    (mockDb as Record<string, unknown>).update = mockUpdate;

    const { runSweep } = await import("../sweep");

    await runSweep(mockStep as never);

    // update was called (for attempts + lastError), but with attempts/lastError shape
    expect(mockUpdate).toHaveBeenCalled();
    const setArg = mockUpdateSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toHaveProperty("lastError");
    expect(setArg).not.toHaveProperty("processedAt");
  });

  test("zero rows: inngest.send is never called (idempotent re-fire)", async () => {
    // Simulate a SELECT that returns no rows (all already processed)
    const mockLimit = rs.fn().mockResolvedValue([]);
    const mockOrderBy = rs.fn().mockReturnValue({ limit: mockLimit });
    const mockSelectWhereFresh = rs
      .fn()
      .mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = rs.fn().mockReturnValue({ where: mockSelectWhereFresh });
    (mockDb as Record<string, unknown>).select = rs
      .fn()
      .mockReturnValue({ from: mockFrom });

    const { runSweep } = await import("../sweep");

    await runSweep(mockStep as never);

    expect(mockSend).not.toHaveBeenCalled();
  });
});
