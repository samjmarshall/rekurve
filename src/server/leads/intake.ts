import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { LeadCreate, LeadUpdate } from "~/server/api/schemas/leads";
import type { db } from "~/server/db";
import { leads } from "~/server/db/schema";
import {
  buildOutboxEvent,
  OUTBOX_EVENTS,
  sendPostCommit,
} from "~/server/outbox";
import type { ScoreMetadata } from "~/server/scoring";
import { qualifyAndScore } from "~/server/scoring";

export async function captureLeadFromHubspot(
  db: Db,
  hubspotContactId: string,
  properties: Partial<typeof leads.$inferSelect>,
  ctx: IntakeCtx,
): Promise<typeof leads.$inferSelect> {
  const existing = await db.query.leads.findFirst({
    where: eq(leads.hubspotContactId, hubspotContactId),
    columns: { id: true },
  });
  const leadId = existing?.id ?? crypto.randomUUID();

  const firstName = properties.firstName ?? "Unknown";
  const lastName = properties.lastName ?? "Unknown";
  const input = { ...properties, firstName, lastName };
  const scoreResult = qualifyAndScore(input);
  const scoreMetadata: ScoreMetadata = {
    ...scoreResult,
    scoredAt: new Date().toISOString(),
  };

  const record = {
    id: leadId,
    hubspotContactId,
    ...properties,
    firstName,
    lastName,
    leadScore: scoreResult.score,
    leadStage: scoreResult.stage,
    scoreMetadata,
    updatedAt: new Date(),
  };

  const evt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_CAPTURED, {
    leadId,
    userId: ctx.userId,
    hubspotSync: false,
  });

  const stmt = db
    .insert(leads)
    .values(record as typeof leads.$inferInsert)
    .onConflictDoUpdate({
      target: leads.hubspotContactId,
      set: record as Partial<typeof leads.$inferInsert>,
    })
    .returning();

  const [[lead]] = await db.batch([stmt, evt.query]);
  await sendPostCommit([
    { id: evt.id, name: evt.eventName, data: evt.payload },
  ]);
  return lead!;
}

type Db = typeof db;

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
  const existing = input.email
    ? await db.query.leads.findFirst({
        where: eq(leads.email, input.email),
        columns: { id: true },
      })
    : undefined;

  const leadId = existing?.id ?? crypto.randomUUID();
  const scoreResult = qualifyAndScore(input);
  const scoreMetadata: ScoreMetadata = {
    ...scoreResult,
    scoredAt: new Date().toISOString(),
  };
  const scoreFields = {
    leadScore: scoreResult.score,
    leadStage: scoreResult.stage,
    scoreMetadata,
  };

  const stmt = existing
    ? db
        .update(leads)
        .set({ ...input, ...scoreFields, updatedAt: new Date() })
        .where(eq(leads.id, existing.id))
        .returning()
    : db
        .insert(leads)
        .values({ id: leadId, ...input, ...scoreFields })
        .returning();

  const evt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_CAPTURED, {
    leadId,
    userId: ctx.userId,
  });

  const [[lead]] = await db.batch([stmt, evt.query]);
  await sendPostCommit([
    { id: evt.id, name: evt.eventName, data: evt.payload },
  ]);

  return lead!;
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

  const evt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_UPDATED, {
    leadId: id,
    userId: ctx.userId,
  });

  const [[updated]] = await db.batch([
    db
      .update(leads)
      .set({ ...input, ...scoreFields, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning(),
    evt.query,
  ]);

  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }

  await sendPostCommit([
    { id: evt.id, name: evt.eventName, data: evt.payload },
  ]);

  return updated;
}
