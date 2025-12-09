import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import type { TestUser } from '../../data/test-users';

export class BookingFormSection {
  readonly page: Page;
  readonly container: Locator;
  readonly stepIndicator: Locator;
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly submitButton: Locator;
  readonly successState: Locator;

  // Step 1 fields
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;

  // Step 2 fields
  readonly companyInput: Locator;
  readonly companySizeSelect: Locator;
  readonly industryInput: Locator;
  readonly locationInput: Locator;

  // Step 3 fields
  readonly challengesContainer: Locator;

  // Step 4 fields
  readonly goalsInput: Locator;
  readonly timelineSelect: Locator;
  readonly currentMrrSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="booking-form-container"]');
    this.stepIndicator = page.locator('[data-testid="booking-form-step-indicator"]');
    this.nextButton = page.locator('[data-testid="booking-form-next-btn"]');
    this.prevButton = page.locator('[data-testid="booking-form-back-btn"]');
    this.submitButton = page.locator('[data-testid="booking-form-submit-btn"]');
    this.successState = page.locator('[data-testid="booking-form-success"]');

    // Step 1
    this.emailInput = page.locator('#email');
    this.firstNameInput = page.locator('#firstName');
    this.lastNameInput = page.locator('#lastName');
    this.phoneInput = page.locator('#phone');

    // Step 2
    this.companyInput = page.locator('#company');
    this.companySizeSelect = page.locator('[data-testid="select-company-size"]');
    this.industryInput = page.locator('#industry');
    this.locationInput = page.locator('#location');

    // Step 3
    this.challengesContainer = page.locator('[data-testid="booking-form-challenges"]');

    // Step 4
    this.goalsInput = page.locator('#goals');
    this.timelineSelect = page.locator('[data-testid="select-timeline"]');
    this.currentMrrSelect = page.locator('[data-testid="select-current-mrr"]');
  }

  async scrollIntoView(): Promise<void> {
    await this.page.locator('#booking-form').scrollIntoViewIfNeeded();
    // Wait for any scroll animations to complete
    await this.page.waitForTimeout(300);
  }

  async focusFirstField(): Promise<void> {
    await this.firstNameInput.waitFor({ state: 'visible' });
    await this.firstNameInput.focus();
  }

  /** Wait for step transition to complete */
  private async waitForStepTransition(): Promise<void> {
    // Wait for React state update and any animations
    // Mobile WebKit needs more time for animations to complete
    await this.page.waitForTimeout(500);
  }

  /** Fill Step 1: Basic Info */
  async fillStep1(user: TestUser): Promise<void> {
    await this.firstNameInput.waitFor({ state: 'visible' });
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.emailInput.fill(user.email);
    await this.phoneInput.fill(user.phone);
  }

  /** Fill Step 2: Company Details */
  async fillStep2(user: TestUser): Promise<void> {
    // Wait for step 2 fields to be visible
    await this.companyInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.companyInput.fill(user.company);

    // Handle select - click and wait for dropdown
    await this.companySizeSelect.click();
    await this.page.waitForTimeout(200); // Wait for dropdown animation
    await this.page.getByRole('option', { name: user.companySize }).click();

    await this.industryInput.fill(user.industry);
    await this.locationInput.fill(user.location);
  }

  /** Fill Step 3: Challenges */
  async fillStep3(user: TestUser): Promise<void> {
    await this.challengesContainer.waitFor({ state: 'visible', timeout: 10000 });

    for (const challenge of user.challenges) {
      // Find the label containing the challenge text and click it
      const label = this.challengesContainer.getByText(challenge, { exact: false });
      await label.waitFor({ state: 'visible' });
      await label.click();
      await this.page.waitForTimeout(100); // Small wait between clicks
    }
  }

  /** Fill Step 4: Goals */
  async fillStep4(user: TestUser): Promise<void> {
    await this.goalsInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.goalsInput.fill(user.goals);

    await this.timelineSelect.click();
    await this.page.waitForTimeout(200);
    await this.page.getByRole('option', { name: user.timeline }).click();

    await this.currentMrrSelect.click();
    await this.page.waitForTimeout(200);
    await this.page.getByRole('option', { name: user.currentMrr }).click();
  }

  async clickNext(): Promise<void> {
    await this.nextButton.waitFor({ state: 'visible' });
    // Ensure button is clickable
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100);
    await this.nextButton.click();
    await this.waitForStepTransition();
  }

  async clickPrev(): Promise<void> {
    await this.prevButton.waitFor({ state: 'visible' });
    await this.prevButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100);
    await this.prevButton.click();
    await this.waitForStepTransition();
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible' });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100);
    await this.submitButton.click();
    // Wait for form submission and state transition
    await this.page.waitForTimeout(500);
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
    return match?.[1] ? parseInt(match[1], 10) : 0;
  }

  async expectStep(stepNumber: number): Promise<void> {
    // Wait for step indicator to update
    await expect(this.stepIndicator).toContainText(`${stepNumber}`, {
      ignoreCase: true,
      timeout: 10000
    });
  }

  async expectValidationError(message: string | RegExp): Promise<void> {
    // Try multiple selectors for validation errors (framework may render differently)
    const errorLocator = this.page.locator('[data-slot="field-error"], [role="alert"], .field-error, [aria-invalid="true"] + *').filter({ hasText: message });
    await expect(errorLocator.first()).toBeVisible({ timeout: 5000 });
  }

  async expectSuccess(): Promise<void> {
    await expect(this.successState).toBeVisible({ timeout: 10000 });
  }

  async expectSuccessContent(heading: string | RegExp): Promise<void> {
    await expect(this.successState).toBeVisible({ timeout: 10000 });
    await expect(this.successState.getByRole('heading', { level: 2 })).toHaveText(heading);
  }
}
