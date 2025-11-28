# Playwright E2E Test Suite Implementation Plan

## Overview

Implement a comprehensive Playwright E2E test suite for the Rekurve landing page, covering functional UI testing and PostHog analytics verification. This plan is based on the validated design document at `thoughts/designs/2025-11-28-playwright-e2e-test-suite.md` with adjustments for the actual codebase state.

## Current State Analysis

### No Existing Test Infrastructure
- No `@playwright/test` dependency
- No test directories (`e2e/`, `tests/`)
- No Playwright configuration

### Existing Analytics Implementation
- Full PostHog tracking in `src/lib/posthog.ts` (~900 lines)
- Tracks: CTA clicks, form funnel, FAQ interactions, section views, pricing engagement
- Person identification occurs after Step 1 completion

### Key Implementation Details Discovered

| Area | Design Assumption | Actual Implementation |
|------|-------------------|----------------------|
| Form steps | 5 steps | **4 steps** (basic_info, company_details, challenges, goals) |
| `data-testid` attrs | Exist | **None exist** - need to add |
| Mobile menu attr | `data-mobile-menu` | **None** - hamburger uses Lucide icons |
| FAQ item attrs | `data-accordion-item` | **Uses `value` attr** on AccordionItem |
| Pricing tier attrs | `data-tier` | **None** - uses `key={tier.id}` |

## Desired End State

After implementation:
1. Playwright installed and configured with 3 viewport projects (desktop, tablet, mobile)
2. Complete e2e/ directory structure with fixtures, pages, data, utils, and test files
3. All section components have `data-testid` attributes for reliable selectors
4. Test scripts integrated into `package.json` including `yarn check:e2e`
5. All journey and feature tests passing against the actual 4-step form

### Verification
- Run `yarn test:e2e` - all tests pass
- Run `yarn check:e2e` - CI-style execution works
- PostHog event interception captures expected events

## What We're NOT Doing

- Adding PostHog API verification to this initial implementation (CI-gated feature for later)
- Creating the 5th form step (booking_preference) - tests match current 4-step form
- Adding analytics tracking to footer links (not currently tracked)
- Testing server-side analytics (instrumentation.ts)

## Implementation Approach

Phased implementation starting with infrastructure, then components with data-testid attributes, then test files. Each phase produces working, testable output.

---

## Phase 1: Install Playwright & Create Configuration

### Overview
Install Playwright, create configuration file, add npm scripts, update .gitignore.

### Changes Required:

#### 1. Install Playwright
**Command**: `yarn add -D @playwright/test`

#### 2. Install Browsers
**Command**: `npx playwright install`

#### 3. Create Playwright Config
**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  outputDir: 'test-results/',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'yarn dev',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !isCI,
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

#### 4. Add Scripts to package.json
**File**: `package.json`

Add to `scripts`:
```json
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
"check:e2e": "playwright test --reporter=list"
```

#### 5. Update .gitignore
**File**: `.gitignore`

Add:
```gitignore
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
/playwright/.auth/
```

### Success Criteria:

#### Automated Verification:
- [ ] `yarn test:e2e --version` outputs Playwright version
- [ ] `npx playwright --version` works

#### Manual Verification:
- [ ] Configuration file exists at `playwright.config.ts`
- [ ] Scripts added to package.json

---

## Phase 2: Create E2E Directory Structure & Utilities

### Overview
Create the e2e directory structure with fixtures, utilities, and data factories.

### Changes Required:

#### 1. Create Directory Structure
```
e2e/
├── fixtures/
│   └── test.ts
├── pages/
│   ├── home.page.ts
│   └── sections/
│       ├── navbar.section.ts
│       ├── hero.section.ts
│       ├── booking-form.section.ts
│       ├── faq.section.ts
│       ├── pricing.section.ts
│       └── final-cta.section.ts
├── data/
│   ├── test-users.ts
│   └── form-data.ts
├── utils/
│   └── analytics-helper.ts
├── journeys/
│   └── .gitkeep
└── features/
    └── .gitkeep
```

#### 2. Analytics Helper
**File**: `e2e/utils/analytics-helper.ts`

Copy from design document `thoughts/designs/2025-11-28-playwright-e2e-test-suite.md` lines 144-321.

Key implementation notes:
- Intercepts `**/posthog.com/**` POST requests to `/e/`
- Parses batched events from request body
- Provides fluent assertion API: `expectEvent('name').withProperty('key', 'value').toBeFired()`

#### 3. Test Fixtures
**File**: `e2e/fixtures/test.ts`

