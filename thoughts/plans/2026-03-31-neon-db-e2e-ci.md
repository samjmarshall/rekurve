# Neon DB Connection for E2E Tests in CI — Implementation Plan

## Overview

Add a Neon API lookup step to `playwright.yml` so that `DATABASE_URL` and `BETTER_AUTH_SECRET` are available to the GitHub Actions runner. This lifts the `test.skip(!process.env.DATABASE_URL, ...)` guard and enables auth-dependent E2E tests (e.g., `dashboard-shell.spec.ts`) to run in CI against Vercel preview and production deployments.

## Current State Analysis

- `playwright.yml` triggers on `repository_dispatch` → `vercel.deployment.ready` and runs E2E tests against the Vercel URL
- `auth-helper.ts` lazily initializes `neon()` from `process.env.DATABASE_URL` — safe to import when absent
- All three `test.describe` blocks in `dashboard-shell.spec.ts` guard with `test.skip(!process.env.DATABASE_URL, ...)` — currently skip in CI
- `client_payload` provides `url`, `environment`, and `git.ref` from the Vercel dispatch

### Key Discoveries:
- `auth-helper.ts:8-11` — lazy `neon()` init means no import-time crash when `DATABASE_URL` is absent
- `auth-helper.ts:13-14` — `BETTER_AUTH_SECRET` also read lazily via `secret()` accessor
- `playwright.yml:56-60` — only `VERCEL_URL` and `VERCEL_AUTOMATION_BYPASS_SECRET` are passed to the test step today
- `.github/workflows/playwright.yml:24-25` — uses `vercel/repository-dispatch/actions/checkout@v1` which checks out the deployment commit SHA

## Desired End State

The `playwright.yml` workflow resolves the Neon branch database URL before running tests. Auth-dependent E2E tests execute in CI against the same database the deployed app queries. No app code changes.

### Verification:
- Auth-dependent E2E tests run (not skip) in CI for both preview and production deployments
- If Neon API is unreachable or branch lookup fails, tests skip gracefully (existing guard) with a `::warning::` annotation
- No changes to `e2e/utils/auth-helper.ts` or any application source code

## What We're NOT Doing

- Creating new Neon branches from the workflow (the Neon-Vercel integration already provisions them)
- Changing `auth-helper.ts` or any app code
- Adding a separate test database or test fixtures beyond what exists
- Handling Neon branch cleanup (Vercel integration manages lifecycle)

## Implementation Approach

Two phases: first verify the Neon branch naming convention (manual), then update the workflow (one new step + two new env vars on the Playwright step).

---

## Phase 1: Verify Neon Branch Naming & Configure GitHub

### Overview
Before writing the branch matching logic, verify how the Neon-Vercel integration names preview branches. Then configure the required GitHub secrets and variables.

### Steps:

#### 1. Verify Neon Branch Naming Convention
**Action**: Manual — check the Neon dashboard

1. Open Neon Console → Project → Branches
2. Find a preview branch created by the Neon-Vercel integration for a recent PR
3. Note the exact branch name format — does it match the git branch name exactly, or is it prefixed/suffixed (e.g., `preview/feat/my-branch` or `feat/my-branch`)?
4. Note the primary branch name (likely `main` or `br-xxx`)
5. Update the `jq` filter in Phase 2 if the naming convention differs from a simple `test($ref)` contains match

**Why this matters**: The design doc's `select(.name | test($ref))` regex contains match assumes the git ref appears somewhere in the Neon branch name. If the Neon-Vercel integration uses a different convention (e.g., numeric IDs, deployment URLs), the filter will silently fail and auth tests will skip — defeating the purpose of this work.

#### 2. Configure GitHub Secrets and Variables
**Action**: Manual — GitHub repo Settings → Secrets and variables → Actions

| Name | Type | Source | Notes |
|---|---|---|---|
| `NEON_API_KEY` | Secret | Neon Console → Account Settings → API Keys | Create a new key scoped to this project if possible |
| `NEON_PROJECT_ID` | Variable | Neon Console → Project Settings → General | The project ID string (e.g., `withered-rain-12345678`) |
| `BETTER_AUTH_SECRET` | Secret | Must match the value configured on Vercel | Copy from Vercel → Project → Settings → Environment Variables |

### Success Criteria:

#### Manual Verification:
- [x] Neon branch naming convention documented (exact format noted)
- [x] `jq` filter confirmed or adjusted based on actual naming
- [x] `NEON_API_KEY` secret added to GitHub repo
- [x] `NEON_PROJECT_ID` variable added to GitHub repo
- [x] `BETTER_AUTH_SECRET` secret added to GitHub repo
- [x] `BETTER_AUTH_SECRET` value confirmed to match Vercel's value

---

## Phase 2: Update Playwright Workflow

### Overview
Add a single new step to `playwright.yml` that calls the Neon API to resolve the database connection URI for the deployed branch, then pass it (along with `BETTER_AUTH_SECRET`) to the Playwright test step.

### Changes Required:

#### 1. Add Neon Branch Resolution Step
**File**: `.github/workflows/playwright.yml`
**Changes**: Insert a new step between "Install Playwright system deps" (line 54) and "Run Playwright tests" (line 56). Update the Playwright step's `env` block to include `DATABASE_URL` and `BETTER_AUTH_SECRET`.

