import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

type Stage = "unqualified" | "nurture" | "warm" | "hot";

const STAGE_LABELS: Record<Stage, string> = {
  unqualified: "Unqualified",
  nurture: "Nurture",
  warm: "Warm",
  hot: "Hot",
};

export class LeadProfileSection {
  readonly page: Page;

  readonly header: Locator;
  readonly name: Locator;
  readonly phoneLink: Locator;
  readonly emailLink: Locator;
  readonly scoreBadge: Locator;
  readonly stageBadge: Locator;
  readonly lastContacted: Locator;

  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  readonly scoreBreakdown: Locator;
  readonly gapsCard: Locator;
  readonly gapsList: Locator;
  readonly gapsEmpty: Locator;
  readonly nextQuestion: Locator;
  readonly conversationHistory: Locator;
  readonly conversationItems: Locator;
  readonly conversationEmpty: Locator;

  constructor(page: Page) {
    this.page = page;

    this.header = page.locator('[data-testid="lead-profile-header"]');
    this.name = page.locator('[data-testid="lead-profile-name"]');
    this.phoneLink = page.locator('[data-testid="lead-profile-phone"]');
    this.emailLink = page.locator('[data-testid="lead-profile-email"]');
    this.scoreBadge = page.locator('[data-testid="lead-profile-score-badge"]');
    this.stageBadge = page.locator('[data-testid="lead-profile-stage"]');
    this.lastContacted = page.locator(
      '[data-testid="lead-profile-last-contacted"]',
    );

    this.editButton = page.locator('[data-testid="lead-profile-edit-btn"]');
    this.saveButton = page.locator('[data-testid="lead-profile-save-btn"]');
    this.cancelButton = page.locator('[data-testid="lead-profile-cancel-btn"]');

    this.scoreBreakdown = page.locator(
      '[data-testid="lead-profile-score-breakdown"]',
    );
    this.gapsCard = page.locator('[data-testid="lead-profile-gaps-card"]');
    this.gapsList = page.locator('[data-testid="lead-profile-gaps-list"]');
    this.gapsEmpty = page.locator('[data-testid="lead-profile-gaps-empty"]');
    this.nextQuestion = page.locator(
      '[data-testid="lead-profile-next-question"]',
    );
    this.conversationHistory = page.locator(
      '[data-testid="lead-profile-conversation-history"]',
    );
    this.conversationItems = page.locator(
      '[data-testid^="lead-profile-conversation-item-"]',
    );
    this.conversationEmpty = page.locator(
      '[data-testid="lead-profile-conversation-empty"]',
    );
  }

  conversationItem(id: string): Locator {
    return this.page.locator(
      `[data-testid="lead-profile-conversation-item-${id}"]`,
    );
  }

  editedPill(id: string): Locator {
    return this.page.locator(
      `[data-testid="lead-profile-conversation-edited-pill-${id}"]`,
    );
  }

  conversationOriginal(id: string): Locator {
    return this.page.locator(
      `[data-testid="lead-profile-conversation-original-${id}"]`,
    );
  }

  async expectConversationCount(n: number) {
    await expect(this.conversationItems).toHaveCount(n);
  }

  factorRow(key: string): Locator {
    return this.page.locator(
      `[data-testid="lead-profile-score-factor-${key}"]`,
    );
  }

  factorValue(key: string): Locator {
    return this.page.locator(
      `[data-testid="lead-profile-score-factor-${key}-value"]`,
    );
  }

  gapItem(field: string): Locator {
    return this.page.locator(`[data-testid="lead-profile-gap-item-${field}"]`);
  }

  async waitForLoaded() {
    await expect(this.header).toBeVisible({ timeout: 10_000 });
  }

  async expectScore(score: number) {
    await expect(this.scoreBadge).toContainText(String(score));
  }

  async expectStage(stage: Stage) {
    await expect(this.stageBadge).toHaveText(STAGE_LABELS[stage]);
  }

  async expectGapCount(count: number) {
    if (count === 0) {
      await expect(this.gapsEmpty).toBeVisible();
      await expect(this.nextQuestion).not.toBeVisible();
      return;
    }
    await expect(this.gapsList).toBeVisible();
    await expect(
      this.gapsList.locator('[data-testid^="lead-profile-gap-item-"]'),
    ).toHaveCount(count);
  }

  async expectFactor(key: string, score: number, max: number) {
    await expect(this.factorValue(key)).toHaveText(`${score}/${max}`);
  }

  async expectNextQuestionMatches(pattern: RegExp) {
    await expect(this.nextQuestion).toBeVisible();
    await expect(this.nextQuestion).toContainText(pattern);
  }
}
