// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { and, eq, isNotNull } from "drizzle-orm";

import { makeStep } from "~/server/inngest/__tests__/step-fake";

const TEST_EVENT = `outbox.integration.sweep.${Date.now()}.${Math.random().toString(36).slice(2)}`;

describe.skipIf(!process.env.INTEGRATION_DB)("outboxSweep integration", () => {
  test("marks inserted rows as processed and is idempotent on re-run", async () => {
    // Real Neon db; only Inngest delivery is faked — the sweep core takes its
    // send port as an injected dep (adr020), so no module mock is needed.
    const mockSend = rs.fn().mockResolvedValue([]);

    const { db } = await import("~/server/db");
    const { outbox } = await import("~/server/outbox/outbox.schema");
    const { makeRunSweep } = await import("../outbox.worker");
    const runSweep = makeRunSweep({ db, send: mockSend });

    // Insert 3 rows aged > 30 s by backdating created_at
    const past = new Date(Date.now() - 60_000);
    await db.insert(outbox).values([
      { eventName: TEST_EVENT, payload: { n: 1 }, createdAt: past },
      { eventName: TEST_EVENT, payload: { n: 2 }, createdAt: past },
      { eventName: TEST_EVENT, payload: { n: 3 }, createdAt: past },
    ]);

    const mockStep = makeStep();

    // First sweep — should process all 3 rows
    await runSweep(mockStep as never);

    const processed = await db
      .select()
      .from(outbox)
      .where(
        and(eq(outbox.eventName, TEST_EVENT), isNotNull(outbox.processedAt)),
      );
    expect(processed).toHaveLength(3);

    // Second sweep — no new rows, send not called again
    const sendCallsAfterFirst = mockSend.mock.calls.length;
    await runSweep(mockStep as never);
    expect(mockSend.mock.calls.length).toBe(sendCallsAfterFirst);
  });

  afterAll(async () => {
    const { db } = await import("~/server/db");
    const { outbox } = await import("~/server/outbox/outbox.schema");
    await db.delete(outbox).where(eq(outbox.eventName, TEST_EVENT));
  });
});