```yaml
      - name: Resolve Neon branch database URL
        id: neon
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ vars.NEON_PROJECT_ID }}
          GIT_REF: ${{ github.event.client_payload.git.ref }}
          ENVIRONMENT: ${{ github.event.client_payload.environment }}
        run: |
          # List branches, find the match
          BRANCHES=$(curl -s -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches")

          if [ "$ENVIRONMENT" = "production" ]; then
            # Primary branch for production deployments
            BRANCH_ID=$(echo "$BRANCHES" | jq -r '.branches[] | select(.primary == true) | .id')
          else
            # Preview branch — match by git ref name
            # NOTE: Adjust this filter based on Phase 1 naming convention findings
            BRANCH_ID=$(echo "$BRANCHES" | jq -r --arg ref "$GIT_REF" \
              '.branches[] | select(.name | test($ref)) | .id')
          fi

          if [ -z "$BRANCH_ID" ]; then
            echo "::warning::Could not resolve Neon branch for ref '$GIT_REF' — auth tests will skip"
            exit 0
          fi

          # Get connection URI for the branch
          CONNECTION=$(curl -s -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/connection_uri?branch_id=$BRANCH_ID&role_name=neondb_owner&database_name=neondb")

          echo "db_url=$(echo $CONNECTION | jq -r '.uri')" >> "$GITHUB_OUTPUT"
```

#### 2. Update Playwright Step Environment Variables
**File**: `.github/workflows/playwright.yml`
**Changes**: Add `DATABASE_URL` and `BETTER_AUTH_SECRET` to the existing `env` block of the "Run Playwright tests" step.

```yaml
      - name: Run Playwright tests
        run: make test_e2e
        env:
          VERCEL_URL: ${{ github.event.client_payload.url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
          DATABASE_URL: ${{ steps.neon.outputs.db_url }}
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
```

#### 3. Full Updated Workflow File
**File**: `.github/workflows/playwright.yml`
**Changes**: Complete file for reference — the only additions are the Neon resolution step and two new env vars.

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
    permissions:
      contents: read
      actions: read
      statuses: write

    steps:
      - name: Report status to Vercel
        uses: vercel/repository-dispatch/actions/status@v1
        with:
          name: "E2E Tests"

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

      - name: Resolve Neon branch database URL
        id: neon
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ vars.NEON_PROJECT_ID }}
          GIT_REF: ${{ github.event.client_payload.git.ref }}
          ENVIRONMENT: ${{ github.event.client_payload.environment }}
        run: |
          BRANCHES=$(curl -s -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches")

          if [ "$ENVIRONMENT" = "production" ]; then
            BRANCH_ID=$(echo "$BRANCHES" | jq -r '.branches[] | select(.primary == true) | .id')
          else
            BRANCH_ID=$(echo "$BRANCHES" | jq -r --arg ref "$GIT_REF" \
              '.branches[] | select(.name | test($ref)) | .id')
          fi

          if [ -z "$BRANCH_ID" ]; then
            echo "::warning::Could not resolve Neon branch for ref '$GIT_REF' — auth tests will skip"
            exit 0
          fi

          CONNECTION=$(curl -s -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/connection_uri?branch_id=$BRANCH_ID&role_name=neondb_owner&database_name=neondb")

          echo "db_url=$(echo $CONNECTION | jq -r '.uri')" >> "$GITHUB_OUTPUT"

      - name: Run Playwright tests
        run: make test_e2e
        env:
          VERCEL_URL: ${{ github.event.client_payload.url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
          DATABASE_URL: ${{ steps.neon.outputs.db_url }}
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.event.client_payload.environment }}
          path: |
            playwright-report/
            test-results/
          retention-days: 30
```

### Success Criteria:

#### Automated Verification:
- [x] Workflow YAML is valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/playwright.yml'))"`
- [x] `make check` passes (no app code changed, but sanity check)

#### Manual Verification:
- [ ] Push a branch → Vercel deploys → `repository_dispatch` fires → Neon step resolves `DATABASE_URL`
- [ ] Auth-dependent tests in `dashboard-shell.spec.ts` run (not skip) in the CI report
- [ ] Production deployment: Neon step resolves primary branch connection URI
- [ ] Preview deployment: Neon step resolves preview branch connection URI matching the git ref
- [ ] If `NEON_API_KEY` is missing/invalid: step emits `::warning::`, auth tests skip, workflow succeeds
- [ ] If branch lookup finds no match: step emits `::warning::`, auth tests skip, workflow succeeds
- [ ] Playwright report artifact is uploaded with test results showing auth tests executed

---

## Error Handling Summary

| Scenario | Behavior | User impact |
|---|---|---|
| `NEON_API_KEY` missing/expired | curl returns 401, `BRANCH_ID` empty, `::warning::` emitted | Auth tests skip — same as today |
| Branch not found (race/naming mismatch) | `BRANCH_ID` empty, `::warning::` emitted | Auth tests skip — same as today |
| `BETTER_AUTH_SECRET` mismatch with Vercel | Auth-helper signs cookies with wrong key | Tests fail loudly with auth errors |
| Neon API rate limit | curl returns 429, `BRANCH_ID` empty | Auth tests skip with warning |
| Primary branch lookup (production) | `select(.primary == true)` — always reliable | Tests run |

## References

- Design doc: `thoughts/designs/2026-03-31-neon-db-e2e-ci.md`
- Current workflow: `.github/workflows/playwright.yml`
- Auth helper: `e2e/utils/auth-helper.ts`
- Dashboard shell tests: `e2e/features/dashboard-shell.spec.ts`
- Neon API docs: https://api-docs.neon.tech/reference/listprojectbranches
