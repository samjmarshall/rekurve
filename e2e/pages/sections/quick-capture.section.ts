import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class QuickCaptureSection {
  readonly page: Page;
  readonly fab: Locator;
  readonly dialog: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly notesTextarea: Locator;
  readonly leadSourceTrigger: Locator;
  readonly submitButton: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fab = page.locator('[data-testid="quick-capture-fab"]');
    this.dialog = page.locator('[data-testid="quick-capture-dialog"]');
    this.firstNameInput = page.locator(
      '[data-testid="quick-capture-first-name"]',
    );
    this.lastNameInput = page.locator(
      '[data-testid="quick-capture-last-name"]',
    );
    this.phoneInput = page.locator('[data-testid="quick-capture-phone"]');
    this.notesTextarea = page.locator('[data-testid="quick-capture-notes"]');
    this.leadSourceTrigger = page.locator(
      '[data-testid="quick-capture-lead-source"]',
    );
    this.submitButton = page.locator('[data-testid="quick-capture-submit"]');
    this.toast = page.locator('[data-testid="quick-capture-toast"]');
  }

  async open() {
    await this.fab.click();
    await expect(this.dialog).toBeVisible();
  }

  async fill(data: {
    firstName: string;
    lastName: string;
    phone: string;
    notes?: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.phoneInput.fill(data.phone);
    if (data.notes) await this.notesTextarea.fill(data.notes);
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectSuccessToast(name: string) {
    const toast = this.toast.filter({ hasText: "Lead created" });
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toContainText(name);
  }
}
