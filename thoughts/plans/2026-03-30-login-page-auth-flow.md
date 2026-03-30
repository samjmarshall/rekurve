# Login Page & Auth Redirect Flow — Implementation Plan

## Overview

Build the login page UI in the `(login)` route group. Two-step email OTP flow: email input sends a verification code, then a 6-digit segmented input verifies and creates a session. Clean, minimal design with no nav/footer chrome. Mobile-first — the primary user (sales consultant) is on their phone.

GitHub Issue: #92

## Current State Analysis

The auth infrastructure is fully wired:

- **Server auth** (`src/lib/auth.ts`): `betterAuth` with `emailOTP` plugin sending via Resend from `noreply@rekurve.ai`
- **Client auth** (`src/lib/auth-client.ts`): `createAuthClient` with `emailOTPClient()` — exposes `authClient.emailOtp.sendVerificationOtp()` and `authClient.signIn.emailOtp()`
- **API route** (`src/app/api/auth/[...all]/route.ts`): catch-all handler mounting the auth API
- **Session** (`src/lib/session.ts`): `cache()`-wrapped `getSession()` for server components
- **DB schema** (`src/server/db/schema/auth.ts`): `user`, `session`, `account`, `verification` tables
- **Login layout** (`src/app/(login)/layout.tsx`): root layout with session check → redirect to `/dashboard`, `noindex` robots, ThemeProvider, fonts
- **Login page** (`src/app/(login)/login/page.tsx`): placeholder "Coming soon" — needs replacing

### Key Discoveries

- `Logo` component exists at `src/components/logo.tsx:7-17` — renders `NativeIcon` + "REKURVE" text as a link to `/`
- All needed base components installed: `Card`, `Input`, `Button` in `src/components/ui/`
- `input-otp` (shadcn) is **not** installed yet — needs adding
- `Button` variants: `primary` (white bg, blue bottom border), `secondary`, `outline`, `ghost` (`src/components/ui/Button.tsx:11-19`)
- Form pattern in codebase uses `react-hook-form` + `zod` + `Field` composites (BookingForm), but this login form is simple enough for plain `useState`
- No middleware.ts exists — auth gating is done in layout server components

## Desired End State

- `/login` renders a centered card with the Rekurve logo
- **Step 1**: Email input + "Continue" button → sends OTP via `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })`
- **Step 2**: 6-digit segmented OTP input (shadcn `InputOTP`) + "Verify" button → verifies via `authClient.signIn.emailOtp({ email, otp })`
- Success redirects to `/dashboard`
- Error states for invalid email, invalid/expired OTP, rate limiting
- "Resend code" option on step 2
- "Back" link to return to step 1
- Mobile-responsive, dark mode supported
- Already-authenticated users redirected to `/dashboard` (existing layout behavior)
- PostHog `identify(email)` fires on email submit (Step 1) — links anonymous session to email
- PostHog `login_otp_requested` event captured on Step 1 success
- PostHog `login_success` event captured on Step 2 success, with `last_login` person property set

### Verification

- `make build` succeeds
- `make check` passes
- Manual walkthrough of the full OTP flow

## What We're NOT Doing

- Google OAuth / social login buttons
- "Remember me" checkbox
- Custom email template styling (plain text OTP for now)
- Sign-up flow (email OTP handles both new + existing users automatically)
- Framer-motion animations (utility page, not marketing)
- E2E test of the full real OTP email delivery (Resend sends real emails — no test mode available). Client-side flow is tested via API mocking with `page.route()`

## Implementation Approach

Single client component replacing the placeholder page. Two-step state machine managed with `useState`. Uses existing `Card`, `Input`, `Button`, `Logo` components plus newly-installed shadcn `InputOTP`. PostHog identify call on email submission (Step 1) to link the anonymous session to the user's email, plus event tracking for OTP request and login success. E2E tests cover the full client-side flow using Playwright's `page.route()` to mock better-auth API responses — no real email delivery required.

## Phase 1: Install shadcn input-otp Component

### Overview

Add the shadcn `input-otp` component which provides a segmented OTP input with accessible slot-based UI.

### Changes Required

#### 1. Install component

```bash
yarn dlx shadcn@latest add input-otp
```

This will:
- Install the `input-otp` npm package
- Create `src/components/ui/input-otp.tsx`

### Success Criteria

#### Automated Verification
- [x] `make check` passes after install

---

## Phase 2: Add Auth Tracking to PostHog Analytics

### Overview

