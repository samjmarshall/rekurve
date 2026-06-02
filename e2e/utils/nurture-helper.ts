import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

import "dotenv/config";

let _sql: NeonQueryFunction<false, false> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
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
  const timeoutMs = opts?.timeoutMs ?? 20_000;
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
