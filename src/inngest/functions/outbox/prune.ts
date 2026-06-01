import { and, isNotNull, lt, sql } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { outbox } from "~/server/db/schema/outbox";

// biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
type Step = { run: (id: string, fn: () => Promise<any>) => Promise<any> };

export async function runPrune(step: Step): Promise<void> {
  await step.run("delete-processed", () =>
    db
      .delete(outbox)
      .where(
        and(
          isNotNull(outbox.processedAt),
          lt(outbox.processedAt, sql`now() - interval '7 days'`),
        ),
      ),
  );
}

export const outboxPrune = inngest.createFunction(
  { id: "outbox-prune", triggers: { cron: "0 3 * * *" } },
  ({ step }) => runPrune(step),
);
