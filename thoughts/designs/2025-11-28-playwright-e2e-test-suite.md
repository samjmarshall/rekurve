# Playwright E2E/Integration Test Suite Design

**Date**: 2025-11-28
**Status**: Validated
**Author**: Claude (Brainstorming Session)

---

## Overview

Automated E2E test suite for the Rekurve landing page using Playwright. Covers both functional UI testing and PostHog analytics verification.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics verification | Hybrid approach | Request interception for all tests; PostHog API verification CI-gated (`CI=true`) |
| Test organization | Both journey + feature | User journeys catch integration issues; feature tests provide isolated coverage |
| Page Object Model | Section-based | Mirrors `src/components/sections/` for easy maintenance |
| Analytics assertions | Fluent API | Prioritizes developer readability and low cognitive overhead |
| Test data | Factory + patterns | Unique data per run with identifiable `@test.rekurve.dev` domain |
| Viewport testing | File-based separation | `*.mobile.spec.ts` for mobile-specific tests |
| Scripts | Comprehensive + check integration | Full discoverability with `yarn check:e2e` for CI |

---

## Project Structure

```
www/
├── e2e/
│   ├── fixtures/
│   │   ├── test.ts                    # Extended test with analytics helper
│   │   └── analytics.fixture.ts       # PostHog interception + API verification
│   │
│   ├── pages/                         # Page Object Models
│   │   ├── home.page.ts               # Landing page (orchestrates sections)
│   │   └── sections/
│   │       ├── navbar.section.ts      # Header nav + mobile menu
│   │       ├── hero.section.ts        # Hero CTAs
│   │       ├── booking-form.section.ts # Multi-step form (5 steps)
│   │       ├── faq.section.ts         # Accordion + search
│   │       ├── pricing.section.ts     # Tier CTAs
│   │       └── final-cta.section.ts   # Bottom CTA
│   │
│   ├── data/
│   │   ├── test-users.ts              # Factory functions + patterns
│   │   └── form-data.ts               # Form field test data
│   │
│   ├── utils/
│   │   ├── analytics-helper.ts        # Fluent assertion API
│   │   └── posthog-api.ts             # PostHog API client (CI-only)
│   │
│   ├── journeys/                      # User journey tests (desktop)
│   │   ├── lead-conversion.spec.ts    # Full form completion
│   │   ├── visitor-exploration.spec.ts # Browse, FAQ, CTA clicks
│   │   └── form-abandonment.spec.ts   # Partial form + page leave
│   │
│   └── features/                      # Component/feature tests
│       ├── cta-tracking.spec.ts       # All 10 CTA locations
│       ├── booking-form.spec.ts       # Form validation, steps, submission
│       ├── faq.spec.ts                # Expand/collapse/search
│       ├── navigation.spec.ts         # Desktop nav, scroll behavior
│       ├── navigation.mobile.spec.ts  # Mobile menu toggle
│       ├── utm-session.spec.ts        # UTM capture, device detection
│       └── identity.spec.ts           # Anonymous → identified, email change
│
├── playwright.config.ts               # Playwright configuration
├── playwright/
│   └── .auth/                         # Auth state (gitignored)
└── test-results/                      # Artifacts (gitignored)
```

---

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,              // Fail if test.only left in CI
  retries: isCI ? 2 : 0,         // Retry flaky tests in CI only
  workers: isCI ? 1 : undefined, // Parallel locally, sequential in CI
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  outputDir: 'test-results/',

  use: {
    baseURL,
    trace: 'on-first-retry',     // Capture trace on retry for debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'yarn dev',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !isCI,  // Reuse local dev server
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
});
```

---

## Analytics Helper (Fluent Assertion API)

```typescript
// e2e/utils/analytics-helper.ts
import { Page, Request } from '@playwright/test';
import { expect } from '@playwright/test';

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

export class AnalyticsHelper {
  private page: Page;
  private capturedEvents: CapturedEvent[] = [];
  private isListening = false;

  constructor(page: Page) {
    this.page = page;
  }

  /** Start intercepting PostHog capture requests */
  async startCapturing(): Promise<void> {
    if (this.isListening) return;

    this.capturedEvents = [];
    this.isListening = true;

    await this.page.route('**/posthog.com/**', async (route) => {
      const request = route.request();

      if (request.method() === 'POST' && request.url().includes('/e/')) {
        try {
          const postData = request.postDataJSON();
          // PostHog batches events, handle both single and batch
          const events = Array.isArray(postData) ? postData : [postData];

          for (const event of events) {
            this.capturedEvents.push({
              event: event.event,
              properties: event.properties || {},
              timestamp: Date.now(),
            });
          }
        } catch {
          // Non-JSON request, ignore
        }
      }

      // Let the request continue (don't block analytics)
      await route.continue();
    });
  }

  /** Stop capturing and clear routes */
  async stopCapturing(): Promise<void> {
    await this.page.unroute('**/posthog.com/**');
    this.isListening = false;
  }

  /** Clear captured events (useful between test actions) */
  clearEvents(): void {
    this.capturedEvents = [];
  }

  /** Get all captured events */
  getEvents(): CapturedEvent[] {
    return [...this.capturedEvents];
  }

  /** Begin fluent assertion chain */
  expectEvent(eventName: string): EventAssertion {
    return new EventAssertion(eventName, this.capturedEvents);
  }

  /** Assert no events of a type were fired */
  expectNoEvent(eventName: string): void {
    const found = this.capturedEvents.filter(e => e.event === eventName);
    expect(found, `Expected no '${eventName}' events, but found ${found.length}`).toHaveLength(0);
  }
}

class EventAssertion {
  private eventName: string;
  private events: CapturedEvent[];
  private propertyMatchers: Array<{
    key: string;
    matcher: (value: unknown) => boolean;
    description: string;
  }> = [];

  constructor(eventName: string, events: CapturedEvent[]) {
    this.eventName = eventName;
    this.events = events;
  }

