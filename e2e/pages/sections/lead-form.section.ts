import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LeadFormSection {
  readonly page: Page;

  // Navigation
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly successScreen: Locator;
  readonly addAnotherButton: Locator;
  readonly goToPipelineLink: Locator;

  // Step 1: Contact
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;

  // Step 2: Land
  readonly landAddressInput: Locator;
  readonly landSqmInput: Locator;
  readonly landWidthInput: Locator;
  readonly landDepthInput: Locator;

  // Step 3: Build
  readonly budgetInput: Locator;

  // Step 4: Additional
  readonly resolveFinanceCheckbox: Locator;
  readonly preferredEstatesInput: Locator;
  readonly preferredSuburbsInput: Locator;
  readonly notesTextarea: Locator;
  readonly leadSourceTrigger: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nextButton = page.locator('[data-testid="lead-form-next-btn"]');
    this.backButton = page.locator('[data-testid="lead-form-back-btn"]');
    this.submitButton = page.locator('[data-testid="lead-form-submit-btn"]');
    this.successScreen = page.locator('[data-testid="lead-form-success"]');
    this.addAnotherButton = page.locator(
      '[data-testid="lead-form-add-another"]',
    );
    this.goToPipelineLink = page.locator(
      '[data-testid="lead-form-go-pipeline"]',
    );

    // Step 1
    this.firstNameInput = page.locator('[data-testid="lead-form-first-name"]');
    this.lastNameInput = page.locator('[data-testid="lead-form-last-name"]');
    this.phoneInput = page.locator('[data-testid="lead-form-phone"]');
    this.emailInput = page.locator('[data-testid="lead-form-email"]');

    // Step 2
    this.landAddressInput = page.locator(
      '[data-testid="lead-form-land-address"]',
    );
    this.landSqmInput = page.locator('[data-testid="lead-form-land-sqm"]');
    this.landWidthInput = page.locator('[data-testid="lead-form-land-width"]');
    this.landDepthInput = page.locator('[data-testid="lead-form-land-depth"]');

    // Step 3
    this.budgetInput = page.locator('[data-testid="lead-form-budget"]');

    // Step 4
    this.resolveFinanceCheckbox = page.locator(
      '[data-testid="lead-form-resolve-finance"]',
    );
    this.preferredEstatesInput = page.locator(
      '[data-testid="lead-form-preferred-estates"]',
    );
    this.preferredSuburbsInput = page.locator(
      '[data-testid="lead-form-preferred-suburbs"]',
    );
    this.notesTextarea = page.locator('[data-testid="lead-form-notes"]');
    this.leadSourceTrigger = page.locator(
      '[data-testid="lead-form-lead-source"]',
    );
  }

  async fillStep1(data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    if (data.phone) await this.phoneInput.fill(data.phone);
    if (data.email) await this.emailInput.fill(data.email);
  }

  async selectSegmented(label: string, optionText: string) {
    const group = this.page.getByRole("radiogroup", { name: label });
    await group.getByRole("radio", { name: optionText }).click();
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async expectSuccess(name: string) {
    await expect(this.successScreen).toBeVisible({ timeout: 10000 });
    await expect(this.successScreen).toContainText(name);
  }
}
