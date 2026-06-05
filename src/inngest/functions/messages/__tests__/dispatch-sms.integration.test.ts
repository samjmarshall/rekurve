// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { eq, inArray } from "drizzle-orm";

// Integration: run the real runDispatchSms against Neon with sendSmsToConsultant
// mocked. Asserts the worker writes the conversation (with twilioMessageSid) and
// stamps sentAt end to end.

describe.skipIf(!process.env.INTEGRATION_DB)(
  "runDispatchSms (integration)",
  () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const leadId = randomUUID();
    const messageId = randomUUID();

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const schema = await import("~/server/db/schema");
      await db
        .delete(schema.conversations)
        .where(eq(schema.conversations.messageQueueId, messageId));
      await db
        .delete(schema.messageQueue)
        .where(inArray(schema.messageQueue.id, [messageId]));
      await db.delete(schema.leads).where(inArray(schema.leads.id, [leadId]));
    });

    test("writes the conversation with twilioMessageSid and stamps sentAt", async () => {
      rs.resetModules();

      rs.doMock("~/server/twilio", () => ({
        sendSmsToConsultant: rs.fn().mockResolvedValue({
          sid: `SM-int-${suffix}`,
          status: "queued",
          sentAt: new Date(),
        }),
      }));
      rs.doMock("~/inngest/client", () => ({
        inngest: {
          createFunction: rs.fn().mockReturnValue({}),
        },
      }));

      const { db } = await import("~/server/db");
      const schema = await import("~/server/db/schema");
      const { runDispatchSms } = await import("../dispatch-sms");

      // Seed: lead → approved sms message.
      await db.insert(schema.leads).values({
        id: leadId,
        firstName: "Sms",
        lastName: "Test",
        email: `sms-disp-${suffix}@test.rekurve.dev`,
        hubspotContactId: `hs-sms-${suffix}`,
      });
      await db.insert(schema.messageQueue).values({
        id: messageId,
        leadId,
        channel: "sms",
        subject: null,
        body: "Integration SMS body",
        status: "approved",
        approvedAt: new Date(),
        priority: 50,
      });

      const step = {
        run: rs
          .fn()
          .mockImplementation((_id: string, fn: () => unknown) => fn()),
      };

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
