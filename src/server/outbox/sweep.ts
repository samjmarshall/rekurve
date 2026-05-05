import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { outbox } from "~/server/db/schema/outbox";

// biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
type Step = { run: (id: string, fn: () => Promise<any>) => Promise<any> };

export async function runSweep(step: Step): Promise<void> {
  const rows = await step.run("select-unprocessed", () =>
    db
      .select()
      .from(outbox)
      .where(
        and(
          isNull(outbox.processedAt),
          lt(outbox.createdAt, sql`now() - interval '30 seconds'`),
        ),
      )
      .orderBy(outbox.createdAt)
      .limit(100),
  );

  for (const row of rows) {
    await step.run(`row-${row.id}`, async () => {
      try {
        await inngest.send({
          id: row.id,
          name: row.eventName,
          data: row.payload as Record<string, unknown>,
        });
        await db
          .update(outbox)
          .set({ processedAt: sql`now()` })
          .where(and(eq(outbox.id, row.id), isNull(outbox.processedAt)));
      } catch (err) {
        await db
          .update(outbox)
          .set({
            attempts: sql`${outbox.attempts} + 1`,
            lastError: String(err),
          })
          .where(eq(outbox.id, row.id));
      }
    });
  }
}

export const outboxSweep = inngest.createFunction(
  { id: "outbox-sweep", triggers: { cron: "* * * * *" } },
  ({ step }) => runSweep(step),
);
