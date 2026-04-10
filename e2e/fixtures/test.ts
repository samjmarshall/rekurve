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
  analytics: async ({ page }, use) => {
    // Must run before any page script so the flag is present when
    // instrumentation-client.ts executes on the next goto().
    await page.addInitScript(() => {
      (window as Window & { __E2E_MODE__?: boolean }).__E2E_MODE__ = true;
    });
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
