# Dashboard App Shell — Mobile-Responsive Empty State

## Overview

Build the empty dashboard app shell in the `(application)` route group. Mobile-first responsive layout with bottom tab navigation (mobile) and sidebar (desktop) for the 3 main views (Action Queue, Pipeline, Lots) plus Settings. Empty states on all pages. This is the consultant's daily workspace — designed for phone use between display home walk-ins.

## Current State Analysis

- `(application)/layout.tsx` has auth guard (`getSession()` → redirect), `TRPCReactProvider`, `ThemeProvider`, and a `TODO: App sidebar/nav` comment at line 55
- Only `/dashboard` exists as a minimal placeholder with "Nothing here yet" text
- No `/pipeline`, `/lots`, or `/settings` pages exist
- `authClient.signOut()` available from `~/lib/auth-client` but not used anywhere
- `getSession()` returns `{ session, user: { id, name, email, ... } }`
- 16 shadcn/ui components installed, lucide-react icons, Tailwind v4, dark mode via next-themes
- Playwright E2E suite with page objects, sections, fixtures, auth helpers at 768px mobile breakpoint

### Key Discoveries:
- Application layout already wraps children in `<div className="flex min-h-screen">` with `<main className="flex-1">` — ready for sidebar insertion (`layout.tsx:54-56`)
- Reference projects (devoli, quitelike, lasoo) all use shadcn sidebar primitive with Sheet on mobile, but issue #94 requires bottom tab nav on mobile — different pattern
- `usePathname()` exact match is the established active route pattern across all reference projects
- No `useIsMobile` hook exists in this project yet
- The `mode-toggle.tsx` component exists for theme switching (`src/components/mode-toggle.tsx`)

## Desired End State

A responsive app shell where:
- **Desktop (>= 768px)**: Fixed left sidebar with logo, 4 nav links, user info + sign out at bottom. Content area to the right.
- **Mobile (< 768px)**: Full-width content with fixed bottom tab bar showing 4 icon+label tabs. User info + sign out lives on the Settings page.
- All 4 pages (`/dashboard`, `/pipeline`, `/lots`, `/settings`) render appropriate empty states.
- Active nav item is visually indicated on both desktop and mobile.
- Sign out works and redirects to `/login`.
- Dark mode works across all new components.
- No horizontal scroll on mobile.

### Verification:
- `make check` passes (lint + typecheck)
- `make build` succeeds
- E2E tests pass for navigation, empty states, responsive layout, and sign out
- Manual verification of responsive design and dark mode

## What We're NOT Doing

- Actual data display (empty states only)
- Lead entry forms, message queue cards, pipeline kanban, lot entry (later epics)
- Push notifications
- Animations / transitions on nav
- Collapsible/expandable sidebar (fixed for MVP)
- Breadcrumbs or page headers (not in issue scope)
- shadcn sidebar primitive (overkill for 4 flat items + different mobile pattern)

## Implementation Approach

Custom lightweight components inspired by the reference projects' structural zones (header/content/footer) but without the shadcn sidebar primitive overhead. The sidebar and bottom nav share a common nav item configuration. Session data flows from the server layout to client components as props.

---

## Phase 1: Navigation Infrastructure

### Overview
Create the responsive navigation shell — desktop sidebar and mobile bottom tab bar — and wire them into the application layout.

### Changes Required:

#### 1. Mobile Breakpoint Hook
**File**: `src/hooks/use-mobile.ts` (new)
**Changes**: Create `useIsMobile()` hook using `matchMedia` at 768px, matching Playwright config breakpoints and the reference project pattern.

```ts
import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
```

#### 2. Shared Navigation Config
**File**: `src/app/(application)/_components/nav-config.ts` (new)
**Changes**: Define nav item type and data array shared between sidebar and bottom nav.

