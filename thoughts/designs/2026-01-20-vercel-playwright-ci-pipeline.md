# Vercel + Playwright CI/CD Pipeline Design

## Overview

Integrate Playwright E2E tests with Vercel deployments using GitHub Actions, enabling automated testing on preview deployments and gating production promotion on test results.

## Release Flow

```
PR Created → Vercel Preview → Playwright Tests → PR Checks Pass → Merge to main
                                                                        ↓
Production Promoted ← Deployment Checks Pass ← Playwright + QC ← Vercel builds main
```

## Architecture

### Trigger Mechanism

Uses Vercel's `repository_dispatch` events (recommended over legacy `deployment_status`):

- `vercel.deployment.ready` - Fires when build completes, before promotion
- Provides enriched payload with deployment URL, environment, git ref
- Integrates with Vercel Deployment Checks for production gating

### Workflows

Two separate workflows handle different concerns:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `playwright.yml` | `repository_dispatch` | E2E tests against deployed URL |
| `quality-control.yml` | `push`, `pull_request`, `repository_dispatch` | Lint, typecheck, audit |

### Deployment Checks

Three checks gate production promotion:

| Check Name | Source | Required |
|------------|--------|----------|
| `E2E Tests` | playwright.yml | Yes |
| `Quality Checks` | quality-control.yml | Yes |
| `NPM Audit` | quality-control.yml | Yes/Optional |

## Implementation

### 1. Playwright Workflow (New)

**File:** `.github/workflows/playwright.yml`

```yaml
name: E2E Tests

on:
  repository_dispatch:
    types:
      - 'vercel.deployment.ready'

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
        run: yarn install

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
        run: yarn check:e2e
        env:
          BASE_URL: ${{ github.event.client_payload.url }}
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

      - name: Report to Vercel
        if: always()
        uses: vercel/repository-dispatch/actions/status@v1
        with:
          name: 'E2E Tests'
```

### 2. Quality Control Workflow (Modifications)

**File:** `.github/workflows/quality-control.yml`

**Changes required:**

1. Add `repository_dispatch` trigger:
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  repository_dispatch:
    types:
      - 'vercel.deployment.ready'
```

2. Update checkout steps (conditional):
```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v5
    if: github.event_name != 'repository_dispatch'

  - name: Checkout (Vercel)
    uses: vercel/repository-dispatch/actions/checkout@v1
    if: github.event_name == 'repository_dispatch'
```

3. Add Vercel status reporting to each job:
```yaml
# End of 'check' job
- name: Report to Vercel
  if: always() && github.event_name == 'repository_dispatch'
  uses: vercel/repository-dispatch/actions/status@v1
  with:
    name: 'Quality Checks'

# End of 'audit' job
- name: Report to Vercel
  if: always() && github.event_name == 'repository_dispatch'
  uses: vercel/repository-dispatch/actions/status@v1
  with:
    name: 'NPM Audit'
```

### 3. Playwright Config Changes

**File:** `playwright.config.ts`

```typescript
const baseURL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const isCI = process.env.CI === 'true';

export default defineConfig({
  // ... existing config ...

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Vercel Protection Bypass
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : {},
  },

  // Disable webServer in CI - test against deployed URL
  webServer: isCI
    ? undefined
    : {
        command: 'yarn dev',
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
```

### 4. Vercel Dashboard Configuration

#### 4.1 Enable Repository Dispatch Events

**Settings → Git → GitHub → Repository Dispatch Events**

- Enable `vercel.deployment.ready`

#### 4.2 Create Protection Bypass Secret

**Settings → Deployment Protection → Protection Bypass for Automation**

1. Generate secret
2. Add to GitHub repo secrets as `VERCEL_AUTOMATION_BYPASS_SECRET`

#### 4.3 Configure Deployment Checks

**Settings → Deployment Checks → Add Check**

For each check (`E2E Tests`, `Quality Checks`, `NPM Audit`):
1. Select "GitHub Action" as check type
2. Enter the check name (must match workflow's `status` action `name` parameter)
3. Enable "Block production promotion until this check passes"

## GitHub Secrets Required

| Secret | Source | Purpose |
|--------|--------|---------|
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Dashboard | Bypass deployment protection for tests |

## Edge Cases

**Timeouts:** Jobs have timeouts (15min Playwright, 10min QC). Timeout = failure reported to Vercel.

**Flaky tests:** Playwright configured with `retries: 2` in CI.

**Branch filtering:** Currently runs on all deployments. Can add conditions if needed:
```yaml
if: contains(github.event.client_payload.git.ref, 'refs/heads/')
```

## References

- [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks)
- [Vercel Repository Dispatch](https://github.com/vercel/repository-dispatch)
- [Vercel Protection Bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
- [Vercel Changelog - Block Deployment Promotions](https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions)
