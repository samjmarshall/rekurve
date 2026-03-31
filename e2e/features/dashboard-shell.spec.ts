import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";

test.describe("Dashboard Shell — Navigation", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  async function withAuth(context: import("@playwright/test").BrowserContext) {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.signedToken,
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  test("sidebar visible on desktop, bottom nav hidden", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop only");
    await withAuth(context);
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"]')).not.toBeVisible();
  });

  test("bottom nav visible on mobile, sidebar hidden", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile only");
    await withAuth(context);
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-sidebar"]')).not.toBeVisible();
  });

  test("navigating between pages updates active nav item", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Uses sidebar links");
    await withAuth(context);
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
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile only");
    await withAuth(context);
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

  test("all four pages are reachable", async ({ context, page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Uses sidebar links");
    await withAuth(context);

    const pages = ["dashboard", "pipeline", "lots", "settings"];
    for (const pageName of pages) {
      await page.goto(`/${pageName}`);
      await expect(page).toHaveURL(new RegExp(`/${pageName}`));
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

test.describe("Dashboard Shell — Empty States", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  async function withAuth(context: import("@playwright/test").BrowserContext) {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.signedToken,
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  test("/dashboard shows Action Queue empty state", async ({
    context,
    page,
  }) => {
    await withAuth(context);
    await page.goto("/dashboard");
    await expect(page.getByText("No pending actions")).toBeVisible();
    await expect(
      page.getByText("AI-drafted messages will appear here"),
    ).toBeVisible();
  });

  test("/pipeline shows Pipeline empty state", async ({ context, page }) => {
    await withAuth(context);
    await page.goto("/pipeline");
    await expect(page.getByText("No leads yet")).toBeVisible();
  });

  test("/lots shows Lots empty state", async ({ context, page }) => {
    await withAuth(context);
    await page.goto("/lots");
    await expect(page.getByText("No lots tracked")).toBeVisible();
  });

  test("/settings shows user email", async ({ context, page }) => {
    await withAuth(context);
    await page.goto("/settings");
    await expect(
      page.locator('[data-testid="settings-user-email"]'),
    ).toBeVisible();
  });
});

test.describe("Dashboard Shell — Sign Out", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

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
  }) => {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.signedToken,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/settings");
    await page.locator('[data-testid="settings-sign-out"]').click();
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
