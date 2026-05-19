import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import { getSessionCookie } from "../utils/session-cookie";

function withAuth(
  context: import("@playwright/test").BrowserContext,
  session: TestSession,
  baseURL: string,
) {
  return context.addCookies([getSessionCookie(session.signedToken, baseURL)]);
}

test.describe("Dashboard Shell — Navigation", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  test("sidebar visible on desktop, bottom nav hidden", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop only");
    await withAuth(context, session, baseURL!);
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"]')).not.toBeVisible();
  });

  test("bottom nav visible on mobile, sidebar hidden", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile only");
    await withAuth(context, session, baseURL!);
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-sidebar"]')).not.toBeVisible();
  });

  test("navigating between pages updates active nav item", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Uses sidebar links");
    await withAuth(context, session, baseURL!);
    await page.goto("/dashboard");

    // Dashboard is active
    await expect(
      page.locator('[data-testid="sidebar-link-dashboard"]'),
    ).toHaveAttribute("aria-current", "page");

    // Navigate to pipeline
    await page.locator('[data-testid="sidebar-link-pipeline"]').click();
    await page.waitForURL("**/pipeline");
    await expect(
      page.locator('[data-testid="sidebar-link-pipeline"]'),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.locator('[data-testid="sidebar-link-dashboard"]'),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("navigating via bottom nav works on mobile", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile only");
    await withAuth(context, session, baseURL!);
    await page.goto("/dashboard");

    await expect(
      page.locator('[data-testid="bottom-nav-link-dashboard"]'),
    ).toHaveAttribute("aria-current", "page");

    await page.locator('[data-testid="bottom-nav-link-pipeline"]').click();
    await page.waitForURL("**/pipeline");
    await expect(
      page.locator('[data-testid="bottom-nav-link-pipeline"]'),
    ).toHaveAttribute("aria-current", "page");
  });

  test("all four pages are reachable", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Uses sidebar links");
    await withAuth(context, session, baseURL!);

    const pages = ["dashboard", "pipeline", "lots", "settings"];
    for (const pageName of pages) {
      await page.goto(`/${pageName}`);
      await expect(page).toHaveURL(new RegExp(`/${pageName}`));
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

test.describe("Dashboard Shell — Empty States", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  test("/dashboard renders the Action Queue or empty state", async ({
    context,
    page,
    baseURL,
  }) => {
    await withAuth(context, session, baseURL!);
    await page.goto("/dashboard");
    // The Action Queue is not user-scoped, so previously seeded data in the
    // shared DB (including production) will render the list instead of the
    // empty state. Assert the route renders either shape without error.
    await expect(page.getByTestId("queue-heading")).toBeVisible();
    await expect(
      page
        .locator('[data-testid="queue-empty"], [data-testid="queue-list"]')
        .first(),
    ).toBeVisible();
  });

  test("/pipeline renders the pipeline board or empty state", async ({
    context,
    page,
    baseURL,
  }) => {
    await withAuth(context, session, baseURL!);
    await page.goto("/pipeline");
    // Leads in this project are not user-scoped, so any previously seeded
    // data in the shared test DB will render the board instead of the empty
    // state. Assert the route renders either shape without error.
    await expect(
      page.getByRole("heading", { name: "Pipeline", level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .locator(
          '[data-testid="pipeline-empty"], [data-testid="pipeline-board"]',
        )
        .first(),
    ).toBeVisible();
  });

  test("/lots shows Lots empty state", async ({ context, page, baseURL }) => {
    await withAuth(context, session, baseURL!);
    await page.goto("/lots");
    await expect(page.getByText("No lots tracked")).toBeVisible();
  });

  test("/settings shows user email", async ({ context, page, baseURL }) => {
    await withAuth(context, session, baseURL!);
    await page.goto("/settings");
    await expect(
      page.locator('[data-testid="settings-user-email"]'),
    ).toBeVisible();
  });
});

test.describe("Dashboard Shell — Sign Out", () => {
  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  test("sign out from settings redirects to login", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    await page.goto("/settings");
    await page.locator('[data-testid="settings-sign-out"]').click();
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
