import { and, eq, sql } from "drizzle-orm";

import type { DraftMessageInput, DraftMessageOutput } from "~/server/ai/schema";
import type { SequenceType } from "~/server/api/schemas/nurture";
import { leads, messageQueue, nurtureSequences } from "~/server/db/schema";

type Db = typeof import("~/server/db").db;
type LeadStage = "unqualified" | "nurture" | "warm" | "hot";
type DraftFn = (input: DraftMessageInput) => Promise<DraftMessageOutput>;

export const SEQUENCE_TYPE_BY_STAGE: Record<LeadStage, SequenceType | null> = {
  unqualified: "discovery",
  nurture: "nurture",
  warm: "warm_progression",
  hot: null,
};

export const CADENCE_DAYS: Record<SequenceType, number> = {
  discovery: 3,
  nurture: 14,
  warm_progression: 7,
  lot_alert: 7,
};

const MS_PER_DAY = 86_400_000;

export function computeNextStepAt(
  sequenceType: SequenceType,
  from = new Date(),
): Date {
  return new Date(from.getTime() + CADENCE_DAYS[sequenceType] * MS_PER_DAY);
}

export async function startOrUpdateSequence(
  db: Db,
  leadId: string,
  stage: LeadStage,
): Promise<void> {
  if (stage === "hot") {
    await db
      .update(nurtureSequences)
      .set({ status: "completed", nextStepAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(nurtureSequences.leadId, leadId),
          eq(nurtureSequences.status, "active"),
        ),
      );
    return;
  }

  const sequenceType = SEQUENCE_TYPE_BY_STAGE[stage]!;

  const existing = await db.query.nurtureSequences.findFirst({
    where: and(
      eq(nurtureSequences.leadId, leadId),
      eq(nurtureSequences.status, "active"),
    ),
  });

  if (!existing) {
    await db.insert(nurtureSequences).values({
      leadId,
      sequenceType,
      status: "active",
      nextStepAt: computeNextStepAt(sequenceType),
    });
    return;
  }

  if (existing.sequenceType !== sequenceType) {
    await db
      .update(nurtureSequences)
      .set({
        sequenceType,
        nextStepAt: computeNextStepAt(sequenceType),
        updatedAt: new Date(),
      })
      .where(eq(nurtureSequences.id, existing.id));
  }
}

export async function runSchedulerTick(
  db: Db,
  draftFn?: DraftFn,
): Promise<{ drafted: number; failed: number }> {
  const draft =
    draftFn ?? (await import("~/server/ai/draft-message")).draftMessage;

  const dueRows = await db
    .select({ seq: nurtureSequences, lead: leads })
    .from(nurtureSequences)
    .innerJoin(leads, eq(nurtureSequences.leadId, leads.id))
    .where(
      and(
        eq(nurtureSequences.status, "active"),
        sql`${nurtureSequences.nextStepAt} <= now()`,
      ),
    );

  let drafted = 0;
  let failed = 0;

  for (const { seq, lead } of dueRows) {
    try {
      const result = await draft({ lead });
      await db.insert(messageQueue).values({
        leadId: lead.id,
        channel: result.channel,
        subject: result.subject,
        body: result.body,
        aiReasoning: result.aiReasoning,
        priority: result.priority,
        status: "pending",
      });
      drafted++;
    } catch (err) {
      console.error(
        `[nurture-scheduler] draftMessage failed for sequence ${seq.id}:`,
        err,
      );
      failed++;
    }

    // Always advance nextStepAt — prevents a failing row from blocking the tick
    await db
      .update(nurtureSequences)
      .set({
        nextStepAt: computeNextStepAt(seq.sequenceType),
        updatedAt: new Date(),
      })
      .where(eq(nurtureSequences.id, seq.id));
  }

  return { drafted, failed };
}