  /** Assert exact property value */
  withProperty(key: string, value: unknown): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => v === value,
      description: `${key} = ${JSON.stringify(value)}`,
    });
    return this;
  }

  /** Assert property matches regex */
  withPropertyMatching(key: string, pattern: RegExp): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => typeof v === 'string' && pattern.test(v),
      description: `${key} matches ${pattern}`,
    });
    return this;
  }

  /** Assert property exists (any value) */
  withPropertyPresent(key: string): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => v !== undefined && v !== null,
      description: `${key} is present`,
    });
    return this;
  }

  /** Assert property is one of the allowed values */
  withPropertyOneOf(key: string, allowedValues: unknown[]): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => allowedValues.includes(v),
      description: `${key} is one of [${allowedValues.join(', ')}]`,
    });
    return this;
  }

  /** Execute the assertion */
  toBeFired(): void {
    const matchingEvents = this.events.filter(e => e.event === this.eventName);

    expect(
      matchingEvents.length,
      `Expected '${this.eventName}' event to be fired, but it wasn't. ` +
      `Captured events: [${this.events.map(e => e.event).join(', ')}]`
    ).toBeGreaterThan(0);

    if (this.propertyMatchers.length === 0) return;

    // Find an event that matches ALL property conditions
    const fullyMatchingEvent = matchingEvents.find(event =>
      this.propertyMatchers.every(({ key, matcher }) =>
        matcher(event.properties[key])
      )
    );

    if (!fullyMatchingEvent) {
      const conditions = this.propertyMatchers.map(m => m.description).join(', ');
      const actualProps = matchingEvents.map(e => JSON.stringify(e.properties)).join('\n');

      expect.fail(
        `Expected '${this.eventName}' with [${conditions}], but no matching event found.\n` +
        `Actual '${this.eventName}' events:\n${actualProps}`
      );
    }
  }

  /** Assert event was fired exactly N times */
  toBeFiredTimes(count: number): void {
    const matchingEvents = this.events.filter(e => {
      if (e.event !== this.eventName) return false;
      if (this.propertyMatchers.length === 0) return true;
      return this.propertyMatchers.every(({ key, matcher }) =>
        matcher(e.properties[key])
      );
    });

    expect(matchingEvents).toHaveLength(count);
  }
}
```

---

## PostHog API Client (CI-Only Verification)

```typescript
// e2e/utils/posthog-api.ts
import { expect } from '@playwright/test';

const isCI = process.env.CI === 'true';
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com';

interface PostHogEvent {
  event: string;
  properties: Record<string, unknown>;
  distinct_id: string;
  timestamp: string;
}

interface PostHogPerson {
  distinct_ids: string[];
  properties: Record<string, unknown>;
}

