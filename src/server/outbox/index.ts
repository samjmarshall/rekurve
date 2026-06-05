import { and, eq, isNull, sql } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { outbox } from "~/server/db/schema/outbox";

export const OUTBOX_EVENTS = {
  LEAD_CAPTURED: "lead.captured",
  LEAD_UPDATED: "lead.updated",
  LEAD_STAGE_CHANGED: "lead.stage-changed",
} as const;

// Co-located so the router, webhook, and dispatch workers all import event
// names from ~/server/outbox without depending on ~/inngest (#261).
export const MESSAGE_EVENTS = {
  APPROVAL_REQUESTED: "message.approval-requested",
} as const;

export const HUBSPOT_EMAIL_EVENTS = {
  ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
  ENGAGEMENT_MISSED: "hubspot.engagement-missed",
} as const;

export type OutboxEventName =
  | (typeof OUTBOX_EVENTS)[keyof typeof OUTBOX_EVENTS]
  | (typeof MESSAGE_EVENTS)[keyof typeof MESSAGE_EVENTS]
  | (typeof HUBSPOT_EMAIL_EVENTS)[keyof typeof HUBSPOT_EMAIL_EVENTS];

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
