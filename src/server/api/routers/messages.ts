import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import {
  messageApproveSchema,
  messageDismissSchema,
  messageEditAndApproveSchema,
  messageSnoozeSchema,
} from "~/server/api/schemas/messages";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads, messageQueue, msGraphTokens } from "~/server/db/schema";
import { dispatchEmail } from "~/server/dispatch/email-dispatch";
import { dispatchSms } from "~/server/dispatch/sms-dispatch";

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

/**
 * Like loadActionable, but also returns the joined lead row.
 * Used by approve/editAndApprove which need lead context for dispatch.
 */
async function loadActionableWithLead(
  db: typeof import("~/server/db").db,
  id: string,
  action: "approve" | "edit",
): Promise<{
  message: typeof messageQueue.$inferSelect;
  lead: typeof leads.$inferSelect;
}> {
  const message = await loadActionable(db, id, action);
  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, message.leadId),
  });
  if (!lead) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }
  return { message, lead };
}

/**
 * Check all email dispatch preconditions before the status write so that
 * failures leave the queue row at its current status rather than approved.
 */
async function checkEmailPreconditions(
  db: typeof import("~/server/db").db,
  userId: string,
  lead: typeof leads.$inferSelect,
): Promise<void> {
  if (!lead.hubspotContactId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This lead isn't synced with HubSpot yet. Contact support.",
    });
  }
  if (!lead.email) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This lead has no email address.",
    });
  }
  const token = await db.query.msGraphTokens.findFirst({
    where: eq(msGraphTokens.userId, userId),
  });
  if (!token) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect your Microsoft account to send emails.",
    });
  }
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
      const { message, lead } = await loadActionableWithLead(
        ctx.db,
        input.id,
        "approve",
      );

      if (message.channel === "email") {
        await checkEmailPreconditions(ctx.db, ctx.session.user.id, lead);
        await dispatchEmail({ db: ctx.db, ctx, message, lead });
      } else if (message.channel === "sms") {
        await dispatchSms({ db: ctx.db, message });
      }

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
      const { message: existing, lead } = await loadActionableWithLead(
        ctx.db,
        input.id,
        "edit",
      );

      if (existing.channel === "email") {
        await checkEmailPreconditions(ctx.db, ctx.session.user.id, lead);
        await dispatchEmail({
          db: ctx.db,
          ctx,
          message: { ...existing, body: input.body },
          lead,
        });
      } else if (existing.channel === "sms") {
        await dispatchSms({
          db: ctx.db,
          message: { ...existing, body: input.body },
        });
      }

      const [updated] = await ctx.db
        .update(messageQueue)
        .set({
          status: "edited_and_approved",
          body: input.body,
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
