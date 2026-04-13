import { createTestUser } from "../data/test-users";
import { expect, test } from "../fixtures/test";

test.describe("Lead Conversion Journey", () => {
  test("complete journey from landing to form submission with analytics", async ({
    homePage,
    analytics,
    page: _page,
  }) => {
    const user = createTestUser();

    // 1. Land on homepage
    await homePage.goto();

    // Verify hero is visible
    await homePage.hero.expectVisible();

    // 2. Click hero CTA
    await homePage.hero.clickPrimaryCta();

    // Verify CTA tracking
    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "hero_primary")
      .toBeFired();

    // 3. Scroll to and complete booking form
    await homePage.bookingForm.scrollIntoView();
    await homePage.bookingForm.expectStep(1);

    // Step 1: Basic Info
    await homePage.bookingForm.fillStep1(user);
    await homePage.bookingForm.clickNext();

    // Verify form tracking
    await analytics.expectEvent("booking_form_started").toBeFired();
    await analytics
      .expectEvent("form_step_completed")
      .withProperty("step", 1)
      .toBeFired();

    // Step 2: Company Details
    await homePage.bookingForm.expectStep(2);
    await homePage.bookingForm.fillStep2(user);
    await homePage.bookingForm.clickNext();

    // Step 3: Challenges
    await homePage.bookingForm.expectStep(3);
    await homePage.bookingForm.fillStep3(user);
    await homePage.bookingForm.clickNext();

    // Step 4: Goals
    await homePage.bookingForm.expectStep(4);
    await homePage.bookingForm.fillStep4(user);
    await homePage.bookingForm.clickSubmit();

    // 4. Verify success state
    await homePage.bookingForm.expectSuccess();

    // Verify final analytics events
    await analytics
      .expectEvent("booking_form_submitted")
      .withPropertyPresent("lead_email")
      .toBeFired();
  });

  test("landing page loads and hero is visible", async ({ homePage }) => {
    await homePage.goto();
    await homePage.hero.expectVisible();
  });

  test("can navigate to booking form via hero CTA", async ({
    homePage,
    page: _page,
  }) => {
    await homePage.goto();
    await homePage.hero.clickPrimaryCta();

    // Should have navigated to booking form section - verify form is in view
    await homePage.bookingForm.expectStep(1);
  });

  test("pricing section displays all tiers", async ({ homePage }) => {
    await homePage.goto();
    await homePage.pricing.scrollIntoView();
    await homePage.pricing.expectAllTiersVisible();
  });

  test("can navigate to booking form from pricing", async ({ homePage }) => {
    await homePage.goto();
    await homePage.pricing.scrollIntoView();
    await homePage.pricing.clickTierCta("growth");

    // Verify form is visible after clicking CTA
    await homePage.bookingForm.expectStep(1);
  });
});

test.describe("Multi-Touch Attribution", () => {
  test("UTM parameters are tracked", async ({ homePage, analytics }) => {
    await homePage.gotoWithUtm({
      source: "google",
      medium: "cpc",
      campaign: "ai-sales-agents",
    });

    // UTM params should be captured in utm_captured event
    await analytics
      .expectEvent("utm_captured")
      .withProperty("utm_source", "google")
      .toBeFired();
  });

  test("page loads with UTM parameters in URL", async ({ homePage, page }) => {
    await homePage.gotoWithUtm({
      source: "google",
      medium: "cpc",
      campaign: "ai-sales-agents",
    });

    await expect(page).toHaveURL(/utm_source=google/);
  });
});
