import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  pauseSequenceSchema,
  resumeSequenceSchema,
  startSequenceSchema,
} from "~/server/api/schemas/nurture";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { nurtureSequences } from "~/server/db/schema";
import { computeNextStepAt } from "~/server/nurture/scheduler";

export const nurtureRouter = createTRPCRouter({
  listActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.nurtureSequences.findMany({
      where: eq(nurtureSequences.status, "active"),
    });
  }),

  startSequence: protectedProcedure
    .input(startSequenceSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.nurtureSequences.findFirst({
        where: and(
          eq(nurtureSequences.leadId, input.leadId),
          eq(nurtureSequences.status, "active"),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An active sequence already exists for this lead",
        });
      }

      const [inserted] = await ctx.db
        .insert(nurtureSequences)
        .values({
          leadId: input.leadId,
          sequenceType: input.sequenceType,
          status: "active",
          nextStepAt: computeNextStepAt(input.sequenceType),
        })
        .returning();

      return inserted!;
    }),

  pauseSequence: protectedProcedure
    .input(pauseSequenceSchema)
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.query.nurtureSequences.findFirst({
        where: eq(nurtureSequences.id, input.id),
      });

      if (!seq) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sequence not found",
        });
      }

      if (seq.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot pause a sequence with status '${seq.status}'`,
        });
      }

      const [updated] = await ctx.db
        .update(nurtureSequences)
        .set({ status: "paused", nextStepAt: null, updatedAt: new Date() })
        .where(eq(nurtureSequences.id, input.id))
        .returning();

      return updated!;
    }),

  resumeSequence: protectedProcedure
    .input(resumeSequenceSchema)
    .mutation(async ({ ctx, input }) => {
      const seq = await ctx.db.query.nurtureSequences.findFirst({
        where: eq(nurtureSequences.id, input.id),
      });

      if (!seq) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sequence not found",
        });
      }

      if (seq.status !== "paused") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot resume a sequence with status '${seq.status}'`,
        });
      }

      const [updated] = await ctx.db
        .update(nurtureSequences)
        .set({
          status: "active",
          nextStepAt: computeNextStepAt(seq.sequenceType),
          updatedAt: new Date(),
        })
        .where(eq(nurtureSequences.id, input.id))
        .returning();

      return updated!;
    }),
});
