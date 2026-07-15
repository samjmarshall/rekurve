import { beforeEach, describe, expect, rs, test } from "@rstest/core";

import { makeStep } from "~/server/inngest/__tests__/step-fake";
import { outbox } from "../outbox.schema";
import { makeRunPrune, makeRunSweep } from "../outbox.worker";

// DI-style worker tests (adr020): the sweep/prune cores take {db, send} fake
// deps directly — no module mocks. The db fakes mirror the Drizzle call
// chains the workers issue.

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

type Db = Parameters<typeof makeRunSweep>[0]["db"];

function makeSweepDb(rows: unknown[]) {
  // SELECT chain: db.select().from().where().orderBy().limit()
  const limit = rs.fn().mockResolvedValue(rows);
  const orderBy = rs.fn().mockReturnValue({ limit });
  const selectWhere = rs.fn().mockReturnValue({ orderBy });
  const from = rs.fn().mockReturnValue({ where: selectWhere });
  const select = rs.fn().mockReturnValue({ from });

  // UPDATE chain: db.update().set().where()
  const updateWhere = rs.fn().mockResolvedValue([]);
  const set = rs.fn().mockReturnValue({ where: updateWhere });
  const update = rs.fn().mockReturnValue({ set });

  return {
    db: { select, update } as unknown as Db,
    select,
    update,
    set,
    updateWhere,
  };
}

describe("runSweep", () => {
  let send: ReturnType<typeof rs.fn>;

  beforeEach(() => {
    send = rs.fn().mockResolvedValue([]);
  });

  test("calls send for each unprocessed row with id, name, data", async () => {
    const { db } = makeSweepDb([ROW_A, ROW_B]);

    await makeRunSweep({ db, send })(makeStep());

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith({
      id: ROW_A.id,
      name: ROW_A.eventName,
      data: ROW_A.payload,
    });
    expect(send).toHaveBeenCalledWith({
      id: ROW_B.id,
      name: ROW_B.eventName,
      data: ROW_B.payload,
    });
  });

  test("frozen step ids: select-unprocessed then row-{id} per row", async () => {
    const { db } = makeSweepDb([ROW_A, ROW_B]);
    const step = makeStep();

    await makeRunSweep({ db, send })(step);

    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "select-unprocessed",
      `row-${ROW_A.id}`,
      `row-${ROW_B.id}`,
    ]);
  });

  test("success branch: updates processedAt for each row", async () => {
    const { db, updateWhere } = makeSweepDb([ROW_A, ROW_B]);

    await makeRunSweep({ db, send })(makeStep());

    expect(updateWhere).toHaveBeenCalledTimes(2);
  });

  test("failure branch: increments attempts and sets lastError, no processedAt update", async () => {
    send.mockRejectedValue(new Error("Inngest unavailable"));
    const { db, update, set } = makeSweepDb([ROW_A, ROW_B]);

    await makeRunSweep({ db, send })(makeStep());

    // update was called (for attempts + lastError), but with attempts/lastError shape
    expect(update).toHaveBeenCalled();
    const setArg = set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toHaveProperty("lastError");
    expect(setArg).not.toHaveProperty("processedAt");
  });

  test("zero rows: send is never called (idempotent re-fire)", async () => {
    const { db } = makeSweepDb([]);

    await makeRunSweep({ db, send })(makeStep());

    expect(send).not.toHaveBeenCalled();
  });
});

describe("runPrune", () => {
  let deleteWhere: ReturnType<typeof rs.fn>;
  let dbDelete: ReturnType<typeof rs.fn>;
  let db: Db;

  beforeEach(() => {
    // DELETE chain: db.delete().where()
    deleteWhere = rs.fn().mockResolvedValue([]);
    dbDelete = rs.fn().mockReturnValue({ where: deleteWhere });
    db = { delete: dbDelete } as unknown as Db;
  });

  test("calls db.delete on the outbox table", async () => {
    await makeRunPrune({ db })(makeStep());

    expect(dbDelete).toHaveBeenCalledWith(outbox);
  });

  test("calls step.run with id 'delete-processed'", async () => {
    const step = makeStep();

    await makeRunPrune({ db })(step);

    expect(step.run).toHaveBeenCalledWith(
      "delete-processed",
      expect.any(Function),
    );
  });

  test("applies a WHERE clause (delete is not unconditional)", async () => {
    await makeRunPrune({ db })(makeStep());

    expect(deleteWhere).toHaveBeenCalled();
  });
});
