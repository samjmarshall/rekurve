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
import { dispatchEmail } from "~/server/dispatch/email-dispatch";

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
        or(
          and(
            eq(messageQueue.status, "pending"),
            or(
              isNull(messageQueue.snoozedUntil),
              lte(messageQueue.snoozedUntil, new Date()),
            ),
          ),
          and(
            eq(messageQueue.status, "snoozed"),
            lte(messageQueue.snoozedUntil, new Date()),
          ),
        ),
      )
      .orderBy(desc(messageQueue.priority), asc(messageQueue.createdAt));
  }),

  approve: protectedProcedure
    .input(messageApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await loadActionable(ctx.db, input.id, "approve");

      // Email dispatch runs BEFORE the status flip so that any failure
      // (token, network, API) leaves the row in its current state and the
      // user can retry from the pending list.
      if (row.channel === "email") {
        const lead = await ctx.db.query.leads.findFirst({
          where: eq(leads.id, row.leadId),
        });
        if (!lead) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lead not found",
          });
        }
        await dispatchEmail({ message: row, lead });
      }

      const now = new Date();
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({
          status: "approved",
          approvedAt: now,
          ...(row.channel === "email" ? { sentAt: now } : {}),
        })
        .where(eq(messageQueue.id, input.id))
        .returning();
      return updated!;
    }),

  editAndApprove: protectedProcedure
    .input(messageEditAndApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await loadActionable(ctx.db, input.id, "edit");

      // Email dispatch runs BEFORE the status flip — see approve for rationale.
      if (existing.channel === "email") {
        const lead = await ctx.db.query.leads.findFirst({
          where: eq(leads.id, existing.leadId),
        });
        if (!lead) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lead not found",
          });
        }
        // Dispatch with the *edited* body so the recipient sees what the user approved.
        await dispatchEmail({
          message: { ...existing, body: input.body },
          lead,
        });
      }

      const now = new Date();
      const [updated] = await ctx.db
        .update(messageQueue)
        .set({
          status: "edited_and_approved",
          body: input.body,
          // Preserve the first-ever draft. If the row was already edited, keep
          // the original; otherwise snapshot the current body.
          originalBody: existing.originalBody ?? existing.body,
          approvedAt: now,
          ...(existing.channel === "email" ? { sentAt: now } : {}),
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
