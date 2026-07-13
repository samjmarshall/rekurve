import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { and, eq, isNull } from "drizzle-orm";

import { createOutboxHelpers } from "../core";
import { outbox } from "../outbox.schema";
import { makeFakeInngest, makeOutboxDbMocks } from "./fixtures";

// --- buildOutboxEvent ---

describe("buildOutboxEvent", () => {
  let mocks: ReturnType<typeof makeOutboxDbMocks>;
  let buildOutboxEvent: ReturnType<
    typeof createOutboxHelpers
  >["buildOutboxEvent"];

  beforeEach(() => {
    mocks = makeOutboxDbMocks();
    ({ buildOutboxEvent } = createOutboxHelpers({
      db: mocks.db,
      inngest: makeFakeInngest().inngest,
    }));
  });

  test("returns a UUID string id", () => {
    const result = buildOutboxEvent("lead.captured", {
      leadId: "abc",
      userId: "user-1",
    });

    expect(typeof result.id).toBe("string");
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("calls db.insert with outbox table and does not execute", () => {
    const result = buildOutboxEvent("lead.captured", {
      leadId: "abc",
      userId: "user-1",
    });

    expect(mocks.insert).toHaveBeenCalledWith(outbox);
    expect(mocks.values).toHaveBeenCalledOnce();
    expect(result.query).toBe(mocks.queries[0]);
  });

  test("passes id, eventName, and payload to values()", () => {
    const payload = { leadId: "abc", userId: "user-1" };
    const result = buildOutboxEvent("lead.captured", payload);

    const valuesArg = mocks.queries[0]!.values;
    expect(valuesArg.id).toBe(result.id);
    expect(valuesArg.eventName).toBe("lead.captured");
    expect(valuesArg.payload).toEqual(payload);
  });

  test("returns the eventName and payload in the result", () => {
    const payload = { leadId: "test-123", userId: "user-1" };
    const result = buildOutboxEvent("lead.updated", payload);

    expect(result.eventName).toBe("lead.updated");
    expect(result.payload).toEqual(payload);
  });

  test("each call generates a distinct id", () => {
    const r1 = buildOutboxEvent("lead.captured", {
      leadId: "a",
      userId: "user-1",
    });
    const r2 = buildOutboxEvent("lead.updated", {
      leadId: "b",
      userId: "user-1",
    });

    expect(r1.id).not.toBe(r2.id);
  });

  // Write-time registry validation (adr019 clause 7). The sweep read path
  // never re-parses — covered by sweep tests staying schema-free.
  test("rejects a payload that fails the registry schema", () => {
    expect(() =>
      buildOutboxEvent("lead.captured", { leadId: "abc" } as never),
    ).toThrow();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("passes optional fields through to the row payload", () => {
    const payload = { leadId: "abc", userId: "user-1", hubspotSync: false };
    const result = buildOutboxEvent("lead.captured", payload);

    expect(result.payload).toEqual(payload);
    expect(mocks.queries[0]!.values.payload).toEqual(payload);
  });

  test("accepts a null fromStage on lead.stage-changed", () => {
    const payload = {
      leadId: "abc",
      userId: "user-1",
      fromStage: null,
      toStage: "warm",
    } as const;
    const result = buildOutboxEvent("lead.stage-changed", payload);

    expect(result.payload).toEqual(payload);
  });
});

// --- sendPostCommit ---

describe("sendPostCommit", () => {
  let mocks: ReturnType<typeof makeOutboxDbMocks>;
  let fakeInngest: ReturnType<typeof makeFakeInngest>;
  let sendPostCommit: ReturnType<typeof createOutboxHelpers>["sendPostCommit"];

  beforeEach(() => {
    mocks = makeOutboxDbMocks();
    fakeInngest = makeFakeInngest();
    ({ sendPostCommit } = createOutboxHelpers({
      db: mocks.db,
      inngest: fakeInngest.inngest,
    }));
  });

  test("calls inngest.send with { id, name, data }", async () => {
    await sendPostCommit([
      { id: "evt-1", name: "lead.captured", data: { leadId: "abc" } },
    ]);

    expect(fakeInngest.send).toHaveBeenCalledWith({
      id: "evt-1",
      name: "lead.captured",
      data: { leadId: "abc" },
    });
  });

  test("marks processedAt after successful send", async () => {
    await sendPostCommit([{ id: "evt-1", name: "lead.captured", data: {} }]);

    expect(mocks.update).toHaveBeenCalledWith(outbox);
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ processedAt: expect.anything() }),
    );
    expect(mocks.where).toHaveBeenCalledWith(
      and(eq(outbox.id, "evt-1"), isNull(outbox.processedAt)),
    );
  });

  test("swallows and logs on inngest.send failure", async () => {
    fakeInngest.send.mockRejectedValue(new Error("send failed"));
    const consoleSpy = rs.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendPostCommit([{ id: "evt-1", name: "lead.captured", data: {} }]),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("does not mark processedAt on failure", async () => {
    fakeInngest.send.mockRejectedValue(new Error("send failed"));
    const consoleSpy = rs.spyOn(console, "error").mockImplementation(() => {});

    await sendPostCommit([{ id: "evt-1", name: "lead.captured", data: {} }]);
    expect(mocks.update).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("processes multiple events in sequence", async () => {
    const events = [
      { id: "evt-1", name: "lead.captured", data: { leadId: "a" } },
      { id: "evt-2", name: "lead.updated", data: { leadId: "b" } },
    ];

    await sendPostCommit(events);

    expect(fakeInngest.send).toHaveBeenCalledTimes(2);
    expect(fakeInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt-1" }),
    );
    expect(fakeInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt-2" }),
    );
  });
});

// --- ~/server/outbox singleton binding ---

describe("~/server/outbox (index)", () => {
  // The one remaining rs.doMock: proves index.ts constructs the helpers on
  // the app db/inngest singletons (the exported fns are core's, bound once).
  test("binds the app db singleton into buildOutboxEvent", async () => {
    rs.resetModules();
    const mocks = makeOutboxDbMocks();
    rs.doMock("~/server/db", () => ({ db: { insert: mocks.insert } }));
    rs.doMock("~/inngest/client", () => ({ inngest: { send: rs.fn() } }));

    const { buildOutboxEvent } = await import("../index");
    const { outbox: outboxTable } = await import("../outbox.schema");

    const result = buildOutboxEvent("lead.captured", {
      leadId: "abc",
      userId: "user-1",
    });

    expect(mocks.insert).toHaveBeenCalledWith(outboxTable);
    expect(result.query).toBe(mocks.queries[0]);
  });
});
