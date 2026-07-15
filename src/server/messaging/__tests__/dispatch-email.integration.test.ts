// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { eq } from "drizzle-orm";

import { makeWaitingStep } from "~/server/inngest/__tests__/step-fake";
import {
  cleanupSeededRows,
  makeSeedIds,
  seedLeadAndMessage,
} from "./integration-fixtures";

// Integration: run the real dispatch-email worker core against Neon — real
// messagingModule.service + leadsModule.service ports, with the external I/O
// seams (ms-graph sendEmail, inngest send) injected as fakes through the
// factory and waitForEvent returning a canned engagement. Asserts the worker
// writes the conversation, stamps sentAt, and stamps hubspotActivityId end to
// end (the frozen "write-conversation" (recordEmailSend) +
// "update-message-status" (stampSent) pair must still produce exactly ONE
// conversation row — this is the idempotency proof).

describe.skipIf(!process.env.INTEGRATION_DB)(
  "runDispatchEmail (integration)",
  () => {
    const ids = makeSeedIds("disp");
    const { leadId, messageId } = ids;

    afterAll(() => cleanupSeededRows(ids));

    test("writes the conversation, sentAt, and hubspotActivityId", async () => {
      const { db } = await import("~/server/db");
      const schema = await import("~/server/messaging/messaging.schema");
      const { messagingModule } = await import(
        "~/server/messaging/messaging.module"
      );
      const { leadsModule } = await import("~/server/leads/leads.module");
      const { makeRunDispatchEmail } = await import("../dispatch-email.worker");

      const sendEmail = rs.fn().mockResolvedValue({ sentAt: new Date() });
      const sendEvent = rs.fn().mockResolvedValue(undefined);
      const runDispatchEmail = makeRunDispatchEmail({
        loadDispatchable: messagingModule.service.loadDispatchable,
        markDispatching: messagingModule.service.markDispatching,
        recordEmailSend: messagingModule.service.recordEmailSend,
        stampSent: messagingModule.service.stampSent,
        stampEngagement: messagingModule.service.stampEngagement,
        resolveOwnerUserId: leadsModule.service.resolveOwnerUserId,
        getLeadContact: leadsModule.service.getLeadContact,
        sendEmail,
        sendEvent,
      });

      // Seed: user (so resolveOwnerUserId resolves) → lead → approved email.
      await seedLeadAndMessage(
        ids,
        {
          channel: "email",
          subject: "Dispatch subject",
          body: "Dispatch body",
          status: "approved",
        },
        { withUser: true },
      );

      const step = makeWaitingStep({
        data: { correlationId: messageId, hubspotActivityId: "hs-eng-int" },
      });

      await runDispatchEmail(
        {
          data: {
            messageId,
            correlationId: messageId,
            channel: "email",
            leadId,
            body: "Dispatch body",
          },
        },
        step as never,
      );

      expect(sendEmail).toHaveBeenCalledOnce();

      const convs = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.messageQueueId, messageId));
      expect(convs).toHaveLength(1);
      expect(convs[0]!.direction).toBe("outbound");
      expect(convs[0]!.deliveryMethod).toBe("email");
      expect(convs[0]!.hubspotActivityId).toBe("hs-eng-int");

      const [msg] = await db
        .select({ sentAt: schema.messageQueue.sentAt })
        .from(schema.messageQueue)
        .where(eq(schema.messageQueue.id, messageId));
      expect(msg!.sentAt).not.toBeNull();
    });
  },
);
