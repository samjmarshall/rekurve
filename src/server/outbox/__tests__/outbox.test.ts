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

// --- publish ---

// Write-less commit (adr019 clause 7): the emit-only path — outbox inserts in
// ONE db.batch, then the same post-commit send + processedAt stamp + swallow
// as every commit path. First caller: the HubSpot webhook's
// engagement-created emission (replacing its inline
// `await evt.query; sendPostCommit(...)` idiom).
describe("publish", () => {
  let mocks: ReturnType<typeof makeOutboxDbMocks>;
  let fakeInngest: ReturnType<typeof makeFakeInngest>;
  let publish: ReturnType<typeof createOutboxHelpers>["publish"];

  beforeEach(() => {
    mocks = makeOutboxDbMocks();
    fakeInngest = makeFakeInngest();
    ({ publish } = createOutboxHelpers({
      db: mocks.db,
      inngest: fakeInngest.inngest,
    }));
  });

  test("commits JUST the outbox inserts in ONE db.batch, in event order", async () => {
    await publish([
      {
        name: "hubspot.email.engagement-created",
        data: { correlationId: "corr-1", hubspotActivityId: "hs-act-1" },
      },
      { name: "lead.captured", data: { leadId: "lead-1", userId: "user-1" } },
    ]);

    expect(mocks.batch).toHaveBeenCalledTimes(1);
    const [items] = mocks.batch.mock.calls[0] as [unknown[]];
    expect(items).toHaveLength(2);
    expect(items[0]).toBe(mocks.queries[0]);
    expect(items[1]).toBe(mocks.queries[1]);
    expect(mocks.queries[0]!.values.eventName).toBe(
      "hubspot.email.engagement-created",
    );
    expect(mocks.queries[1]!.values.eventName).toBe("lead.captured");
  });

  test("batch commits BEFORE the post-commit send; send keyed by the row id, processedAt stamped", async () => {
    const calls: string[] = [];
    mocks.batch.mockImplementation(async () => {
      calls.push("batch");
      return [];
    });
    fakeInngest.send.mockImplementation(async () => {
      calls.push("send");
    });

    await publish([
      {
        name: "hubspot.email.engagement-created",
        data: { correlationId: "corr-1", hubspotActivityId: "hs-act-1" },
      },
    ]);

    expect(calls).toEqual(["batch", "send"]);
    expect(fakeInngest.send).toHaveBeenCalledWith({
      id: mocks.queries[0]!.values.id,
      name: "hubspot.email.engagement-created",
      data: { correlationId: "corr-1", hubspotActivityId: "hs-act-1" },
    });
    expect(mocks.where).toHaveBeenCalledWith(
      and(
        eq(outbox.id, mocks.queries[0]!.values.id),
        isNull(outbox.processedAt),
      ),
    );
  });

  test("rejects a payload that fails the registry schema before anything commits", async () => {
    await expect(
      publish([
        {
          name: "hubspot.email.engagement-created",
          data: { correlationId: "corr-1" },
        } as never,
      ]),
    ).rejects.toThrow();
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  test("swallows send failure (row stays unprocessed for the sweep)", async () => {
    fakeInngest.send.mockRejectedValue(new Error("send failed"));
    const consoleSpy = rs.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      publish([
        {
          name: "hubspot.email.engagement-created",
          data: { correlationId: "corr-1", hubspotActivityId: "hs-act-1" },
        },
      ]),
    ).resolves.toBeUndefined();
    expect(mocks.batch).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("no events → no batch, no send", async () => {
    await publish([]);

    expect(mocks.batch).not.toHaveBeenCalled();
    expect(fakeInngest.send).not.toHaveBeenCalled();
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

    const { buildOutboxEvent, publish } = await import("../index");
    const { outbox: outboxTable } = await import("../outbox.schema");

    const result = buildOutboxEvent("lead.captured", {
      leadId: "abc",
      userId: "user-1",
    });

    expect(mocks.insert).toHaveBeenCalledWith(outboxTable);
    expect(result.query).toBe(mocks.queries[0]);
    // The write-less publish is bound on the same singletons.
    expect(typeof publish).toBe("function");
  });
});
