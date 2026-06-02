import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import { cleanupTestLeadsByPhone } from "../utils/hubspot-helper";
import { getLeadIdByPhone } from "../utils/leads-helper";
import { cleanupLeads, cleanupMessages } from "../utils/messages-helper";
import { waitForPendingMessage } from "../utils/nurture-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("Nurture plan runner", () => {
  test.skip(!process.env.NURTURE_TEST_RHYTHM, "NURTURE_TEST_RHYTHM required");
  test.describe.configure({ mode: "serial" });

  let session: TestSession;
  const phones: string[] = [];
  const leadIds: string[] = [];
  const messageIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupMessages(messageIds);
    await cleanupTestLeadsByPhone(phones);
    await cleanupLeads(leadIds);
    await deleteTestSession(session.userId);
  });

  test("runner drafts a pending message after rhythm timeout", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const phone = uniquePhone();
    const email = `e2e-nurture-${randomUUID()}@test.rekurve.dev`;
    phones.push(phone);

    await page.goto("/leads/new");

    // Step 1 — Contact details
    await page.getByTestId("lead-form-first-name").fill("Nurture");
    await page.getByTestId("lead-form-last-name").fill("Runner");
    await page.getByTestId("lead-form-phone").fill(phone);
    await page.getByTestId("lead-form-email").fill(email);
    await page.getByTestId("lead-form-next-btn").click();

    // Step 2 — Land (no required fields)
    await page.getByTestId("lead-form-next-btn").click();

    // Step 3 — Build (no required fields)
    await page.getByTestId("lead-form-next-btn").click();

    // Step 4 — Submit
    await page.getByTestId("lead-form-submit-btn").click();
    await expect(page.getByTestId("lead-form-success")).toBeVisible();

    const leadId = await getLeadIdByPhone(phone);
    leadIds.push(leadId);

    // NURTURE_TEST_RHYTHM=5s → the runner fires after ~5s. Allow extra time for
    // the outbox sweep, Inngest dev server scheduling, and DB insert.
    const msg = await waitForPendingMessage(leadId, { timeoutMs: 20_000 });
    expect(msg.body).toMatch(/^\[ai-stub\]/);
    expect(msg.status).toBe("pending");
    messageIds.push(msg.id);
  });

  test("action queue renders the drafted message", async ({
    page,
    context,
    baseURL,
  }) => {
    const msgId = messageIds[0];
    if (!msgId) return;

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/dashboard");

    await expect(page.getByTestId(`queue-row-${msgId}`)).toBeVisible();
    await expect(page.getByTestId(`queue-row-body-${msgId}`)).toContainText(
      "[ai-stub]",
    );
  });
});
