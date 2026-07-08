import { beforeEach, describe, expect, rs, test } from "@rstest/core";

import type { OutboxEventDescriptor } from "~/server/inngest/events";
import { makeOutboxDbMocks } from "./fixtures";

const CAPTURED: OutboxEventDescriptor = {
  name: "lead.captured",
  data: { leadId: "lead-1", userId: "user-1" },
};

const STAGE_CHANGED: OutboxEventDescriptor = {
  name: "lead.stage-changed",
  data: { leadId: "lead-1", userId: "user-1", fromStage: null, toStage: "hot" },
};

describe("makeCommitWithOutbox", () => {
  let calls: string[];
  let mocks: ReturnType<typeof makeOutboxDbMocks>;
  let mockSend: ReturnType<typeof rs.fn>;
  let mockBatch: ReturnType<typeof rs.fn>;

  beforeEach(() => {
    rs.resetModules();
    calls = [];
    mocks = makeOutboxDbMocks();

    // buildOutboxEvent + sendPostCommit both use the module-level db.
    rs.doMock("~/server/db", () => ({
      db: { insert: mocks.insert, update: mocks.update },
    }));

    mockSend = rs.fn().mockImplementation(async () => {
      calls.push("send");
    });
    rs.doMock("~/inngest/client", () => ({
      inngest: { send: mockSend },
    }));

    mockBatch = rs.fn().mockImplementation(async () => {
      calls.push("batch");
      return [];
    });
  });

  async function makeCommit() {
    const { makeCommitWithOutbox } = await import("../commit");
    return makeCommitWithOutbox({
      batch: mockBatch,
    } as unknown as Parameters<typeof makeCommitWithOutbox>[0]);
  }

  test("batches caller statements then outbox inserts, in event order, in ONE db.batch", async () => {
    const commitWithOutbox = await makeCommit();
    const stmt = { __isStmt: true };

    await commitWithOutbox([stmt] as never, [CAPTURED, STAGE_CHANGED]);

    expect(mockBatch).toHaveBeenCalledTimes(1);
    const [items] = mockBatch.mock.calls[0] as [unknown[]];
    // Caller statements first, then one DISTINCT insert per event: identity
    // (toBe) pins the order, and each insert's values carry its own event.
    expect(items).toHaveLength(3);
    expect(items[0]).toBe(stmt);
    expect(items[1]).toBe(mocks.queries[0]);
    expect(items[2]).toBe(mocks.queries[1]);
    expect(mocks.queries[0]!.values.eventName).toBe("lead.captured");
    expect(mocks.queries[1]!.values.eventName).toBe("lead.stage-changed");
  });

  test("returns the batch results so .returning() rows flow back", async () => {
    const commitWithOutbox = await makeCommit();
    const row = { id: "lead-1" };
    mockBatch.mockResolvedValue([[row], {}]);

    const results = await commitWithOutbox([{ __isStmt: true }] as never, [
      CAPTURED,
    ]);

    expect(results).toEqual([[row], {}]);
  });

  test("sends each event post-commit keyed by its outbox row id", async () => {
    const commitWithOutbox = await makeCommit();

    await commitWithOutbox([], [CAPTURED]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [sent] = mockSend.mock.calls[0] as [
      { id: string; name: string; data: unknown },
    ];
    expect(sent.name).toBe("lead.captured");
    expect(sent.data).toEqual(CAPTURED.data);
    // Row id doubles as the Inngest idempotency key (adr019 clause 4).
    expect(sent.id).toBe(mocks.queries[0]!.values.id);
  });

  test("pairs each of two post-commit sends with its OWN outbox row id", async () => {
    const commitWithOutbox = await makeCommit();

    await commitWithOutbox([], [CAPTURED, STAGE_CHANGED]);

    expect(mockSend).toHaveBeenCalledTimes(2);
    const sends = mockSend.mock.calls.map(
      ([evt]) => evt as { id: string; name: string; data: unknown },
    );
    expect(sends.map((s) => s.name)).toEqual([
      "lead.captured",
      "lead.stage-changed",
    ]);
    expect(sends[0]!.data).toEqual(CAPTURED.data);
    expect(sends[1]!.data).toEqual(STAGE_CHANGED.data);
    // Each send carries the id written to ITS row — not a shared or crossed id.
    expect(sends[0]!.id).toBe(mocks.queries[0]!.values.id);
    expect(sends[1]!.id).toBe(mocks.queries[1]!.values.id);
    expect(sends[0]!.id).not.toBe(sends[1]!.id);
  });

  test("commits the batch before the post-commit send", async () => {
    const commitWithOutbox = await makeCommit();

    await commitWithOutbox([], [CAPTURED]);

    expect(calls).toEqual(["batch", "send"]);
  });

  test("empty events: batches statements alone and sends nothing", async () => {
    const commitWithOutbox = await makeCommit();
    const stmt = { __isStmt: true };

    await commitWithOutbox([stmt] as never, []);

    const [items] = mockBatch.mock.calls[0] as [unknown[]];
    expect(items).toEqual([stmt]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("no statements and no events: skips db.batch entirely", async () => {
    const commitWithOutbox = await makeCommit();

    const results = await commitWithOutbox([], []);

    expect(mockBatch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  test("rejects an invalid payload at write time, before anything commits", async () => {
    const commitWithOutbox = await makeCommit();

    await expect(
      commitWithOutbox(
        [],
        [{ name: "lead.captured", data: { leadId: "lead-1" } } as never],
      ),
    ).rejects.toThrow();
    expect(mockBatch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("a failed post-commit send is swallowed and results still return", async () => {
    const commitWithOutbox = await makeCommit();
    mockSend.mockRejectedValue(new Error("send failed"));
    mockBatch.mockResolvedValue([{}]);
    const consoleSpy = rs.spyOn(console, "error").mockImplementation(() => {});

    const results = await commitWithOutbox([], [CAPTURED]);

    expect(results).toEqual([{}]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