export class PostHogApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      throw new Error(
        'PostHog API verification requires POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID environment variables'
      );
    }

    this.baseUrl = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}`;
    this.headers = {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /** Check if API verification is enabled (CI=true + credentials present) */
  static isEnabled(): boolean {
    return isCI && !!POSTHOG_API_KEY && !!POSTHOG_PROJECT_ID;
  }

  /**
   * Query recent events by distinct_id
   * Note: PostHog events may take a few seconds to appear in the API
   */
  async getRecentEvents(
    distinctId: string,
    options?: { eventName?: string; limit?: number }
  ): Promise<PostHogEvent[]> {
    const { eventName, limit = 100 } = options || {};

    const params = new URLSearchParams({
      distinct_id: distinctId,
      limit: limit.toString(),
    });

    if (eventName) {
      params.append('event', eventName);
    }

    const response = await fetch(`${this.baseUrl}/events/?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /** Get person profile by distinct_id */
  async getPerson(distinctId: string): Promise<PostHogPerson | null> {
    const params = new URLSearchParams({
      distinct_id: distinctId,
    });

    const response = await fetch(`${this.baseUrl}/persons/?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.[0] || null;
  }

  /**
   * Wait for an event to appear in PostHog API
   * Retries with exponential backoff due to ingestion delay
   */
  async waitForEvent(
    distinctId: string,
    eventName: string,
    options?: {
      timeoutMs?: number;
      properties?: Record<string, unknown>;
    }
  ): Promise<PostHogEvent> {
    const { timeoutMs = 30_000, properties } = options || {};
    const startTime = Date.now();
    let lastError: Error | null = null;
    let delay = 1000; // Start with 1s delay

    while (Date.now() - startTime < timeoutMs) {
      try {
        const events = await this.getRecentEvents(distinctId, { eventName });

        const matchingEvent = events.find(event => {
          if (!properties) return true;
          return Object.entries(properties).every(
            ([key, value]) => event.properties[key] === value
          );
        });

        if (matchingEvent) {
          return matchingEvent;
        }
      } catch (error) {
        lastError = error as Error;
      }

      // Wait before retrying (exponential backoff, max 5s)
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000);
    }

    throw new Error(
      `Timed out waiting for '${eventName}' event for distinct_id '${distinctId}'. ` +
      (lastError ? `Last error: ${lastError.message}` : '')
    );
  }

  /**
   * Wait for person profile to exist and have expected properties
   */
  async waitForPerson(
    distinctId: string,
    options?: {
      timeoutMs?: number;
      expectedProperties?: Record<string, unknown>;
    }
  ): Promise<PostHogPerson> {
    const { timeoutMs = 30_000, expectedProperties } = options || {};
    const startTime = Date.now();
    let delay = 1000;

    while (Date.now() - startTime < timeoutMs) {
      const person = await this.getPerson(distinctId);

      if (person) {
        if (!expectedProperties) {
          return person;
        }

        const hasAllProperties = Object.entries(expectedProperties).every(
          ([key, value]) => person.properties[key] === value
        );

        if (hasAllProperties) {
          return person;
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000);
    }

    throw new Error(
      `Timed out waiting for person '${distinctId}' with expected properties`
    );
  }
}

/**
 * Helper to conditionally run PostHog API assertions
 * Skips gracefully when not in CI or credentials missing
 */
export async function withPostHogApiVerification(
  fn: (client: PostHogApiClient) => Promise<void>
): Promise<void> {
  if (!PostHogApiClient.isEnabled()) {
    // Skip API verification in local development
    return;
  }

  const client = new PostHogApiClient();
  await fn(client);
}
```

---

## Test Fixtures

```typescript
// e2e/fixtures/test.ts
import { test as base, Page } from '@playwright/test';
import { AnalyticsHelper } from '../utils/analytics-helper';
import { HomePage } from '../pages/home.page';

// Declare custom fixture types
type TestFixtures = {
  analytics: AnalyticsHelper;
  homePage: HomePage;
};

export const test = base.extend<TestFixtures>({
  // Analytics helper - auto-starts capturing, auto-stops on teardown
  analytics: async ({ page }, use) => {
    const analytics = new AnalyticsHelper(page);
    await analytics.startCapturing();

    await use(analytics);

    await analytics.stopCapturing();
  },

  // Home page POM - ready to use
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// e2e/fixtures/analytics.fixture.ts
import { test as base } from './test';
import { PostHogApiClient, withPostHogApiVerification } from '../utils/posthog-api';

// Extended fixture for tests that need PostHog API verification
type AnalyticsApiFixtures = {
  posthogApi: typeof withPostHogApiVerification;
  isApiVerificationEnabled: boolean;
};

export const test = base.extend<AnalyticsApiFixtures>({
  // Convenience wrapper for conditional API verification
  posthogApi: async ({}, use) => {
    await use(withPostHogApiVerification);
  },

  // Flag to check if API verification is available
  isApiVerificationEnabled: async ({}, use) => {
    await use(PostHogApiClient.isEnabled());
  },
});

export { expect } from '@playwright/test';
```

---

## Test Data Factories

```typescript
// e2e/data/test-users.ts

/** Identifiable test email domain for PostHog filtering */
export const TEST_EMAIL_DOMAIN = '@test.rekurve.dev';
export const TEST_NAME_PREFIX = 'Playwright';

export interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  companySize: string;
  industry: string;
  location: string;
  timeline: string;
  currentMrr: string;
  challenges: string[];
  goals: string[];
}

/** Generate unique test user with timestamp */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  const timestamp = Date.now();
  const uniqueId = timestamp.toString(36); // Shorter unique string

  return {
    email: `${TEST_NAME_PREFIX.toLowerCase()}-${uniqueId}${TEST_EMAIL_DOMAIN}`,
    firstName: TEST_NAME_PREFIX,
    lastName: `User ${uniqueId}`,
    phone: '+61400000000',
    company: `Test Company ${uniqueId}`,
    companySize: '11-20',
    industry: 'Technology',
    location: 'Brisbane',
    timeline: '1-3 months',
    currentMrr: '$10k-$50k',
    challenges: ['Lead qualification taking too long'],
    goals: ['Automate lead research'],
    ...overrides,
  };
}

/** Create user for abandonment tests (partial data) */
export function createAbandonmentUser(overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    email: `abandon-${Date.now().toString(36)}${TEST_EMAIL_DOMAIN}`,
    ...overrides,
  });
}

/** Create user for identity flow tests */
export function createIdentityTestUser(
  variant: 'first' | 'changed',
  overrides?: Partial<TestUser>
): TestUser {
  const timestamp = Date.now().toString(36);
  const prefix = variant === 'first' ? 'identity' : 'identity-changed';

  return createTestUser({
    email: `${prefix}-${timestamp}${TEST_EMAIL_DOMAIN}`,
    ...overrides,
  });
}
```

```typescript
// e2e/data/form-data.ts

/** Valid form data for each step */
export const validFormSteps = {
  step1: {
    email: '', // Use from TestUser
    firstName: '',
    lastName: '',
  },
  step2: {
    company: '',
    companySize: '11-20',
    industry: 'Technology',
    location: 'Brisbane',
  },
  step3: {
    challenges: ['Lead qualification taking too long'],
  },
  step4: {
    goals: ['Automate lead research'],
    timeline: '1-3 months',
    currentMrr: '$10k-$50k',
  },
};

/** Invalid data for validation testing */
export const invalidFormData = {
  email: {
    empty: '',
    noAt: 'invalid-email',
    noDomain: 'test@',
    noTld: 'test@example',
  },
  phone: {
    tooShort: '123',
    letters: 'abc123def',
  },
};

/** Company size options (matches form select) */
export const companySizeOptions = [
  '1-5',
  '6-10',
  '11-20',
  '21-50',
  '51-100',
  '100+',
] as const;

/** Industry options (matches form select) */
export const industryOptions = [
  'Technology',
  'Finance',
  'Healthcare',
  'E-commerce',
  'Professional Services',
  'Other',
] as const;

/** Timeline options (matches form select) */
export const timelineOptions = [
  'Immediately',
  '1-3 months',
  '3-6 months',
  '6+ months',
] as const;
```

---

## Page Object Models

### Home Page (Orchestrator)

```typescript
// e2e/pages/home.page.ts
import { Page } from '@playwright/test';
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

  /** Scroll to a section by ID */
  async scrollToSection(sectionId: string): Promise<void> {
    await this.page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  }
}
```

### Navbar Section

```typescript
// e2e/pages/sections/navbar.section.ts
import { Page, Locator, expect } from '@playwright/test';

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
    this.ctaButton = this.container.getByRole('link', { name: /book a call/i });
    this.mobileMenuButton = this.container.getByRole('button', { name: /menu|toggle/i });
    this.mobileMenu = page.locator('[data-mobile-menu]');
    this.mobileCtaButton = this.mobileMenu.getByRole('link', { name: /book a call/i });
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
```

### Hero Section

```typescript
// e2e/pages/sections/hero.section.ts
import { Page, Locator, expect } from '@playwright/test';

export class HeroSection {
  readonly page: Page;
  readonly container: Locator;
  readonly heading: Locator;
  readonly primaryCta: Locator;
  readonly secondaryCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('section').filter({ has: page.getByRole('heading', { level: 1 }) }).first();
    this.heading = this.container.getByRole('heading', { level: 1 });
    this.primaryCta = this.container.getByRole('link', { name: /book a (strategy )?call/i }).first();
    this.secondaryCta = this.container.getByRole('link', { name: /how it works|see how|learn more/i }).first();
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
}
```

### Booking Form Section

```typescript
// e2e/pages/sections/booking-form.section.ts
import { Page, Locator, expect } from '@playwright/test';
import { TestUser } from '../../data/test-users';

export class BookingFormSection {
  readonly page: Page;
  readonly container: Locator;
  readonly stepIndicator: Locator;
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly submitButton: Locator;

  // Step 1 fields
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;

  // Step 2 fields
  readonly companyInput: Locator;
  readonly companySizeSelect: Locator;
  readonly industrySelect: Locator;
  readonly locationInput: Locator;

  // Step 3 fields
  readonly challengesCheckboxes: Locator;

  // Step 4 fields
  readonly goalsCheckboxes: Locator;
  readonly timelineSelect: Locator;
  readonly currentMrrSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-booking-form], #booking-form, form').filter({ hasText: /book/i }).first();
    this.stepIndicator = this.container.locator('[data-step-indicator]');
    this.nextButton = this.container.getByRole('button', { name: /next|continue/i });
    this.prevButton = this.container.getByRole('button', { name: /back|previous/i });
    this.submitButton = this.container.getByRole('button', { name: /submit|book|schedule/i });

    // Step 1
    this.emailInput = this.container.getByLabel(/email/i);
    this.firstNameInput = this.container.getByLabel(/first name/i);
    this.lastNameInput = this.container.getByLabel(/last name/i);

    // Step 2
    this.companyInput = this.container.getByLabel(/company name/i);
    this.companySizeSelect = this.container.getByLabel(/company size|team size/i);
    this.industrySelect = this.container.getByLabel(/industry/i);
    this.locationInput = this.container.getByLabel(/location/i);

    // Step 3
    this.challengesCheckboxes = this.container.locator('[data-challenges] input[type="checkbox"]');

    // Step 4
    this.goalsCheckboxes = this.container.locator('[data-goals] input[type="checkbox"]');
    this.timelineSelect = this.container.getByLabel(/timeline/i);
    this.currentMrrSelect = this.container.getByLabel(/mrr|revenue/i);
  }

  async scrollIntoView(): Promise<void> {
    await this.container.scrollIntoViewIfNeeded();
  }

  async focusFirstField(): Promise<void> {
    await this.emailInput.focus();
  }

  /** Fill Step 1: Basic Info */
  async fillStep1(user: TestUser): Promise<void> {
    await this.emailInput.fill(user.email);
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
  }

  /** Fill Step 2: Company Details */
  async fillStep2(user: TestUser): Promise<void> {
    await this.companyInput.fill(user.company);
    await this.companySizeSelect.selectOption(user.companySize);
    await this.industrySelect.selectOption(user.industry);
    await this.locationInput.fill(user.location);
  }

  /** Fill Step 3: Challenges */
  async fillStep3(user: TestUser): Promise<void> {
    for (const challenge of user.challenges) {
      await this.container.getByLabel(challenge, { exact: false }).check();
    }
  }

  /** Fill Step 4: Goals */
  async fillStep4(user: TestUser): Promise<void> {
    for (const goal of user.goals) {
      await this.container.getByLabel(goal, { exact: false }).check();
    }
    await this.timelineSelect.selectOption(user.timeline);
    await this.currentMrrSelect.selectOption(user.currentMrr);
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async clickPrev(): Promise<void> {
    await this.prevButton.click();
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Complete all steps and submit */
  async completeAllSteps(user: TestUser): Promise<void> {
    await this.scrollIntoView();

    // Step 1
    await this.fillStep1(user);
    await this.clickNext();

    // Step 2
    await this.fillStep2(user);
    await this.clickNext();

    // Step 3
    await this.fillStep3(user);
    await this.clickNext();

    // Step 4
    await this.fillStep4(user);
    await this.clickSubmit();
  }

  /** Get current step number from indicator */
  async getCurrentStep(): Promise<number> {
    const text = await this.stepIndicator.textContent();
    const match = text?.match(/step\s*(\d)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  async expectStep(stepNumber: number): Promise<void> {
    await expect(this.stepIndicator).toContainText(`${stepNumber}`, { ignoreCase: true });
  }

  async expectValidationError(message: string | RegExp): Promise<void> {
    await expect(this.container.getByText(message)).toBeVisible();
  }
}
```

### FAQ Section

```typescript
// e2e/pages/sections/faq.section.ts
import { Page, Locator, expect } from '@playwright/test';

export class FaqSection {
  readonly page: Page;
  readonly container: Locator;
  readonly searchInput: Locator;
  readonly searchClearButton: Locator;
  readonly accordionItems: Locator;
  readonly bottomCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('section').filter({ hasText: /frequently asked|faq/i }).first();
    this.searchInput = this.container.getByPlaceholder(/search|find/i);
    this.searchClearButton = this.container.getByRole('button', { name: /clear/i });
    this.accordionItems = this.container.locator('[data-accordion-item], [data-faq-item]');
    this.bottomCta = this.container.getByRole('link', { name: /book a call|get started/i });
  }

  async scrollIntoView(): Promise<void> {
    await this.container.scrollIntoViewIfNeeded();
  }

  /** Search FAQs */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for debounce (500ms in implementation)
    await this.page.waitForTimeout(600);
  }

  async clearSearch(): Promise<void> {
    await this.searchClearButton.click();
  }

  /** Expand an FAQ by question text */
  async expandQuestion(questionText: string | RegExp): Promise<void> {
    const item = this.container.getByRole('button', { name: questionText });
    await item.click();
  }

  /** Collapse an FAQ by question text */
  async collapseQuestion(questionText: string | RegExp): Promise<void> {
    const item = this.container.getByRole('button', { name: questionText });
    await item.click();
  }

  /** Get the accordion trigger by question text */
  getQuestionTrigger(questionText: string | RegExp): Locator {
    return this.container.getByRole('button', { name: questionText });
  }

  /** Get the answer content panel for a question */
  getAnswerContent(questionText: string | RegExp): Locator {
    const trigger = this.getQuestionTrigger(questionText);
    return trigger.locator('~ [data-accordion-content], + [data-accordion-content]').first();
  }

  async clickBottomCta(): Promise<void> {
    await this.bottomCta.click();
  }

  /** Get count of visible FAQ items (after search filtering) */
  async getVisibleCount(): Promise<number> {
    return await this.accordionItems.filter({ has: this.page.locator(':visible') }).count();
  }

  async expectQuestionExpanded(questionText: string | RegExp): Promise<void> {
    const trigger = this.getQuestionTrigger(questionText);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  }

  async expectQuestionCollapsed(questionText: string | RegExp): Promise<void> {
    const trigger = this.getQuestionTrigger(questionText);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }

  async expectSearchResults(count: number): Promise<void> {
    await expect(this.accordionItems).toHaveCount(count);
  }

  async expectNoResults(): Promise<void> {
    await expect(this.container.getByText(/no results|no questions found/i)).toBeVisible();
  }
}
```

### Pricing Section

```typescript
// e2e/pages/sections/pricing.section.ts
import { Page, Locator, expect } from '@playwright/test';

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
    this.container = page.locator('section').filter({ hasText: /pricing|plans/i }).first();

    // Cards by tier name or data attribute
    this.foundationCard = this.container.locator('[data-tier="foundation"], [data-pricing-tier="foundation"]')
      .or(this.container.locator('div').filter({ hasText: /foundation/i }).first());
    this.growthCard = this.container.locator('[data-tier="growth"], [data-pricing-tier="growth"]')
      .or(this.container.locator('div').filter({ hasText: /growth/i }).first());
    this.enterpriseCard = this.container.locator('[data-tier="enterprise"], [data-pricing-tier="enterprise"]')
      .or(this.container.locator('div').filter({ hasText: /enterprise/i }).first());

    // CTAs within each card
    this.foundationCta = this.foundationCard.getByRole('link', { name: /get started|book|start/i });
    this.growthCta = this.growthCard.getByRole('link', { name: /get started|book|start/i });
    this.enterpriseCta = this.enterpriseCard.getByRole('link', { name: /get started|book|contact/i });
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
    const card = tier === 'foundation' ? this.foundationCard
      : tier === 'growth' ? this.growthCard
      : this.enterpriseCard;
    await expect(card.getByText(priceText)).toBeVisible();
  }
}
```

### Final CTA Section

```typescript
// e2e/pages/sections/final-cta.section.ts
import { Page, Locator, expect } from '@playwright/test';

export class FinalCtaSection {
  readonly page: Page;
  readonly container: Locator;
  readonly heading: Locator;
  readonly primaryCta: Locator;
  readonly secondaryCta: Locator;

  constructor(page: Page) {
    this.page = page;
    // Final CTA is typically near the bottom, before footer
    this.container = page.locator('section').filter({ hasText: /ready to|get started|book.*call/i }).last();
    this.heading = this.container.getByRole('heading');
    this.primaryCta = this.container.getByRole('link', { name: /book a call|get started|schedule/i }).first();
    this.secondaryCta = this.container.getByRole('link', { name: /email|contact|questions/i }).first();
  }

  async scrollIntoView(): Promise<void> {
    await this.container.scrollIntoViewIfNeeded();
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
}
```

---

## Test Files

### User Journey Tests

```typescript
// e2e/journeys/lead-conversion.spec.ts
import { test, expect } from '../fixtures/analytics.fixture';
import { createTestUser } from '../data/test-users';

test.describe('Lead Conversion Journey', () => {
  test('completes full booking form and tracks all events', async ({
    homePage,
    analytics,
    posthogApi
  }) => {
    const testUser = createTestUser();

    // Land on page
    await homePage.goto();

    // Click hero CTA to scroll to form
    await homePage.hero.clickPrimaryCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'hero_primary')
      .toBeFired();

    // Focus form field triggers form started
    await homePage.bookingForm.focusFirstField();

    analytics
      .expectEvent('booking_form_started')
      .withPropertyPresent('entry_point')
      .toBeFired();

    // Complete Step 1
    await homePage.bookingForm.fillStep1(testUser);
    await homePage.bookingForm.clickNext();

    analytics
      .expectEvent('form_step_completed')
      .withProperty('step', 1)
      .withProperty('step_name', 'basic_info')
      .toBeFired();

    analytics
      .expectEvent('lead_identified')
      .withProperty('identification_point', 'step_1_complete')
      .toBeFired();

    // Complete Step 2
    await homePage.bookingForm.fillStep2(testUser);
    await homePage.bookingForm.clickNext();

    analytics
      .expectEvent('form_step_completed')
      .withProperty('step', 2)
      .withProperty('step_name', 'company_details')
      .toBeFired();

    // Complete Step 3
    await homePage.bookingForm.fillStep3(testUser);
    await homePage.bookingForm.clickNext();

    analytics
      .expectEvent('form_step_completed')
      .withProperty('step', 3)
      .withProperty('step_name', 'challenges')
      .toBeFired();

    // Complete Step 4 and submit
    await homePage.bookingForm.fillStep4(testUser);
    await homePage.bookingForm.clickSubmit();

    analytics
      .expectEvent('form_step_completed')
      .withProperty('step', 4)
      .withProperty('step_name', 'goals')
      .toBeFired();

    analytics
      .expectEvent('booking_form_submitted')
      .withProperty('lead_email', testUser.email)
      .withProperty('lead_company', testUser.company)
      .toBeFired();

    // CI-only: Verify person profile in PostHog
    await posthogApi(async (client) => {
      const person = await client.waitForPerson(testUser.email, {
        expectedProperties: {
          email: testUser.email,
          company: testUser.company,
        },
      });

      expect(person.properties).toHaveProperty('first_seen');
      expect(person.properties).toHaveProperty('form_completed', true);
    });
  });
});
```

```typescript
// e2e/journeys/visitor-exploration.spec.ts
import { test, expect } from '../fixtures/test';

test.describe('Visitor Exploration Journey', () => {
  test('browses page sections and interacts with FAQ', async ({
    homePage,
    analytics
  }) => {
    await homePage.goto();

    // Verify hero loads
    await homePage.hero.expectVisible();

    // Click secondary CTA to see how it works
    await homePage.hero.clickSecondaryCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'hero_secondary')
      .toBeFired();

    // Scroll to FAQ and explore
    await homePage.faq.scrollIntoView();

    // Expand first question
    await homePage.faq.expandQuestion(/what.*roi|how much.*save/i);

    analytics
      .expectEvent('faq_expanded')
      .withPropertyPresent('question_id')
      .withPropertyPresent('question')
      .toBeFired();

    // Search FAQs
    analytics.clearEvents();
    await homePage.faq.search('pricing');

    analytics
      .expectEvent('faq_searched')
      .withProperty('query', 'pricing')
      .withPropertyPresent('results_count')
      .toBeFired();

    // Click FAQ bottom CTA
    analytics.clearEvents();
    await homePage.faq.clickBottomCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'faq_bottom')
      .toBeFired();
  });
});
```

```typescript
// e2e/journeys/form-abandonment.spec.ts
import { test, expect } from '../fixtures/test';
import { createAbandonmentUser } from '../data/test-users';

test.describe('Form Abandonment Journey', () => {
  test('tracks abandonment when user leaves mid-form', async ({
    homePage,
    analytics,
    page
  }) => {
    const testUser = createAbandonmentUser();

    await homePage.goto();
    await homePage.bookingForm.scrollIntoView();

    // Start form
    await homePage.bookingForm.focusFirstField();

    analytics
      .expectEvent('booking_form_started')
      .toBeFired();

    // Complete only Step 1
    await homePage.bookingForm.fillStep1(testUser);
    await homePage.bookingForm.clickNext();

    analytics
      .expectEvent('form_step_completed')
      .withProperty('step', 1)
      .toBeFired();

    analytics
      .expectEvent('lead_identified')
      .toBeFired();

    // Clear events before abandonment
    analytics.clearEvents();

    // Navigate away (triggers abandonment)
    await page.goto('https://example.com');

    // Wait for beforeunload event to fire
    await page.waitForTimeout(500);

    analytics
      .expectEvent('booking_form_abandoned')
      .withProperty('last_step', 2)
      .withProperty('reason', 'page_leave')
      .toBeFired();
  });
});
```

### Feature Tests

```typescript
// e2e/features/cta-tracking.spec.ts
import { test, expect } from '../fixtures/test';

test.describe('CTA Click Tracking', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('tracks header CTA click', async ({ homePage, analytics }) => {
    await homePage.navbar.clickCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'header')
      .withPropertyMatching('cta_text', /book/i)
      .toBeFired();
  });

  test('tracks hero primary CTA click', async ({ homePage, analytics }) => {
    await homePage.hero.clickPrimaryCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'hero_primary')
      .toBeFired();
  });

  test('tracks hero secondary CTA click', async ({ homePage, analytics }) => {
    await homePage.hero.clickSecondaryCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'hero_secondary')
      .toBeFired();
  });

  test('tracks pricing foundation CTA click', async ({ homePage, analytics }) => {
    await homePage.pricing.scrollIntoView();
    await homePage.pricing.clickTierCta('foundation');

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'pricing_foundation')
      .toBeFired();
  });

  test('tracks pricing growth CTA click', async ({ homePage, analytics }) => {
    await homePage.pricing.scrollIntoView();
    await homePage.pricing.clickTierCta('growth');

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'pricing_growth')
      .toBeFired();
  });

  test('tracks pricing enterprise CTA click', async ({ homePage, analytics }) => {
    await homePage.pricing.scrollIntoView();
    await homePage.pricing.clickTierCta('enterprise');

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'pricing_enterprise')
      .toBeFired();
  });

  test('tracks final CTA primary click', async ({ homePage, analytics }) => {
    await homePage.finalCta.scrollIntoView();
    await homePage.finalCta.clickPrimaryCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'final_cta_primary')
      .toBeFired();
  });

  test('tracks final CTA email click', async ({ homePage, analytics }) => {
    await homePage.finalCta.scrollIntoView();
    await homePage.finalCta.clickSecondaryCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'final_cta_email')
      .toBeFired();
  });

  test('tracks FAQ bottom CTA click', async ({ homePage, analytics }) => {
    await homePage.faq.scrollIntoView();
    await homePage.faq.clickBottomCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'faq_bottom')
      .toBeFired();
  });
});
```

```typescript
// e2e/features/booking-form.spec.ts
import { test, expect } from '../fixtures/test';
import { createTestUser } from '../data/test-users';
import { invalidFormData } from '../data/form-data';

test.describe('Booking Form', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.bookingForm.scrollIntoView();
  });

  test.describe('Form Navigation', () => {
    test('starts at step 1', async ({ homePage }) => {
      await homePage.bookingForm.expectStep(1);
    });

    test('advances to next step on valid input', async ({ homePage }) => {
      const testUser = createTestUser();

      await homePage.bookingForm.fillStep1(testUser);
      await homePage.bookingForm.clickNext();

      await homePage.bookingForm.expectStep(2);
    });

    test('goes back to previous step', async ({ homePage }) => {
      const testUser = createTestUser();

      await homePage.bookingForm.fillStep1(testUser);
      await homePage.bookingForm.clickNext();
      await homePage.bookingForm.expectStep(2);

      await homePage.bookingForm.clickPrev();
      await homePage.bookingForm.expectStep(1);
    });

    test('preserves data when navigating back', async ({ homePage }) => {
      const testUser = createTestUser();

      await homePage.bookingForm.fillStep1(testUser);
      await homePage.bookingForm.clickNext();
      await homePage.bookingForm.clickPrev();

      await expect(homePage.bookingForm.emailInput).toHaveValue(testUser.email);
      await expect(homePage.bookingForm.firstNameInput).toHaveValue(testUser.firstName);
    });
  });

  test.describe('Form Validation', () => {
    test('shows error for empty email', async ({ homePage, analytics }) => {
      await homePage.bookingForm.firstNameInput.fill('Test');
      await homePage.bookingForm.lastNameInput.fill('User');
      await homePage.bookingForm.clickNext();

      await homePage.bookingForm.expectValidationError(/email.*required/i);

      analytics
        .expectEvent('form_field_interaction')
        .withProperty('action', 'error')
        .withPropertyMatching('error_message', /email/i)
        .toBeFired();
    });

    test('shows error for invalid email format', async ({ homePage, analytics }) => {
      await homePage.bookingForm.emailInput.fill(invalidFormData.email.noAt);
      await homePage.bookingForm.firstNameInput.fill('Test');
      await homePage.bookingForm.lastNameInput.fill('User');
      await homePage.bookingForm.clickNext();

      await homePage.bookingForm.expectValidationError(/valid email|invalid email/i);

      analytics
        .expectEvent('form_field_interaction')
        .withProperty('action', 'error')
        .toBeFired();
    });

    test('shows error for empty required fields', async ({ homePage }) => {
      await homePage.bookingForm.emailInput.fill('test@example.com');
      // Leave first name and last name empty
      await homePage.bookingForm.clickNext();

      await homePage.bookingForm.expectValidationError(/required/i);
    });
  });

  test.describe('Step Completion Tracking', () => {
    test('tracks time spent on each step', async ({ homePage, analytics }) => {
      const testUser = createTestUser();

      await homePage.bookingForm.focusFirstField();

      // Spend some time on step 1
      await homePage.bookingForm.fillStep1(testUser);
      await homePage.bookingForm.page.waitForTimeout(1000);
      await homePage.bookingForm.clickNext();

      analytics
        .expectEvent('form_step_completed')
        .withProperty('step', 1)
        .withPropertyPresent('time_spent_ms')
        .toBeFired();
    });
  });
});
```

```typescript
// e2e/features/faq.spec.ts
import { test, expect } from '../fixtures/test';

test.describe('FAQ Section', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.faq.scrollIntoView();
  });

  test.describe('Accordion Behavior', () => {
    test('expands question on click', async ({ homePage }) => {
      await homePage.faq.expandQuestion(/what.*roi/i);
      await homePage.faq.expectQuestionExpanded(/what.*roi/i);
    });

    test('collapses expanded question on second click', async ({ homePage }) => {
      await homePage.faq.expandQuestion(/what.*roi/i);
      await homePage.faq.expectQuestionExpanded(/what.*roi/i);

      await homePage.faq.collapseQuestion(/what.*roi/i);
      await homePage.faq.expectQuestionCollapsed(/what.*roi/i);
    });

    test('tracks expand event with question details', async ({ homePage, analytics }) => {
      await homePage.faq.expandQuestion(/what.*roi/i);

      analytics
        .expectEvent('faq_expanded')
        .withPropertyPresent('question_id')
        .withPropertyPresent('question')
        .withPropertyPresent('category')
        .toBeFired();
    });

    test('tracks collapse event', async ({ homePage, analytics }) => {
      await homePage.faq.expandQuestion(/what.*roi/i);
      analytics.clearEvents();

      await homePage.faq.collapseQuestion(/what.*roi/i);

      analytics
        .expectEvent('faq_collapsed')
        .withPropertyPresent('question_id')
        .toBeFired();
    });
  });

  test.describe('Search Functionality', () => {
    test('filters questions by search query', async ({ homePage }) => {
      await homePage.faq.search('pricing');

      // Should show fewer results than total
      const visibleCount = await homePage.faq.getVisibleCount();
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('tracks search event with query and results', async ({ homePage, analytics }) => {
      await homePage.faq.search('integration');

      analytics
        .expectEvent('faq_searched')
        .withProperty('query', 'integration')
        .withPropertyPresent('results_count')
        .withPropertyPresent('has_results')
        .toBeFired();
    });

    test('clears search and shows all questions', async ({ homePage }) => {
      await homePage.faq.search('pricing');
      await homePage.faq.clearSearch();

      await expect(homePage.faq.searchInput).toHaveValue('');
    });

    test('shows no results message for unmatched query', async ({ homePage }) => {
      await homePage.faq.search('xyznonexistentquery123');
      await homePage.faq.expectNoResults();
    });
  });
});
```

```typescript
// e2e/features/navigation.spec.ts
import { test, expect } from '../fixtures/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('header CTA is visible on load', async ({ homePage }) => {
    await homePage.navbar.expectCtaVisible();
  });

  test('scrolls to booking form when CTA clicked', async ({ homePage, page }) => {
    await homePage.navbar.clickCta();

    // Wait for scroll animation
    await page.waitForTimeout(500);

    // Booking form should be in viewport
    await expect(homePage.bookingForm.container).toBeInViewport();
  });

  test('hero secondary CTA scrolls to how-it-works section', async ({ homePage, page }) => {
    await homePage.hero.clickSecondaryCta();

    await page.waitForTimeout(500);

    // How it works section should be visible
    const howItWorksSection = page.locator('section').filter({ hasText: /how it works/i });
    await expect(howItWorksSection).toBeInViewport();
  });
});
```

```typescript
// e2e/features/navigation.mobile.spec.ts
import { test, expect } from '../fixtures/test';

// Only run on mobile project
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('shows hamburger menu on mobile', async ({ homePage }) => {
    await expect(homePage.navbar.mobileMenuButton).toBeVisible();
  });

  test('hides desktop CTA on mobile', async ({ homePage }) => {
    await expect(homePage.navbar.ctaButton).toBeHidden();
  });

  test('opens mobile menu on hamburger click', async ({ homePage }) => {
    await homePage.navbar.openMobileMenu();
    await expect(homePage.navbar.mobileMenu).toBeVisible();
  });

  test('closes mobile menu on second click', async ({ homePage }) => {
    await homePage.navbar.openMobileMenu();
    await homePage.navbar.closeMobileMenu();
    await expect(homePage.navbar.mobileMenu).toBeHidden();
  });

  test('tracks mobile nav CTA click', async ({ homePage, analytics }) => {
    await homePage.navbar.openMobileMenu();
    await homePage.navbar.clickMobileCta();

    analytics
      .expectEvent('cta_clicked')
      .withProperty('location', 'mobile_nav')
      .toBeFired();
  });
});
```

```typescript
// e2e/features/utm-session.spec.ts
import { test, expect } from '../fixtures/test';

test.describe('UTM & Session Tracking', () => {
  test.describe('UTM Parameter Capture', () => {
    test('captures all UTM parameters on page load', async ({ homePage, analytics }) => {
      await homePage.gotoWithUtm({
        source: 'google',
        medium: 'cpc',
        campaign: 'ai-sales-agents',
        term: 'sales automation',
        content: 'hero-ad',
      });

      analytics
        .expectEvent('utm_captured')
        .withProperty('utm_source', 'google')
        .withProperty('utm_medium', 'cpc')
        .withProperty('utm_campaign', 'ai-sales-agents')
        .withProperty('utm_term', 'sales automation')
        .withProperty('utm_content', 'hero-ad')
        .toBeFired();
    });

    test('captures partial UTM parameters', async ({ homePage, analytics }) => {
      await homePage.gotoWithUtm({
        source: 'linkedin',
        medium: 'social',
      });

      analytics
        .expectEvent('utm_captured')
        .withProperty('utm_source', 'linkedin')
        .withProperty('utm_medium', 'social')
        .toBeFired();
    });

    test('does not fire utm_captured without UTM params', async ({ homePage, analytics }) => {
      await homePage.goto();

      analytics.expectNoEvent('utm_captured');
    });
  });

  test.describe('Page View Tracking', () => {
    test('tracks page view with session data', async ({ homePage, analytics }) => {
      await homePage.goto();

      analytics
        .expectEvent('page_viewed')
        .withPropertyPresent('landing_page')
        .withPropertyPresent('viewport_width')
        .withPropertyPresent('viewport_height')
        .withPropertyPresent('device_type')
        .toBeFired();
    });

    test('captures referrer when present', async ({ homePage, analytics, page }) => {
      // Set referrer via navigation
      await page.goto('https://example.com');
      await page.goto('/');

      analytics
        .expectEvent('page_viewed')
        .withPropertyPresent('referrer')
        .toBeFired();
    });
  });

  test.describe('Device Type Detection', () => {
    test('detects desktop viewport', async ({ homePage, analytics, page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await homePage.goto();

      analytics
        .expectEvent('page_viewed')
        .withProperty('device_type', 'desktop')
        .toBeFired();
    });

    test('detects tablet viewport', async ({ homePage, analytics, page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await homePage.goto();

      analytics
        .expectEvent('page_viewed')
        .withProperty('device_type', 'tablet')
        .toBeFired();
    });

    test('detects mobile viewport', async ({ homePage, analytics, page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await homePage.goto();

      analytics
        .expectEvent('page_viewed')
        .withProperty('device_type', 'mobile')
        .toBeFired();
    });
  });
});
```

```typescript
// e2e/features/identity.spec.ts
import { test, expect } from '../fixtures/analytics.fixture';
import { createTestUser, createIdentityTestUser } from '../data/test-users';

test.describe('Identity & Person Profiles', () => {
  test.describe('Anonymous Browsing', () => {
    test('fires events without creating person profile', async ({
      homePage,
      analytics,
      posthogApi,
      page
    }) => {
      // Clear any existing PostHog cookies for clean state
      await page.context().clearCookies();

      await homePage.goto();

      // Interact with page (CTA click)
      await homePage.hero.clickPrimaryCta();

      analytics
        .expectEvent('cta_clicked')
        .withProperty('location', 'hero_primary')
        .toBeFired();

      // Start form but don't complete step 1
      await homePage.bookingForm.focusFirstField();

      analytics
        .expectEvent('booking_form_started')
        .toBeFired();

      // CI-only: Verify NO person profile was created
      await posthogApi(async (client) => {
        // Get the anonymous distinct_id from captured events
        const events = analytics.getEvents();
        const distinctId = events[0]?.properties?.distinct_id as string;

        if (distinctId) {
          const person = await client.getPerson(distinctId);
          // Person should be null (no profile for anonymous user)
          expect(person).toBeNull();
        }
      });
    });
  });

  test.describe('User Identification', () => {
    test('identifies user after step 1 completion', async ({
      homePage,
      analytics,
      posthogApi,
      page
    }) => {
      await page.context().clearCookies();

      const testUser = createIdentityTestUser('first');

      await homePage.goto();
      await homePage.bookingForm.scrollIntoView();
      await homePage.bookingForm.focusFirstField();

      // Complete step 1
      await homePage.bookingForm.fillStep1(testUser);
      await homePage.bookingForm.clickNext();

      analytics
        .expectEvent('lead_identified')
        .withProperty('identification_point', 'step_1_complete')
        .withProperty('email', testUser.email)
        .toBeFired();

      // CI-only: Verify person profile was created with email as distinct_id
      await posthogApi(async (client) => {
        const person = await client.waitForPerson(testUser.email, {
          timeoutMs: 30_000,
        });

        expect(person).not.toBeNull();
        expect(person.distinct_ids).toContain(testUser.email);
        expect(person.properties).toHaveProperty('email', testUser.email);
      });
    });

    test('links anonymous events to identified user', async ({
      homePage,
      analytics,
      posthogApi,
      page
    }) => {
      await page.context().clearCookies();

      const testUser = createIdentityTestUser('first');

      await homePage.goto();

      // Anonymous action before identification
      await homePage.hero.clickPrimaryCta();

      // Complete step 1 to identify
      await homePage.bookingForm.fillStep1(testUser);
      await homePage.bookingForm.clickNext();

      // CI-only: Verify anonymous events are linked to person
      await posthogApi(async (client) => {
        const events = await client.getRecentEvents(testUser.email, {
          eventName: 'cta_clicked',
        });

        // The anonymous cta_clicked event should now be linked to this person
        expect(events.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Email Change Handling', () => {
    test('fires identity_reset when email changes mid-form', async ({
      homePage,
      analytics,
      page
    }) => {
      await page.context().clearCookies();

      const firstUser = createIdentityTestUser('first');
      const changedUser = createIdentityTestUser('changed');

      await homePage.goto();
      await homePage.bookingForm.scrollIntoView();

      // Complete step 1 with first email
      await homePage.bookingForm.fillStep1(firstUser);
      await homePage.bookingForm.clickNext();

      analytics
        .expectEvent('lead_identified')
        .withProperty('email', firstUser.email)
        .toBeFired();

      // Go back to step 1 and change email
      await homePage.bookingForm.clickPrev();
      analytics.clearEvents();

      await homePage.bookingForm.emailInput.clear();
      await homePage.bookingForm.emailInput.fill(changedUser.email);
      await homePage.bookingForm.clickNext();

      analytics
        .expectEvent('identity_reset')
        .withProperty('previous_email', firstUser.email)
        .withProperty('new_email', changedUser.email)
        .toBeFired();

      analytics
        .expectEvent('lead_identified')
        .withProperty('email', changedUser.email)
        .toBeFired();
    });

    test('creates new person profile on email change', async ({
      homePage,
      analytics,
      posthogApi,
      page
    }) => {
      await page.context().clearCookies();

      const firstUser = createIdentityTestUser('first');
      const changedUser = createIdentityTestUser('changed');

      await homePage.goto();
      await homePage.bookingForm.scrollIntoView();

      // Complete step 1 with first email
      await homePage.bookingForm.fillStep1(firstUser);
      await homePage.bookingForm.clickNext();

      // Go back and change email
      await homePage.bookingForm.clickPrev();
      await homePage.bookingForm.emailInput.clear();
      await homePage.bookingForm.emailInput.fill(changedUser.email);
      await homePage.bookingForm.clickNext();

      // CI-only: Verify both person profiles exist
      await posthogApi(async (client) => {
        const firstPerson = await client.waitForPerson(firstUser.email);
        const changedPerson = await client.waitForPerson(changedUser.email);

        expect(firstPerson).not.toBeNull();
        expect(changedPerson).not.toBeNull();

        // They should be different profiles
        expect(firstPerson.distinct_ids).not.toContain(changedUser.email);
        expect(changedPerson.distinct_ids).not.toContain(firstUser.email);
      });
    });
  });

  test.describe('Person Properties', () => {
    test('sets $set properties on form submission', async ({
      homePage,
      analytics,
      posthogApi
    }) => {
      const testUser = createTestUser();

      await homePage.goto();
      await homePage.bookingForm.completeAllSteps(testUser);

      // CI-only: Verify $set properties
      await posthogApi(async (client) => {
        const person = await client.waitForPerson(testUser.email, {
          expectedProperties: {
            email: testUser.email,
            company: testUser.company,
            company_size: testUser.companySize,
            industry: testUser.industry,
            form_completed: true,
          },
        });

        expect(person.properties).toHaveProperty('name');
        expect(person.properties).toHaveProperty('first_name', testUser.firstName);
        expect(person.properties).toHaveProperty('last_name', testUser.lastName);
        expect(person.properties).toHaveProperty('location', testUser.location);
        expect(person.properties).toHaveProperty('timeline', testUser.timeline);
        expect(person.properties).toHaveProperty('form_completed_at');
      });
    });

    test('sets $set_once properties for first-touch attribution', async ({
      homePage,
      analytics,
      posthogApi
    }) => {
      const testUser = createTestUser();

      await homePage.gotoWithUtm({
        source: 'test-source',
        medium: 'test-medium',
        campaign: 'test-campaign',
      });

      await homePage.bookingForm.completeAllSteps(testUser);

      // CI-only: Verify $set_once properties
      await posthogApi(async (client) => {
        const person = await client.waitForPerson(testUser.email);

        expect(person.properties).toHaveProperty('first_seen');
        expect(person.properties).toHaveProperty('initial_utm_source', 'test-source');
        expect(person.properties).toHaveProperty('initial_utm_medium', 'test-medium');
        expect(person.properties).toHaveProperty('initial_utm_campaign', 'test-campaign');
        expect(person.properties).toHaveProperty('initial_landing_page');
        expect(person.properties).toHaveProperty('first_form_submission');
      });
    });
  });
});
```

---

## Package.json Scripts

Add to existing `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:desktop": "playwright test --project=desktop",
    "test:e2e:tablet": "playwright test --project=tablet",
    "test:e2e:mobile": "playwright test --project=mobile",
    "test:e2e:journeys": "playwright test e2e/journeys/",
    "test:e2e:features": "playwright test e2e/features/",
    "test:e2e:report": "playwright show-report",
    "check:e2e": "playwright test --reporter=list",
    "check:all": "yarn check && yarn check:e2e"
  }
}
```

---

## Environment Variables

```bash
# .env.local (for local PostHog API testing)
# Only needed when running with CI=true locally

# PostHog API verification (CI-only by default)
POSTHOG_PERSONAL_API_KEY=phx_your_personal_api_key
POSTHOG_PROJECT_ID=12345
```

---

## .gitignore Additions

```gitignore
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
/playwright/.auth/
```

---

## Installation

```bash
# Install Playwright and dependencies
yarn add -D @playwright/test

# Initialize Playwright (installs browsers)
npx playwright install
```

---

## Usage Examples

```bash
# Run all tests
yarn test:e2e

# Run with UI mode (interactive)
yarn test:e2e:ui

# Run only journey tests
yarn test:e2e:journeys

# Run only mobile tests
yarn test:e2e:mobile

# Run with PostHog API verification (local)
CI=true yarn test:e2e

# Run in CI pipeline
CI=true yarn check:e2e

# View test report
yarn test:e2e:report
```

---

## Next Steps

Use `/create_plan` to generate an implementation plan from this design.