```ts
import { Inbox, type LucideIcon, Map, Settings, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Action Queue", href: "/dashboard", icon: Inbox },
  { label: "Pipeline", href: "/pipeline", icon: Users },
  { label: "Lots", href: "/lots", icon: Map },
  { label: "Settings", href: "/settings", icon: Settings },
];
```

#### 3. Desktop Sidebar
**File**: `src/app/(application)/_components/app-sidebar.tsx` (new)
**Changes**: Client component with three zones — logo header, nav links, user footer with sign out. Hidden on mobile via `hidden md:flex`.

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "~/components/logo";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { navItems } from "./nav-config";

interface AppSidebarProps {
  user: { name: string; email: string };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <aside
      data-testid="app-sidebar"
      className="hidden w-64 shrink-0 flex-col border-r border-border bg-background md:flex"
    >
      {/* Header — Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      {/* Content — Nav Links */}
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`sidebar-link-${item.href.slice(1)}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — User Info + Sign Out */}
      <div className="border-t border-border p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-foreground">
            {user.name || "User"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          data-testid="sidebar-sign-out"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

#### 4. Mobile Bottom Tab Bar
**File**: `src/app/(application)/_components/bottom-nav.tsx` (new)
**Changes**: Client component with 4 equal-width tabs, fixed to bottom. Hidden on desktop via `flex md:hidden`. Safe area padding for iOS.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { navItems } from "./nav-config";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`bottom-nav-link-${item.href.slice(1)}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

#### 5. Update Application Layout
**File**: `src/app/(application)/layout.tsx`
**Changes**: Import and render `AppSidebar` + `BottomNav`. Pass session user info to sidebar. Add bottom padding on mobile for the tab bar.

```tsx
// Add imports:
import { AppSidebar } from "./_components/app-sidebar";
import { BottomNav } from "./_components/bottom-nav";

// Update the return JSX — replace the inner <div> block:
<div className="flex min-h-screen">
  <AppSidebar
    user={{
      name: session.user.name ?? "",
      email: session.user.email,
    }}
  />
  <main className="flex-1 pb-16 md:pb-0">{children}</main>
  <BottomNav />
</div>
```

The `pb-16 md:pb-0` on `<main>` prevents content from being hidden behind the fixed bottom nav on mobile.

#### 6. Tests — Navigation Shell
**File**: `e2e/pages/dashboard.page.ts` (new)
**Changes**: Page object for the dashboard app shell.

```ts
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
```

**File**: `e2e/pages/sections/app-sidebar.section.ts` (new)
**Changes**: Section object for the desktop sidebar.

```ts
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class AppSidebarSection {
  readonly page: Page;
  readonly container: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="app-sidebar"]');
    this.signOutButton = page.locator('[data-testid="sidebar-sign-out"]');
  }

  link(name: string): Locator {
    return this.container.locator(`[data-testid="sidebar-link-${name}"]`);
  }

  async expectVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.container).not.toBeVisible();
  }

  async expectActiveLink(name: string): Promise<void> {
    await expect(this.link(name)).toHaveAttribute("aria-current", "page");
  }

  async navigateTo(name: string): Promise<void> {
    await this.link(name).click();
  }
}
```

**File**: `e2e/pages/sections/bottom-nav.section.ts` (new)
**Changes**: Section object for the mobile bottom nav.

```ts
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class BottomNavSection {
  readonly page: Page;
  readonly container: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="bottom-nav"]');
  }

  link(name: string): Locator {
    return this.container.locator(`[data-testid="bottom-nav-link-${name}"]`);
  }

  async expectVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.container).not.toBeVisible();
  }

  async expectActiveLink(name: string): Promise<void> {
    await expect(this.link(name)).toHaveAttribute("aria-current", "page");
  }

  async navigateTo(name: string): Promise<void> {
    await this.link(name).click();
  }
}
```

**File**: `e2e/fixtures/test.ts`
**Changes**: Add `DashboardPage` fixture alongside existing `homePage` and `loginPage`.

```ts
// Add import:
import { DashboardPage } from "../pages/dashboard.page";

// Add to TestFixtures type:
dashboardPage: DashboardPage;

// Add fixture:
dashboardPage: async ({ page }, use) => {
  const dashboardPage = new DashboardPage(page);
  await use(dashboardPage);
},
```

**File**: `e2e/features/dashboard-shell.spec.ts` (new)
**Changes**: E2E tests for the navigation shell across viewports.

```ts
import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";

test.describe("Dashboard Shell — Navigation", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  async function withAuth(context: import("@playwright/test").BrowserContext) {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.signedToken,
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  test("sidebar visible on desktop, bottom nav hidden", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop only");
    await withAuth(context);
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"]')).not.toBeVisible();
  });

  test("bottom nav visible on mobile, sidebar hidden", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile only");
    await withAuth(context);
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-sidebar"]')).not.toBeVisible();
  });

  test("navigating between pages updates active nav item", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Uses sidebar links");
    await withAuth(context);
    await page.goto("/dashboard");

    // Dashboard is active
    await expect(
      page.locator('[data-testid="sidebar-link-dashboard"]'),
    ).toHaveAttribute("aria-current", "page");

    // Navigate to pipeline
    await page.locator('[data-testid="sidebar-link-pipeline"]').click();
    await page.waitForURL("**/pipeline");
    await expect(
      page.locator('[data-testid="sidebar-link-pipeline"]'),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.locator('[data-testid="sidebar-link-dashboard"]'),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("navigating via bottom nav works on mobile", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile only");
    await withAuth(context);
    await page.goto("/dashboard");

    await expect(
      page.locator('[data-testid="bottom-nav-link-dashboard"]'),
    ).toHaveAttribute("aria-current", "page");

    await page.locator('[data-testid="bottom-nav-link-pipeline"]').click();
    await page.waitForURL("**/pipeline");
    await expect(
      page.locator('[data-testid="bottom-nav-link-pipeline"]'),
    ).toHaveAttribute("aria-current", "page");
  });

  test("all four pages are reachable", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Uses sidebar links");
    await withAuth(context);

    const pages = ["dashboard", "pipeline", "lots", "settings"];
    for (const pageName of pages) {
      await page.goto(`/${pageName}`);
      await expect(page).toHaveURL(new RegExp(`/${pageName}`));
      // Each page should have content (not a 404)
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `make build` succeeds
- [x] E2E tests pass: sidebar visible on desktop, bottom nav visible on mobile
- [x] E2E tests pass: navigation between all 4 pages works
- [x] E2E tests pass: active nav item indicated with `aria-current="page"`

#### Manual Verification:
- [ ] Sidebar renders on the left on desktop with logo, nav links, user info
- [ ] Bottom tab bar renders at screen bottom on mobile with 4 icon+label tabs
- [ ] Active nav item is visually distinct on both desktop and mobile
- [ ] Dark mode works correctly on sidebar and bottom nav
- [ ] No horizontal scroll on mobile viewport

---

## Phase 2: Empty State Pages

### Overview
Create all 4 pages with appropriate empty states per the issue spec. Each page is a simple server component with centered empty state messaging.

### Changes Required:

#### 1. Update Dashboard Page
**File**: `src/app/(application)/dashboard/page.tsx`
**Changes**: Replace placeholder with proper empty state for the Action Queue.

```tsx
import { Inbox } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Inbox size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No pending actions</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          AI-drafted messages will appear here for your review
        </p>
      </div>
    </div>
  );
}
```

#### 2. Create Pipeline Page
**File**: `src/app/(application)/pipeline/page.tsx` (new)
**Changes**: Empty state for the Pipeline Board.

```tsx
import { Users } from "lucide-react";

