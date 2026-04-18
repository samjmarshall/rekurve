import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import {
  messageApproveSchema,
  messageDismissSchema,
  messageEditAndApproveSchema,
  messageSnoozeSchema,
} from "~/server/api/schemas/messages";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads, messageQueue } from "~/server/db/schema";

/**
 * Fetch a message_queue row and assert its status permits a user action.
 * Terminal states (approved, edited_and_approved, dismissed) are rejected.
 * Returns the fetched row so callers like editAndApprove can reuse the body.
 */
async function loadActionable(
  db: typeof import("~/server/db").db,
  id: string,
  action: "approve" | "edit" | "snooze" | "dismiss",
): Promise<typeof messageQueue.$inferSelect> {
  const row = await db.query.messageQueue.findFirst({
    where: eq(messageQueue.id, id),
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
  }
  if (row.status !== "pending" && row.status !== "snoozed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot ${action} message in ${row.status} state`,
    });
  }
  return row;
}

export const messagesRouter = createTRPCRouter({
  listPending: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db
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
        and(
          eq(messageQueue.status, "pending"),
          or(
            isNull(messageQueue.snoozedUntil),
            lte(messageQueue.snoozedUntil, new Date()),
          ),
        ),
      )
      .orderBy(desc(messageQueue.priority), asc(messageQueue.createdAt));
  }),

  approve: protectedProcedure
    .input(messageApproveSchema)
    .mutation(async ({ ctx, input }) => {
      await loadActionable(ctx.db, input.id, "approve");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  editAndApprove: protectedProcedure
    .input(messageEditAndApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await loadActionable(ctx.db, input.id, "edit");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({
          status: "edited_and_approved",
          body: input.body,
          // Preserve the first-ever draft. If the row was already edited, keep
          // the original; otherwise snapshot the current body.
          originalBody: existing.originalBody ?? existing.body,
          approvedAt: new Date(),
        })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  snooze: protectedProcedure
    .input(messageSnoozeSchema)
    .mutation(async ({ ctx, input }) => {
      await loadActionable(ctx.db, input.id, "snooze");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({ status: "snoozed", snoozedUntil: input.snoozedUntil })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  dismiss: protectedProcedure
    .input(messageDismissSchema)
    .mutation(async ({ ctx, input }) => {
      await loadActionable(ctx.db, input.id, "dismiss");
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({ status: "dismissed" })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),
});
