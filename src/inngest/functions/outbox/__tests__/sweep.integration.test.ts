// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { and, eq, isNotNull } from "drizzle-orm";

const TEST_EVENT = `outbox.integration.sweep.${Date.now()}.${Math.random().toString(36).slice(2)}`;

describe.skipIf(!process.env.INTEGRATION_DB)("outboxSweep integration", () => {
  test("marks inserted rows as processed and is idempotent on re-run", async () => {
    rs.resetModules();

    // doMock must be called before importing sweep — sweep statically imports
    // ~/inngest/client at load time, so the mock must be registered first.
    const mockSend = rs.fn().mockResolvedValue([]);
    rs.doMock("~/inngest/client", () => ({
      inngest: {
        createFunction: rs.fn().mockReturnValue({}),
        send: mockSend,
      },
    }));

    const { db } = await import("~/server/db");
    const { outbox } = await import("~/server/db/schema/outbox");
    const { runSweep } = await import("../sweep");

    // Insert 3 rows aged > 30 s by backdating created_at
    const past = new Date(Date.now() - 60_000);
    await db.insert(outbox).values([
      { eventName: TEST_EVENT, payload: { n: 1 }, createdAt: past },
      { eventName: TEST_EVENT, payload: { n: 2 }, createdAt: past },
      { eventName: TEST_EVENT, payload: { n: 3 }, createdAt: past },
    ]);

    const mockStep = {
      run: rs
        .fn()
        .mockImplementation((_id: string, fn: () => Promise<unknown>) => fn()),
    };

    // First sweep — should process all 3 rows
    await runSweep(mockStep as never);

    const processed = await db
      .select()
      .from(outbox)
      .where(
        and(eq(outbox.eventName, TEST_EVENT), isNotNull(outbox.processedAt)),
      );
    expect(processed).toHaveLength(3);

    // Second sweep — no new rows, inngest.send not called again
    const sendCallsAfterFirst = mockSend.mock.calls.length;
    await runSweep(mockStep as never);
    expect(mockSend.mock.calls.length).toBe(sendCallsAfterFirst);
  });

  afterAll(async () => {
    const { db } = await import("~/server/db");
    const { outbox } = await import("~/server/db/schema/outbox");
    await db.delete(outbox).where(eq(outbox.eventName, TEST_EVENT));
  });
});
