import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { ActionQueueSection } from "../pages/sections/action-queue.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import {
  cleanupConversationsForLead,
  cleanupLeads,
  cleanupMessages,
  getConversationsForMessage,
  getMessageStatus,
  seedLead,
  seedPendingMessage,
} from "../utils/messages-helper";
import { getSessionCookie } from "../utils/session-cookie";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// Inject navigator.share / canShare stubs before page scripts run.
async function stubNativeShare(page: Page, behavior: "resolve" | "reject") {
  const shareImpl =
    behavior === "resolve"
      ? "() => Promise.resolve()"
      : "() => Promise.reject(new DOMException('Share cancelled', 'AbortError'))";

  await page.addInitScript(`
    Object.defineProperty(navigator, 'canShare', {
      value: (data) => !!(data && data.text),
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: ${shareImpl},
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      writable: true,
      configurable: true,
    });
  `);
}

// Force desktop path by making canShare always return false. Also override the
// userAgent to a Mac UA so canUseSmsLink() returns true and the "Open in
// Messages" link is rendered (not md:hidden) on desktop viewports.
async function stubDesktopShare(page: Page) {
  await page.addInitScript(`
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: () => false,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      writable: true,
      configurable: true,
    });
  `);
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe("SMS Share — E2E", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;
  const leadIds: string[] = [];
  const messageIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    for (const leadId of leadIds) {
      await cleanupConversationsForLead(leadId);
    }
    await cleanupMessages(messageIds);
    await cleanupLeads(leadIds);
    await deleteTestSession(session.userId);
  });

  // -------------------------------------------------------------------------
  // 1. Mobile happy path
  // -------------------------------------------------------------------------

  test("mobile: native share resolves → row approved, sent_at stamped, no conversations row", async ({
    context,
    page,
    baseURL,
  }) => {
    await routePostHog(page, {}); // flag OFF — share sheet path
    await stubNativeShare(page, "resolve");
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsShareMobile",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Mobile share test ${suffix}`,
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

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("approved");
    expect(dbState?.approved_at).not.toBeNull();
    expect(dbState?.sent_at).not.toBeNull();

    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 2. Mobile cancel
  // -------------------------------------------------------------------------

  test("mobile: native share cancelled → row stays pending, sent_at null", async ({
    context,
    page,
    baseURL,
  }) => {
    await routePostHog(page, {});
    await stubNativeShare(page, "reject");
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsShareCancel",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Mobile cancel test ${suffix}`,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);
    await expect(queue.row(msg.id)).toBeVisible();

    await queue.approveButton(msg.id).click();

    // Allow the rejection microtask to settle before asserting
    await page.waitForTimeout(300);
    await expect(queue.row(msg.id)).toBeVisible();

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("pending");
    expect(dbState?.sent_at).toBeNull();

    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 3. Desktop: Copy to clipboard
  // -------------------------------------------------------------------------

  test("desktop: Copy button approves row and creates no conversations row", async ({
    context,
    page,
    baseURL,
  }) => {
    await routePostHog(page, {});
    await stubDesktopShare(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsShareCopy",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Desktop copy test ${suffix}`,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);
    await expect(queue.row(msg.id)).toBeVisible();

    await queue.approveButton(msg.id).click();

    // Drawer opens
    await expect(page.getByTestId("sms-share-drawer")).toBeVisible();

    // Click Copy
    await page.getByTestId("sms-share-copy").click();

    // Drawer closes and row is removed
    await expect(page.getByTestId("sms-share-drawer")).not.toBeVisible();
    await expect(queue.row(msg.id)).toBeHidden();

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("approved");
    expect(dbState?.sent_at).not.toBeNull();

    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 4. Desktop: Messages link (sms: scheme)
  // -------------------------------------------------------------------------

  test("desktop: Messages link has sms: href and approves row", async ({
    context,
    page,
    baseURL,
  }) => {
    await routePostHog(page, {});
    await stubDesktopShare(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsShareMessages",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Desktop messages test ${suffix}`,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);
    await expect(queue.row(msg.id)).toBeVisible();

    await queue.approveButton(msg.id).click();
    await expect(page.getByTestId("sms-share-drawer")).toBeVisible();

    const messagesLink = page.getByTestId("sms-share-messages");
    await expect(messagesLink).toHaveAttribute("href", /^sms:/);

    // Strip the sms: href before clicking. We've already asserted it above; if
    // we leave it on, the click triggers a navigation that races with — and
    // cancels — the in-flight approve mutation. Removing it lets the JS
    // onClick handler (handleMessages → onApprove → mutate) complete cleanly.
    await messagesLink.evaluate((el) => el.removeAttribute("href"));

    await messagesLink.click();

    await expect(
      page.getByTestId("app-toast").filter({ hasText: "Draft approved" }),
    ).toBeVisible();
    await expect(queue.row(msg.id)).toBeHidden();

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("approved");
    expect(dbState?.sent_at).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. Desktop: Close drawer without action → row stays pending
  // -------------------------------------------------------------------------

  test("desktop: closing drawer without action leaves row pending", async ({
    context,
    page,
    baseURL,
  }) => {
    await routePostHog(page, {});
    await stubDesktopShare(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsShareClose",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Desktop close test ${suffix}`,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);
    await expect(queue.row(msg.id)).toBeVisible();

    await queue.approveButton(msg.id).click();
    await expect(page.getByTestId("sms-share-drawer")).toBeVisible();

    // Close drawer by pressing Escape
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sms-share-drawer")).not.toBeVisible();

    // Row stays pending
    await expect(queue.row(msg.id)).toBeVisible();

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("pending");
    expect(dbState?.sent_at).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6. Edit & Approve (mobile): native share path with edited body
  // -------------------------------------------------------------------------

  test("mobile edit & approve: share resolves → status edited_and_approved, body and original_body correct", async ({
    context,
    page,
    baseURL,
  }) => {
    await routePostHog(page, {});
    await stubNativeShare(page, "resolve");
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsEditMobile",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const originalBody = `Original body ${suffix}`;
    const editedBody = `Edited body ${suffix}`;

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: originalBody,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);
    await expect(queue.row(msg.id)).toBeVisible();

    // Open edit dialog
    await queue.editButton(msg.id).click();
    await expect(page.getByTestId(`edit-dialog-${msg.id}`)).toBeVisible();

    // Replace body
    await queue.editBody(msg.id).fill(editedBody);

    // Save & Approve — closes dialog and triggers share flow
    await queue.editSave(msg.id).click();

    // Row leaves the queue
    await expect(queue.row(msg.id)).toBeHidden();
    await expect(
      page.getByTestId("app-toast").filter({ hasText: "Draft approved" }),
    ).toBeVisible();

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("edited_and_approved");
    expect(dbState?.body).toBe(editedBody);
    expect(dbState?.original_body).toBe(originalBody);
    expect(dbState?.sent_at).not.toBeNull();

    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 7. Flag ON: Twilio path runs, share UI never appears
  // -------------------------------------------------------------------------

  test("flag ON: Twilio dispatch path runs, share drawer never shown", async ({
    context,
    page,
    baseURL,
  }) => {
    // Force flag ON — app should route through Twilio, not share sheet
    await routePostHog(page, { "sms-twilio-dispatch": true });
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsFlagOn",
      lastName: `E2E-${suffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Flag ON test ${suffix}`,
      priority: 80,
    });
    messageIds.push(msg.id);

    const flagsReady = page.waitForResponse(/\/rk\/(flags|decide)/);
    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);
    await expect(queue.row(msg.id)).toBeVisible();
    await flagsReady;

    await queue.approveButton(msg.id).click();

    // With placeholder Twilio creds, the dispatch fails and shows an error toast.
    // Either way the share drawer must NOT appear.
    await expect(page.getByTestId("sms-share-drawer")).not.toBeVisible();

    // The error toast surfaces (dispatch failed with placeholder credentials)
    await expect(
      page
        .getByTestId("app-toast")
        .filter({ hasText: /Approve failed|Failed to send/i }),
    ).toBeVisible();

    // Row remains pending — dispatch-before-status-flip ordering preserved
    await expect(queue.row(msg.id)).toBeVisible();

    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("pending");
  });
});
