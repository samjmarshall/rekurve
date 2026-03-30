import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly container: Locator;
  readonly logo: Locator;

  // Email step
  readonly emailForm: Locator;
  readonly emailInput: Locator;
  readonly continueButton: Locator;

  // OTP step
  readonly otpForm: Locator;
  readonly otpInput: Locator;
  readonly otpEmail: Locator;
  readonly verifyButton: Locator;
  readonly backButton: Locator;
  readonly resendButton: Locator;

  // Shared
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="login-page"]');
    this.logo = this.container.locator("span").filter({ hasText: "REKURVE" });

    // Email step
    this.emailForm = page.locator('[data-testid="login-email-form"]');
    this.emailInput = page.locator('[data-testid="login-email-input"]');
    this.continueButton = page.locator('[data-testid="login-continue-button"]');

    // OTP step
    this.otpForm = page.locator('[data-testid="login-otp-form"]');
    this.otpInput = page.locator('[data-testid="login-otp-input"]');
    this.otpEmail = page.locator('[data-testid="login-otp-email"]');
    this.verifyButton = page.locator('[data-testid="login-verify-button"]');
    this.backButton = page.locator('[data-testid="login-back-button"]');
    this.resendButton = page.locator('[data-testid="login-resend-button"]');

    // Shared
    this.error = page.locator('[data-testid="login-error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async submitEmail(): Promise<void> {
    await this.continueButton.click();
  }

  async submitOtp(): Promise<void> {
    await this.verifyButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  async clickResend(): Promise<void> {
    await this.resendButton.click();
  }

  async expectEmailStep(): Promise<void> {
    await expect(this.emailForm).toBeVisible();
    await expect(this.otpForm).not.toBeVisible();
  }

  async expectOtpStep(): Promise<void> {
    await expect(this.otpForm).toBeVisible();
    await expect(this.emailForm).not.toBeVisible();
  }

  async expectError(message?: string): Promise<void> {
    await expect(this.error).toBeVisible();
    if (message) {
      await expect(this.error).toHaveText(message);
    }
  }

  async expectNoError(): Promise<void> {
    await expect(this.error).not.toBeVisible();
  }
}