Add an `authTracking` section to the existing PostHog analytics module. This follows the established pattern (`ctaTracking`, `formTracking`, etc.) and provides `identify` (on email submit) and `loginSuccess` (on OTP verify) methods.

### Changes Required

#### 1. Auth Tracking Section
**File**: `src/lib/posthog.ts`
**Changes**: Add `authTracking` object before the consolidated export, and add it to the `analytics` export

Add after the `recordingControl` section (~line 868) and before the consolidated export:

```typescript
// ============================================================================
// Auth Tracking
// ============================================================================

export const authTracking = {
  /**
   * Identify user when they submit their email for OTP.
   * Links the anonymous PostHog session to the user's email address.
   * Call this after a successful OTP send (Step 1 of login).
   */
  identify: (email: string) => {
    if (!isPostHogReady()) return;

    posthog.identify(email, {
      $set: {
        email,
      },
      $set_once: {
        first_login_attempt: new Date().toISOString(),
      },
    });

    safeCapture("login_otp_requested", {
      method: "email_otp",
    });
  },

  /**
   * Track successful login after OTP verification.
   */
  loginSuccess: () => {
    safeCapture("login_success", {
      method: "email_otp",
    });

    posthog.setPersonProperties({
      last_login: new Date().toISOString(),
    });
  },
};
```

Update the consolidated `analytics` export to include `auth`:

```typescript
export const analytics = {
  auth: authTracking,   // ← add this line
  cta: ctaTracking,
  // ... rest unchanged
};
```

### Success Criteria

#### Automated Verification
- [x] `make check` passes

---

## Phase 3: Build the Login Page

### Overview

Replace the placeholder login page with the full two-step OTP flow.

### Changes Required

