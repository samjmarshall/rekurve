import type { Page } from "@playwright/test";

/**
 * Mock the better-auth send-otp endpoint.
 * Intercepts POST to /api/auth/email-otp/send-verification-otp
 */
export function mockSendOtp(
  page: Page,
  response: { ok: boolean; error?: string },
) {
  return page.route("**/api/auth/email-otp/send-verification-otp", (route) => {
    if (response.ok) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: true }),
      });
    }
    return route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: response.error ?? "Too many requests" },
      }),
    });
  });
}

/**
 * Mock the better-auth sign-in-with-otp endpoint.
 * Intercepts POST to /api/auth/sign-in/email-otp
 */
export function mockVerifyOtp(
  page: Page,
  response: { ok: boolean; error?: string },
) {
  return page.route("**/api/auth/sign-in/email-otp", (route) => {
    if (response.ok) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: { id: "mock-session" },
          user: { id: "mock-user" },
        }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          message: response.error ?? "Invalid or expired code",
        },
      }),
    });
  });
}
