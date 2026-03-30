# Playwright CI Against Vercel Deployments — Implementation Plan

## Overview

Wire up Playwright E2E tests to run automatically against Vercel Preview and Production deployments via GitHub Actions. Uses Vercel's `repository_dispatch` integration to trigger tests when deployments are ready, and reports results back as Deployment Checks that gate production promotion.

## Current State Analysis

- **Playwright config** (`playwright.config.ts`) hardcodes `baseURL` to `http://localhost:${PORT}` and always runs a local build via `webServer` — incompatible with testing a remote deployment
- **Auth tests** (`e2e/features/auth.spec.ts`) require direct DB access (`DATABASE_URL`, `BETTER_AUTH_SECRET`) and set cookies with `domain: "localhost"` — cannot run against deployed URLs without additional secrets and domain logic
- **Example workflow** (`.github/workflows/playwright.yml`) uses legacy `deployment_status` trigger, which doesn't support Vercel Deployment Checks
- **Quality Control workflow** (`.github/workflows/quality-control.yml`) runs on `push`/`pull_request` only — not connected to Vercel deployments
- **Design doc** (`thoughts/designs/2026-01-20-vercel-playwright-ci-pipeline.md`) already specifies the target architecture using `repository_dispatch`

### Key Discoveries:
- `playwright.config.ts:4` — `baseURL` ignores `VERCEL_URL` env var
- `playwright.config.ts:33-39` — `webServer` block always active, will try to build in CI
- `auth.spec.ts:47-54` — cookie `domain` hardcoded to `"localhost"`
- `auth-helper.ts:6-7` — reads `DATABASE_URL` and `BETTER_AUTH_SECRET` from env
- `quality-control.yml` — no `repository_dispatch` trigger, no Vercel status reporting

## Desired End State

1. When Vercel finishes a Preview or Production deployment, GitHub Actions automatically runs Playwright tests against the deployed URL
2. Test results are reported back to Vercel as Deployment Checks
3. Quality Control checks (lint, typecheck, audit) also run on deployments and report back
4. Production promotion is blocked until all checks pass
5. Auth tests that need DB access are skipped in CI (tagged for future implementation)
6. Vercel Deployment Protection is bypassed for test requests via automation secret

### Verification:
- Push a branch → Vercel builds preview → `E2E Tests` and `Quality Checks` workflow runs → results appear as Vercel Deployment Checks
- If tests fail, production promotion is blocked
- Local `make test_e2e` still works unchanged

## What We're NOT Doing

- Passing DB secrets to CI (auth tests skipped for now)
- Sharding tests across multiple runners (premature — test suite is small)
- Adding a `workflow_dispatch` manual trigger (can add later if needed)
- Modifying test content — only config and CI wiring

## Implementation Approach

Four phases: Playwright config changes → skip auth tests in CI → Playwright workflow → Quality Control workflow. Each phase is independently testable.

---

## Phase 1: Update Playwright Config for Remote Deployments

### Overview
Make `playwright.config.ts` support testing against a remote URL by reading `VERCEL_URL`, disabling `webServer` in CI, and adding Vercel protection bypass headers.

### Changes Required:

#### 1. `playwright.config.ts`
**File**: `playwright.config.ts`
**Changes**: Read `VERCEL_URL` env var, conditionally disable `webServer`, add protection bypass headers

