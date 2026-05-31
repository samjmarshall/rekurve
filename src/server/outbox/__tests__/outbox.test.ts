import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { and, eq, isNull } from "drizzle-orm";

// --- buildOutboxEvent ---

describe("buildOutboxEvent", () => {
  let mockQueryObject: Record<string, unknown>;
  let mockValues: ReturnType<typeof rs.fn>;
  let mockInsert: ReturnType<typeof rs.fn>;

  beforeEach(() => {
    rs.resetModules();

    mockQueryObject = { __isQuery: true };
    mockValues = rs.fn().mockReturnValue(mockQueryObject);
    mockInsert = rs.fn().mockReturnValue({ values: mockValues });

    rs.doMock("~/server/db", () => ({
      db: { insert: mockInsert },
    }));

    rs.doMock("~/inngest/client", () => ({
      inngest: { send: rs.fn() },
    }));
  });

  test("returns a UUID string id", async () => {
    const { buildOutboxEvent } = await import("../index");

    const result = buildOutboxEvent("lead.captured", { leadId: "abc" });

    expect(typeof result.id).toBe("string");
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("calls db.insert with outbox table and does not execute", async () => {
    const { buildOutboxEvent } = await import("../index");
    const { outbox } = await import("~/server/db/schema/outbox");

    const result = buildOutboxEvent("lead.captured", { leadId: "abc" });

    expect(mockInsert).toHaveBeenCalledWith(outbox);
    expect(mockValues).toHaveBeenCalledOnce();
    expect(result.query).toBe(mockQueryObject);
  });

  test("passes id, eventName, and payload to values()", async () => {
    const { buildOutboxEvent } = await import("../index");

    const payload = { leadId: "abc", userId: "user-1" };
    const result = buildOutboxEvent("lead.captured", payload);

    const [valuesArg] = mockValues.mock.calls[0] as [
      { id: string; eventName: string; payload: unknown },
    ];
    expect(valuesArg.id).toBe(result.id);
    expect(valuesArg.eventName).toBe("lead.captured");
    expect(valuesArg.payload).toEqual(payload);
  });

  test("returns the eventName and payload in the result", async () => {
    const { buildOutboxEvent } = await import("../index");

    const payload = { leadId: "test-123", userId: "user-1" };
    const result = buildOutboxEvent("lead.updated", payload);

    expect(result.eventName).toBe("lead.updated");
    expect(result.payload).toEqual(payload);
  });

  test("each call generates a distinct id", async () => {
    const { buildOutboxEvent } = await import("../index");

    const r1 = buildOutboxEvent("lead.captured", { a: 1 });
    const r2 = buildOutboxEvent("lead.updated", { a: 2 });

    expect(r1.id).not.toBe(r2.id);
  });
});

// --- sendPostCommit ---

describe("sendPostCommit", () => {
  let mockSend: ReturnType<typeof rs.fn>;
  let mockWhere: ReturnType<typeof rs.fn>;
  let mockSet: ReturnType<typeof rs.fn>;
  let mockUpdate: ReturnType<typeof rs.fn>;

  beforeEach(() => {
    rs.resetModules();

    mockSend = rs.fn().mockResolvedValue(undefined);
    rs.doMock("~/inngest/client", () => ({
      inngest: { send: mockSend },
    }));

    mockWhere = rs.fn().mockResolvedValue(undefined);
    mockSet = rs.fn().mockReturnValue({ where: mockWhere });
    mockUpdate = rs.fn().mockReturnValue({ set: mockSet });

    rs.doMock("~/server/db", () => ({
      db: { update: mockUpdate },
    }));
  });

  test("calls inngest.send with { id, name, data }", async () => {
    const { sendPostCommit } = await import("../index");

    await sendPostCommit([
      { id: "evt-1", name: "lead.captured", data: { leadId: "abc" } },
    ]);

    expect(mockSend).toHaveBeenCalledWith({
      id: "evt-1",
      name: "lead.captured",
      data: { leadId: "abc" },
    });
  });

  test("marks processedAt after successful send", async () => {
    const { sendPostCommit } = await import("../index");
    const { outbox } = await import("~/server/db/schema/outbox");

    await sendPostCommit([{ id: "evt-1", name: "lead.captured", data: {} }]);

    expect(mockUpdate).toHaveBeenCalledWith(outbox);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ processedAt: expect.anything() }),
    );
    expect(mockWhere).toHaveBeenCalledWith(
      and(eq(outbox.id, "evt-1"), isNull(outbox.processedAt)),
    );
  });

  test("swallows and logs on inngest.send failure", async () => {
    const { sendPostCommit } = await import("../index");

    mockSend.mockRejectedValue(new Error("send failed"));
    const consoleSpy = rs.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendPostCommit([{ id: "evt-1", name: "lead.captured", data: {} }]),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("does not mark processedAt on failure", async () => {
    const { sendPostCommit } = await import("../index");

    mockSend.mockRejectedValue(new Error("send failed"));
    const consoleSpy = rs.spyOn(console, "error").mockImplementation(() => {});

    await sendPostCommit([{ id: "evt-1", name: "lead.captured", data: {} }]);
    expect(mockUpdate).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("processes multiple events in sequence", async () => {
    const { sendPostCommit } = await import("../index");

    const events = [
      { id: "evt-1", name: "lead.captured", data: { leadId: "a" } },
      { id: "evt-2", name: "lead.updated", data: { leadId: "b" } },
    ];

    await sendPostCommit(events);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt-1" }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt-2" }),
    );
  });
});
