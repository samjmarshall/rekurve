import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import { PipelineBoardSection } from "../pages/sections/pipeline-board.section";
import { QuickCaptureSection } from "../pages/sections/quick-capture.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import { cleanupTestLeadsByPhone } from "../utils/hubspot-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("Leads CRUD — E2E", () => {
  let session: TestSession;
  const phones: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupTestLeadsByPhone(phones);
    await deleteTestSession(session.userId);
  });

  test("create a lead via the full enquiry form and verify it appears in the pipeline", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    // Navigate to form via Pipeline page
    await page.goto("/pipeline");
    await page.getByRole("link", { name: /add lead/i }).click();
    await page.waitForURL("**/leads/new");

    const form = new LeadFormSection(page);
    const uniqueId = Date.now().toString(36);
    const phone = uniquePhone();
    phones.push(phone);

    // Step 1: Contact
    await form.fillStep1({
      firstName: "E2E",
      lastName: `Test ${uniqueId}`,
      phone,
      email: `e2e-${uniqueId}@test.rekurve.dev`,
    });
    await form.selectSegmented("Preferred contact time", "Anytime");
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

    // Step 4: Additional
    await form.notesTextarea.fill("E2E test lead");
    await form.clickSubmit();

    // Verify success
    await form.expectSuccess(`E2E Test ${uniqueId}`);
  });

  test("step validation prevents advancing with empty required fields", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/leads/new");

    const form = new LeadFormSection(page);

    // Try to advance without filling required fields
    await form.clickNext();

    // Should still be on step 1 — validation error visible
    await expect(form.firstNameInput).toBeVisible();
    await expect(
      page.locator('[data-slot="field-error"]').first(),
    ).toBeVisible();
  });

  test("back navigation preserves entered data", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/leads/new");

    const form = new LeadFormSection(page);

    // Fill step 1
    await form.fillStep1({ firstName: "Persist", lastName: "Test" });
    await form.clickNext();

    // Go back
    await page.locator('[data-testid="lead-form-back-btn"]').click();

    // Data should be preserved
    await expect(form.firstNameInput).toHaveValue("Persist");
    await expect(form.lastNameInput).toHaveValue("Test");
  });

  test("create a lead via quick capture and verify the success toast appears", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/dashboard");

    const quickCapture = new QuickCaptureSection(page);
    const uniqueId = Date.now().toString(36);
    const phone = uniquePhone();
    phones.push(phone);

    await quickCapture.open();
    await expect(quickCapture.firstNameInput).toBeFocused();

    await quickCapture.fill({
      firstName: "Quick",
      lastName: `Capture ${uniqueId}`,
      phone,
      notes: "Met at BBQ",
    });
    await quickCapture.submit();

    // Success toast appears with the lead name
    await quickCapture.expectSuccessToast(`Quick Capture ${uniqueId}`);

    // Dialog should be closed
    await expect(quickCapture.dialog).not.toBeVisible();
  });

  test("quick capture validation surfaces phone format errors", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/dashboard");

    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    await quickCapture.fill({
      firstName: "Bad",
      lastName: "Phone",
      phone: "555-1234",
    });
    await quickCapture.submit();

    await expect(
      page
        .locator('[data-slot="field-error"]')
        .filter({ hasText: /AU mobile/i }),
    ).toBeVisible();
  });

  test("update a lead's details and verify changes persist on reload", () => {
    test.fixme();
  });

  test("delete a lead and verify it is removed from the pipeline", () => {
    test.fixme();
  });

  test("filter the lead list by stage and verify correct results", () => {
    test.fixme();
  });

  test("pipeline board displays leads grouped by stage (unqualified, nurture, warm, hot)", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    const uniqueId = Date.now().toString(36);

    // Seed one quick-capture lead (→ unqualified) and one full-form
    // fully-qualified lead (→ hot after scoring).
    await page.goto("/dashboard");
    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    const phoneUnqualified = uniquePhone();
    phones.push(phoneUnqualified);
    await quickCapture.fill({
      firstName: "Pipeline",
      lastName: `Unqualified ${uniqueId}`,
      phone: phoneUnqualified,
    });
    await quickCapture.submit();
    await quickCapture.expectSuccessToast(`Pipeline Unqualified ${uniqueId}`);

    await page.goto("/leads/new");
    const form = new LeadFormSection(page);
    const phoneHot = uniquePhone();
    phones.push(phoneHot);
    await form.fillStep1({
      firstName: "Pipeline",
      lastName: `Hot ${uniqueId}`,
      phone: phoneHot,
      email: `e2e-${uniqueId}-hot@test.rekurve.dev`,
    });
    await form.clickNext();
    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landAddressInput.fill("1 Hot St");
    await form.landSqmInput.fill("450");
    await form.clickNext();
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$650,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`Pipeline Hot ${uniqueId}`);

    // Scoring is fire-and-forget, so poll until the hot lead lands in the hot column.
    await page.goto("/pipeline");
    const board = new PipelineBoardSection(page);

    await expect(
      board.column("unqualified").getByText(`Pipeline Unqualified ${uniqueId}`),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      board.column("hot").getByText(`Pipeline Hot ${uniqueId}`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("quick-capture lead appears in the Unqualified column with score 0", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    const uniqueId = Date.now().toString(36);

    await page.goto("/dashboard");
    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    const phone = uniquePhone();
    phones.push(phone);
    await quickCapture.fill({
      firstName: "QC",
      lastName: `Capture ${uniqueId}`,
      phone,
    });
    await quickCapture.submit();
    await quickCapture.expectSuccessToast(`QC Capture ${uniqueId}`);

    await page.goto("/pipeline");
    const board = new PipelineBoardSection(page);
    const card = board
      .column("unqualified")
      .locator('[data-testid^="lead-card-"]', {
        hasText: `QC Capture ${uniqueId}`,
      });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.locator('[data-testid^="lead-card-score-"]')).toHaveText(
      "0",
    );
  });

  test("tapping a lead card navigates to /leads/[id]", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    const uniqueId = Date.now().toString(36);

    // Seed a lead
    await page.goto("/dashboard");
    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    const phone = uniquePhone();
    phones.push(phone);
    await quickCapture.fill({
      firstName: "Nav",
      lastName: `Test ${uniqueId}`,
      phone,
    });
    await quickCapture.submit();
    await quickCapture.expectSuccessToast(`Nav Test ${uniqueId}`);

    await page.goto("/pipeline");
    const board = new PipelineBoardSection(page);
    const card = board
      .column("unqualified")
      .locator('[data-testid^="lead-card-"]', {
        hasText: `Nav Test ${uniqueId}`,
      });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    // Profile page is not built yet (#101) — just assert URL shape.
    await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
  });

  test("new lead appears in the pipeline board after quick capture", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    const uniqueId = Date.now().toString(36);

    // QuickCapture FAB lives on /dashboard.
    await page.goto("/dashboard");
    const quickCapture = new QuickCaptureSection(page);
    await quickCapture.open();
    const phone = uniquePhone();
    phones.push(phone);
    await quickCapture.fill({
      firstName: "Count",
      lastName: `Update ${uniqueId}`,
      phone,
    });
    await quickCapture.submit();
    await quickCapture.expectSuccessToast(`Count Update ${uniqueId}`);

    // The new lead should land in the Unqualified column. The absolute
    // column count is racy under parallel test runs against a shared DB,
    // so assert on the card's presence instead.
    await page.goto("/pipeline");
    const board = new PipelineBoardSection(page);
    await expect(
      board.column("unqualified").getByText(`Count Update ${uniqueId}`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("FHOG filter narrows to first home buyer leads", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    const uniqueId = Date.now().toString(36);

    // Seed one first_home_buyer lead and one investment lead via full form.
    const form = new LeadFormSection(page);

    await page.goto("/leads/new");
    const phoneBuyer = uniquePhone();
    phones.push(phoneBuyer);
    await form.fillStep1({
      firstName: "FHOG",
      lastName: `Buyer ${uniqueId}`,
      phone: phoneBuyer,
      email: `e2e-${uniqueId}-fhog-buyer@test.rekurve.dev`,
    });
    await form.clickNext();
    await form.clickNext();
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`FHOG Buyer ${uniqueId}`);

    await page.goto("/leads/new");
    const phoneInvestor = uniquePhone();
    phones.push(phoneInvestor);
    await form.fillStep1({
      firstName: "FHOG",
      lastName: `Investor ${uniqueId}`,
      phone: phoneInvestor,
      email: `e2e-${uniqueId}-fhog-investor@test.rekurve.dev`,
    });
    await form.clickNext();
    await form.clickNext();
    await form.selectSegmented("Property type", "Investment");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`FHOG Investor ${uniqueId}`);

    await page.goto("/pipeline");
    const board = new PipelineBoardSection(page);

    // Both visible before filter applied.
    await expect(board.board.getByText(`FHOG Buyer ${uniqueId}`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      board.board.getByText(`FHOG Investor ${uniqueId}`),
    ).toBeVisible();

    // Apply FHOG filter.
    await board.filterFhog.click();
    await page.waitForURL(/fhog=true/);

    await expect(board.board.getByText(`FHOG Buyer ${uniqueId}`)).toBeVisible();
    await expect(
      board.board.getByText(`FHOG Investor ${uniqueId}`),
    ).not.toBeVisible();
  });

  test("Zod validation errors surface in the UI when submitting invalid form data", () => {
    test.fixme();
  });
});
