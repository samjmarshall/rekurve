import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  leadCreateSchema,
  leadFilterSchema,
  leadUpdateSchema,
} from "~/server/api/schemas/leads";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads } from "~/server/db/schema";

export const leadsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(leadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .insert(leads)
        .values({
          ...input,
          leadStage: "unqualified",
          leadScore: 0,
        })
        .returning();
      return lead!;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: eq(leads.id, input.id),
      });
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      return lead;
    }),

  list: protectedProcedure
    .input(leadFilterSchema)
    .query(async ({ ctx, input }) => {
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        stage,
        constructionTimeline,
        preferredEstate,
        fhogEligible,
      } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (stage) conditions.push(eq(leads.leadStage, stage));
      if (constructionTimeline)
        conditions.push(eq(leads.constructionTimeline, constructionTimeline));
      if (fhogEligible)
        conditions.push(eq(leads.propertyType, "first_home_buyer"));
      if (preferredEstate)
        conditions.push(
          sql`${preferredEstate} = ANY(${leads.preferredEstates})`,
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderFn = sortOrder === "asc" ? asc : desc;

      const [items, countResult] = await Promise.all([
        ctx.db.query.leads.findMany({
          where,
          orderBy: orderFn(leads[sortBy]),
          limit,
          offset,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(where),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  update: protectedProcedure
    .input(leadUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [updated] = await ctx.db
        .update(leads)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(leads)
        .where(eq(leads.id, input.id))
        .returning({ id: leads.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      return deleted;
    }),

  getByStage: protectedProcedure.query(async ({ ctx }) => {
    const allLeads = await ctx.db.query.leads.findMany({
      orderBy: desc(leads.leadScore),
    });

    return {
      unqualified: allLeads.filter((l) => l.leadStage === "unqualified"),
      nurture: allLeads.filter((l) => l.leadStage === "nurture"),
      warm: allLeads.filter((l) => l.leadStage === "warm"),
      hot: allLeads.filter((l) => l.leadStage === "hot"),
    };
  }),
});