#### 1. Login Page Component
**File**: `src/app/(login)/login/page.tsx`
**Changes**: Complete rewrite — replace placeholder with client component

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { analytics } from "~/lib/posthog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/Button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/components/ui/input-otp";
import { NativeIcon } from "~/icons/bento-icons";

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (error) {
        setError(error.message ?? "Failed to send verification code");
        return;
      }

      // Identify user in PostHog — links anonymous session to email
      analytics.auth.identify(email);

      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (error) {
        setError(error.message ?? "Invalid or expired code");
        return;
      }

      analytics.auth.loginSuccess();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (error) {
        setError(error.message ?? "Failed to resend code");
        return;
      }

      setOtp("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <NativeIcon className="size-8 text-primary" />
          <span className="font-mono text-xl font-bold">REKURVE</span>
        </div>

        <Card>
          {step === "email" ? (
            <form onSubmit={handleSendOtp} data-testid="login-email-form">
              <CardHeader>
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>
                  Enter your email to receive a verification code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    disabled={loading}
                    data-testid="login-email-input"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert" data-testid="login-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                  data-testid="login-continue-button"
                >
                  {loading ? "Sending..." : "Continue"}
                </Button>
              </CardContent>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} data-testid="login-otp-form">
              <CardHeader>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground" data-testid="login-otp-email">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center" data-testid="login-otp-input">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={loading}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert" data-testid="login-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading || otp.length !== 6}
                  data-testid="login-verify-button"
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="login-back-button"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    data-testid="login-resend-button"
                  >
                    Resend code
                  </button>
                </div>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
```

**Design notes:**
- Inline logo (not using the `Logo` component which wraps a `<Link>`) — just the icon + wordmark, centered above the card
- `max-w-sm` card width — comfortable on mobile, not too wide on desktop
- `px-4` on main for mobile edge padding
- `text-destructive` for errors (maps to the `--destructive` CSS variable)
- Loading states disable inputs and buttons, show "Sending..."/"Verifying..." text
- OTP step shows the email address so the user knows where to check
- Back button clears OTP state
- Resend clears the OTP input on success
- All interactive elements have `data-testid` attributes for E2E test selectors

### Success Criteria

#### Automated Verification
- [x] `make build` succeeds
- [x] `make check` passes
- [x] TypeScript compilation passes with no errors

#### Manual Verification
- [ ] `/login` shows email input form with Rekurve logo
- [ ] Submitting valid email triggers OTP send and transitions to code entry step
- [ ] Submitting invalid email shows browser-native validation (HTML `required` + `type="email"`)
- [ ] OTP step shows 6-digit segmented input
- [ ] OTP step displays the email address the code was sent to
- [ ] Entering correct 6-digit code creates session and redirects to `/dashboard`
- [ ] Entering incorrect code shows error with "Resend code" option
- [ ] "Back" link returns to email step
- [ ] "Resend code" sends a new OTP and clears the input
- [ ] Login page is mobile-responsive (test at 375px width)
- [ ] Dark mode renders correctly
- [ ] Already-authenticated user visiting `/login` is redirected to `/dashboard`
- [ ] Page has `noindex` meta tag (inspect source — set by layout)
- [ ] Loading states disable form interactions
- [ ] PostHog identify fires on email submit (check PostHog persons list — email should appear as distinct ID)
- [ ] `login_otp_requested` event appears in PostHog after email submit
- [ ] `login_success` event appears in PostHog after OTP verify
- [ ] `last_login` person property is set after successful login

---

## Phase 4: E2E Tests for Login Flow

### Overview

Add E2E tests covering the login page UI, client-side form flow (via API mocking), error states, analytics events, and redirect guards. Uses Playwright's `page.route()` to intercept better-auth API calls, so tests run without real email delivery or DB access (except the authenticated redirect test, which uses the existing `createTestSession` DB bypass).

### Changes Required

#### 1. Login Page Object
**File**: `e2e/pages/login.page.ts` (new)
**Pattern**: Follows existing POM pattern (`home.page.ts`, `hero.section.ts`) — locators as readonly properties, action/assertion methods.

```typescript
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly container: Locator;
  readonly logo: Locator;

  // Email step
  readonly emailForm: Locator;
  readonly emailInput: Locator;
  readonly continueButton: Locator;

  // OTP step
  readonly otpForm: Locator;
  readonly otpInput: Locator;
  readonly otpEmail: Locator;
  readonly verifyButton: Locator;
  readonly backButton: Locator;
  readonly resendButton: Locator;

  // Shared
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="login-page"]');
    this.logo = this.container.locator("span").filter({ hasText: "REKURVE" });

    // Email step
    this.emailForm = page.locator('[data-testid="login-email-form"]');
    this.emailInput = page.locator('[data-testid="login-email-input"]');
    this.continueButton = page.locator('[data-testid="login-continue-button"]');

    // OTP step
    this.otpForm = page.locator('[data-testid="login-otp-form"]');
    this.otpInput = page.locator('[data-testid="login-otp-input"]');
    this.otpEmail = page.locator('[data-testid="login-otp-email"]');
    this.verifyButton = page.locator('[data-testid="login-verify-button"]');
    this.backButton = page.locator('[data-testid="login-back-button"]');
    this.resendButton = page.locator('[data-testid="login-resend-button"]');

    // Shared
    this.error = page.locator('[data-testid="login-error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async submitEmail(): Promise<void> {
    await this.continueButton.click();
  }

  async submitOtp(): Promise<void> {
    await this.verifyButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  async clickResend(): Promise<void> {
    await this.resendButton.click();
  }

  async expectEmailStep(): Promise<void> {
    await expect(this.emailForm).toBeVisible();
    await expect(this.otpForm).not.toBeVisible();
  }

  async expectOtpStep(): Promise<void> {
    await expect(this.otpForm).toBeVisible();
    await expect(this.emailForm).not.toBeVisible();
  }

  async expectError(message?: string): Promise<void> {
    await expect(this.error).toBeVisible();
    if (message) {
      await expect(this.error).toHaveText(message);
    }
  }

  async expectNoError(): Promise<void> {
    await expect(this.error).not.toBeVisible();
  }
}
```

#### 2. Login Fixture
**File**: `e2e/fixtures/test.ts`
**Changes**: Add `loginPage` fixture alongside the existing `homePage` fixture

Add import:
```typescript
import { LoginPage } from "../pages/login.page";
```

Update `TestFixtures` type:
```typescript
type TestFixtures = {
  analytics: AnalyticsHelper;
  homePage: HomePage;
  loginPage: LoginPage;
};
```

Add fixture:
```typescript
loginPage: async ({ page }, use) => {
  const loginPage = new LoginPage(page);
  await use(loginPage);
},
```

#### 3. API Mock Helper
**File**: `e2e/utils/auth-mock.ts` (new)
**Purpose**: Reusable route interceptors for better-auth API endpoints. Tests call these to control what the client-side auth calls return.

```typescript
import type { Page } from "@playwright/test";

/**
 * Mock the better-auth send-otp endpoint.
 * Intercepts POST to /api/auth/email-otp/send-verification-otp
 */
