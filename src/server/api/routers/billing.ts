import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc"
import { stripe, stripePriceMap } from "~/server/stripe"

import { TRPCError } from "@trpc/server"
import { env } from "~/env"
import { eq } from "drizzle-orm"
import logger from "~/server/logger"
import { users } from "~/server/db/schema"
import { z } from "zod"

export const billingRouter = createTRPCRouter({
  userHasSubscription: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.email) {
      try {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.email, ctx.session.user.email),
        })

        if (user?.stripe_customer_id) {
          const subscriptions = await stripe.subscriptions.list({
            customer: String(user.stripe_customer_id),
          })

          return subscriptions.data.length > 0
        }
      } catch (error: unknown) {
        logger.error({
          request: "billing.userHasSubscription",
          message: error instanceof Error ? error.message : "Unknown error",
          data: error,
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      }
    }

    return false
  }),
  userSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.email) {
      try {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.email, ctx.session.user.email),
        })

        if (user?.stripe_customer_id) {
          const subscriptions = await stripe.subscriptions.list({
            customer: String(user.stripe_customer_id),
          })

          return subscriptions.data
        }
      } catch (error: unknown) {
        logger.error({
          request: "billing.userSubscription",
          message: error instanceof Error ? error.message : "Unknown error",
          data: error,
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      }
    }

    return []
  }),
  generateCheckoutLink: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["Basic", "Pro", "Enterprise"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.email) {
        try {
          const user = await ctx.db.query.users.findFirst({
            where: eq(users.email, ctx.session.user.email),
          })

          if (user?.stripe_customer_id) {
            const price = stripePriceMap[input.plan]
            const session = await stripe.checkout.sessions.create({
              mode: "subscription",
              payment_method_types: ["card"],
              line_items: [
                {
                  price,
                  quantity: 1,
                },
              ],
              customer: String(user.stripe_customer_id),
              success_url: `${env.BASE_URL}/dashboard`,
              cancel_url: `${env.BASE_URL}/onboarding/${input.plan.toLowerCase()}`,
            })
            logger.debug({
              request: "billing.generateCheckoutLink",
              message: "Checkout session created",
              data: session,
            })

            return session.url
          }
        } catch (error: unknown) {
          logger.error({
            request: "billing.generateCheckoutLink",
            message: error instanceof Error ? error.message : "Unknown error",
            data: error,
          })

          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
        }
      }
    }),
  generateCustomerPortalLink: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.email) {
      try {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.email, ctx.session.user.email),
        })

        if (user?.stripe_customer_id) {
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: env.BASE_URL + "/dashboard",
          })
          return portalSession.url
        }
      } catch (error: unknown) {
        logger.error({
          request: "billing.generateCustomerPortalLink",
          message: error instanceof Error ? error.message : "Unknown error",
          data: error,
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      }
    }
  }),
  createCustomerIfNull: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.email) {
      try {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.email, ctx.session.user.email),
        })

        if (!user) {
          return
        }

        if (!user.stripe_customer_id) {
          const customer = await stripe.customers.create({
            email: String(user?.email),
          })

          await ctx.db
            .update(users)
            .set({ stripe_customer_id: customer.id })
            .where(eq(users.email, user.email))
        }
      } catch (error: unknown) {
        logger.error({
          request: "billing.createCustomerIfNull",
          message: error instanceof Error ? error.message : "Unknown error",
          data: error,
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      }
    }
  }),
})