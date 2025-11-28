import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class NavbarSection {
  readonly page: Page;
  readonly container: Locator;
  readonly ctaButton: Locator;
  readonly mobileMenuButton: Locator;
  readonly mobileMenu: Locator;
  readonly mobileCtaButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('header');
    this.ctaButton = page.locator('[data-testid="navbar-cta-desktop"]');
    this.mobileMenuButton = page.locator('[data-testid="navbar-mobile-menu-btn"]');
    this.mobileMenu = page.locator('[data-testid="navbar-mobile-menu"]');
    this.mobileCtaButton = page.locator('[data-testid="navbar-cta-mobile"]');
  }

  async clickCta(): Promise<void> {
    await this.ctaButton.click();
  }

  async openMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    await expect(this.mobileMenu).toBeVisible();
  }

  async closeMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    await expect(this.mobileMenu).toBeHidden();
  }

  async clickMobileCta(): Promise<void> {
    await this.mobileCtaButton.click();
  }

  async expectCtaVisible(): Promise<void> {
    await expect(this.ctaButton).toBeVisible();
  }
}
