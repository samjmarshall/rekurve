import { eq } from "drizzle-orm";
import { inngest } from "~/inngest/client";
import { resolveWorkerDraftFn } from "~/server/ai/stub";
import { db } from "~/server/db";
import { leads, messageQueue } from "~/server/db/schema";
import { rhythmForStage } from "~/server/nurture/rhythm";
import { OUTBOX_EVENTS } from "~/server/outbox";

export const NURTURE_EVENTS = {
  FOLLOWUP_DRAFTED: "nurture.followup-message-drafted",
  PLAN_PAUSED: "nurture.plan-paused",
} as const;

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
  waitForEvent: (
    id: string,
    opts: { event: string; match: string; timeout: string },
  ) => Promise<unknown>;
};

export async function runNurturePlan(
  event: { data: { leadId: string } },
  step: Step,
): Promise<void> {
  const { leadId } = event.data;

  for (let i = 0; ; i++) {
    const lead = await step.run(`load-lead-${i}`, () =>
      db.query.leads.findFirst({ where: eq(leads.id, leadId) }),
    );
    if (!lead) return;

    const rhythm = rhythmForStage(lead.leadStage);
    if (!rhythm) return; // hot stage — no scheduling

    const changed = await step.waitForEvent(`wait-stage-change-${i}`, {
      event: OUTBOX_EVENTS.LEAD_STAGE_CHANGED,
      match: "data.leadId",
      timeout: rhythm.duration,
    });

    if (changed) return; // superseded — new instance queued behind concurrency key

    // Timeout: draft + enqueue + emit, then loop
    const draft = await step.run(`draft-followup-${i}`, () =>
      resolveWorkerDraftFn()({ lead }),
    );

    const msgId = await step.run(`enqueue-followup-${i}`, () =>
      db
        .insert(messageQueue)
        .values({
          leadId,
          channel: draft.channel,
          subject: draft.subject,
          body: draft.body,
          aiReasoning: draft.aiReasoning,
          priority: draft.priority,
          status: "pending",
        })
        .returning({ id: messageQueue.id })
        .then(([row]) => row!.id),
    );

    await step.run(`emit-drafted-${i}`, () =>
      inngest.send({
        name: NURTURE_EVENTS.FOLLOWUP_DRAFTED,
        data: { leadId, messageId: msgId },
      }),
    );
  }
}

export const nurturePlanRunner = inngest.createFunction(
  {
    id: "nurture-plan-runner",
    triggers: [{ event: OUTBOX_EVENTS.LEAD_STAGE_CHANGED }],
    concurrency: [{ key: "event.data.leadId", limit: 1 }],
    retries: 8,
    onFailure: async ({ event }) => {
      const leadId = (
        event as unknown as { data: { event: { data: { leadId: string } } } }
      ).data.event.data.leadId;
      await inngest.send({
        name: NURTURE_EVENTS.PLAN_PAUSED,
        data: { leadId },
      });
    },
  },
  ({ event, step }) =>
    runNurturePlan(event as unknown as { data: { leadId: string } }, step),
);
