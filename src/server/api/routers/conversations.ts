import { desc, eq } from "drizzle-orm";
import { conversationsListSchema } from "~/server/api/schemas/conversations";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { conversations, messageQueue } from "~/server/db/schema";

export const conversationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(conversationsListSchema)
    .query(async ({ ctx, input }) => {
      return await ctx.db
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
        .leftJoin(
          messageQueue,
          eq(conversations.messageQueueId, messageQueue.id),
        )
        .where(eq(conversations.leadId, input.leadId))
        .orderBy(desc(conversations.createdAt));
    }),
});
