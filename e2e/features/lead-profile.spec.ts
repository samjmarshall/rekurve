import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import { LeadProfileSection } from "../pages/sections/lead-profile.section";
import { QuickCaptureSection } from "../pages/sections/quick-capture.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import { cleanupTestLeadsByPhone } from "../utils/hubspot-helper";
import { getLeadIdByPhone } from "../utils/leads-helper";
import {
  cleanupConversations,
  cleanupLeads,
  seedConversation,
  seedEditedQueueMessage,
  seedLead,
} from "../utils/messages-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("Lead Profile — E2E", () => {
  let session: TestSession;
  const phones: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupTestLeadsByPhone(phones);
    await deleteTestSession(session.userId);
  });

  test("quick capture lead: score 0, unqualified, 5 gaps", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const phone = uniquePhone();
    phones.push(phone);
    const uniqueId = Date.now().toString(36);
    const lastName = `Unqualified ${uniqueId}`;

    await page.goto("/dashboard");

    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    await quickCapture.fill({
      firstName: "Quick",
      lastName,
      phone,
    });
    await quickCapture.submit();
    await quickCapture.expectSuccessToast(`Quick ${lastName}`);

    const leadId = await getLeadIdByPhone(phone);
    await page.goto(`/leads/${leadId}`);

    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await profile.expectScore(0);
    await profile.expectStage("unqualified");
    await profile.expectGapCount(5);
    await profile.expectNextQuestionMatches(/land/i);
  });

  test("fully qualified lead: score 85, hot, 0 gaps", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const phone = uniquePhone();
    phones.push(phone);
    const email = `e2e-${uniqueId}@test.rekurve.dev`;
    const lastName = `Hot ${uniqueId}`;

    await page.goto("/leads/new");

    const form = new LeadFormSection(page);
    await form.fillStep1({ firstName: "E2E", lastName, phone, email });
    await form.clickNext();

    // Step 2: Land
    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landAddressInput.fill("123 Test St");
    await form.landSqmInput.fill("450");
    await form.landWidthInput.fill("15");
    await form.landDepthInput.fill("30");
    await form.clickNext();

    // Step 3: Build
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$650,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    // Step 4: Additional — leave defaults
    await form.clickSubmit();
    await form.expectSuccess(`E2E ${lastName}`);

    const leadId = await getLeadIdByPhone(phone);
    await page.goto(`/leads/${leadId}`);

    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await profile.expectScore(85);
    await profile.expectStage("hot");
    await profile.expectGapCount(0);
  });

  test("score breakdown shows all 6 factors with correct max scores", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const phone = uniquePhone();
    phones.push(phone);
    const email = `e2e-${uniqueId}@test.rekurve.dev`;
    const lastName = `Breakdown ${uniqueId}`;

    await page.goto("/leads/new");

    const form = new LeadFormSection(page);
    await form.fillStep1({ firstName: "E2E", lastName, phone, email });
    await form.clickNext();

    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landAddressInput.fill("45 Parade St");
    await form.landSqmInput.fill("450");
    await form.landWidthInput.fill("15");
    await form.landDepthInput.fill("30");
    await form.clickNext();

    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$650,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    await form.clickSubmit();
    await form.expectSuccess(`E2E ${lastName}`);

    const leadId = await getLeadIdByPhone(phone);
    await page.goto(`/leads/${leadId}`);

    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await profile.expectFactor("land", 30, 30);
    await profile.expectFactor("finance", 15, 25);
    await profile.expectFactor("timeline", 20, 20);
    await profile.expectFactor("budget", 10, 10);
    await profile.expectFactor("propertyType", 10, 10);
    await profile.expectFactor("engagement", 0, 5);
    await profile.expectScore(85);
  });

  test("suggested next question targets the highest-impact gap", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const phone = uniquePhone();
    phones.push(phone);
    const email = `e2e-${uniqueId}@test.rekurve.dev`;
    const lastName = `NoLand ${uniqueId}`;

    await page.goto("/leads/new");

    const form = new LeadFormSection(page);
    await form.fillStep1({ firstName: "E2E", lastName, phone, email });
    await form.clickNext();

    // Step 2: skip land entirely (hasLand left null) — land becomes the
    // highest-impact gap and picks up the canonical "land" next-question.
    await form.clickNext();

    // Step 3: everything else filled
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$650,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    await form.clickSubmit();
    await form.expectSuccess(`E2E ${lastName}`);

    const leadId = await getLeadIdByPhone(phone);
    await page.goto(`/leads/${leadId}`);

    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    // Land gap should be present and the next question should mention land.
    await expect(profile.gapItem("land")).toBeVisible();
    await profile.expectNextQuestionMatches(/land/i);
  });

  test("edit a lead's qualification fields: score and stage update in place without reload", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    // 1. Create an unqualified lead via quick capture
    const phone = uniquePhone();
    phones.push(phone);
    const uniqueId = Date.now().toString(36);
    const lastName = `Edit ${uniqueId}`;

    await page.goto("/dashboard");

    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    await quickCapture.fill({ firstName: "Quick", lastName, phone });
    await quickCapture.submit();
    await quickCapture.expectSuccessToast(`Quick ${lastName}`);

    const leadId = await getLeadIdByPhone(phone);

    // 2. Navigate to profile and assert unqualified
    await page.goto(`/leads/${leadId}`);
    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await profile.expectScore(0);
    await profile.expectStage("unqualified");

    // 3. Click Edit
    const url = page.url();
    await profile.editButton.click();
    const editForm = page.locator('[data-testid="lead-profile-edit-form"]');
    await expect(editForm).toBeVisible();

    // 4. Fill qualification fields using the form step controls
    const formPage = new LeadFormSection(page);
    await formPage.selectSegmented("Has land", "Yes");
    await formPage.landAddressInput.waitFor({ state: "visible" });
    await formPage.selectSegmented("Land registered", "Yes");
    await formPage.landSqmInput.fill("450");
    await formPage.landWidthInput.fill("15");
    await formPage.landDepthInput.fill("30");
    await formPage.selectSegmented("Property type", "First Home Buyer");
    await formPage.budgetInput.fill("$650,000");
    await formPage.selectSegmented("Seen broker", "Yes");
    await formPage.selectSegmented("Construction timeline", "Ready Now");

    // 5. Save
    await profile.saveButton.click();

    // 6. Wait for edit form to close and assert new values
    await expect(editForm).not.toBeVisible({ timeout: 15_000 });

    await profile.expectScore(85);
    await profile.expectStage("hot");
    await profile.expectGapCount(0);

    // URL did not change (no full navigation)
    expect(page.url()).toBe(url);

    // 7. Reload and verify persistence
    await page.reload();
    await profile.waitForLoaded();
    await profile.expectScore(85);
    await profile.expectStage("hot");
  });
});

