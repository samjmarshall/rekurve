// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, rs, test } from "@rstest/core";
import { eq, inArray } from "drizzle-orm";

const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

const stubDraftOutput = {
  channel: "sms" as const,
  subject: null,
  body: `[integration-stub] body for ${RUN_ID}`,
  aiReasoning: "[integration-stub]",
  priority: 50,
};

describe.skipIf(!process.env.INTEGRATION_DB)(
  "runNurturePlan integration",
  () => {
    const createdLeadIds: string[] = [];
    const createdMessageIds: string[] = [];

    beforeEach(() => {
      rs.resetModules();

      rs.doMock("~/inngest/client", () => ({
        inngest: {
          send: rs.fn().mockResolvedValue(undefined),
          createFunction: rs.fn().mockReturnValue({}),
        },
      }));
    });

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
      const { runNurturePlan } = await import(
        "~/inngest/functions/nurture/nurture-plan-runner"
      );

      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "NurtureIntegration",
          lastName: `Runner-${RUN_ID}`,
          leadStage: "warm",
        })
        .returning();
      createdLeadIds.push(lead!.id);

      let waitCallCount = 0;

      const step = {
        run: rs
          .fn()
          .mockImplementation(
            async (id: string, fn: () => Promise<unknown>) => {
              if (id.startsWith("draft-followup-")) {
                return stubDraftOutput;
              }
              return fn(); // load-lead-*, enqueue-followup-*, emit-drafted-* hit real impls
            },
          ),
        waitForEvent: rs.fn().mockImplementation(() => {
          waitCallCount++;
          // First call: timeout; second call: superseded to terminate the loop
          return Promise.resolve(
            waitCallCount === 1 ? null : { data: { leadId: lead!.id } },
          );
        }),
      };

      await runNurturePlan({ data: { leadId: lead!.id } }, step as never);

      const rows = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.leadId, lead!.id));

      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe("pending");
      expect(rows[0]!.body).toContain("[integration-stub]");
      createdMessageIds.push(rows[0]!.id);
    });
  },
);
