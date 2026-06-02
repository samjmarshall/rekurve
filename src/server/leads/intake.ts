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

type LeadStage = "unqualified" | "nurture" | "warm" | "hot";

function buildStageChangedEvent(
  leadId: string,
  userId: string,
  fromStage: LeadStage | null,
  toStage: LeadStage,
) {
  if (fromStage === toStage) return null;
  return buildOutboxEvent(OUTBOX_EVENTS.LEAD_STAGE_CHANGED, {
    leadId,
    userId,
    fromStage,
    toStage,
  });
}

export async function captureLeadFromHubspot(
  db: Db,
  hubspotContactId: string,
  properties: Partial<typeof leads.$inferSelect>,
  ctx: IntakeCtx,
): Promise<typeof leads.$inferSelect> {
  const existing = await db.query.leads.findFirst({
    where: eq(leads.hubspotContactId, hubspotContactId),
    columns: { id: true, leadStage: true },
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

  const capturedEvt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_CAPTURED, {
    leadId,
    userId: ctx.userId,
    hubspotSync: false,
  });

  const stageEvt = buildStageChangedEvent(
    leadId,
    ctx.userId,
    existing?.leadStage ?? null,
    scoreResult.stage,
  );

  const stmt = db
    .insert(leads)
    .values(record as typeof leads.$inferInsert)
    .onConflictDoUpdate({
      target: leads.hubspotContactId,
      set: record as Partial<typeof leads.$inferInsert>,
    })
    .returning();

  const batchItems: Parameters<typeof db.batch>[0] = stageEvt
    ? [stmt, capturedEvt.query, stageEvt.query]
    : [stmt, capturedEvt.query];
  const [[lead]] = await db.batch(batchItems);

  const postCommitEvents = [
    {
      id: capturedEvt.id,
      name: capturedEvt.eventName,
      data: capturedEvt.payload,
    },
    ...(stageEvt
      ? [{ id: stageEvt.id, name: stageEvt.eventName, data: stageEvt.payload }]
      : []),
  ];
  await sendPostCommit(postCommitEvents);
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
        columns: { id: true, leadStage: true },
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

  const capturedEvt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_CAPTURED, {
    leadId,
    userId: ctx.userId,
  });

  const stageEvt = buildStageChangedEvent(
    leadId,
    ctx.userId,
    existing?.leadStage ?? null,
    scoreResult.stage,
  );

  const batchItems: Parameters<typeof db.batch>[0] = stageEvt
    ? [stmt, capturedEvt.query, stageEvt.query]
    : [stmt, capturedEvt.query];
  const [[lead]] = await db.batch(batchItems);

  const postCommitEvents = [
    {
      id: capturedEvt.id,
      name: capturedEvt.eventName,
      data: capturedEvt.payload,
    },
    ...(stageEvt
      ? [
          {
            id: stageEvt.id,
            name: stageEvt.eventName,
            data: stageEvt.payload,
          },
        ]
      : []),
  ];
  await sendPostCommit(postCommitEvents);

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
  let newStage: LeadStage | undefined;
  if (hasQualificationChange) {
    const merged = { ...existing, ...input };
    const result = qualifyAndScore(merged as typeof existing);
    newStage = result.stage;
    scoreFields = {
      leadScore: result.score,
      leadStage: result.stage,
      scoreMetadata: { ...result, scoredAt: new Date().toISOString() },
    };
  }

  const updatedEvt = buildOutboxEvent(OUTBOX_EVENTS.LEAD_UPDATED, {
    leadId: id,
    userId: ctx.userId,
  });

  const stageEvt =
    newStage !== undefined
      ? buildStageChangedEvent(id, ctx.userId, existing.leadStage, newStage)
      : null;

  const batchItems: Parameters<typeof db.batch>[0] = stageEvt
    ? [
        db
          .update(leads)
          .set({ ...input, ...scoreFields, updatedAt: new Date() })
          .where(eq(leads.id, id))
          .returning(),
        updatedEvt.query,
        stageEvt.query,
      ]
    : [
        db
          .update(leads)
          .set({ ...input, ...scoreFields, updatedAt: new Date() })
          .where(eq(leads.id, id))
          .returning(),
        updatedEvt.query,
      ];

  const [[updated]] = await db.batch(batchItems);

  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }

  const postCommitEvents = [
    {
      id: updatedEvt.id,
      name: updatedEvt.eventName,
      data: updatedEvt.payload,
    },
    ...(stageEvt
      ? [
          {
            id: stageEvt.id,
            name: stageEvt.eventName,
            data: stageEvt.payload,
          },
        ]
      : []),
  ];
  await sendPostCommit(postCommitEvents);

  return updated;
}