test.describe("Lead Profile — Conversation history", () => {
  let session: TestSession;
  const leadIds: string[] = [];
  const convIds: string[] = [];
  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupConversations(convIds);
    // message_queue rows cascade-delete when lead is deleted
    await cleanupLeads(leadIds);
    await deleteTestSession(session.userId);
  });

  test("empty state: no conversations shows empty copy", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "Conv",
      lastName: `Empty ${uniqueId}`,
      phone: `+614${uniqueId.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
    });
    leadIds.push(lead.id);

    await page.goto(`/leads/${lead.id}`);
    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await expect(profile.conversationEmpty).toBeVisible();
    await expect(profile.conversationEmpty).toContainText(
      "No messages yet — drafts will appear in the action queue.",
    );
    await profile.expectConversationCount(0);
  });

  test("renders conversations newest-first with relative timestamps", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "Conv",
      lastName: `Order ${uniqueId}`,
      phone: `+614${uniqueId.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
    });
    leadIds.push(lead.id);

    const now = Date.now();
    const oldest = await seedConversation({
      leadId: lead.id,
      channel: "sms",
      direction: "outbound",
      body: "Oldest message",
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    });
    const middle = await seedConversation({
      leadId: lead.id,
      channel: "sms",
      direction: "outbound",
      body: "Middle message",
      createdAt: new Date(now - 30 * 60 * 1000),
    });
    const newest = await seedConversation({
      leadId: lead.id,
      channel: "sms",
      direction: "outbound",
      body: "Newest message",
      createdAt: new Date(now - 5 * 60 * 1000),
    });
    convIds.push(oldest.id, middle.id, newest.id);

    await page.goto(`/leads/${lead.id}`);
    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await profile.expectConversationCount(3);

    // DOM order: newest first
    const items = profile.conversationItems;
    await expect(items.nth(0)).toContainText("Newest message");
    await expect(items.nth(1)).toContainText("Middle message");
    await expect(items.nth(2)).toContainText("Oldest message");

    // Relative timestamps
    await expect(items.nth(0)).toContainText("minute");
    await expect(items.nth(2)).toContainText("hour");
  });

  test("edited pill toggles original draft inline", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "Conv",
      lastName: `Edited ${uniqueId}`,
      phone: `+614${uniqueId.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
    });
    leadIds.push(lead.id);

    const queueMsg = await seedEditedQueueMessage({
      leadId: lead.id,
      channel: "email",
      body: "Edited sent body",
      originalBody: "Original AI draft",
    });
    const conv = await seedConversation({
      leadId: lead.id,
      channel: "email",
      direction: "outbound",
      body: "Edited sent body",
      messageQueueId: queueMsg.id,
    });
    convIds.push(conv.id);

    await page.goto(`/leads/${lead.id}`);
    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await expect(profile.editedPill(conv.id)).toBeVisible();
    await expect(profile.conversationOriginal(conv.id)).not.toBeVisible();

    await profile.editedPill(conv.id).click();
    await expect(profile.conversationOriginal(conv.id)).toBeVisible();
    await expect(profile.conversationOriginal(conv.id)).toContainText(
      "Original AI draft",
    );

    await profile.editedPill(conv.id).click();
    await expect(profile.conversationOriginal(conv.id)).not.toBeVisible();
  });

  test("email subject renders on email rows, not on sms rows", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "Conv",
      lastName: `Subject ${uniqueId}`,
      phone: `+614${uniqueId.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
    });
    leadIds.push(lead.id);

    const emailConv = await seedConversation({
      leadId: lead.id,
      channel: "email",
      direction: "outbound",
      subject: "Welcome to Creation Homes",
      body: "Email body text",
    });
    const smsConv = await seedConversation({
      leadId: lead.id,
      channel: "sms",
      direction: "outbound",
      body: "SMS body text",
    });
    convIds.push(emailConv.id, smsConv.id);

    await page.goto(`/leads/${lead.id}`);
    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    await expect(profile.conversationItem(emailConv.id)).toContainText(
      "Welcome to Creation Homes",
    );
    await expect(profile.conversationItem(smsConv.id)).not.toContainText(
      "Welcome to Creation Homes",
    );
  });
});
