import { randomUUID } from "node:crypto";
import { sql as dsql, eq, inArray } from "drizzle-orm";

/**
 * Shared Neon seed/cleanup scaffold for the messaging integration tests
 * (dispatch-email / dispatch-sms / approval-outbox). All ~/server/db imports
 * stay dynamic so unit runs (no INTEGRATION_DB) never evaluate the real env.
 */

/** Unique-per-run identity set: `${prefix}` namespaces the human-readable
 * ids; leadId/messageId are plain uuids. */
export function makeSeedIds(prefix: string) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return {
    suffix,
    userId: `${prefix}-user-${suffix}`,
    leadId: randomUUID(),
    messageId: randomUUID(),
    email: `${prefix}-${suffix}@test.rekurve.dev`,
    hubspotContactId: `hs-${prefix}-${suffix}`,
  };
}

export type SeedIds = ReturnType<typeof makeSeedIds>;

/**
 * Seed lead + messageQueue rows (and, with `withUser`, the owning user so
 * resolveLeadOwnerUserId resolves). `approvedAt` is stamped only for approved
 * seeds — pending rows (approval-outbox) stay unapproved.
 */
export async function seedLeadAndMessage(
  ids: SeedIds,
  message: {
    channel: "email" | "sms" | "imessage";
    subject: string | null;
    body: string;
    status: "pending" | "approved";
  },
  opts: { withUser?: boolean } = {},
): Promise<void> {
  const { db } = await import("~/server/db");
  const schema = await import("~/server/db/schema");
  if (opts.withUser) {
    await db
      .insert(schema.user)
      .values({ id: ids.userId, name: "Integration", email: ids.email });
  }
  await db.insert(schema.leads).values({
    id: ids.leadId,
    firstName: "Int",
    lastName: "Test",
    email: ids.email,
    hubspotContactId: ids.hubspotContactId,
  });
  await db.insert(schema.messageQueue).values({
    id: ids.messageId,
    leadId: ids.leadId,
    channel: message.channel,
    subject: message.subject,
    body: message.body,
    status: message.status,
    approvedAt: message.status === "approved" ? new Date() : undefined,
    priority: 50,
  });
}

/**
 * afterAll cleanup — deletes in FK order everything a messaging integration
 * test can create: outbox rows keyed by payload.messageId (opt-in),
 * conversations, the messageQueue row, the lead, and the user (which cascades
 * ms_graph_tokens). Deleting rows a test never created is a no-op, so one
 * chain serves all three suites and cleanup omissions can't drift per copy.
 */
export async function cleanupSeededRows(
  ids: SeedIds,
  opts: { outbox?: boolean } = {},
): Promise<void> {
  const { db } = await import("~/server/db");
  const schema = await import("~/server/db/schema");
  if (opts.outbox) {
    await db
      .delete(schema.outbox)
      .where(dsql`${schema.outbox.payload}->>'messageId' = ${ids.messageId}`);
  }
  await db
    .delete(schema.conversations)
    .where(eq(schema.conversations.messageQueueId, ids.messageId));
  await db
    .delete(schema.messageQueue)
    .where(inArray(schema.messageQueue.id, [ids.messageId]));
  await db.delete(schema.leads).where(inArray(schema.leads.id, [ids.leadId]));
  await db.delete(schema.user).where(inArray(schema.user.id, [ids.userId]));
}
