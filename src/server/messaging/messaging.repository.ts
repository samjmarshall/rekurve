import "server-only";

import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";

import type { db as defaultDb } from "~/server/db";
import type { OutboxEventDescriptor } from "~/server/inngest/events";
// READ-MODEL JOINS (adr020/adr021 read rule): sibling *.schema.ts imports are
// allowed for READS only — listPending joins leads for board context, the
// approval flow reads the lead row and the consultant's Graph token. All
// writes to those tables stay behind their own domains' commit doors.
import { leads } from "~/server/leads/leads.schema";
import { msGraphTokens } from "~/server/ms-graph/ms-graph.schema";
import type { CommitWithOutbox } from "~/server/outbox/commit";
import type { MessagingWrite } from "./messaging.decide";
import type { MessageRow } from "./messaging.schema";
import { conversations, messageQueue } from "./messaging.schema";

type Db = typeof defaultDb;
type BatchItem = Parameters<CommitWithOutbox>[0][number];

/** Per-variant result of the write door: only updateMessage returns the fresh
 * row from `.returning()` (adr006 — mutations return the row); the worker/
 * webhook stamps are fire-and-forget and return void, matching the pre-split
 * inline statements, which carried no RETURNING clause. */
type MessagingCommitResult<W extends MessagingWrite> = W extends {
  kind: "updateMessage";
}
  ? MessageRow | undefined
  : undefined;

/** Positional result tuple of the plural write door: one entry per write, in
 * write order (batch results align with statements; outbox inserts trail). */
type MessagingCommitResults<Ws extends readonly MessagingWrite[]> = {
  [K in keyof Ws]: MessagingCommitResult<Ws[K]>;
};

