import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  leadCreateSchema,
  leadFilterSchema,
  leadUpdateSchema,
  pipelineFiltersSchema,
} from "~/server/api/schemas/leads";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads } from "~/server/db/schema";
import {
  createContact,
  findExistingContact,
  PROPERTY_MAP,
  updateContact as updateHubSpotContact,
} from "~/server/hubspot";
import type { ScoreMetadata } from "~/server/scoring";
import { qualifyAndScore } from "~/server/scoring";

/**
 * Synchronously re-score a lead, persist the new score/stage/metadata, and
 * push the score/stage to HubSpot if linked. Returns the fully-scored row so
 * callers can send an authoritative response back to the client.
 *
 * Scoring and the score write propagate errors. HubSpot push errors are
 * logged, not thrown — scoring must not fail because of a CRM outage.
 */
async function scoreLead(
  db: typeof import("~/server/db").db,
  lead: typeof leads.$inferSelect,
  hubspotContactId: string | null,
): Promise<typeof leads.$inferSelect> {
  const result = qualifyAndScore(lead);
  const metadata: ScoreMetadata = {
    ...result,
    scoredAt: new Date().toISOString(),
  };

  const [scored] = await db
    .update(leads)
    .set({
      leadScore: result.score,
      leadStage: result.stage,
      scoreMetadata: metadata,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id))
    .returning();

  if (hubspotContactId) {
    await updateHubSpotContact(hubspotContactId, {
      leadScore: String(result.score),
      leadStage: result.stage,
    }).catch((err) => {
      console.error(`[scoring] HubSpot sync failed for lead ${lead.id}:`, err);
    });
  }

  return scored!;
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
]);

export const leadsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(leadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Extract HubSpot-mapped fields from input
      const hubspotData: Record<string, string | boolean | null> = {};
      for (const key of Object.keys(input) as Array<keyof typeof input>) {
        if (key in PROPERTY_MAP && input[key] != null) {
          hubspotData[key] = input[key] as string | boolean | null;
        }
      }

      // 2. Dedup: search HubSpot for existing contact by email/phone
      const existing = await findExistingContact(input.email, input.phone);
      const hubspotContact = existing
        ? await updateHubSpotContact(existing.id, hubspotData)
        : await createContact(hubspotData);

      // 3. Write to local DB with hubspotContactId
      let lead: typeof leads.$inferSelect;
      try {
        const [inserted] = await ctx.db
          .insert(leads)
          .values({
            ...input,
            hubspotContactId: hubspotContact.id,
            leadStage: "unqualified",
            leadScore: 0,
          })
          .returning();
        lead = inserted!;
      } catch (err) {
        const cause = err instanceof Error ? err.cause : undefined;
        console.error(
          `[leads.create] local insert failed for HubSpot contact ${hubspotContact.id}:`,
          err,
          "cause:",
          cause,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Lead saved to HubSpot (contact ID: ${hubspotContact.id}) but local save failed. Retry or check HubSpot.`,
        });
      }

      // 4. Score synchronously so the response reflects the final score/stage
      return await scoreLead(ctx.db, lead, lead.hubspotContactId);
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

      // Fetch the lead to get its hubspotContactId
      const existing = await ctx.db.query.leads.findFirst({
        where: eq(leads.id, id),
        columns: { hubspotContactId: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      // Write mapped fields to HubSpot first (if linked)
      if (existing.hubspotContactId) {
        const hubspotData: Record<string, string | boolean | null> = {};
        for (const key of Object.keys(data) as Array<keyof typeof data>) {
          if (key in PROPERTY_MAP && data[key] !== undefined) {
            hubspotData[key] = data[key] as string | boolean | null;
          }
        }
        if (Object.keys(hubspotData).length > 0) {
          await updateHubSpotContact(existing.hubspotContactId, hubspotData);
        }
      }

      // Update local DB
      const [updated] = await ctx.db
        .update(leads)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      // Re-score if qualification fields changed — awaited so the returned
      // row always reflects the latest score/stage/scoreMetadata.
      const hasQualificationChange = Object.keys(data).some((k) =>
        SCORING_FIELDS.has(k),
      );
      if (hasQualificationChange) {
        return await scoreLead(ctx.db, updated, updated.hubspotContactId);
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

  getByStage: protectedProcedure
    .input(pipelineFiltersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.constructionTimeline)
        conditions.push(
          eq(leads.constructionTimeline, input.constructionTimeline),
        );
      if (input?.fhogEligible)
        conditions.push(eq(leads.propertyType, "first_home_buyer"));
      if (input?.preferredEstate)
        conditions.push(
          sql`${input.preferredEstate} = ANY(${leads.preferredEstates})`,
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const allLeads = await ctx.db.query.leads.findMany({
        where,
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
