import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

type Stage = "unqualified" | "nurture" | "warm" | "hot";

export class PipelineBoardSection {
  readonly page: Page;
  readonly board: Locator;
  readonly empty: Locator;
  readonly filters: Locator;
  readonly filterEstate: Locator;
  readonly filterFhog: Locator;
  readonly filterTimeline: Locator;
  readonly filterClear: Locator;

  constructor(page: Page) {
    this.page = page;
    this.board = page.locator('[data-testid="pipeline-board"]');
    this.empty = page.locator('[data-testid="pipeline-empty"]');
    this.filters = page.locator('[data-testid="pipeline-filters"]');
    this.filterEstate = page.locator('[data-testid="filter-estate"]');
    this.filterFhog = page.locator('[data-testid="filter-fhog"]');
    this.filterTimeline = page.locator('[data-testid="filter-timeline"]');
    this.filterClear = page.locator('[data-testid="filter-clear"]');
  }

  column(stage: Stage): Locator {
    return this.page.locator(`[data-testid="pipeline-column-${stage}"]`);
  }

  columnCount(stage: Stage): Locator {
    return this.page.locator(`[data-testid="pipeline-column-count-${stage}"]`);
  }

  async expectColumnCount(stage: Stage, n: number) {
    await expect(this.columnCount(stage)).toHaveText(String(n));
  }
}
