import { test } from "../fixtures/test";

test.describe("CTA Click Tracking", () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test("hero primary CTA tracks click event", async ({
    homePage,
    analytics,
  }) => {
    await homePage.hero.clickPrimaryCta();

    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "hero_primary")
      .toBeFired();
  });

  test("hero secondary CTA tracks click event", async ({
    homePage,
    analytics,
  }) => {
    await homePage.hero.clickSecondaryCta();

    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "hero_secondary")
      .toBeFired();
  });

  test("navbar desktop CTA tracks click event", async ({
    homePage,
    analytics,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Desktop-only navbar CTA — tablet/mobile show a hamburger menu",
    );

    await homePage.navbar.clickCta();

    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "header")
      .toBeFired();
  });

  test("pricing tier CTAs track click events", async ({
    homePage,
    analytics,
  }) => {
    await homePage.pricing.scrollIntoView();

    // Test foundation tier
    await homePage.pricing.clickTierCta("foundation");
    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "pricing_foundation")
      .toBeFired();

    analytics.clearEvents();

    // Navigate back to pricing
    await homePage.pricing.scrollIntoView();

    // Test growth tier
    await homePage.pricing.clickTierCta("growth");
    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "pricing_growth")
      .toBeFired();
  });

  test("final CTA section tracks click event", async ({
    homePage,
    analytics,
  }) => {
    await homePage.finalCta.scrollIntoView();
    await homePage.finalCta.clickPrimaryCta();

    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "final_cta_primary")
      .toBeFired();
  });

  test("FAQ bottom CTA tracks click event", async ({ homePage, analytics }) => {
    await homePage.faq.scrollIntoView();
    await homePage.faq.clickBottomCta();

    await analytics
      .expectEvent("cta_clicked")
      .withProperty("location", "faq_bottom")
      .toBeFired();
  });
});

test.describe("CTA Navigation", () => {
  test("hero CTA navigates to booking form", async ({ homePage }) => {
    await homePage.goto();

    // Click hero primary CTA
    await homePage.hero.clickPrimaryCta();

    // Verify navigation to booking form - form is now visible
    await homePage.bookingForm.expectStep(1);
  });
});
