// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { eq, inArray } from "drizzle-orm";

import { makeDraftOutput } from "~/server/ai/__tests__/fixtures";
import { makeWaitingStep } from "~/server/inngest/__tests__/step-fake";

const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

const stubDraftOutput = makeDraftOutput({
  body: `[integration-stub] body for ${RUN_ID}`,
  aiReasoning: "[integration-stub]",
});

// Integration: run the real nurture worker core against Neon — real
// leadsModule.service getLead + messagingModule.service enqueueDraft ports
// (the message_queue write door), with the AI draft fn and the inngest send
// injected as fakes through the factory. Asserts the timeout path writes
// exactly one pending message_queue row end to end.
describe.skipIf(!process.env.INTEGRATION_DB)(
  "runNurturePlan integration",
  () => {
    const createdLeadIds: string[] = [];
    const createdMessageIds: string[] = [];

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const { leads, messageQueue } = await import("~/server/db/schema");
      if (createdMessageIds.length > 0) {
        await db
          .delete(messageQueue)
          .where(inArray(messageQueue.id, createdMessageIds));
      }
      if (createdLeadIds.length > 0) {
        await db.delete(leads).where(inArray(leads.id, createdLeadIds));
      }
    });

    test("drafts on timeout — writes one pending message_queue row to Neon", async () => {
      const { db } = await import("~/server/db");
      const { leads, messageQueue } = await import("~/server/db/schema");
      const { leadsModule } = await import("~/server/leads/leads.module");
      const { messagingModule } = await import(
        "~/server/messaging/messaging.module"
      );
      const { makeRunNurturePlan } = await import("../nurture.worker");

      const sendEvent = rs.fn().mockResolvedValue(undefined);
      const runNurturePlan = makeRunNurturePlan({
        getLead: leadsModule.service.getById,
        enqueueDraft: messagingModule.service.enqueueDraft,
        draftFn: () => Promise.resolve(stubDraftOutput),
        sendEvent,
      });

      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "NurtureIntegration",
          lastName: `Runner-${RUN_ID}`,
          leadStage: "warm",
        })
        .returning();
      createdLeadIds.push(lead!.id);

      // Shared inline-run step fake: first wait times out (null), second wait
      // supersedes to terminate the loop.
      const step = makeWaitingStep(null);
      step.waitForEvent
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ data: { leadId: lead!.id } });

      await runNurturePlan({ data: { leadId: lead!.id } }, step);

      const rows = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.leadId, lead!.id));

      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe("pending");
      expect(rows[0]!.body).toContain("[integration-stub]");
      createdMessageIds.push(rows[0]!.id);

      // Delivery path preserved: the drafted event rides the worker's own
      // emit step (direct inngest send), never the outbox.
      expect(sendEvent).toHaveBeenCalledWith({
        name: "nurture.followup-message-drafted",
        data: { leadId: lead!.id, messageId: rows[0]!.id },
      });
    });
  },
);