```typescript
import { test as base } from '@playwright/test';
import { AnalyticsHelper } from '../utils/analytics-helper';
import { HomePage } from '../pages/home.page';

type TestFixtures = {
  analytics: AnalyticsHelper;
  homePage: HomePage;
};

export const test = base.extend<TestFixtures>({
  analytics: async ({ page }, use) => {
    const analytics = new AnalyticsHelper(page);
    await analytics.startCapturing();
    await use(analytics);
    await analytics.stopCapturing();
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
});

export { expect } from '@playwright/test';
```

#### 4. Test Data Factories
**File**: `e2e/data/test-users.ts`

Copy from design document lines 593-656. Key changes:
- Remove Step 5 booking preference fields
- Ensure `companySize`, `industry`, `timeline` values match actual select options

**File**: `e2e/data/form-data.ts`

Copy from design document lines 659-725. Update to match actual form:
- Step 4 has `goals` (textarea) + `timeline` + `currentMRR` selects
- No Step 5

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `yarn tsc --noEmit`

#### Manual Verification:
- [ ] All directories created as specified
- [ ] Utility files have no import errors when opened in IDE

---

## Phase 3: Add data-testid Attributes to Components

### Overview
Add `data-testid` attributes to existing components for reliable test selectors.

### Changes Required:

#### 1. Navbar Component
**File**: `src/components/navbar.tsx`

| Element | data-testid |
|---------|-------------|
| Desktop CTA button | `navbar-cta-desktop` |
| Mobile menu button | `navbar-mobile-menu-btn` |
| Mobile menu container | `navbar-mobile-menu` |
| Mobile CTA link | `navbar-cta-mobile` |

**Changes**:

Line ~116 (Desktop CTA Link):
```tsx
<Link href="#booking-form" onClick={() => analytics.cta.click('header')} data-testid="navbar-cta-desktop">
```

Line ~155-165 (Mobile menu button - wrap icons):
```tsx
<button
  data-testid="navbar-mobile-menu-btn"
  onClick={() => setOpen(!open)}
  aria-label={open ? "Close menu" : "Open menu"}
  aria-expanded={open}
>
  {open ? (
    <X className="text-black dark:text-white" />
  ) : (
    <Menu className="text-black dark:text-white" />
  )}
</button>
```

Line ~170 (Mobile menu container):
```tsx
<motion.div
  data-testid="navbar-mobile-menu"
  ...
>
```

Line ~188 (Mobile CTA):
```tsx
<Link
  href="#booking-form"
  onClick={() => {
    analytics.cta.click('mobile_nav')
    setOpen(false)
  }}
  data-testid="navbar-cta-mobile"
  ...
>
```

#### 2. Hero Component
**File**: `src/components/sections/Hero.tsx`

| Element | data-testid |
|---------|-------------|
| Section container | `hero-section` |
| Primary CTA | `hero-cta-primary` |
| Secondary CTA | `hero-cta-secondary` |

**Changes**:

Add `id="hero"` and `data-testid="hero-section"` to section element.

Line ~73 (Secondary CTA):
```tsx
<Link href="#how-it-works" onClick={() => analytics.cta.click('hero_secondary')} data-testid="hero-cta-secondary">
```

Line ~78 (Primary CTA):
```tsx
<Link href="#booking-form" onClick={() => analytics.cta.click('hero_primary')} data-testid="hero-cta-primary">
```

#### 3. Booking Form Component
**File**: `src/components/sections/BookingForm.tsx`

| Element | data-testid |
|---------|-------------|
| Form container | `booking-form-container` |
| Step indicator | `booking-form-step-indicator` |
| Step content containers | `booking-form-step-1`, `booking-form-step-2`, etc. |
| Next button | `booking-form-next-btn` |
| Back button | `booking-form-back-btn` |
| Submit button | `booking-form-submit-btn` |
| Challenge checkboxes container | `booking-form-challenges` |
| Company size select | `select-company-size` |
| Timeline select | `select-timeline` |
| Current MRR select | `select-current-mrr` |
| Success state | `booking-form-success` |

**Changes** (approximate line numbers based on research):

Line ~406 (Step indicator text):
```tsx
<span data-testid="booking-form-step-indicator">Step {currentStep} of 4</span>
```

Line ~412 (Form tag):
```tsx
<form onSubmit={handleSubmit(onSubmit)} data-testid="booking-form-container">
```

Each step content div should have:
```tsx
<div data-testid={`booking-form-step-${stepNumber}`}>
```

Line ~625 (Challenges container):
```tsx
<div data-testid="booking-form-challenges" className="...">
```