// The only messaging file that builds Drizzle statements (adr020): plain-data
// reads plus the single atomic write door, `commit(writes, events)`, which
// lands canonical rows and outbox rows in one db.batch via commitWithOutbox.
export function makeMessagingRepository({
  db,
  commitWithOutbox,
}: {
  db: Db;
  commitWithOutbox: CommitWithOutbox;
}) {
  function findMessage(id: string) {
    return db.query.messageQueue.findFirst({ where: eq(messageQueue.id, id) });
  }

  /** Lead context for approve/editAndApprove dispatch (cross-domain READ). */
  function findLeadById(id: string) {
    return db.query.leads.findFirst({ where: eq(leads.id, id) });
  }

  /** Email precondition c: the consultant's Graph token row (cross-domain READ). */
  function findMsGraphToken(userId: string) {
    return db.query.msGraphTokens.findFirst({
      where: eq(msGraphTokens.userId, userId),
    });
  }

  /** Dispatch idempotency probe: the check half of check-then-insert (no
   * unique index on messageQueueId yet). Same shape as the workers' inline
   * select — id only, limit 1. */
  function findConversationByMessageQueueId(messageQueueId: string) {
    return db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.messageQueueId, messageQueueId))
      .limit(1);
  }

  /** Reconciliation probe: the conversation row for a dispatched message —
   * same projection as the reconcile worker's former inline select. */
  function findConversationForReconciliation(messageQueueId: string) {
    return db
      .select({
        leadId: conversations.leadId,
        hubspotActivityId: conversations.hubspotActivityId,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(eq(conversations.messageQueueId, messageQueueId))
      .limit(1);
  }

  /** Reconciliation needs only the lead's HubSpot id (cross-domain READ). */
  function findLeadHubspotContactId(leadId: string) {
    return db.query.leads.findFirst({
      where: eq(leads.id, leadId),
      columns: { hubspotContactId: true },
    });
  }

  /** The approval queue read-model: pending rows (snooze elapsed or never
   * snoozed) plus snoozed rows whose snoozedUntil has elapsed, joined to lead
   * board context, priority-then-age ordered. Query is a byte-copy of the
   * pre-split router's (messages.ts listPending); the snooze-elapsed clock is
   * injected by the service (no inline now()) so the read is deterministic. */
  function listPending(now: Date) {
    return db
      .select({
        id: messageQueue.id,
        leadId: messageQueue.leadId,
        channel: messageQueue.channel,
        subject: messageQueue.subject,
        body: messageQueue.body,
        aiReasoning: messageQueue.aiReasoning,
        priority: messageQueue.priority,
        status: messageQueue.status,
        snoozedUntil: messageQueue.snoozedUntil,
        originalBody: messageQueue.originalBody,
        approvedAt: messageQueue.approvedAt,
        sentAt: messageQueue.sentAt,
        createdAt: messageQueue.createdAt,
        lead: {
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          leadScore: leads.leadScore,
          leadStage: leads.leadStage,
        },
      })
      .from(messageQueue)
      .innerJoin(leads, eq(messageQueue.leadId, leads.id))
      .where(
        or(
          and(
            eq(messageQueue.status, "pending"),
            or(
              isNull(messageQueue.snoozedUntil),
              lte(messageQueue.snoozedUntil, now),
            ),
          ),
          and(
            eq(messageQueue.status, "snoozed"),
            lte(messageQueue.snoozedUntil, now),
          ),
        ),
      )
      .orderBy(desc(messageQueue.priority), asc(messageQueue.createdAt));
  }

  /** Lead-scoped conversation history, newest first, with the originalBody of
   * a linked edited queue message surfaced via left join (read-model — the
   * conversations "domain" is this one query). */
  function listConversations(leadId: string) {
    return db
      .select({
        id: conversations.id,
        leadId: conversations.leadId,
        channel: conversations.channel,
        direction: conversations.direction,
        deliveryMethod: conversations.deliveryMethod,
        subject: conversations.subject,
        body: conversations.body,
        createdAt: conversations.createdAt,
        originalBody: messageQueue.originalBody,
      })
      .from(conversations)
      .leftJoin(messageQueue, eq(conversations.messageQueueId, messageQueue.id))
      .where(eq(conversations.leadId, leadId))
      .orderBy(desc(conversations.createdAt));
  }

  /** One write descriptor → one Drizzle statement. Only updateMessage carries
   * `.returning()` (adr006); stampSent is guarded on `sentAt IS NULL`, so a
   * second stamp is a no-op (dispatch idempotence). */
  function toStatement(write: MessagingWrite): BatchItem {
    switch (write.kind) {
      case "updateMessage":
        return db
          .update(messageQueue)
          .set(write.set)
          .where(eq(messageQueue.id, write.id))
          .returning();
      case "markDispatching":
        return db
          .update(messageQueue)
          .set({ dispatchingAt: write.dispatchingAt })
          .where(eq(messageQueue.id, write.id));
      case "stampSent":
        return db
          .update(messageQueue)
          .set({ sentAt: write.sentAt })
          .where(
            and(eq(messageQueue.id, write.id), isNull(messageQueue.sentAt)),
          );
      case "insertConversation":
        return db.insert(conversations).values(write.values);
      case "stampActivity":
        return db
          .update(conversations)
          .set({ hubspotActivityId: write.hubspotActivityId })
          .where(eq(conversations.messageQueueId, write.messageQueueId));
      case "recordDeliveryStatus":
        return db
          .update(conversations)
          .set({ deliveryStatus: write.deliveryStatus })
          .where(eq(conversations.twilioMessageSid, write.twilioMessageSid));
    }
  }

  /** The plural atomic write door (adr020's recorded signature): ALL mapped
   * statements plus the outbox inserts land in ONE db.batch. Results map
   * positionally onto `writes` — commitWithOutbox returns batch results
   * aligned with its statements (outbox rows trail), so index i of the batch
   * is write i, and only updateMessage writes surface their `.returning()`
   * row. */
  async function commit<const Ws extends readonly MessagingWrite[]>(
    writes: Ws,
    events: readonly OutboxEventDescriptor[],
  ): Promise<MessagingCommitResults<Ws>> {
    const results = await commitWithOutbox(writes.map(toStatement), events);
    return writes.map((write, i) =>
      write.kind === "updateMessage"
        ? (results[i] as MessageRow[])[0]
        : undefined,
    ) as MessagingCommitResults<Ws>;
  }

  return {
    findMessage,
    findLeadById,
    findMsGraphToken,
    findConversationByMessageQueueId,
    findConversationForReconciliation,
    findLeadHubspotContactId,
    listPending,
    listConversations,
    commit,
  };
}

export type MessagingRepository = ReturnType<typeof makeMessagingRepository>;
