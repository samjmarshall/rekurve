import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class FaqSection {
  readonly page: Page;
  readonly container: Locator;
  readonly searchInput: Locator;
  readonly searchClearButton: Locator;
  readonly noResultsMessage: Locator;
  readonly accordionItems: Locator;
  readonly bottomCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('#faq');
    this.searchInput = page.locator('[data-testid="faq-search-input"]');
    this.searchClearButton = page.locator('[data-testid="faq-search-clear"]');
    this.noResultsMessage = page.locator('[data-testid="faq-no-results"]');
    // Count accordion triggers (buttons with data-state) as a proxy for visible items
    this.accordionItems = this.container.locator('button[data-state]');
    this.bottomCta = page.locator('[data-testid="faq-cta-bottom"]');
  }

  async scrollIntoView(): Promise<void> {
    await this.container.scrollIntoViewIfNeeded();
    // Wait for scroll animation to complete (WebKit needs this)
    await this.page.waitForTimeout(300);
  }

  /** Wait for accordion animation to complete */
  private async waitForAccordionAnimation(): Promise<void> {
    // Accordion animations take ~300ms, add larger buffer for mobile WebKit
    await this.page.waitForTimeout(600);
  }

  /** Search FAQs */
  async search(query: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);
    await this.searchInput.fill(query);
    // Wait for debounce (500ms in implementation) + extra buffer for mobile WebKit rendering
    await this.page.waitForTimeout(1000);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible' });
    // Clear by filling with empty string and waiting for debounce
    await this.searchInput.fill('');
    await this.page.waitForTimeout(1000);
  }

  /** Expand an FAQ by question text */
  async expandQuestion(questionText: string | RegExp): Promise<void> {
    const item = this.container.getByRole('button', { name: questionText });
    await item.scrollIntoViewIfNeeded();
    await item.waitFor({ state: 'visible' });
    await item.click();
    await this.waitForAccordionAnimation();
  }

  /** Collapse an FAQ by question text */
  async collapseQuestion(questionText: string | RegExp): Promise<void> {
    const item = this.container.getByRole('button', { name: questionText });
    await item.scrollIntoViewIfNeeded();
    await item.waitFor({ state: 'visible' });
    await item.click();
    await this.waitForAccordionAnimation();
  }

  /** Get the accordion trigger by question text */
  getQuestionTrigger(questionText: string | RegExp): Locator {
    return this.container.getByRole('button', { name: questionText });
  }

  async clickBottomCta(): Promise<void> {
    await this.bottomCta.scrollIntoViewIfNeeded();
    await this.bottomCta.waitFor({ state: 'visible' });
    await this.bottomCta.click();
  }

  /** Get count of visible FAQ items (after search filtering) */
  async getVisibleCount(): Promise<number> {
    // Wait a moment for DOM to stabilize after any filtering
    await this.page.waitForTimeout(100);
    return await this.accordionItems.count();
  }

  async expectQuestionExpanded(questionText: string | RegExp): Promise<void> {
    const trigger = this.getQuestionTrigger(questionText);
    await expect(trigger).toHaveAttribute('data-state', 'open', { timeout: 5000 });
  }

  async expectQuestionCollapsed(questionText: string | RegExp): Promise<void> {
    const trigger = this.getQuestionTrigger(questionText);
    await expect(trigger).toHaveAttribute('data-state', 'closed', { timeout: 5000 });
  }

  async expectSearchResults(count: number): Promise<void> {
    // Wait for search filtering to complete
    await this.page.waitForTimeout(200);
    await expect(this.accordionItems).toHaveCount(count, { timeout: 5000 });
  }

  async expectNoResults(): Promise<void> {
    await expect(this.noResultsMessage).toBeVisible({ timeout: 5000 });
  }
}
