import "server-only";

import { inngest } from "~/inngest/client";
import type { DraftFn } from "~/server/ai/ai.module";
import type {
  EventName,
  EventPayload,
  SendEvent,
} from "~/server/inngest/events";
import type { LeadRow } from "~/server/leads/leads.schema";
import { OUTBOX_EVENTS } from "~/server/outbox";
import { rhythmForStage } from "./rhythm";

// `satisfies` pins each name to an EVENT_REGISTRY key (adr019 clause 7) —
// type-only, so no runtime dep on the registry module. Module-private: the
// only consumers are this file's emit steps (tests pin the raw wire strings).
const NURTURE_EVENTS = {
  FOLLOWUP_DRAFTED: "nurture.followup-message-drafted",
  PLAN_PAUSED: "nurture.plan-paused",
} as const satisfies Record<string, EventName>;

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
  waitForEvent: (
    id: string,
    opts: { event: string; match: string; timeout: string },
  ) => Promise<unknown>;
};

// Worker port surface (adr020): the lead read comes from leadsModule.service,
// the draft enqueue from messagingModule.service (the message_queue write door
// lives in messaging), the draft fn from aiModule, and sendEvent wraps
// inngest.send. All injected through the factory so tests assert against a
// fake deps object, not module mocks.
export type NurturePlanRunnerDeps = {
  /** leads port (leadsModule.service.getById): the full lead row — leadStage
   * drives the rhythm and the row feeds the draft fn. Undefined → plan ends
   * (lead deleted). */
  getLead: (id: string) => Promise<LeadRow | undefined>;
  /** messaging port (messagingModule.service.enqueueDraft): inserts the
   * pending message_queue row (same column set as the former inline insert)
   * and returns only the id — the Inngest-memoised step value. */
  enqueueDraft: (draft: {
    leadId: string;
    channel: "sms" | "email";
    subject: string | null;
    body: string;
    aiReasoning: string | null;
    priority: number;
  }) => Promise<{ id: string }>;
  /** ai port: the composition root preserves per-invocation
   * resolveWorkerDraftFn() resolution, so the AI_STUB env gate is read at
   * draft time, exactly as the pre-split inline call did. */
  draftFn: DraftFn;
  /** Correlated send port (SendEvent): name↔payload pinned as a pair — this
   * direct inngest.send path bypasses buildOutboxEvent's write-time parse. */
  sendEvent: SendEvent;
};

/**
 * The per-lead nurture plan: an infinite loop that re-reads the lead, waits
 * out the stage's rhythm, and on timeout drafts + enqueues a follow-up and
 * emits `nurture.followup-message-drafted`, then loops. A stage-change event
 * arriving mid-wait supersedes the run (the new instance queues behind the
 * per-lead concurrency key); a hot or deleted lead ends the plan.
 *
 * Step ids are FROZEN (Inngest memoisation keys — in-flight runs replay
 * against them), loop-indexed: load-lead-{i}, wait-stage-change-{i},
 * draft-followup-{i}, enqueue-followup-{i}, emit-drafted-{i}. The wait
 * timeout derives from rhythmForStage (NURTURE_TEST_RHYTHM override outside
 * production).
 */
export function makeRunNurturePlan(deps: NurturePlanRunnerDeps) {
  return async function runNurturePlan(
    event: { data: { leadId: string } },
    step: Step,
  ): Promise<void> {
    const { leadId } = event.data;

    for (let i = 0; ; i++) {
      const lead = await step.run(`load-lead-${i}`, () => deps.getLead(leadId));
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
        deps.draftFn({ lead }),
      );

      const msgId = await step.run(`enqueue-followup-${i}`, () =>
        deps
          .enqueueDraft({
            leadId,
            channel: draft.channel,
            subject: draft.subject,
            body: draft.body,
            aiReasoning: draft.aiReasoning,
            priority: draft.priority,
          })
          .then((row) => row.id),
      );

      await step.run(`emit-drafted-${i}`, () =>
        deps.sendEvent({
          name: NURTURE_EVENTS.FOLLOWUP_DRAFTED,
          data: { leadId, messageId: msgId },
        }),
      );
    }
  };
}

// Thin Inngest adapter factory: real deps are wired by the workers composition
// root (nurture.workers.ts), which exposes the built function as
// nurtureWorkers.nurturePlanRunner. Config is byte-stable — id, trigger,
// concurrency key/limit, retries, and onFailure presence are pinned by the
// registry golden test; exhausted retries emit nurture.plan-paused with the
// original leadId.
export function makeNurturePlanRunner(deps: NurturePlanRunnerDeps) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunNurturePlan(deps);
  return inngest.createFunction(
    {
      id: "nurture-plan-runner",
      triggers: [{ event: OUTBOX_EVENTS.LEAD_STAGE_CHANGED }],
      concurrency: [{ key: "event.data.leadId", limit: 1 }],
      retries: 8,
      onFailure: async ({ event }) => {
        const leadId = (
          event as unknown as { data: { event: { data: { leadId: string } } } }
        ).data.event.data.leadId;
        await deps.sendEvent({
          name: NURTURE_EVENTS.PLAN_PAUSED,
          data: { leadId },
        });
      },
    },
    // The shared Inngest client is untyped (typed schemas are a PR-6 concern);
    // the trigger config pins the event name, so narrow `data` to the registry
    // payload (adr019 clause 7 — the single payload authority) once at the
    // boundary — no `as unknown as` double-cast.
    ({ event, step }) =>
      run({ data: event.data as EventPayload<"lead.stage-changed"> }, step),
  );
}
