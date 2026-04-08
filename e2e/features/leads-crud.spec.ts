import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import { QuickCaptureSection } from "../pages/sections/quick-capture.section";
import {
  createTestSession,
  deleteTestLeads,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("Leads CRUD — E2E", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestLeads();
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

    // Step 1: Contact
    await form.fillStep1({
      firstName: "E2E",
      lastName: `Test ${uniqueId}`,
      phone: "0412345678",
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

    await quickCapture.open();
    await expect(quickCapture.firstNameInput).toBeFocused();

    await quickCapture.fill({
      firstName: "Quick",
      lastName: `Capture ${uniqueId}`,
      phone: "0412345678",
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

  test("pipeline board displays leads grouped by stage (unqualified, nurture, warm, hot)", () => {
    test.fixme();
  });

  test("Zod validation errors surface in the UI when submitting invalid form data", () => {
    test.fixme();
  });
});
