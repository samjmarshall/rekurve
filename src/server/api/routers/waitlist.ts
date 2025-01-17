import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

import { TRPCError } from "@trpc/server"
import { env } from "~/env"
import { eq } from "drizzle-orm"
import logger from "~/server/logger"
import { verifyRecaptcha } from "~/server/recaptcha"
import { waitlist } from "~/server/db/schema"
import { z } from "zod"

export const waitlistRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const recaptcha = await verifyRecaptcha(input.token)

      if (!recaptcha.success || recaptcha.score < env.RECAPTCHA_THRESHOLD) {
        logger.warn({
          request: "waitlist.signUp",
          code: "UNAUTHORIZED",
          recaptcha,
        })
        throw new TRPCError({ code: "UNAUTHORIZED" })
      }

      try {
        const exists = await ctx.db
          .select()
          .from(waitlist)
          .where(eq(waitlist.email, input.email.toLowerCase().trim()))

        if (exists.length > 0) {
          return
        }

        await ctx.db.insert(waitlist).values({
          email: input.email.toLowerCase().trim(),
        })
      } catch (error: unknown) {
        logger.error({
          request: "waitlist.signUp",
          message: error instanceof Error ? error.message : "Unknown error",
          data: error,
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      }
    }),
  addDetails: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2).max(256),
        company: z.string().min(2).max(256),
        problems: z.string().optional(),
        solutions: z.string().optional(),
        token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const recaptcha = await verifyRecaptcha(input.token)

      if (!recaptcha.success || recaptcha.score < env.RECAPTCHA_THRESHOLD) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
      }

      try {
        await ctx.db
          .update(waitlist)
          .set({
            name: input.name,
            company: input.company,
            problems: input.problems,
            solutions: input.solutions,
          })
          .where(eq(waitlist.email, input.email.toLowerCase().trim()))
      } catch (error: unknown) {
        logger.error({
          request: "waitlist.addDetails",
          message: error instanceof Error ? error.message : "Unknown error",
          data: error,
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      }
    }),
})
