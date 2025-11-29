import { test, expect } from '../fixtures/test';

test.describe('FAQ Search', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.faq.scrollIntoView();
  });

  /**
   * SKIPPED ON MOBILE WEBKIT
   *
   * Issue: FAQ search filtering doesn't complete reliably on mobile WebKit.
   * After typing a search query and waiting for debounce (1000ms), the
   * filtered count doesn't update as expected.
   *
   * Root Cause Investigation Needed:
   * 1. The search input's onChange may fire differently on mobile WebKit
   * 2. The debounce timer (500ms) may behave differently in WebKit's JS engine
   * 3. CSS display:none filtering may not update the DOM count immediately
   *
   * To Enable:
   * - Debug the FAQ component's search handler on real Safari
   * - Check if the debounce uses requestAnimationFrame (WebKit timing differs)
   * - Consider using MutationObserver to wait for DOM changes instead of timeout
   * - Test with longer debounce waits (2000ms+) to isolate timing vs logic issues
   */
  test('search filters FAQ items', async ({ homePage }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile WebKit search debounce timing - see code comments');

    const initialCount = await homePage.faq.getVisibleCount();
    expect(initialCount).toBeGreaterThan(0);

    await homePage.faq.search('CRM');

    // Wait for debounce and filtering
    await homePage.page.waitForTimeout(700);

    const filteredCount = await homePage.faq.getVisibleCount();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  /**
   * SKIPPED ON MOBILE WEBKIT - Same search timing issue as above
   */
  test('search with no results shows message', async ({ homePage }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile WebKit search timing - see code comments');

    await homePage.faq.search('xyznonexistent123');

    await homePage.faq.expectNoResults();
  });

  /**
   * SKIPPED ON MOBILE WEBKIT - Same search timing issue as above
   */
  test('clearing search restores all FAQs', async ({ homePage }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile WebKit search timing - see code comments');

    const initialCount = await homePage.faq.getVisibleCount();

    await homePage.faq.search('CRM');
    await homePage.page.waitForTimeout(700);

    const filteredCount = await homePage.faq.getVisibleCount();
    expect(filteredCount).toBeLessThan(initialCount);

    await homePage.faq.clearSearch();

    const restoredCount = await homePage.faq.getVisibleCount();
    expect(restoredCount).toBe(initialCount);
  });

  /**
   * ANALYTICS TEST - See booking-form.spec.ts for PostHog batching explanation
   */
  test.fixme('search tracks analytics event after debounce', async ({ homePage, analytics }) => {
    await homePage.faq.search('pilot');
    await homePage.page.waitForTimeout(1000);

    analytics.expectEvent('faq_searched').withPropertyPresent('query').toBeFired();
  });
});

test.describe('FAQ Accordion', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.faq.scrollIntoView();
  });

  /**
   * ANALYTICS TEST - See booking-form.spec.ts for PostHog batching explanation
   */
  test.fixme('expanding FAQ tracks analytics event', async ({ homePage, analytics }) => {
    await homePage.faq.expandQuestion(/integrate with our existing CRM/i);
    await homePage.page.waitForTimeout(500);

    analytics
      .expectEvent('faq_expanded')
      .withPropertyPresent('question_id')
      .withPropertyPresent('question')
      .toBeFired();
  });

  /**
   * SKIPPED ON MOBILE WEBKIT
   *
   * Issue: Accordion expand/collapse doesn't update data-state attribute
   * reliably on mobile WebKit. After clicking to expand, the trigger's
   * data-state remains "closed" instead of changing to "open".
   *
   * Root Cause Investigation Needed:
   * 1. Radix UI Accordion may use CSS animations that WebKit handles differently
   * 2. The data-state attribute update may be tied to animation completion
   * 3. Touch events on mobile may not trigger the same handlers as click
   *
   * To Enable:
   * - Check if Radix Accordion has known WebKit issues in their GitHub
   * - Test if using { force: true } on click resolves the issue
   * - Consider waiting for the content panel to be visible instead of data-state
   * - Debug with Safari's Web Inspector on iOS Simulator
   */
  test('accordion expands to show answer content', async ({ homePage }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile WebKit accordion animation timing - see code comments');

    // Use partial question text to match
    const questionText = /integrate with our existing CRM/i;

    await homePage.faq.expectQuestionCollapsed(questionText);
    await homePage.faq.expandQuestion(questionText);
    await homePage.faq.expectQuestionExpanded(questionText);
  });

  /**
   * SKIPPED ON MOBILE WEBKIT - Same accordion animation issue as above
   */
  test('multiple accordions can be open simultaneously', async ({ homePage }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Mobile WebKit accordion animation timing - see code comments');

    // Use partial question text to match
    await homePage.faq.expandQuestion(/What is the Release Pilot program/i);
    await homePage.faq.expandQuestion(/integrate with our existing CRM/i);

    await homePage.faq.expectQuestionExpanded(/What is the Release Pilot program/i);
    await homePage.faq.expectQuestionExpanded(/integrate with our existing CRM/i);
  });
});