Line ~537 (Company size select):
```tsx
<Select name="companySize" data-testid="select-company-size" ...>
```

Line ~718 (Timeline select):
```tsx
<Select name="timeline" data-testid="select-timeline" ...>
```

Line ~755 (Current MRR select):
```tsx
<Select name="currentMRR" data-testid="select-current-mrr" ...>
```

Navigation buttons:
```tsx
<Button type="button" onClick={prevStep} data-testid="booking-form-back-btn">Back</Button>
<Button type="button" onClick={nextStep} data-testid="booking-form-next-btn">Next</Button>
<Button type="submit" data-testid="booking-form-submit-btn">Submit</Button>
```

Success state container:
```tsx
<div data-testid="booking-form-success" ...>
```

#### 4. FAQ Component
**File**: `src/components/sections/FAQ.tsx`

| Element | data-testid |
|---------|-------------|
| Search input | `faq-search-input` |
| Clear search button | `faq-search-clear` |
| No results message | `faq-no-results` |
| Bottom CTA | `faq-cta-bottom` |

**Changes**:

Line ~165 (Search input):
```tsx
<Input
  type="text"
  placeholder="Search questions..."
  data-testid="faq-search-input"
  ...
/>
```

Line ~234 (Clear search button):
```tsx
<Button onClick={() => setSearchQuery('')} data-testid="faq-search-clear">
  Clear search
</Button>
```

Line ~230 (No results container):
```tsx
<div data-testid="faq-no-results" className="...">
```

Line ~250 (Bottom CTA):
```tsx
<Link href="#booking-form" onClick={() => analytics.cta.click('faq_bottom')} data-testid="faq-cta-bottom">
```

#### 5. Pricing Component
**File**: `src/components/sections/Pricing.tsx`

| Element | data-testid |
|---------|-------------|
| Pricing cards | `pricing-tier-foundation`, `pricing-tier-growth`, `pricing-tier-enterprise` |
| Tier CTAs | `pricing-cta-foundation`, `pricing-cta-growth`, `pricing-cta-enterprise` |

**Changes**:

Line ~203 (Each tier card):
```tsx
<div key={tier.id} data-testid={`pricing-tier-${tier.id}`} ...>
```

Line ~298-311 (Each tier CTA):
```tsx
<Link
  href="#booking-form"
  onClick={() => analytics.cta.click(`pricing_${tier.id}` as CTALocation)}
  data-testid={`pricing-cta-${tier.id}`}
>
```

#### 6. Final CTA Component
**File**: `src/components/sections/FinalCTA.tsx`

| Element | data-testid |
|---------|-------------|
| Section container | `final-cta-section` |
| Primary CTA | `final-cta-primary` |
| Email CTA | `final-cta-email` |

**Changes**:

Line ~15 (Section):
```tsx
<section id="final-cta" data-testid="final-cta-section" ...>
```

Line ~34 (Primary CTA):
```tsx
<Link href="#booking-form" onClick={() => analytics.cta.click('final_cta_primary')} data-testid="final-cta-primary">
```

Line ~41 (Email CTA):
```tsx
<Link href="mailto:contact@rekurve.ai" onClick={...} data-testid="final-cta-email">
```

### Success Criteria:

#### Automated Verification:
- [ ] `yarn check` passes (lint + typecheck)
- [ ] `yarn dev` starts without errors

#### Manual Verification:
- [ ] Inspect elements in browser DevTools to verify data-testid attributes appear
- [ ] No visual regressions

---

## Phase 4: Create Page Object Models

### Overview
Create Page Object Models that use the data-testid attributes added in Phase 3.

### Changes Required:

#### 1. Home Page (Orchestrator)
**File**: `e2e/pages/home.page.ts`

```typescript
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

  async scrollToSection(sectionId: string): Promise<void> {
    await this.page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  }
}
```

#### 2. Section Page Objects
Create files based on design document with updated selectors using `data-testid`:

**File**: `e2e/pages/sections/navbar.section.ts`
- Use `[data-testid="navbar-cta-desktop"]` for desktop CTA
- Use `[data-testid="navbar-mobile-menu-btn"]` for hamburger
- Use `[data-testid="navbar-mobile-menu"]` for mobile menu container
- Use `[data-testid="navbar-cta-mobile"]` for mobile CTA

**File**: `e2e/pages/sections/hero.section.ts`
- Use `[data-testid="hero-section"]` for container
- Use `[data-testid="hero-cta-primary"]` for primary CTA
- Use `[data-testid="hero-cta-secondary"]` for secondary CTA

