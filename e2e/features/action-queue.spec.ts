import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { ActionQueueSection } from "../pages/sections/action-queue.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import {
  cleanupLeads,
  cleanupMessages,
  getMessageStatus,
  seedLead,
  seedPendingMessage,
} from "../utils/messages-helper";
import { getSessionCookie } from "../utils/session-cookie";

const hasTwilioCredentials =
  !!process.env.TWILIO_AUTH_TOKEN &&
  !process.env.TWILIO_AUTH_TOKEN.startsWith("placeholder");

// posthog-js ≥ 1.x calls `/flags/?v=2`; older versions hit `/decide`. Match
// both so the route stays correct across SDK upgrades.
async function routePostHog(page: Page, flags: Record<string, boolean>) {
  await page.route(/\/rk\/(flags|decide)/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ featureFlags: flags }),
    });
  });
}

// Stub navigator.canShare/share/clipboard so the SMS approve flow goes through
// shareNative() → approve.mutate({skipDispatch:true}). Avoids relying on a real
// Twilio dispatch, which is what `sms-twilio-dispatch=on` would require.
async function stubNativeShareResolve(page: Page) {
  await page.addInitScript(`
    Object.defineProperty(navigator, 'canShare', {
      value: (data) => !!(data && data.text),
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: () => Promise.resolve(),
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      writable: true,
      configurable: true,
    });
  `);
}

test.describe("Action Queue — E2E", () => {
  let session: TestSession;
  const leadIds: string[] = [];
  const messageIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupMessages(messageIds);
    await cleanupLeads(leadIds);
    await deleteTestSession(session.userId);
  });

  // Empty-state coverage lives in e2e/features/dashboard-shell.spec.ts:139-146.
  // A seed-free assertion here could not distinguish empty state from rows
  // seeded by parallel tests, so it was removed.

  test("approve removes the row and toasts success", async ({
    context,
    page,
    baseURL,
  }) => {
    test.skip(
      !hasTwilioCredentials,
      "Requires real Twilio credentials — set TWILIO_AUTH_TOKEN to a non-placeholder value",
    );

    await routePostHog(page, {});
    await stubNativeShareResolve(page);
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const lead = await seedLead({
      firstName: "Approve",
      lastName: `Test ${Date.now().toString(36)}`,
      leadStage: "warm",
      leadScore: 60,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: "Hey, any questions about the Springfield lot?",
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await expect(queue.row(msg.id)).toBeVisible();
    await queue.approveButton(msg.id).click();

    await expect(queue.row(msg.id)).toBeHidden();
    await expect(
      page.getByTestId("app-toast").filter({ hasText: "Draft approved" }),
    ).toBeVisible();

    const record = await getMessageStatus(msg.id);
    expect(record?.status).toBe("approved");
  });

  test("edit dialog saves the new body and preserves original", async ({
    context,
    page,
    baseURL,
  }) => {
    test.skip(
      !hasTwilioCredentials,
      "Requires real Twilio credentials — set TWILIO_AUTH_TOKEN to a non-placeholder value",
    );

    await routePostHog(page, {});
    await stubNativeShareResolve(page);
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const lead = await seedLead({
      firstName: "Edit",
      lastName: `Test ${Date.now().toString(36)}`,
    });
    leadIds.push(lead.id);

    const originalBody = "Original draft text";
    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: originalBody,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await queue.editButton(msg.id).click();
    const body = queue.editBody(msg.id);
    await expect(body).toBeVisible();
    await body.fill("Edited draft text");
    await queue.editSave(msg.id).click();

    await expect(queue.row(msg.id)).toBeHidden();
    // Wait for the success toast before reading the DB. The optimistic update
    // hides the row instantly, but the mutation is still in flight.
    await expect(
      page.getByTestId("app-toast").filter({ hasText: "Draft approved" }),
    ).toBeVisible();

    const record = await getMessageStatus(msg.id);
    expect(record?.status).toBe("edited_and_approved");
    expect(record?.body).toBe("Edited draft text");
    expect(record?.original_body).toBe(originalBody);
  });

  test("snooze persists snoozed_until", async ({ context, page, baseURL }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const lead = await seedLead({
      firstName: "Snooze",
      lastName: `Test ${Date.now().toString(36)}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      body: "Snoozable draft",
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await queue.snoozeButton(msg.id).click();
    // Pick a time ~2 days in the future using the datetime-local input.
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localValue = `${future.getFullYear()}-${pad(
      future.getMonth() + 1,
    )}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(
      future.getMinutes(),
    )}`;
    await queue.snoozeInput(msg.id).fill(localValue);
    await queue.snoozeSave(msg.id).click();

    await expect(queue.row(msg.id)).toBeHidden();
    await expect(page.getByText(/Snoozed until/i)).toBeVisible();

    const record = await getMessageStatus(msg.id);
    expect(record?.status).toBe("snoozed");
    expect(record?.snoozed_until).not.toBeNull();
  });

  test("dismiss requires confirmation and persists dismissed state", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const lead = await seedLead({
      firstName: "Dismiss",
      lastName: `Test ${Date.now().toString(36)}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      body: "Draft to dismiss",
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await queue.dismissButton(msg.id).click();
    await queue.dismissConfirm(msg.id).click();

    await expect(queue.row(msg.id)).toBeHidden();
    await expect(page.getByText(/Draft dismissed/i)).toBeVisible();

    const record = await getMessageStatus(msg.id);
    expect(record?.status).toBe("dismissed");
  });

  test("priority ordering — higher priority rendered before lower", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const lead = await seedLead({
      firstName: "Order",
      lastName: `Test ${Date.now().toString(36)}`,
    });
    leadIds.push(lead.id);

    const low = await seedPendingMessage({
      leadId: lead.id,
      body: "Low priority",
      priority: 10,
    });
    const high = await seedPendingMessage({
      leadId: lead.id,
      body: "High priority",
      priority: 90,
    });
    messageIds.push(low.id, high.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    const rows = queue.list.locator('[data-testid^="queue-row-"]');
    const firstId = await rows.first().getAttribute("data-testid");
    const ourRows = [high.id, low.id];
    const indices = await Promise.all(
      ourRows.map((id) =>
        rows.evaluateAll((els, testId: string) => {
          return els.findIndex(
            (el) => el.getAttribute("data-testid") === testId,
          );
        }, `queue-row-${id}`),
      ),
    );

    // high priority row index must be smaller than low priority row index.
    expect(indices[0]).toBeGreaterThanOrEqual(0);
    expect(indices[1]).toBeGreaterThanOrEqual(0);
    expect(indices[0]).toBeLessThan(indices[1] as number);
    expect(firstId).toBeTruthy();
  });
});
