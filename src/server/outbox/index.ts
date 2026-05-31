import { and, eq, isNull, sql } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { outbox } from "~/server/db/schema/outbox";

export const OUTBOX_EVENTS = {
  LEAD_CAPTURED: "lead.captured",
  LEAD_UPDATED: "lead.updated",
} as const;

export type OutboxEventName =
  (typeof OUTBOX_EVENTS)[keyof typeof OUTBOX_EVENTS];

export function buildOutboxEvent(
  eventName: OutboxEventName,
  payload: Record<string, unknown>,
) {
  const id = crypto.randomUUID();
  const query = db.insert(outbox).values({ id, eventName, payload });
  return { id, eventName, payload, query };
}

export async function sendPostCommit(
  events: { id: string; name: string; data: Record<string, unknown> }[],
): Promise<void> {
  for (const evt of events) {
    try {
      await inngest.send({ id: evt.id, name: evt.name, data: evt.data });
      await db
        .update(outbox)
        .set({ processedAt: sql`now()` })
        .where(and(eq(outbox.id, evt.id), isNull(outbox.processedAt)));
    } catch (err) {
      console.error("[outbox] post-commit send failed; sweep will retry:", err);
    }
  }
}