**File**: `e2e/pages/sections/booking-form.section.ts`
- **Critical**: Update to 4-step form (remove Step 5 references)
- Use `[data-testid="booking-form-container"]` for form
- Use `#firstName`, `#lastName`, `#email`, `#phone` for Step 1 inputs (existing IDs)
- Use `#company`, `[data-testid="select-company-size"]`, `#industry`, `#location` for Step 2
- Use `[data-testid="booking-form-challenges"]` for Step 3
- Use `#goals`, `[data-testid="select-timeline"]`, `[data-testid="select-current-mrr"]` for Step 4
- Use `[data-testid="booking-form-next-btn"]`, `[data-testid="booking-form-back-btn"]`, `[data-testid="booking-form-submit-btn"]` for navigation

**File**: `e2e/pages/sections/faq.section.ts`
- Use `[data-testid="faq-search-input"]` for search
- Use `[data-testid="faq-search-clear"]` for clear button
- Use `[data-testid="faq-no-results"]` for no results message
- Use `[data-testid="faq-cta-bottom"]` for bottom CTA
- Use existing `AccordionItem[value="X"]` for FAQ items (value attr exists)

**File**: `e2e/pages/sections/pricing.section.ts`
- Use `[data-testid="pricing-tier-foundation"]`, etc. for cards
- Use `[data-testid="pricing-cta-foundation"]`, etc. for CTAs

**File**: `e2e/pages/sections/final-cta.section.ts`
- Use `[data-testid="final-cta-section"]` for container
- Use `[data-testid="final-cta-primary"]` for primary CTA
- Use `[data-testid="final-cta-email"]` for email CTA

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `yarn tsc --noEmit`

#### Manual Verification:
- [ ] Page objects instantiate without errors in a simple test

---

## Phase 5: Create Feature Tests

### Overview
Create isolated feature tests for each component's functionality and analytics tracking.

### Changes Required:

#### 1. CTA Tracking Tests
**File**: `e2e/features/cta-tracking.spec.ts`

Test all CTA click locations:
- Header CTA (`header`)
- Hero primary CTA (`hero_primary`)
- Hero secondary CTA (`hero_secondary`)
- Pricing foundation CTA (`pricing_foundation`)
- Pricing growth CTA (`pricing_growth`)
- Pricing enterprise CTA (`pricing_enterprise`)
- Final CTA primary (`final_cta_primary`)
- Final CTA email (`final_cta_email`)
- FAQ bottom CTA (`faq_bottom`)

Copy structure from design document lines 1454-1550.

#### 2. Booking Form Tests
**File**: `e2e/features/booking-form.spec.ts`

**Critical changes from design**:
- Update all references to 4 steps (not 5)
- Step names: `basic_info` (1), `company_details` (2), `challenges` (3), `goals` (4)

Test cases:
- Form navigation (start at step 1, advance, go back)
- Data preservation when navigating back
- Validation errors (empty email, invalid email, empty required fields)
- Step completion tracking with `time_spent_ms`

Copy structure from design document lines 1559-1658, updating step counts.

#### 3. FAQ Tests
**File**: `e2e/features/faq.spec.ts`

Test cases:
- Expand question on click
- Collapse question on second click
- Track expand event with question details
- Track collapse event (verify this exists in analytics)
- Search filters questions
- Search tracks event with query and results
- Clear search shows all questions
- No results message for unmatched query

Copy structure from design document lines 1661-1741.

#### 4. Navigation Tests
**File**: `e2e/features/navigation.spec.ts`

Test cases:
- Header CTA visible on load
- Scrolls to booking form when CTA clicked
- Hero secondary CTA scrolls to how-it-works section

Copy structure from design document lines 1744-1776.

#### 5. Mobile Navigation Tests
**File**: `e2e/features/navigation.mobile.spec.ts`

Test cases:
- Shows hamburger menu on mobile
- Hides desktop CTA on mobile
- Opens mobile menu on hamburger click
- Closes mobile menu on second click
- Tracks mobile nav CTA click

Copy structure from design document lines 1779-1819.

#### 6. UTM & Session Tests
**File**: `e2e/features/utm-session.spec.ts`

**Note**: Actual implementation captures UTM in `page_viewed` event, not separate `utm_captured`.

Test cases:
- Captures UTM parameters in page_viewed event
- Captures partial UTM parameters
- Does not include UTM props without UTM params
- Tracks page view with session data
- Detects desktop/tablet/mobile viewport

Update from design to match actual analytics implementation.

#### 7. Identity Tests
**File**: `e2e/features/identity.spec.ts`

