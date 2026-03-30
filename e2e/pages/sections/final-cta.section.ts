import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class FinalCtaSection {
  readonly page: Page;
  readonly container: Locator;
  readonly heading: Locator;
  readonly primaryCta: Locator;
  readonly emailCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="final-cta-section"]');
    this.heading = this.container.getByRole("heading");
    this.primaryCta = page.locator('[data-testid="final-cta-primary"]');
    this.emailCta = page.locator('[data-testid="final-cta-email"]');
  }

  async scrollIntoView(): Promise<void> {
    await this.container.scrollIntoViewIfNeeded();
  }

  async clickPrimaryCta(): Promise<void> {
    await this.primaryCta.click();
  }

  async clickEmailCta(): Promise<void> {
    await this.emailCta.click();
  }

  async expectVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.primaryCta).toBeVisible();
  }
}
