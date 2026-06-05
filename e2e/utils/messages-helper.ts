import { randomUUID } from "node:crypto";
import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

import "dotenv/config";

let _sql: NeonQueryFunction<false, false> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}

export interface SeededLead {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Insert a lead directly into the DB, bypassing HubSpot sync. Used by action
 * queue E2E tests that need a lead row to hang messages off of without caring
 * about the CRM side.
 */
export async function seedLead(overrides: {
  firstName: string;
  lastName: string;
  leadScore?: number;
  leadStage?: "unqualified" | "nurture" | "warm" | "hot";
  phone?: string | null;
  email?: string | null;
  hubspotContactId?: string | null;
}): Promise<SeededLead> {
  const id = randomUUID();
  await sql()`
    INSERT INTO "leads" (id, first_name, last_name, lead_score, lead_stage, phone, email, hubspot_contact_id)
    VALUES (
      ${id},
      ${overrides.firstName},
      ${overrides.lastName},
      ${overrides.leadScore ?? 0},
      ${overrides.leadStage ?? "unqualified"},
      ${overrides.phone ?? null},
      ${overrides.email ?? null},
      ${overrides.hubspotContactId ?? null}
    )
  `;
  return { id, firstName: overrides.firstName, lastName: overrides.lastName };
}

export interface SeededMessage {
  id: string;
  leadId: string;
}

/**
 * Seed a pending row into `message_queue`.
 */
export async function seedPendingMessage(args: {
  leadId: string;
  channel?: "sms" | "email";
  body: string;
  subject?: string | null;
  aiReasoning?: string | null;
  priority?: number;
}): Promise<SeededMessage> {
  const id = randomUUID();
  await sql()`
    INSERT INTO "message_queue"
      (id, lead_id, channel, subject, body, ai_reasoning, priority, status)
    VALUES (
      ${id},
      ${args.leadId},
      ${args.channel ?? "sms"},
      ${args.subject ?? null},
      ${args.body},
      ${args.aiReasoning ?? null},
      ${args.priority ?? 0},
      'pending'
    )
  `;
  return { id, leadId: args.leadId };
}

export async function getMessageStatus(id: string): Promise<{
  status: string;
  body: string;
  original_body: string | null;
  snoozed_until: string | null;
  approved_at: string | null;
  sent_at: string | null;
} | null> {
  const rows = await sql()`
    SELECT status, body, original_body, snoozed_until, approved_at, sent_at
    FROM "message_queue"
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as never) : null;
}

export async function cleanupMessages(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql()`DELETE FROM "message_queue" WHERE id = ANY(${ids}::uuid[])`;
}

export async function cleanupLeads(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql()`DELETE FROM "leads" WHERE id = ANY(${ids}::uuid[])`;
}

export interface SeededConversation {
  id: string;
  leadId: string;
}

export async function seedConversation(args: {
  leadId: string;
  messageQueueId?: string | null;
  channel?: "sms" | "email";
  direction?: "inbound" | "outbound";
  deliveryMethod?: "sms" | "email" | null;
  subject?: string | null;
  body: string;
  hubspotActivityId?: string | null;
  twilioMessageSid?: string | null;
  deliveryStatus?: string | null;
  createdAt?: Date | string;
}): Promise<SeededConversation> {
  const id = randomUUID();
  const createdAt = args.createdAt
    ? new Date(args.createdAt).toISOString()
    : null;
  if (createdAt) {
    await sql()`
      INSERT INTO "conversations"
        (id, lead_id, message_queue_id, channel, direction, delivery_method, subject, body, hubspot_activity_id, twilio_message_sid, delivery_status, created_at)
      VALUES (
        ${id},
        ${args.leadId},
        ${args.messageQueueId ?? null},
        ${args.channel ?? "email"},
        ${args.direction ?? "outbound"},
        ${args.deliveryMethod ?? "email"},
        ${args.subject ?? null},
        ${args.body},
        ${args.hubspotActivityId ?? null},
        ${args.twilioMessageSid ?? null},
        ${args.deliveryStatus ?? null},
        ${createdAt}
      )
    `;
  } else {
    await sql()`
      INSERT INTO "conversations"
        (id, lead_id, message_queue_id, channel, direction, delivery_method, subject, body, hubspot_activity_id, twilio_message_sid, delivery_status)
      VALUES (
        ${id},
        ${args.leadId},
        ${args.messageQueueId ?? null},
        ${args.channel ?? "email"},
        ${args.direction ?? "outbound"},
        ${args.deliveryMethod ?? "email"},
        ${args.subject ?? null},
        ${args.body},
        ${args.hubspotActivityId ?? null},
        ${args.twilioMessageSid ?? null},
        ${args.deliveryStatus ?? null}
      )
    `;
  }
  return { id, leadId: args.leadId };
}

export interface SeededQueueMessage {
  id: string;
  leadId: string;
}

/**
 * Inserts a message_queue row whose original_body differs from body, simulating
 * an AI draft that was edited before send. Returns the row id for linking to a
 * conversation via messageQueueId.
 */
export async function seedEditedQueueMessage(args: {
  leadId: string;
  channel?: "sms" | "email";
  body: string;
  originalBody: string;
}): Promise<SeededQueueMessage> {
  const id = randomUUID();
  await sql()`
    INSERT INTO "message_queue"
      (id, lead_id, channel, body, original_body, status, priority)
    VALUES (
      ${id},
      ${args.leadId},
      ${args.channel ?? "email"},
      ${args.body},
      ${args.originalBody},
      'edited_and_approved',
      0
    )
  `;
  return { id, leadId: args.leadId };
}

export async function cleanupConversations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql()`DELETE FROM "conversations" WHERE id = ANY(${ids}::uuid[])`;
}

export async function getConversation(id: string): Promise<{
  id: string;
  direction: string;
  delivery_method: string | null;
  hubspot_activity_id: string | null;
  subject: string | null;
} | null> {
  const rows = await sql()`
    SELECT id, direction, delivery_method, hubspot_activity_id, subject
    FROM "conversations"
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as never) : null;
}