Test cases:
- Anonymous browsing fires events without identification
- Identifies user after step 1 completion (`lead_identified` event)
- Links anonymous events to identified user
- Fires `identity_reset` when email changes mid-form

Copy structure from design document lines 2043-2083.

### Success Criteria:

#### Automated Verification:
- [ ] `yarn test:e2e:features` runs (tests may fail initially)
- [ ] TypeScript compiles without errors

#### Manual Verification:
- [ ] Each test file loads without syntax errors
- [ ] Test names clearly describe what they test

---

## Phase 6: Create Journey Tests

### Overview
Create end-to-end user journey tests that combine multiple features.

### Changes Required:

#### 1. Lead Conversion Journey
**File**: `e2e/journeys/lead-conversion.spec.ts`

Full flow:
1. Land on page
2. Click hero CTA → verify `cta_clicked` event
3. Focus form field → verify `booking_form_started` event
4. Complete Step 1 → verify `form_step_completed` (step 1) and `lead_identified`
5. Complete Step 2 → verify `form_step_completed` (step 2)
6. Complete Step 3 → verify `form_step_completed` (step 3)
7. Complete Step 4 and submit → verify `form_step_completed` (step 4) and `booking_form_submitted`

**Critical**: Update to 4 steps from design's implicit 5.

#### 2. Visitor Exploration Journey
**File**: `e2e/journeys/visitor-exploration.spec.ts`

Flow:
1. Land on page, verify hero loads
2. Click secondary CTA → verify `cta_clicked` (hero_secondary)
3. Scroll to FAQ
4. Expand a question → verify `faq_expanded`
5. Search FAQs → verify `faq_searched`
6. Click FAQ bottom CTA → verify `cta_clicked` (faq_bottom)

Copy from design document lines 1346-1394.

#### 3. Form Abandonment Journey
**File**: `e2e/journeys/form-abandonment.spec.ts`

Flow:
1. Start form
2. Complete Step 1 only
3. Navigate away (triggers beforeunload)
4. Verify `booking_form_abandoned` event with `last_step: 2` (was on step 2)

Copy from design document lines 1397-1449.

### Success Criteria:

#### Automated Verification:
- [ ] `yarn test:e2e:journeys` runs

#### Manual Verification:
- [ ] Journey tests represent realistic user flows
- [ ] Each journey tests a distinct conversion path

---

## Phase 7: Final Integration & Documentation

### Overview
Ensure all tests run, update CLAUDE.md, and verify CI integration.

### Changes Required:

#### 1. Run Full Test Suite
```bash
yarn test:e2e
```

Fix any failing tests.

#### 2. Update CLAUDE.md

Add to Key Commands section:
```markdown
yarn test:e2e        # Run E2E tests
yarn check:e2e       # Run E2E tests (CI mode)
```

Update Repository Structure to include e2e/ directory.

#### 3. Verify CI Check Integration

Ensure `yarn check:e2e` works for CI pipelines.

### Success Criteria:

#### Automated Verification:
- [ ] `yarn test:e2e` passes all tests
- [ ] `yarn check:e2e` completes without errors
- [ ] `yarn check` still passes (lint + typecheck)

#### Manual Verification:
- [ ] Test report opens and shows results
- [ ] Tests run in reasonable time (<2 minutes locally)
- [ ] CLAUDE.md updated with e2e test commands

---

## Testing Strategy

### Unit Tests
Not applicable - this is an E2E test implementation.

### Integration Tests
The E2E tests themselves are integration tests verifying:
- UI components work together
- Analytics events fire correctly
- Form validation works end-to-end

### Manual Testing Steps
1. Run `yarn test:e2e:ui` and verify tests pass interactively
2. Try `yarn test:e2e:headed` to see browser automation
3. Break something (remove a data-testid) and verify test fails
4. Check that mobile tests use correct viewport

---

## Performance Considerations

- Tests run in parallel locally (`workers: undefined` uses all CPU cores)
- Tests run sequentially in CI (`workers: 1`) for reliability
- Web server reuses existing dev server locally to speed up runs
- Analytics interception adds minimal overhead (request passthrough)

---

## Migration Notes

Not applicable - greenfield implementation with no existing tests to migrate.

---

## References

- Design document: `thoughts/designs/2025-11-28-playwright-e2e-test-suite.md`
- PostHog analytics implementation: `src/lib/posthog.ts`
- Booking form component: `src/components/sections/BookingForm.tsx`
- Section components: `src/components/sections/*.tsx`
- Navbar component: `src/components/navbar.tsx`
