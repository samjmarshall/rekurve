# Neon DB Connection for E2E Tests in CI

**Date**: 2026-03-31
**Status**: Validated

## Problem

The `playwright.yml` workflow triggers on `repository_dispatch` → `vercel.deployment.ready` and runs E2E tests against the Vercel preview/production URL. Tests that require direct database access (e.g., `dashboard-shell.spec.ts`) are skipped in CI because `DATABASE_URL` is not available to the GitHub Actions runner.

The `auth-helper.ts` creates test sessions by inserting directly into the Neon database using `@neondatabase/serverless`. Sessions must exist in the same database branch the deployed app queries, otherwise the app rejects the session cookie and auth fails.

## Approach: Neon API Lookup

Query the Neon API from the workflow to discover the connection string for the branch the Neon-Vercel integration already provisioned. No new branches created. No app code changes.

## Architecture

1. `vercel.deployment.ready` dispatch fires after Vercel deployment completes
2. Workflow reads `git.ref` and `environment` from the dispatch payload
3. New step calls Neon API to list branches for the project
4. Matches the branch: primary branch for production, preview branch (by git ref) for preview deployments
5. Calls Neon API to get a connection URI for the matched branch
6. Exports `DATABASE_URL` for the Playwright step
7. `auth-helper.ts` connects to the same database the deployed app uses
8. Existing `test.skip(!process.env.DATABASE_URL, ...)` guard passes in CI instead of skipping

## Workflow Changes

A single new step is added to `playwright.yml` between checkout and the Playwright run:

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

The Playwright step receives the connection string:

```yaml
- name: Run Playwright tests
  run: make test_e2e
  env:
    VERCEL_URL: ${{ github.event.client_payload.url }}
    VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
    DATABASE_URL: ${{ steps.neon.outputs.db_url }}
    BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
```

## Required GitHub Configuration

| Name | Type | Source |
|---|---|---|
| `NEON_API_KEY` | Secret | Neon Console → Account Settings → API Keys |
| `NEON_PROJECT_ID` | Variable | Neon Console → Project Settings |
| `BETTER_AUTH_SECRET` | Secret | Must match the value configured on Vercel |

## Branch Name Matching

The preview branch name matching uses `test($ref)` (regex contains) rather than exact match, because the Neon-Vercel integration may prefix/suffix the git branch name. This needs tuning once the actual naming convention is verified in the Neon dashboard under Branches.

## Error Handling

**Race condition**: The Neon-Vercel integration creates the preview branch as part of the deployment process. The branch should exist by the time the workflow runs. If it doesn't, the lookup returns empty, `DATABASE_URL` is empty, and auth tests skip via the existing guard. No failure, no noise.

**Production deployments**: The primary branch always exists. The lookup uses `select(.primary == true)` which is reliable.

**API key rotation**: If `NEON_API_KEY` expires or is revoked, curl returns 401, `BRANCH_ID` is empty, and a `::warning::` annotation is emitted. Auth tests skip gracefully. The workflow degrades to current behaviour.

**`BETTER_AUTH_SECRET` mismatch**: If the secret in GitHub doesn't match Vercel, the auth-helper signs cookies with the wrong key. The app rejects them and tests fail with auth errors. This is a loud, obvious failure.

## No Code Changes Required

- **`auth-helper.ts`**: Already initializes `neon()` lazily from `process.env.DATABASE_URL`. Uses `dotenv/config` which no-ops in CI when there's no `.env` file.
- **Test skip guards**: `test.skip(!process.env.DATABASE_URL, ...)` stays as a safety net. Now passes in CI instead of skipping.
