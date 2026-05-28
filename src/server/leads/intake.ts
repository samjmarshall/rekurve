import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { LeadCreate, LeadUpdate } from "~/server/api/schemas/leads";
import { leads } from "~/server/db/schema";
import {
  createContact,
  findExistingContact,
  toContactProperties,
  updateContact,
} from "~/server/hubspot";
import { startOrUpdateSequence } from "~/server/nurture/scheduler";
import type { ScoreMetadata } from "~/server/scoring";
import { qualifyAndScore } from "~/server/scoring";

// TODO(#258): swap Db for Tx (drizzle-orm/pg-core PgTransaction) when the outbox insert lands and the driver moves to neon-serverless
type Db = typeof import("~/server/db").db;

export type IntakeCtx = { db: Db; userId: string };

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

export async function captureLead(
  db: Db,
  input: LeadCreate,
  ctx: IntakeCtx,
): Promise<typeof leads.$inferSelect> {
  const hubspotProps = toContactProperties(input);
  const existing = await findExistingContact(input.email, input.phone);
  const hubspotContact = existing
    ? await updateContact(existing.id, hubspotProps)
    : await createContact(hubspotProps);

  const scoreResult = qualifyAndScore(input);
  const scoreMetadata: ScoreMetadata = {
    ...scoreResult,
    scoredAt: new Date().toISOString(),
  };

  let lead: typeof leads.$inferSelect;
  try {
    const [inserted] = await db
      .insert(leads)
      .values({
        ...input,
        hubspotContactId: hubspotContact.id,
        leadScore: scoreResult.score,
        leadStage: scoreResult.stage,
        scoreMetadata,
      })
      .onConflictDoUpdate({
        target: leads.hubspotContactId,
        set: {
          ...input,
          hubspotContactId: hubspotContact.id,
          leadScore: scoreResult.score,
          leadStage: scoreResult.stage,
          scoreMetadata,
          updatedAt: new Date(),
        },
      })
      .returning();
    lead = inserted!;
  } catch (err) {
    const cause = err instanceof Error ? err.cause : undefined;
    console.error(
      `[intake.captureLead] local insert failed for HubSpot contact ${hubspotContact.id}:`,
      err,
      "cause:",
      cause,
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Lead saved to HubSpot (contact ID: ${hubspotContact.id}) but local save failed. Retry or check HubSpot.`,
    });
  }

  await updateContact(
    hubspotContact.id,
    toContactProperties({
      leadScore: scoreResult.score,
      leadStage: scoreResult.stage,
    }),
  ).catch((err) => {
    console.error(
      `[intake.captureLead] HubSpot score sync failed for lead ${lead.id}:`,
      err,
    );
  });

  await startOrUpdateSequence(ctx.db, lead.id, lead.leadStage).catch((err) => {
    console.error(
      `[intake.captureLead] nurture sequence start failed for lead ${lead.id}:`,
      err,
    );
  });

  return lead;
}

export async function updateLead(
  db: Db,
  id: string,
  input: Omit<LeadUpdate, "id">,
  ctx: IntakeCtx,
): Promise<typeof leads.$inferSelect> {
  const existing = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }

  if (existing.hubspotContactId) {
    const hubspotProps = toContactProperties(input);
    if (Object.keys(hubspotProps).length > 0) {
      await updateContact(existing.hubspotContactId, hubspotProps);
    }
  }

  const hasQualificationChange = Object.keys(input).some((k) =>
    SCORING_FIELDS.has(k),
  );

  let scoreFields: Partial<typeof leads.$inferInsert> = {};
  if (hasQualificationChange) {
    const merged = { ...existing, ...input };
    const result = qualifyAndScore(merged as typeof existing);
    scoreFields = {
      leadScore: result.score,
      leadStage: result.stage,
      scoreMetadata: { ...result, scoredAt: new Date().toISOString() },
    };
  }

  const [updated] = await db
    .update(leads)
    .set({ ...input, ...scoreFields, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }

  if (hasQualificationChange && updated.hubspotContactId) {
    await updateContact(
      updated.hubspotContactId,
      toContactProperties({
        leadScore: updated.leadScore,
        leadStage: updated.leadStage,
      }),
    ).catch((err) => {
      console.error(
        `[intake.updateLead] HubSpot score sync failed for lead ${updated.id}:`,
        err,
      );
    });
  }

  if (hasQualificationChange) {
    await startOrUpdateSequence(ctx.db, updated.id, updated.leadStage).catch(
      (err) => {
        console.error(
          `[intake.updateLead] nurture sequence update failed for lead ${updated.id}:`,
          err,
        );
      },
    );
  }

  return updated;
}
