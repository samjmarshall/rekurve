import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";

test.describe("Auth Health Check", () => {
  test("/api/auth/ok returns a successful response", async ({ request }) => {
    const response = await request.get("/api/auth/ok");
    expect(response.ok()).toBe(true);
  });
});

test.describe("Unauthenticated Redirects", () => {
  test("/dashboard redirects to /login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("/login renders the login page when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toHaveText("Login");
  });
});

test.describe("Authenticated Redirects", () => {
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

  test("/login redirects to /dashboard when authenticated", async ({
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

    await page.goto("/login");
    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });
});