```typescript
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? 3000;
const baseURL = process.env.VERCEL_URL ?? `http://localhost:${PORT}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 4,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  outputDir: 'test-results/',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: undefined,
    permissions: [],
    geolocation: undefined,

    // Bypass Vercel Deployment Protection for automated tests
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : {},
  },

  // In CI, test against the deployed URL — no local server needed
  webServer: isCI
    ? undefined
    : {
        command: `rm -rf .next/ && yarn build && yarn start`,
        url: `http://localhost:${PORT}`,
        timeout: 120_000,
        reuseExistingServer: true,
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
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
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

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (no type errors in config)
- [x] `VERCEL_URL=https://example.com yarn playwright test --list` lists tests without starting a server

#### Manual Verification:
- [x] `make test_e2e` still works locally (starts build + runs tests)

---

## Phase 2: Skip Auth Tests That Need DB Access in CI

### Overview
Tag the "Authenticated Redirects" test block to skip in CI, since it requires `DATABASE_URL` and `BETTER_AUTH_SECRET`. The "Auth Health Check" and "Unauthenticated Redirects" tests work purely over HTTP and can run against deployed URLs.

### Changes Required:

#### 1. `e2e/features/auth.spec.ts`
**File**: `e2e/features/auth.spec.ts`
**Changes**: Add `test.skip` for the "Authenticated Redirects" describe block when `DATABASE_URL` is not available

```typescript
test.describe("Authenticated Redirects", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  // ... rest unchanged
});
```

This approach is better than checking `CI` because it's explicit about the actual dependency — if DB secrets are ever added to CI, the tests will automatically start running.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `DATABASE_URL= yarn playwright test e2e/features/auth.spec.ts --list` lists tests without crashing (lazy DB init)

#### Manual Verification:
- [x] Local `make test_e2e` still runs all auth tests (since `.env` has `DATABASE_URL`)

---

## Phase 3: Playwright Workflow with `repository_dispatch`

### Overview
Replace the example `deployment_status` workflow with the `repository_dispatch` approach. Tests run when Vercel fires `vercel.deployment.ready`, and results are reported back as a Deployment Check.

### Changes Required:

#### 1. `.github/workflows/playwright.yml`
**File**: `.github/workflows/playwright.yml`
**Changes**: Full rewrite

```yaml
name: E2E Tests

on:
  repository_dispatch:
    types:
      - "vercel.deployment.ready"

jobs:
  e2e-tests:
    name: Playwright (${{ github.event.client_payload.environment }})
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: vercel/repository-dispatch/actions/checkout@v1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc

      - name: Yarn cache
        uses: actions/cache@v4
        with:
          path: .yarn/cache
          key: yarn-${{ hashFiles('yarn.lock') }}

      - name: Install dependencies
        run: make install

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('yarn.lock') }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: yarn playwright install --with-deps

      - name: Install Playwright system deps
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: yarn playwright install-deps

      - name: Run Playwright tests
        run: make test_e2e
        env:
          VERCEL_URL: ${{ github.event.client_payload.url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.event.client_payload.environment }}
          path: |
            playwright-report/
            test-results/
          retention-days: 30

      - name: Report status to Vercel
        if: always()
        uses: vercel/repository-dispatch/actions/status@v1
        with:
          name: "E2E Tests"
```

### Success Criteria:

#### Automated Verification:
- [x] YAML is valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/playwright.yml'))"`
- [x] `make check` passes

#### Manual Verification:
- [ ] Push branch to GitHub → Vercel deploys preview → workflow triggers → tests run against preview URL
- [ ] Test report artifact is uploaded
- [ ] Vercel shows "E2E Tests" as a Deployment Check

---

## Phase 4: Add `repository_dispatch` to Quality Control Workflow

### Overview
Make the Quality Control workflow also run on Vercel deployments and report back as Deployment Checks, gating production promotion alongside the E2E tests.

### Changes Required:

#### 1. `.github/workflows/quality-control.yml`
**File**: `.github/workflows/quality-control.yml`
**Changes**: Add `repository_dispatch` trigger, conditional checkout, Vercel status reporting

```yaml
name: Quality Control

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  repository_dispatch:
    types:
      - "vercel.deployment.ready"

jobs:
  check:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
        if: github.event_name != 'repository_dispatch'

      - uses: vercel/repository-dispatch/actions/checkout@v1
        if: github.event_name == 'repository_dispatch'

      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc

      - name: Yarn cache
        uses: actions/cache@v5
        with:
          path: .yarn/cache
          key: yarn-${{ hashFiles('yarn.lock') }}

      - run: make install

      - name: Lint & Type Check
        run: make check

      - name: Report status to Vercel
        if: always() && github.event_name == 'repository_dispatch'
        uses: vercel/repository-dispatch/actions/status@v1
        with:
          name: "Quality Checks"

  audit:
    name: NPM Audit
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: actions/checkout@v6
        if: github.event_name != 'repository_dispatch'

      - uses: vercel/repository-dispatch/actions/checkout@v1
        if: github.event_name == 'repository_dispatch'

      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc

      - name: Yarn cache
        uses: actions/cache@v5
        with:
          path: .yarn/cache
          key: yarn-${{ hashFiles('yarn.lock') }}

      - run: make install

      - name: Audit
        run: make audit

      - name: Report status to Vercel
        if: always() && github.event_name == 'repository_dispatch'
        uses: vercel/repository-dispatch/actions/status@v1
        with:
          name: "NPM Audit"
```

### Success Criteria:

#### Automated Verification:
- [x] YAML is valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/quality-control.yml'))"`
- [x] Existing `push`/`pull_request` triggers still work (no regression)

#### Manual Verification:
- [ ] On Vercel deployment, both `Quality Checks` and `NPM Audit` appear as Deployment Checks
- [ ] On `push` to main or PR, workflow still runs normally without Vercel status step

---

## Phase 5: Vercel Dashboard Configuration (Manual)

### Overview
Configure the Vercel project to fire `repository_dispatch` events and gate production promotion on GitHub Actions checks.

### Steps:

#### 1. Enable Repository Dispatch Events
**Vercel Dashboard → Settings → Git → GitHub → Repository Dispatch Events**
- Enable `vercel.deployment.ready`

#### 2. Create Protection Bypass Secret
**Vercel Dashboard → Settings → Deployment Protection → Protection Bypass for Automation**
1. Click "Generate Secret"
2. Copy the generated secret
3. Add to GitHub repo as secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
   - **GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret**

#### 3. Configure Deployment Checks
**Vercel Dashboard → Settings → Deployment Checks → Add Check**

Add three checks:

| Check Name | Type | Block Production |
|---|---|---|
| `E2E Tests` | GitHub Action | Yes |
| `Quality Checks` | GitHub Action | Yes |
| `NPM Audit` | GitHub Action | Yes (or Optional) |

The check names **must** match the `name` parameter in each workflow's `vercel/repository-dispatch/actions/status@v1` step exactly.

### Success Criteria:

#### Manual Verification:
- [ ] Vercel Settings shows `vercel.deployment.ready` dispatch enabled
- [ ] `VERCEL_AUTOMATION_BYPASS_SECRET` exists in GitHub repo secrets
- [ ] Three Deployment Checks configured in Vercel
- [ ] Push a test branch → Vercel deploys → all three checks appear and run → production promotion is gated

---

## Testing Strategy

### Smoke Test (after all phases):
1. Create a PR with a trivial change
2. Verify Vercel builds preview deployment
3. Verify `E2E Tests` workflow triggers and runs Playwright against the preview URL
4. Verify `Quality Control` workflow triggers with both `check` and `audit` jobs
5. Verify all three checks appear in Vercel's Deployment Checks UI
6. Verify auth "Authenticated Redirects" tests are skipped (no DB secrets in CI)
7. Verify auth "Health Check" and "Unauthenticated Redirects" tests pass
8. Merge to main → verify production deployment is gated until checks pass

### Rollback:
If something goes wrong, disable the `vercel.deployment.ready` dispatch event in Vercel Dashboard. Workflows will simply stop triggering — no code changes needed.

## GitHub Secrets Required

| Secret | Source | Purpose |
|---|---|---|
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Dashboard | Bypass deployment protection for Playwright requests |

## References

- Design doc: `thoughts/designs/2026-01-20-vercel-playwright-ci-pipeline.md`
- [Vercel Repository Dispatch](https://github.com/vercel/repository-dispatch)
- [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks)
- [Vercel Protection Bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
- [Vercel Changelog — Block Deployment Promotions](https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions)
