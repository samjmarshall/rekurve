import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import {
  EVENT_REGISTRY,
  type EventName,
  type EventPayload,
} from "~/server/inngest/events";
import { outbox } from "./outbox.schema";

// Legacy name maps — EVENT_REGISTRY is the naming authority (adr019 clause 7);
// `satisfies` pins every value to a registry key. Kept as re-export surfaces
// until the last domain PR retires them.
export const OUTBOX_EVENTS = {
  LEAD_CAPTURED: "lead.captured",
  LEAD_UPDATED: "lead.updated",
  LEAD_STAGE_CHANGED: "lead.stage-changed",
} as const satisfies Record<string, EventName>;

// Co-located so the router, webhook, and dispatch workers all import event
// names from ~/server/outbox without depending on ~/inngest (#261).
export const MESSAGE_EVENTS = {
  APPROVAL_REQUESTED: "message.approval-requested",
} as const satisfies Record<string, EventName>;

export const HUBSPOT_EMAIL_EVENTS = {
  ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
  ENGAGEMENT_MISSED: "hubspot.engagement-missed",
} as const satisfies Record<string, EventName>;

// Return shape keeps the legacy member names {id, eventName, payload, query}
// so every existing call site (evt.eventName/evt.payload/evt.query) is
// untouched in this zero-behavior-change PR; the adr019 clause 7 shape
// {id, name, data, insert} lands with the domain PRs (PR 6 retires this
// compat surface). Clause 7's write-less `publish(events)` (webhook's
// engagement-created emission) is likewise deferred to PR 5, its only caller —
// the webhook keeps its inline `await evt.query; sendPostCommit(...)` form
// until then.
export function buildOutboxEvent<K extends EventName>(
  eventName: K,
  payload: EventPayload<K>,
) {
  // Write-time validation only (adr019 clause 7): the sweep/prune read path
  // must never re-parse — a legacy in-flight row that predates the registry
  // would error-loop the backstop. Registry schemas are strict, so an unknown
  // payload key throws here rather than being silently stripped.
  const data = EVENT_REGISTRY[eventName].parse(payload) as EventPayload<K>;
  const id = crypto.randomUUID();
  const query = db.insert(outbox).values({ id, eventName, payload: data });
  return { id, eventName, payload: data, query };
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
