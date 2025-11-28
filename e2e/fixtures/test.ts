import { test as base } from '@playwright/test';
import { AnalyticsHelper } from '../utils/analytics-helper';
import { HomePage } from '../pages/home.page';

type TestFixtures = {
  analytics: AnalyticsHelper;
  homePage: HomePage;
};

export const test = base.extend<TestFixtures>({
  analytics: async ({ page }, use) => {
    const analytics = new AnalyticsHelper(page);
    await analytics.startCapturing();
    await use(analytics);
    await analytics.stopCapturing();
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
});

export { expect } from '@playwright/test';
