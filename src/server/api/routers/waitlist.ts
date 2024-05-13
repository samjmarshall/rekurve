import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

import { eq } from "drizzle-orm";
import { waitlist } from "~/server/db/schema";
import { z } from "zod";

export const waitlistRouter = createTRPCRouter({
  addEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.select().from(waitlist).where(eq(waitlist.email, input.email.toLowerCase().trim()))

      if (exists.length > 0) {
        return
      }

      await ctx.db.insert(waitlist).values({
        email: input.email.toLowerCase().trim(),
      });
    }),
  addDetails: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(2).max(256),
      company: z.string().min(2).max(256),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(waitlist).set({ name: input.name, company: input.company, message: input.message }).where(eq(waitlist.email, input.email.toLowerCase().trim()));
    }),
});
