import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc"

import { eq } from "drizzle-orm"
import { users } from "~/server/db/schema"
import { z } from "zod"

export const userRouter = createTRPCRouter({
  deleteStripeCustomerId: protectedProcedure
    .input(
      z.object({
        stripeCustomerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(users)
        .set({ stripe_customer_id: null })
        .where(eq(users.stripe_customer_id, input.stripeCustomerId))
    }),
})
