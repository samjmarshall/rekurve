import type { Page } from "@playwright/test";
import { AppSidebarSection } from "./sections/app-sidebar.section";
import { BottomNavSection } from "./sections/bottom-nav.section";

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: AppSidebarSection;
  readonly bottomNav: BottomNavSection;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = new AppSidebarSection(page);
    this.bottomNav = new BottomNavSection(page);
  }

  async goto(path = "/dashboard"): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }
}
