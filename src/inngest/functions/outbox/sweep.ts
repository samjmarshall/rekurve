import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { outbox } from "~/server/db/schema/outbox";
import { withDbTimeout } from "~/server/db/with-timeout";

// biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
type Step = { run: (id: string, fn: () => Promise<any>) => Promise<any> };

// Bound each Neon HTTP call so a hung query fails fast as a retriable step error
// instead of burning the function budget and 504-ing. Generous enough to absorb
// a cold-resume (the hourly cadence means the compute is usually suspended when
// the sweep fires), far below the route's 300s `maxDuration`.
const DB_TIMEOUT_MS = 20_000;

export async function runSweep(step: Step): Promise<void> {
  const rows = await step.run("select-unprocessed", () =>
    withDbTimeout("outbox-sweep:select", DB_TIMEOUT_MS, () =>
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
    ),
  );

  for (const row of rows) {
    await step.run(`row-${row.id}`, async () => {
      try {
        await inngest.send({
          id: row.id,
          name: row.eventName,
          data: row.payload as Record<string, unknown>,
        });
        await withDbTimeout("outbox-sweep:mark-processed", DB_TIMEOUT_MS, () =>
          db
            .update(outbox)
            .set({ processedAt: sql`now()` })
            .where(and(eq(outbox.id, row.id), isNull(outbox.processedAt))),
        );
      } catch (err) {
        await withDbTimeout("outbox-sweep:record-error", DB_TIMEOUT_MS, () =>
          db
            .update(outbox)
            .set({
              attempts: sql`${outbox.attempts} + 1`,
              lastError: String(err),
            })
            .where(eq(outbox.id, row.id)),
        );
      }
    });
  }
}

// Hourly, not per-minute: the post-commit `inngest.send` is the fast path that
// delivers ~every event in real time; this sweep is only the backstop for the
// rare event whose post-commit send failed (ADR-014 — cadence is "a tunable
// knob, not a contract"). A per-minute query kept Neon's compute from ever
// autosuspending (scale-to-zero), pinning it ~24/7 and driving DB usage to
// quota. Hourly lets the compute idle between sweeps; worst-case recovery for a
// failed publish is bounded by this interval.
export const outboxSweep = inngest.createFunction(
  { id: "outbox-sweep", triggers: { cron: "0 * * * *" } },
  ({ step }) => runSweep(step),
);
