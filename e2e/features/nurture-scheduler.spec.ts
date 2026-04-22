import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import { getLeadIdByPhone } from "../utils/leads-helper";
import {
  cleanupLeads,
  cleanupMessages,
  seedLead,
} from "../utils/messages-helper";
import {
  cleanupSequences,
  cronRequestContext,
  getActiveSequenceByLead,
  seedActiveSequence,
  waitForPendingMessage,
} from "../utils/nurture-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("Nurture scheduler", () => {
  test.skip(!process.env.DATABASE_URL, "DB required");
  test.skip(!process.env.CRON_SECRET, "CRON_SECRET required");

  let session: TestSession;
  const leadIds: string[] = [];
  const sequenceIds: string[] = [];
  const messageIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupMessages(messageIds);
    await cleanupSequences(sequenceIds);
    await cleanupLeads(leadIds);
    await deleteTestSession(session.userId);
  });

  test("auto-starts a sequence on lead create (migration gate)", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const phone = uniquePhone();
    const email = `e2e-${randomUUID()}@test.rekurve.dev`;

    await page.goto("/leads/new");

    // Step 1 — Contact details
    await page.getByTestId("lead-form-first-name").fill("Nurture");
    await page.getByTestId("lead-form-last-name").fill("AutoStart");
    await page.getByTestId("lead-form-phone").fill(phone);
    await page.getByTestId("lead-form-email").fill(email);
    await page.getByTestId("lead-form-next-btn").click();

    // Step 2 — Land (no required fields, skip through)
    await page.getByTestId("lead-form-next-btn").click();

    // Step 3 — Build (no required fields, skip through)
    await page.getByTestId("lead-form-next-btn").click();

    // Step 4 — More / submit
    await page.getByTestId("lead-form-submit-btn").click();

    // Wait for success screen
    await expect(page.getByTestId("lead-form-success")).toBeVisible();

    const leadId = await getLeadIdByPhone(phone);
    leadIds.push(leadId);

    const sequence = await getActiveSequenceByLead(leadId);
    expect(sequence).not.toBeNull();
    expect(sequence!.sequenceType).toBe("discovery");

    // nextStepAt should be within ±1 minute of now + 3 days
    const expectedAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(
      sequence!.nextStepAt!.getTime() - expectedAt.getTime(),
    );
    expect(diffMs).toBeLessThan(60_000);

    sequenceIds.push(sequence!.id);
  });

  test.describe("cron → action queue", () => {
    test.describe.configure({ mode: "serial" });

    let seededLeadId: string;
    let draftedMessageId: string;

    test("cron drafts a pending message", async ({ baseURL }) => {
      const lead = await seedLead({
        firstName: "Nurture",
        lastName: "Cron",
        leadStage: "nurture",
        phone: uniquePhone(),
      });
      seededLeadId = lead.id;
      leadIds.push(lead.id);

      // Seed with nextStepAt already in the past so the scheduler picks it up
      // (the dev-advance route is production-gated and unavailable here)
      const seq = await seedActiveSequence({
        leadId: seededLeadId,
        sequenceType: "nurture",
        nextStepAt: new Date(Date.now() - 60_000),
      });
      sequenceIds.push(seq.id);

      // Invoke cron with AI stub header
      const cronCtx = await cronRequestContext(baseURL!);
      try {
        const cronRes = await cronCtx.get("/api/cron/nurture-scheduler");
        expect(cronRes.status()).toBe(200);
        const body = (await cronRes.json()) as {
          drafted: number;
          failed: number;
        };
        expect(body).toEqual({ drafted: 1, failed: 0 });
      } finally {
        await cronCtx.dispose();
      }

      // Poll until the pending message appears in the DB
      const msg = await waitForPendingMessage(seededLeadId);
      expect(msg.body).toMatch(/^\[ai-stub\]/);
      expect(msg.status).toBe("pending");
      draftedMessageId = msg.id;
      messageIds.push(msg.id);
    });

    test("action queue renders the drafted message", async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        getSessionCookie(session.signedToken, baseURL!),
      ]);
      await page.goto("/dashboard");

      await expect(
        page.getByTestId(`queue-row-${draftedMessageId}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`queue-row-body-${draftedMessageId}`),
      ).toContainText("[ai-stub]");
    });
  });
});
