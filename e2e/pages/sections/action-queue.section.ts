import type { Locator, Page } from "@playwright/test";

export class ActionQueueSection {
  readonly page: Page;
  readonly list: Locator;
  readonly empty: Locator;
  readonly count: Locator;

  constructor(page: Page) {
    this.page = page;
    this.list = page.locator('[data-testid="queue-list"]');
    this.empty = page.locator('[data-testid="queue-empty"]');
    this.count = page.locator('[data-testid="queue-count"]');
  }

  row(id: string): Locator {
    return this.page.locator(`[data-testid="queue-row-${id}"]`);
  }

  approveButton(id: string): Locator {
    return this.page.locator(`[data-testid="queue-approve-${id}"]`);
  }

  editButton(id: string): Locator {
    return this.page.locator(`[data-testid="queue-edit-${id}"]`);
  }

  snoozeButton(id: string): Locator {
    return this.page.locator(`[data-testid="queue-snooze-${id}"]`);
  }

  dismissButton(id: string): Locator {
    return this.page.locator(`[data-testid="queue-dismiss-${id}"]`);
  }

  editBody(id: string): Locator {
    return this.page.locator(`[data-testid="edit-body-${id}"]`);
  }

  editSave(id: string): Locator {
    return this.page.locator(`[data-testid="edit-save-${id}"]`);
  }

  snoozeInput(id: string): Locator {
    return this.page.locator(`[data-testid="snooze-input-${id}"]`);
  }

  snoozeSave(id: string): Locator {
    return this.page.locator(`[data-testid="snooze-save-${id}"]`);
  }

  dismissConfirm(id: string): Locator {
    return this.page.locator(`[data-testid="dismiss-confirm-${id}"]`);
  }
}
