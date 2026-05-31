import { randomUUID } from "node:crypto";
import { type NeonQueryFunction, neon } from "@neondatabase/serverless";
import { type APIRequestContext, request } from "@playwright/test";

import "dotenv/config";

import { TEST_FIRST_NAMES } from "./hubspot-helper";

let _sql: NeonQueryFunction<false, false> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}

export async function seedActiveSequence(args: {
  leadId: string;
  sequenceType: "discovery" | "nurture" | "warm_progression" | "lot_alert";
  nextStepAt: Date;
}): Promise<{ id: string }> {
  const id = randomUUID();
  await sql()`
    INSERT INTO "nurture_sequences" (id, lead_id, sequence_type, status, next_step_at)
    VALUES (
      ${id},
      ${args.leadId},
      ${args.sequenceType},
      'active',
      ${args.nextStepAt.toISOString()}
    )
  `;
  return { id };
}

export async function getActiveSequenceByLead(leadId: string): Promise<{
  id: string;
  sequenceType: string;
  nextStepAt: Date | null;
} | null> {
  const rows = await sql()`
    SELECT id, sequence_type, next_step_at
    FROM "nurture_sequences"
    WHERE lead_id = ${leadId} AND status = 'active'
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as {
    id: string;
    sequence_type: string;
    next_step_at: string | null;
  };
  return {
    id: row.id,
    sequenceType: row.sequence_type,
    nextStepAt: row.next_step_at ? new Date(row.next_step_at) : null,
  };
}

export async function getPendingMessagesByLead(leadId: string): Promise<
  Array<{
    id: string;
    body: string;
    status: string;
    channel: string;
    subject: string | null;
  }>
> {
  const rows = await sql()`
    SELECT id, body, status, channel, subject
    FROM "message_queue"
    WHERE lead_id = ${leadId} AND status = 'pending'
  `;
  return rows as Array<{
    id: string;
    body: string;
    status: string;
    channel: string;
    subject: string | null;
  }>;
}

export async function waitForPendingMessage(
  leadId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<{
  id: string;
  body: string;
  status: string;
  channel: string;
  subject: string | null;
}> {
  const intervalMs = opts?.intervalMs ?? 2_000;
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await getPendingMessagesByLead(leadId);
    if (rows.length > 0) return rows[0]!;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Timed out waiting for pending message for lead ${leadId} (${timeoutMs}ms)`,
  );
}

/**
 * Poll for the active nurture sequence on a lead. The DB-first intake cutover
 * (#258) moved sequence auto-start off the request path and into the
 * lead-hubspot-sync worker, so the row appears asynchronously after capture.
 */
export async function waitForActiveSequence(
  leadId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<{ id: string; sequenceType: string; nextStepAt: Date | null }> {
  const intervalMs = opts?.intervalMs ?? 1_000;
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const seq = await getActiveSequenceByLead(leadId);
    if (seq) return seq;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Timed out waiting for active sequence for lead ${leadId} (${timeoutMs}ms)`,
  );
}

export async function cleanupSequences(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql()`DELETE FROM "nurture_sequences" WHERE id = ANY(${ids}::uuid[])`;
}

/**
 * Removes active sequences the cron would pick up on its next tick, scoped to
 * test-created rows only (lead first_name in TEST_FIRST_NAMES OR email matches
 * e2e-%@test.rekurve.dev). Mirrors the marker pattern in
 * auth-helper.deleteTestLeads so production rows are never in scope — safe to
 * run against the production DB in post-deploy E2E without an env guard.
 *
 * Safe alongside the auto-starts test: its seeded sequence is dated 3 days in
 * the future and won't match next_step_at <= NOW().
 */
export async function cleanupDueActiveSequences(): Promise<void> {
  await sql()`
    DELETE FROM "nurture_sequences"
    WHERE status = 'active'
      AND next_step_at <= NOW()
      AND lead_id IN (
        SELECT id FROM "leads"
        WHERE first_name = ANY(${TEST_FIRST_NAMES})
           OR email LIKE 'e2e-%@test.rekurve.dev'
      )
  `;
}

export async function cronRequestContext(
  baseURL: string,
): Promise<APIRequestContext> {
  if (!process.env.CRON_SECRET) {
    throw new Error("CRON_SECRET is not set");
  }
  const extraHTTPHeaders: Record<string, string> = {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
    "x-ai-stub": "1",
  };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    extraHTTPHeaders["x-vercel-protection-bypass"] =
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    extraHTTPHeaders["x-vercel-set-bypass-cookie"] = "true";
  }
  return request.newContext({ baseURL, extraHTTPHeaders });
}