export default function PipelinePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No leads yet</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your leads will appear here, grouped by stage
        </p>
      </div>
    </div>
  );
}
```

#### 3. Create Lots Page
**File**: `src/app/(application)/lots/page.tsx` (new)
**Changes**: Empty state for the Lot Matcher.

```tsx
import { Map } from "lucide-react";

export default function LotsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Map size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No lots tracked</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add available lots to find matching leads
        </p>
      </div>
    </div>
  );
}
```

#### 4. Create Settings Page
**File**: `src/app/(application)/settings/page.tsx` (new)
**Changes**: Settings page showing user email and sign out button. The page itself is a server component; the sign out button is a client component.

```tsx
import { getSession } from "~/lib/session";
import { SignOutButton } from "./_components/sign-out-button";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="font-semibold text-lg">Settings</h1>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-sm font-medium" data-testid="settings-user-email">
            {session?.user.email}
          </p>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
```

#### 5. Sign Out Button Component
**File**: `src/app/(application)/settings/_components/sign-out-button.tsx` (new)
**Changes**: Client component that calls `authClient.signOut()`.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={loading}
      data-testid="settings-sign-out"
    >
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
```

#### 6. Tests — Empty States and Settings
**File**: `e2e/features/dashboard-shell.spec.ts`
**Changes**: Add tests for empty states and settings page (append to existing file from Phase 1).

