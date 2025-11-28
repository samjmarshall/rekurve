import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export type PricingTier = 'foundation' | 'growth' | 'enterprise';

export class PricingSection {
  readonly page: Page;
  readonly container: Locator;
  readonly foundationCard: Locator;
  readonly growthCard: Locator;
  readonly enterpriseCard: Locator;
  readonly foundationCta: Locator;
  readonly growthCta: Locator;
  readonly enterpriseCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('#pricing');

    // Cards by data-testid
    this.foundationCard = page.locator('[data-testid="pricing-tier-foundation"]');
    this.growthCard = page.locator('[data-testid="pricing-tier-growth"]');
    this.enterpriseCard = page.locator('[data-testid="pricing-tier-enterprise"]');

    // CTAs within each card
    this.foundationCta = page.locator('[data-testid="pricing-cta-foundation"]');
    this.growthCta = page.locator('[data-testid="pricing-cta-growth"]');
    this.enterpriseCta = page.locator('[data-testid="pricing-cta-enterprise"]');
  }

  async scrollIntoView(): Promise<void> {
    await this.container.scrollIntoViewIfNeeded();
  }

  async clickTierCta(tier: PricingTier): Promise<void> {
    switch (tier) {
      case 'foundation':
        await this.foundationCta.click();
        break;
      case 'growth':
        await this.growthCta.click();
        break;
      case 'enterprise':
        await this.enterpriseCta.click();
        break;
    }
  }

  /** Get CTA locator for a specific tier */
  getTierCta(tier: PricingTier): Locator {
    switch (tier) {
      case 'foundation':
        return this.foundationCta;
      case 'growth':
        return this.growthCta;
      case 'enterprise':
        return this.enterpriseCta;
    }
  }

  async expectAllTiersVisible(): Promise<void> {
    await expect(this.foundationCard).toBeVisible();
    await expect(this.growthCard).toBeVisible();
    await expect(this.enterpriseCard).toBeVisible();
  }

  async expectTierPrice(tier: PricingTier, priceText: string | RegExp): Promise<void> {
    const card =
      tier === 'foundation'
        ? this.foundationCard
        : tier === 'growth'
          ? this.growthCard
          : this.enterpriseCard;
    await expect(card.getByText(priceText)).toBeVisible();
  }
}
