import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { ScoreMetadata } from "~/server/ai/scoring";
import { qualifyAndScore } from "~/server/ai/scoring";
import {
  leadCreateSchema,
  leadFilterSchema,
  leadUpdateSchema,
} from "~/server/api/schemas/leads";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads } from "~/server/db/schema";
import { updateContact } from "~/server/hubspot/contacts";

/** Fire-and-forget scoring — errors are logged, never thrown. */
async function scoreLeadAsync(
  db: typeof import("~/server/db").db,
  leadId: string,
  lead: Parameters<typeof qualifyAndScore>[0],
  hubspotContactId: string | null,
): Promise<void> {
  try {
    const result = await qualifyAndScore(lead);

    const metadata: ScoreMetadata = {
      ...result,
      scoredAt: new Date().toISOString(),
    };

    await db
      .update(leads)
      .set({
        leadScore: result.score,
        leadStage: result.stage,
        scoreMetadata: metadata,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    if (hubspotContactId) {
      await updateContact(hubspotContactId, {
        leadScore: String(result.score),
        leadStage: result.stage,
      }).catch((err) => {
        console.error(`[scoring] HubSpot sync failed for lead ${leadId}:`, err);
      });
    }
  } catch (err) {
    console.error(`[scoring] Failed to score lead ${leadId}:`, err);
  }
}

// Qualification fields that trigger re-scoring
const SCORING_FIELDS = new Set([
  "hasLand",
  "landRegistered",
  "landAddress",
  "landSizeSqm",
  "landWidth",
  "landDepth",
  "seenBroker",
  "constructionTimeline",
  "budget",
  "propertyType",
  "preferredEstates",
  "preferredSuburbs",
  "notes",
]);

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

      // Fire-and-forget — don't block the response
      void scoreLeadAsync(ctx.db, lead!.id, lead!, lead!.hubspotContactId);

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

      // Re-score if qualification fields changed
      const hasQualificationChange = Object.keys(data).some((k) =>
        SCORING_FIELDS.has(k),
      );
      if (hasQualificationChange) {
        void scoreLeadAsync(
          ctx.db,
          updated.id,
          updated,
          updated.hubspotContactId,
        );
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
