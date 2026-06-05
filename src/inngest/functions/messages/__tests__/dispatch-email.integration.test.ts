// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { eq, inArray } from "drizzle-orm";

// Integration: run the real runDispatchEmail against Neon with sendEmail mocked
// and waitForEvent returning a canned engagement. Asserts the worker writes the
// conversation, stamps sentAt, and stamps hubspotActivityId end to end.

describe.skipIf(!process.env.INTEGRATION_DB)(
  "runDispatchEmail (integration)",
  () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const userId = `disp-user-${suffix}`;
    const leadId = randomUUID();
    const messageId = randomUUID();
    const email = `disp-${suffix}@test.rekurve.dev`;

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const schema = await import("~/server/db/schema");
      const { user } = await import("~/server/db/schema/auth");
      await db
        .delete(schema.conversations)
        .where(eq(schema.conversations.messageQueueId, messageId));
      await db
        .delete(schema.messageQueue)
        .where(inArray(schema.messageQueue.id, [messageId]));
      await db.delete(schema.leads).where(inArray(schema.leads.id, [leadId]));
      await db.delete(user).where(inArray(user.id, [userId]));
    });

    test("writes the conversation, sentAt, and hubspotActivityId", async () => {
      rs.resetModules();

      rs.doMock("~/server/ms-graph", () => ({
        sendEmail: rs.fn().mockResolvedValue({ sentAt: new Date() }),
      }));
      rs.doMock("~/inngest/client", () => ({
        inngest: {
          createFunction: rs.fn().mockReturnValue({}),
          send: rs.fn().mockResolvedValue(undefined),
        },
      }));

      const { db } = await import("~/server/db");
      const schema = await import("~/server/db/schema");
      const { user } = await import("~/server/db/schema/auth");
      const { runDispatchEmail } = await import("../dispatch-email");

      // Seed: user (so resolveLeadOwnerUserId resolves) → lead → approved email.
      await db.insert(user).values({ id: userId, name: "Dispatch", email });
      await db.insert(schema.leads).values({
        id: leadId,
        firstName: "Disp",
        lastName: "Test",
        email,
        hubspotContactId: `hs-disp-${suffix}`,
      });
      await db.insert(schema.messageQueue).values({
        id: messageId,
        leadId,
        channel: "email",
        subject: "Dispatch subject",
        body: "Dispatch body",
        status: "approved",
        approvedAt: new Date(),
        priority: 50,
      });

      const step = {
        run: rs
          .fn()
          .mockImplementation((_id: string, fn: () => unknown) => fn()),
        waitForEvent: rs.fn().mockResolvedValue({
          data: { correlationId: messageId, hubspotActivityId: "hs-eng-int" },
        }),
      };

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
