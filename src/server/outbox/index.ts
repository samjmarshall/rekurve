import "server-only";

import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import type { EventName } from "~/server/inngest/events";
import { createOutboxHelpers } from "./core";

// Legacy name maps — EVENT_REGISTRY is the naming authority (adr019 clause 7);
// `satisfies` pins every value to a registry key. Kept as re-export surfaces
// until the last domain PR retires them.
export const OUTBOX_EVENTS = {
  LEAD_CAPTURED: "lead.captured",
  LEAD_UPDATED: "lead.updated",
  LEAD_STAGE_CHANGED: "lead.stage-changed",
} as const satisfies Record<string, EventName>;

// Co-located so the router and dispatch workers import event names from
// ~/server/outbox without depending on ~/inngest (#261). The hubspot webhook
// no longer consumes these — it pins its wire string module-privately
// (hubspot.webhook.ts) to stay off this barrel's db/inngest graph.
export const MESSAGE_EVENTS = {
  APPROVAL_REQUESTED: "message.approval-requested",
} as const satisfies Record<string, EventName>;

export const HUBSPOT_EMAIL_EVENTS = {
  ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
  ENGAGEMENT_MISSED: "hubspot.engagement-missed",
} as const satisfies Record<string, EventName>;

// App-singleton binding of the outbox helpers (core.ts holds the logic and
// its DI seam). Repositories constructed on a non-singleton db go through
// makeCommitWithOutbox (./commit) or createOutboxHelpers directly.
// buildOutboxEvent/sendPostCommit have no runtime importers left (the webhook
// moved onto `publish`); they stay exported as the adr019-documented compat
// surface — #330 decides whether they are retired or kept.
export const { buildOutboxEvent, sendPostCommit, publish } =
  createOutboxHelpers({
    db,
    inngest,
  });