export function mockSendOtp(
  page: Page,
  response: { ok: boolean; error?: string },
) {
  return page.route("**/api/auth/email-otp/send-verification-otp", (route) => {
    if (response.ok) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: true }),
      });
    }
    return route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: response.error ?? "Too many requests" },
      }),
    });
  });
}

/**
 * Mock the better-auth sign-in-with-otp endpoint.
 * Intercepts POST to /api/auth/sign-in/email-otp
 */
export function mockVerifyOtp(
  page: Page,
  response: { ok: boolean; error?: string },
) {
  return page.route("**/api/auth/sign-in/email-otp", (route) => {
    if (response.ok) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session: { id: "mock-session" }, user: { id: "mock-user" } }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: response.error ?? "Invalid or expired code" },
      }),
    });
  });
}
```

**Note**: The exact API paths (`/api/auth/email-otp/send-verification-otp` and `/api/auth/sign-in/email-otp`) need to be verified against the running app's network requests during implementation. better-auth generates these from the plugin config. If the paths differ, update the mock patterns to match.

#### 4. Login Flow Tests
**File**: `e2e/features/login.spec.ts` (new)
**Pattern**: Follows existing spec pattern (see `auth.spec.ts`, `cta-tracking.spec.ts`)

```typescript
import { expect, test } from "../fixtures/test";
import { mockSendOtp, mockVerifyOtp } from "../utils/auth-mock";

const TEST_EMAIL = "test@example.com";

test.describe("Login Page — UI", () => {
  test("renders the email step with logo and form", async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.logo).toBeVisible();
    await loginPage.expectEmailStep();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.continueButton).toBeVisible();
    await expect(loginPage.continueButton).toHaveText("Continue");
  });

  test("email input has correct attributes", async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.emailInput).toHaveAttribute("type", "email");
    await expect(loginPage.emailInput).toHaveAttribute("required", "");
    await expect(loginPage.emailInput).toHaveAttribute("autocomplete", "email");
  });
});

test.describe("Login Page — Email Step", () => {
  test("transitions to OTP step on successful email submit", async ({
    loginPage,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();

    await loginPage.expectOtpStep();
    await expect(loginPage.otpEmail).toHaveText(TEST_EMAIL);
  });

  test("shows error when OTP send fails", async ({ loginPage }) => {
    await mockSendOtp(loginPage.page, {
      ok: false,
      error: "Too many requests",
    });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();

    await loginPage.expectEmailStep();
    await loginPage.expectError("Too many requests");
  });

  test("shows loading state while sending", async ({ loginPage }) => {
    // Use a delayed response to observe loading state
    await loginPage.page.route(
      "**/api/auth/email-otp/send-verification-otp",
      async (route) => {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: true }),
        });
      },
    );
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();

    await expect(loginPage.continueButton).toHaveText("Sending...");
    await expect(loginPage.continueButton).toBeDisabled();
    await expect(loginPage.emailInput).toBeDisabled();
  });
});

test.describe("Login Page — OTP Step", () => {
  test.beforeEach(async ({ loginPage }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await loginPage.goto();
    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();
  });

  test("shows error for invalid OTP", async ({ loginPage }) => {
    await mockVerifyOtp(loginPage.page, {
      ok: false,
      error: "Invalid or expired code",
    });

    // Type 6 digits into the OTP input slots
    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await loginPage.expectError("Invalid or expired code");
  });

  test("verify button is disabled until 6 digits entered", async ({
    loginPage,
  }) => {
    await expect(loginPage.verifyButton).toBeDisabled();

    // Type only 3 digits
    await loginPage.page.keyboard.type("123");
    await expect(loginPage.verifyButton).toBeDisabled();

    // Complete to 6 digits
    await loginPage.page.keyboard.type("456");
    await expect(loginPage.verifyButton).toBeEnabled();
  });

  test("back button returns to email step", async ({ loginPage }) => {
    await loginPage.clickBack();
    await loginPage.expectEmailStep();
    // Email should still be populated
    await expect(loginPage.emailInput).toHaveValue(TEST_EMAIL);
  });

  test("resend button triggers new OTP send", async ({ loginPage }) => {
    let sendCount = 0;
    await loginPage.page.route(
      "**/api/auth/email-otp/send-verification-otp",
      (route) => {
        sendCount++;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: true }),
        });
      },
    );

    await loginPage.clickResend();
    // Wait for the request to complete
    await expect(loginPage.resendButton).toBeEnabled();
    expect(sendCount).toBe(1);
  });

  test("shows loading state while verifying", async ({ loginPage }) => {
    await loginPage.page.route(
      "**/api/auth/sign-in/email-otp",
      async (route) => {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ session: { id: "s" }, user: { id: "u" } }),
        });
      },
    );

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await expect(loginPage.verifyButton).toHaveText("Verifying...");
    await expect(loginPage.verifyButton).toBeDisabled();
  });
});