```ts
test.describe("Dashboard Shell — Empty States", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  async function withAuth(context: import("@playwright/test").BrowserContext) {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.signedToken,
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  test("/dashboard shows Action Queue empty state", async ({
    context,
    page,
  }) => {
    await withAuth(context);
    await page.goto("/dashboard");
    await expect(page.getByText("No pending actions")).toBeVisible();
    await expect(
      page.getByText("AI-drafted messages will appear here"),
    ).toBeVisible();
  });

  test("/pipeline shows Pipeline empty state", async ({ context, page }) => {
    await withAuth(context);
    await page.goto("/pipeline");
    await expect(page.getByText("No leads yet")).toBeVisible();
  });

  test("/lots shows Lots empty state", async ({ context, page }) => {
    await withAuth(context);
    await page.goto("/lots");
    await expect(page.getByText("No lots tracked")).toBeVisible();
  });

  test("/settings shows user email", async ({ context, page }) => {
    await withAuth(context);
    await page.goto("/settings");
    await expect(
      page.locator('[data-testid="settings-user-email"]'),
    ).toBeVisible();
  });
});

test.describe("Dashboard Shell — Sign Out", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  test("sign out from settings redirects to login", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: session.signedToken,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/settings");
    await page.locator('[data-testid="settings-sign-out"]').click();
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `make build` succeeds
- [x] E2E tests pass: all 4 pages show expected empty state text
- [x] E2E tests pass: settings page shows user email
- [x] E2E tests pass: sign out redirects to /login

#### Manual Verification:
- [ ] Empty state icons and text are centered and readable
- [ ] Settings page displays the correct user email from session
- [ ] Sign out clears session (revisiting /dashboard redirects to /login)
- [ ] Empty states look correct in dark mode
- [ ] Layout is responsive — no horizontal scroll on mobile

---

## Performance Considerations

- All nav components are client components (required for `usePathname()`), but they're small and tree-shake well
- Empty state pages are server components (no client JS except settings sign-out button)
- The bottom nav uses `position: fixed` — content needs `pb-16 md:pb-0` to avoid overlap
- No additional dependencies required — everything uses existing lucide-react, next/navigation, and auth-client

## References

- Issue: [#94](https://github.com/samjmarshall/rekurve-www/issues/94)
- Parent epic: [#85](https://github.com/samjmarshall/rekurve-www/issues/85) (Epic 1: MVP Foundation)
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Dashboard UX section)
- Reference implementations: `~/workspace/v2/devoli-aws-prototype/ui/`, `~/workspace/v2/quitelike-aws-prototype/`, `~/workspace/lasoo/connect-platform/`
- Existing application layout: `src/app/(application)/layout.tsx`
- Auth client: `src/lib/auth-client.ts`
- Session helper: `src/lib/session.ts`
