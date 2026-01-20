import type { Page } from '@playwright/test';
import { NavbarSection } from './sections/navbar.section';
import { HeroSection } from './sections/hero.section';
import { BookingFormSection } from './sections/booking-form.section';
import { FaqSection } from './sections/faq.section';
import { PricingSection } from './sections/pricing.section';
import { FinalCtaSection } from './sections/final-cta.section';

export class HomePage {
  readonly page: Page;
  readonly navbar: NavbarSection;
  readonly hero: HeroSection;
  readonly bookingForm: BookingFormSection;
  readonly faq: FaqSection;
  readonly pricing: PricingSection;
  readonly finalCta: FinalCtaSection;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new NavbarSection(page);
    this.hero = new HeroSection(page);
    this.bookingForm = new BookingFormSection(page);
    this.faq = new FaqSection(page);
    this.pricing = new PricingSection(page);
    this.finalCta = new FinalCtaSection(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoWithUtm(params: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  }): Promise<void> {
    const searchParams = new URLSearchParams();
    if (params.source) searchParams.set('utm_source', params.source);
    if (params.medium) searchParams.set('utm_medium', params.medium);
    if (params.campaign) searchParams.set('utm_campaign', params.campaign);
    if (params.term) searchParams.set('utm_term', params.term);
    if (params.content) searchParams.set('utm_content', params.content);

    await this.page.goto(`/?${searchParams.toString()}`);
  }

  async scrollToSection(sectionId: string): Promise<void> {
    await this.page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  }
}
