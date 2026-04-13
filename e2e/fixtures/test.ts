import { test as base } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";
import { HomePage } from "../pages/home.page";
import { LoginPage } from "../pages/login.page";
import { AnalyticsHelper } from "../utils/analytics-helper";

type TestFixtures = {
  analytics: AnalyticsHelper;
  dashboardPage: DashboardPage;
  homePage: HomePage;
  loginPage: LoginPage;
};

export const test = base.extend<TestFixtures>({
  // Override the built-in page fixture to inject E2E test flags before any
  // page scripts. This MUST live on `page` (not `analytics`) because
  // Playwright sets up beforeEach-requested fixtures first — if it lived on
  // `analytics` it would miss the initial goto() triggered by beforeEach.
  page: async ({ page }, use) => {
    await page.addInitScript(`
      // Set E2E mode flag so instrumentation-client.ts installs the
      // before_send hook that emits captures via console.info.
      window.__E2E_MODE__ = true;
      // Override navigator.webdriver so PostHog's bot detection doesn't
      // silently drop all capture events (Playwright sets webdriver=true).
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
      });
    `);
    await use(page);
  },

  analytics: async ({ page }, use) => {
    const analytics = new AnalyticsHelper(page);
    await analytics.startCapturing();
    await use(analytics);
    await analytics.stopCapturing();
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from "@playwright/test";
