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
}): Promise<SeededLead> {
  const id = randomUUID();
  await sql()`
    INSERT INTO "leads" (id, first_name, last_name, lead_score, lead_stage, phone, email)
    VALUES (
      ${id},
      ${overrides.firstName},
      ${overrides.lastName},
      ${overrides.leadScore ?? 0},
      ${overrides.leadStage ?? "unqualified"},
      ${overrides.phone ?? null},
      ${overrides.email ?? null}
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
} | null> {
  const rows = await sql()`
    SELECT status, body, original_body, snoozed_until
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
