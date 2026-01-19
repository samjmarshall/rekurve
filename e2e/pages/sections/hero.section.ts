import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class HeroSection {
  readonly page: Page;
  readonly container: Locator;
  readonly heading: Locator;
  readonly primaryCta: Locator;
  readonly secondaryCta: Locator;
  readonly highlightAnnotation: Locator;
  readonly underlineAnnotation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="hero-section"]');
    this.heading = this.container.getByRole('heading', { level: 1 });
    this.primaryCta = page.locator('[data-testid="hero-cta-primary"]');
    this.secondaryCta = page.locator('[data-testid="hero-cta-secondary"]');
    // RoughNotation renders SVG elements for annotations
    this.highlightAnnotation = this.heading.locator('svg').first();
    this.underlineAnnotation = this.heading.locator('svg').last();
  }

  async clickPrimaryCta(): Promise<void> {
    await this.primaryCta.click();
  }

  async clickSecondaryCta(): Promise<void> {
    await this.secondaryCta.click();
  }

  async expectVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.primaryCta).toBeVisible();
  }

  async expectAnnotationsVisible(): Promise<void> {
    await expect(this.highlightAnnotation).toBeVisible();
    await expect(this.underlineAnnotation).toBeVisible();
  }
}
