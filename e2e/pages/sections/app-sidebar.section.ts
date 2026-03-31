import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class AppSidebarSection {
  readonly page: Page;
  readonly container: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="app-sidebar"]');
    this.signOutButton = page.locator('[data-testid="sidebar-sign-out"]');
  }

  link(name: string): Locator {
    return this.container.locator(`[data-testid="sidebar-link-${name}"]`);
  }

  async expectVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.container).not.toBeVisible();
  }

  async expectActiveLink(name: string): Promise<void> {
    await expect(this.link(name)).toHaveAttribute("aria-current", "page");
  }

  async navigateTo(name: string): Promise<void> {
    await this.link(name).click();
  }
}
