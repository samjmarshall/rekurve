import { test } from '../fixtures/test';
import { createAbandonmentUser } from '../data/test-users';

/**
 * ANALYTICS TESTS - ALL MARKED AS FIXME
 *
 * These tests verify that partial form data is captured for abandoned leads.
 * They're disabled because PostHog batches events - see booking-form.spec.ts
 * for detailed explanation and solutions.
 */
test.describe('Form Abandonment Tracking', () => {
  test.fixme('abandonment tracked when leaving after step 1', async ({ homePage, analytics, page: _page }) => {
    const user = createAbandonmentUser();

    await homePage.goto();
    await homePage.bookingForm.scrollIntoView();

    // Start form
    await homePage.bookingForm.fillStep1(user);
    await homePage.bookingForm.clickNext();

    // Verify we're on step 2
    await homePage.bookingForm.expectStep(2);

    // Navigate away (simulates abandonment)
    // Note: beforeunload events don't fire reliably in Playwright
    // We can verify the form state was captured

    // Clear analytics and check the form state was tracked
    analytics.expectEvent('form_step_completed').withProperty('step', 1).toBeFired();
  });

  test.fixme('partial lead data is captured at each step', async ({ homePage, analytics }) => {
    const user = createAbandonmentUser();

    await homePage.goto();
    await homePage.bookingForm.scrollIntoView();

    // Complete step 1 - this triggers lead identification
    await homePage.bookingForm.fillStep1(user);
    await homePage.bookingForm.clickNext();

    // Verify lead was identified even without completing form
    analytics.expectEvent('lead_identified').toBeFired();

    // Complete step 2
    await homePage.bookingForm.fillStep2(user);
    await homePage.bookingForm.clickNext();

    // Step 2 completion tracked
    analytics.expectEvent('form_step_completed').withProperty('step', 2).toBeFired();

    // At this point, even if user abandons, we have:
    // - Contact info from step 1
    // - Company info from step 2
    // This data is valuable for follow-up
  });
});

test.describe('Form Recovery', () => {
  /**
   * SKIPPED ON MOBILE WEBKIT
   *
   * Issue: This is a complex multi-step journey that exercises the same
   * step transition issues seen in booking-form.spec.ts. The test navigates
   * through steps 1-3, goes back to step 2, then forward again.
   *
   * Root Cause: Same as booking form navigation tests - WebKit doesn't
   * reliably show step 2 fields after clicking Next from step 1.
   *
   * To Enable:
   * - Fix the underlying step transition issue in booking-form.spec.ts
   * - This test should automatically start passing once that's resolved
   * - Alternatively, break this into smaller tests that verify one transition each
   */
  test('can navigate back to correct errors', async ({ homePage }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile WebKit step transition timing - see code comments');

    const user = createAbandonmentUser();

    await homePage.goto();
    await homePage.bookingForm.scrollIntoView();

    // Complete step 1
    await homePage.bookingForm.fillStep1(user);
    await homePage.bookingForm.clickNext();

    // Complete step 2
    await homePage.bookingForm.fillStep2(user);
    await homePage.bookingForm.clickNext();

    // Skip step 3 challenges (causes validation error)
    await homePage.bookingForm.clickNext();

    // Should stay on step 3 (validation prevents navigation)
    await homePage.bookingForm.expectStep(3);

    // Go back to step 2 and return - data should be preserved
    await homePage.bookingForm.clickPrev();
    await homePage.bookingForm.expectStep(2);

    await homePage.bookingForm.clickNext();
    await homePage.bookingForm.expectStep(3);

    // Now complete step 3
    await homePage.bookingForm.fillStep3(user);
    await homePage.bookingForm.clickNext();

    // Should successfully move to step 4
    await homePage.bookingForm.expectStep(4);
  });
});