export async function getConversationsForLead(leadId: string): Promise<
  Array<{
    id: string;
    direction: string;
    delivery_method: string | null;
    hubspot_activity_id: string | null;
    subject: string | null;
    created_at: string;
  }>
> {
  const rows = await sql()`
    SELECT id, direction, delivery_method, hubspot_activity_id, subject, created_at
    FROM "conversations"
    WHERE lead_id = ${leadId}
    ORDER BY created_at DESC
  `;
  return rows as never;
}

export async function getConversationsForMessage(
  messageQueueId: string,
): Promise<
  Array<{
    id: string;
    twilio_message_sid: string | null;
    delivery_status: string | null;
    body: string;
  }>
> {
  const rows = await sql()`
    SELECT id, twilio_message_sid, delivery_status, body
    FROM "conversations"
    WHERE message_queue_id = ${messageQueueId}
    ORDER BY created_at DESC
  `;
  return rows as never;
}

export async function cleanupConversationsForLead(
  leadId: string,
): Promise<void> {
  await sql()`DELETE FROM "conversations" WHERE lead_id = ${leadId}`;
}

export async function deleteMsGraphTokens(userId: string): Promise<void> {
  await sql()`DELETE FROM "ms_graph_tokens" WHERE user_id = ${userId}`;
}

export async function seedMsGraphTokens(
  userId: string,
  opts: {
    accessToken: string;
    refreshToken?: string;
    microsoftUserId?: string;
    email?: string;
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await sql()`
    INSERT INTO "ms_graph_tokens"
      (user_id, access_token, refresh_token, expires_at, microsoft_user_id, email)
    VALUES (
      ${userId},
      ${opts.accessToken},
      ${opts.refreshToken ?? "e2e-refresh-placeholder"},
      ${expiresAt},
      ${opts.microsoftUserId ?? "e2e-ms-user-id"},
      ${opts.email ?? "e2e@placeholder.local"}
    )
    ON CONFLICT (user_id) DO UPDATE
      SET access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
  `;
}

export interface SeededEmailItem {
  leadId: string;
  messageId: string;
}

export async function seedEmailQueueItem(args: {
  firstName: string;
  lastName: string;
  email: string;
  hubspotContactId: string;
  subject: string;
  body: string;
  priority?: number;
}): Promise<SeededEmailItem> {
  const lead = await seedLead({
    firstName: args.firstName,
    lastName: args.lastName,
    email: args.email,
    hubspotContactId: args.hubspotContactId,
  });
  const msg = await seedPendingMessage({
    leadId: lead.id,
    channel: "email",
    subject: args.subject,
    body: args.body,
    priority: args.priority ?? 80,
  });
  return { leadId: lead.id, messageId: msg.id };
}
