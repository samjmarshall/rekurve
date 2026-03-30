import { expect, test } from "../fixtures/test";
import { mockSendOtp, mockVerifyOtp } from "../utils/auth-mock";

const TEST_EMAIL = "test@example.com";

test.describe("Login Page — UI", () => {
  test("renders the email step with logo and form", async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.logo).toBeVisible();
    await loginPage.expectEmailStep();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.continueButton).toBeVisible();
    await expect(loginPage.continueButton).toHaveText("Continue");
  });

  test("email input has correct attributes", async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.emailInput).toHaveAttribute("type", "email");
    await expect(loginPage.emailInput).toHaveAttribute("required", "");
    await expect(loginPage.emailInput).toHaveAttribute("autocomplete", "email");
  });
});

/**
 * INTERACTIVE FORM TESTS — SKIPPED ON MOBILE WEBKIT
 *
 * Mobile WebKit (iPhone 14 emulation) has known issues with form submission
 * and step transitions in Playwright — button clicks don't trigger form submit.
 * Same root cause as booking-form.spec.ts mobile skip.
 * The component renders identically across viewports; behavior is tested on
 * desktop Chrome and tablet.
 */
test.describe("Login Page — Email Step", () => {
  test("transitions to OTP step on successful email submit", async ({
    loginPage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Mobile WebKit form submission issues",
    );
    await mockSendOtp(loginPage.page, { ok: true });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();

    await loginPage.expectOtpStep();
    await expect(loginPage.otpEmail).toHaveText(TEST_EMAIL);
  });

  test("shows error when OTP send fails", async ({ loginPage }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Mobile WebKit form submission issues",
    );
    await mockSendOtp(loginPage.page, { ok: false });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();

    await loginPage.expectEmailStep();
    await loginPage.expectError();
  });

  test("shows loading state while sending", async ({ loginPage }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Mobile WebKit form submission issues",
    );
    await loginPage.page.route(
      "**/api/auth/email-otp/send-verification-otp",
      async (route) => {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: true }),
        });
      },
    );
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();

    await expect(loginPage.continueButton).toHaveText("Sending...");
    await expect(loginPage.continueButton).toBeDisabled();
    await expect(loginPage.emailInput).toBeDisabled();
  });
});

test.describe("Login Page — OTP Step", () => {
  test.beforeEach(async ({ loginPage }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Mobile WebKit form submission issues",
    );
    await mockSendOtp(loginPage.page, { ok: true });
    await loginPage.goto();
    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();
  });

  test("shows error for invalid OTP", async ({ loginPage }) => {
    await mockVerifyOtp(loginPage.page, {
      ok: false,
      error: "Invalid or expired code",
    });

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await loginPage.expectError();
  });

  test("verify button is disabled until 6 digits entered", async ({
    loginPage,
  }) => {
    await expect(loginPage.verifyButton).toBeDisabled();

    await loginPage.page.keyboard.type("123");
    await expect(loginPage.verifyButton).toBeDisabled();

    await loginPage.page.keyboard.type("456");
    await expect(loginPage.verifyButton).toBeEnabled();
  });

  test("back button returns to email step", async ({ loginPage }) => {
    await loginPage.clickBack();
    await loginPage.expectEmailStep();
    await expect(loginPage.emailInput).toHaveValue(TEST_EMAIL);
  });

  test("resend button triggers new OTP send", async ({ loginPage }) => {
    let sendCount = 0;
    await loginPage.page.route(
      "**/api/auth/email-otp/send-verification-otp",
      (route) => {
        sendCount++;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: true }),
        });
      },
    );

    await loginPage.clickResend();
    await expect(loginPage.resendButton).toBeEnabled();
    expect(sendCount).toBe(1);
  });

  test("shows loading state while verifying", async ({ loginPage }) => {
    await loginPage.page.route(
      "**/api/auth/sign-in/email-otp",
      async (route) => {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ session: { id: "s" }, user: { id: "u" } }),
        });
      },
    );

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await expect(loginPage.verifyButton).toHaveText("Verifying...");
    await expect(loginPage.verifyButton).toBeDisabled();
  });
});

/**
 * POSTHOG EVENT TESTS — MARKED AS FIXME
 *
 * PostHog batches events and sends them asynchronously via sendBeacon()
 * on page unload. During E2E tests, events are queued but never sent
 * because the page doesn't naturally unload. See cta-tracking.spec.ts
 * for the full explanation and potential fix options.
 */
test.describe("Login Page — PostHog Events", () => {
  test.fixme(
    true,
    "PostHog events are batched and sent via sendBeacon — not capturable in E2E tests without flush config",
  );

  test("fires login_otp_requested on email submit", async ({
    loginPage,
    analytics,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();

    await loginPage.page.waitForTimeout(500);

    analytics
      .expectEvent("login_otp_requested")
      .withProperty("method", "email_otp")
      .toBeFired();
  });

  test("fires login_success on successful OTP verify", async ({
    loginPage,
    analytics,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await mockVerifyOtp(loginPage.page, { ok: true });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await loginPage.page.waitForTimeout(500);

    analytics
      .expectEvent("login_success")
      .withProperty("method", "email_otp")
      .toBeFired();
  });

  test("does not fire login_success on failed OTP verify", async ({
    loginPage,
    analytics,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await mockVerifyOtp(loginPage.page, { ok: false });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await loginPage.page.waitForTimeout(500);

    analytics.expectNoEvent("login_success");
  });
});