test.describe("Login Page — PostHog Events", () => {
  test("fires login_otp_requested on email submit", async ({
    loginPage,
    analytics,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();

    // Allow time for async PostHog capture
    await loginPage.page.waitForTimeout(500);

    analytics
      .expectEvent("login_otp_requested")
      .withProperty("method", "email_otp")
      .toBeFired();
  });

  test("fires login_success on successful OTP verify", async ({
    loginPage,
    analytics,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await mockVerifyOtp(loginPage.page, { ok: true });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    // Allow time for async PostHog capture
    await loginPage.page.waitForTimeout(500);

    analytics
      .expectEvent("login_success")
      .withProperty("method", "email_otp")
      .toBeFired();
  });

  test("does not fire login_success on failed OTP verify", async ({
    loginPage,
    analytics,
  }) => {
    await mockSendOtp(loginPage.page, { ok: true });
    await mockVerifyOtp(loginPage.page, { ok: false });
    await loginPage.goto();

    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.submitEmail();
    await loginPage.expectOtpStep();

    await loginPage.page.keyboard.type("123456");
    await loginPage.submitOtp();

    await loginPage.page.waitForTimeout(500);

    analytics.expectNoEvent("login_success");
  });
});
```

#### 5. Update Existing Auth Spec
**File**: `e2e/features/auth.spec.ts`
**Changes**: Update the unauthenticated login render test to match the new page content (the `<h1>` text changes from "Login" to "Sign in")

```typescript
// Line 28 — update the expected heading text
test("/login renders the login page when unauthenticated", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
```

### Success Criteria

#### Automated Verification
- [x] `make check` passes
- [x] `make test_e2e` passes (new login tests included)
- [x] All login page tests pass with API mocking (no real email delivery needed)

#### Manual Verification
- [ ] Login page tests appear in Playwright test report
- [ ] PostHog event tests correctly capture mocked analytics
- [ ] Tests run across desktop, tablet, and mobile Playwright projects

---

## Testing Strategy

### Automated — Build & Lint
- `make build` — confirms the page compiles and renders server-side without error
- `make check` — lint + typecheck passes

### Automated — E2E Tests (`e2e/features/login.spec.ts`)
Tests use Playwright's `page.route()` to intercept better-auth API calls, enabling full client-side flow testing without real email delivery:

| Test Group | What's Covered |
|---|---|
| **UI** | Page renders with logo, email form, correct input attributes |
| **Email Step** | Successful transition to OTP step, error handling, loading states |
| **OTP Step** | Invalid code errors, verify button disabled state, back button, resend, loading states |
| **PostHog Events** | `login_otp_requested` fires on email submit, `login_success` fires on verify, no success event on failure |

Redirect tests remain in `e2e/features/auth.spec.ts`:
- Unauthenticated `/dashboard` → `/login` redirect
- Authenticated `/login` → `/dashboard` redirect (requires `DATABASE_URL` — skipped in CI without it)

### Manual Testing Steps
1. Visit `/login` — see email form
2. Enter email, click Continue — receive OTP email, see code entry step
3. Enter wrong code — see error message
4. Click "Resend code" — receive new email, input clears
5. Enter correct code — redirected to `/dashboard`
6. Visit `/login` again while authenticated — redirected to `/dashboard`
7. Test on mobile viewport (375px)
8. Toggle dark mode — verify readability
9. Check PostHog → Persons — email appears as distinct ID after Step 1
10. Check PostHog → Events — `login_otp_requested` and `login_success` events fire at correct steps

## Performance Considerations

None — this is a simple form with two API calls. No heavy libraries or animations.

## Migration Notes

None — replacing a placeholder page, no existing functionality to migrate.

## References

- GitHub Issue: #92
- Parent Epic: #85 (MVP Foundation)
- Dependencies: #89 (Route Group Scaffold), #91 (better-auth setup)
- better-auth emailOTP plugin docs: client methods `emailOtp.sendVerificationOtp()` and `signIn.emailOtp()`
- shadcn input-otp: uses `input-otp` library under the hood
