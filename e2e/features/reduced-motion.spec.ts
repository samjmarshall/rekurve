import { test } from '../fixtures/test';

// SVG annotations from react-rough-notation may render differently on mobile viewports
// These tests focus on desktop/tablet where the annotations are consistently rendered
test.describe('Reduced Motion Support', () => {
  test('hero annotations appear immediately with reduced motion enabled', async ({ homePage }, testInfo) => {
    // Skip mobile - annotations may not render identically across all viewport sizes
    test.skip(testInfo.project.name === 'mobile', 'Annotation SVGs render differently on mobile');

    // Emulate reduced motion preference before navigation
    await homePage.page.emulateMedia({ reducedMotion: 'reduce' });
    await homePage.goto();

    // Annotations should be visible immediately (no scroll trigger needed)
    await homePage.hero.expectAnnotationsVisible();
  });

  test('hero annotations appear after scrolling into view with normal motion', async ({ homePage }, testInfo) => {
    // Skip mobile - annotations may not render identically across all viewport sizes
    test.skip(testInfo.project.name === 'mobile', 'Annotation SVGs render differently on mobile');

    // Emulate no preference for reduced motion
    await homePage.page.emulateMedia({ reducedMotion: 'no-preference' });
    await homePage.goto();

    // Hero is above fold, so annotations should trigger on load
    // Wait for the animation to complete (1500ms + 2000ms = 3500ms max)
    await homePage.page.waitForTimeout(4000);

    await homePage.hero.expectAnnotationsVisible();
  });
});
