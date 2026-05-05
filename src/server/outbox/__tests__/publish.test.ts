import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockValues: ReturnType<typeof rs.fn>;
let mockInsert: ReturnType<typeof rs.fn>;
let mockTx: Record<string, unknown>;

beforeEach(() => {
  rs.resetModules();

  mockValues = rs.fn().mockResolvedValue(undefined);
  mockInsert = rs.fn().mockReturnValue({ values: mockValues });
  mockTx = { insert: mockInsert };
});

describe("outbox.publish", () => {
  test("calls tx.insert with outbox table", async () => {
    const { publish } = await import("../index");
    const { outbox } = await import("~/server/db/schema/outbox");

    await publish(mockTx as never, "lead.captured", { leadId: "abc" });

    expect(mockInsert).toHaveBeenCalledWith(outbox);
  });

  test("calls values with eventName, payload, and a generated id", async () => {
    const { publish } = await import("../index");

    await publish(mockTx as never, "lead.captured", { leadId: "abc" });

    const [valuesArg] = mockValues.mock.calls[0] as [
      { id: string; eventName: string; payload: unknown },
    ];
    expect(valuesArg.eventName).toBe("lead.captured");
    expect(valuesArg.payload).toEqual({ leadId: "abc" });
    expect(typeof valuesArg.id).toBe("string");
    expect(valuesArg.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("returns the generated id", async () => {
    const { publish } = await import("../index");

    const id = await publish(mockTx as never, "lead.captured", {
      leadId: "abc",
    });

    const [valuesArg] = mockValues.mock.calls[0] as [{ id: string }];
    expect(id).toBe(valuesArg.id);
  });

  test("each call generates a distinct id", async () => {
    const { publish } = await import("../index");

    const id1 = await publish(mockTx as never, "lead.captured", { a: 1 });
    const id2 = await publish(mockTx as never, "lead.updated", { a: 2 });

    expect(id1).not.toBe(id2);
  });
});

// Compile-time guard: bare db must not be assignable to the tx parameter.
// Removing the @ts-expect-error directive below and running `make check` must
// fail with "Argument of type 'NeonHttpDatabase' is not assignable to parameter".
describe("compile-time: publish rejects bare db", () => {
  beforeEach(() => {
    rs.doMock("~/server/db", () => ({ db: {} }));
  });

  test("ts-expect-error confirms db is not assignable to tx param", async () => {
    const { db } = await import("~/server/db");
    const { publish } = await import("../index");

    // @ts-expect-error bare db must not satisfy the tx parameter type
    await publish(db, "lead.captured", {}).catch(() => undefined);
  });
});
