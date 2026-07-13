import "server-only";

import { z } from "zod";

import { leadStageSchema } from "~/domain/leads/schemas";

/**
 * Single naming + payload authority for every Inngest event (adr019 clause 7).
 * Keys are the exact wire strings — byte-stable external identifiers (function
 * triggers, waitForEvent matches); renames require a golden-test update and an
 * ADR note. Payloads are validated at WRITE time only (`buildOutboxEvent`);
 * the sweep read path never re-parses, so a legacy in-flight row can't
 * error-loop the backstop. Schemas are strict: an unknown payload key (e.g. a
 * typo'd `hubSpotSync`) fails loudly at write time instead of being silently
 * stripped — a stripped-then-absent optional flag would flip a consumer's
 * default (lead-fanout reads absent `hubspotSync` as true).
 */
export const EVENT_REGISTRY = {
  "lead.captured": z.strictObject({
    leadId: z.string(),
    userId: z.string(),
    // HubSpot-origin ingest sets false to suppress the echo sync (lead-fanout
    // reads it as `hubspotSync = true` when absent).
    hubspotSync: z.boolean().optional(),
  }),
  "lead.updated": z.strictObject({
    leadId: z.string(),
    userId: z.string(),
    hubspotSync: z.boolean().optional(),
  }),
  "lead.stage-changed": z.strictObject({
    leadId: z.string(),
    userId: z.string(),
    fromStage: leadStageSchema.nullable(),
    toStage: leadStageSchema,
  }),
  "message.approval-requested": z.strictObject({
    messageId: z.string(),
    correlationId: z.string(),
    channel: z.enum(["email", "sms", "imessage"]),
    leadId: z.string(),
    body: z.string().optional(),
  }),
  "hubspot.email.engagement-created": z.strictObject({
    correlationId: z.string(),
    hubspotActivityId: z.string(),
  }),
  "hubspot.engagement-missed": z.strictObject({
    messageId: z.string(),
    leadId: z.string(),
    correlationId: z.string(),
  }),
  "nurture.followup-message-drafted": z.strictObject({
    leadId: z.string(),
    messageId: z.string(),
  }),
  "nurture.plan-paused": z.strictObject({
    leadId: z.string(),
  }),
} as const;

export type EventName = keyof typeof EVENT_REGISTRY;
export type EventPayload<K extends EventName> = z.infer<
  (typeof EVENT_REGISTRY)[K]
>;
export type OutboxEventDescriptor = {
  [K in EventName]: { name: K; data: EventPayload<K> };
}[EventName];
