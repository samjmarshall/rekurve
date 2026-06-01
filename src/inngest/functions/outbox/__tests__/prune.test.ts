import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockDeleteWhere: ReturnType<typeof rs.fn>;
let mockDelete: ReturnType<typeof rs.fn>;
let mockStep: { run: ReturnType<typeof rs.fn> };

beforeEach(() => {
  rs.resetModules();

  mockDeleteWhere = rs.fn().mockResolvedValue([]);
  const mockDeleteBase = rs.fn().mockReturnValue({ where: mockDeleteWhere });
  mockDelete = mockDeleteBase;

  rs.doMock("~/env", () => ({ env: {} }));
  rs.doMock("~/server/db", () => ({
    db: { delete: mockDelete },
  }));
  rs.doMock("~/inngest/client", () => ({
    inngest: {
      createFunction: rs.fn().mockReturnValue({}),
      send: rs.fn(),
    },
  }));

  mockStep = {
    run: rs
      .fn()
      .mockImplementation((_id: string, fn: () => Promise<unknown>) => fn()),
  };
});

describe("runPrune", () => {
  test("calls db.delete on the outbox table", async () => {
    const { runPrune } = await import("../prune");
    const { outbox } = await import("~/server/db/schema/outbox");

    await runPrune(mockStep as never);

    expect(mockDelete).toHaveBeenCalledWith(outbox);
  });

  test("calls step.run with id 'delete-processed'", async () => {
    const { runPrune } = await import("../prune");

    await runPrune(mockStep as never);

    expect(mockStep.run).toHaveBeenCalledWith(
      "delete-processed",
      expect.any(Function),
    );
  });

  test("applies a WHERE clause (delete is not unconditional)", async () => {
    const { runPrune } = await import("../prune");

    await runPrune(mockStep as never);

    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});
