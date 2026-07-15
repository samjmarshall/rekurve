// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { eq } from "drizzle-orm";

import { makeStep } from "~/server/inngest/__tests__/step-fake";
import {
  cleanupSeededRows,
  makeSeedIds,
  seedLeadAndMessage,
} from "./integration-fixtures";

// Integration: run the real dispatch-sms worker core against Neon — real
// messagingModule.service ports, with the external I/O seam
// (sendSmsToConsultant) injected as a fake through the factory. Asserts the
// worker writes the conversation (with twilioMessageSid) and stamps sentAt end
// to end (the frozen "write-conversation" (recordSmsSend) +
// "update-message-status" (stampSent) pair must still produce exactly ONE
// conversation row — this is the idempotency proof).

describe.skipIf(!process.env.INTEGRATION_DB)(
  "runDispatchSms (integration)",
  () => {
    const ids = makeSeedIds("sms");
    const { suffix, leadId, messageId } = ids;

    afterAll(() => cleanupSeededRows(ids));

    test("writes the conversation with twilioMessageSid and stamps sentAt", async () => {
      const { db } = await import("~/server/db");
      const schema = await import("~/server/messaging/messaging.schema");
      const { messagingModule } = await import(
        "~/server/messaging/messaging.module"
      );
      const { makeRunDispatchSms } = await import("../dispatch-sms.worker");

      const sendSmsToConsultant = rs.fn().mockResolvedValue({
        sid: `SM-int-${suffix}`,
        status: "queued",
        sentAt: new Date(),
      });
      const runDispatchSms = makeRunDispatchSms({
        loadDispatchable: messagingModule.service.loadDispatchable,
        markDispatching: messagingModule.service.markDispatching,
        recordSmsSend: messagingModule.service.recordSmsSend,
        stampSent: messagingModule.service.stampSent,
        sendSmsToConsultant,
        statusCallbackUrl: "https://rekurve.localhost/api/twilio/status",
      });

      // Seed: lead → approved sms message.
      await seedLeadAndMessage(ids, {
        channel: "sms",
        subject: null,
        body: "Integration SMS body",
        status: "approved",
      });

      const step = makeStep();

      await runDispatchSms(
        {
          data: {
            messageId,
            correlationId: messageId,
            channel: "sms",
            leadId,
            body: "Integration SMS body",
          },
        },
        step as never,
      );

      expect(sendSmsToConsultant).toHaveBeenCalledOnce();

      const convs = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.messageQueueId, messageId));
      expect(convs).toHaveLength(1);
      expect(convs[0]!.direction).toBe("outbound");
      expect(convs[0]!.deliveryMethod).toBe("sms");
      expect(convs[0]!.twilioMessageSid).toBe(`SM-int-${suffix}`);

      const [msg] = await db
        .select({ sentAt: schema.messageQueue.sentAt })
        .from(schema.messageQueue)
        .where(eq(schema.messageQueue.id, messageId));
      expect(msg!.sentAt).not.toBeNull();
    });
  },
);
