# Implement intuit/auto Release Automation

## Overview

Add automated release management using [intuit/auto](https://github.com/intuit/auto) so that every merge to `main` produces a semver git tag, a GitHub Release with structured notes, and comments on linked PRs/issues notifying them of the release version.

## Current State Analysis

- **No release tooling exists** — no tags, no `.autorc`, no release workflow
- **Conventional Commits already in use** — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `build:` prefixes used consistently
- **Husky pre-commit** runs `make check` (lint + typecheck)
- **CI** — `quality-control.yml` runs lint, typecheck, and npm audit on push to `main` and on PRs
- **Private app** — `"private": true` in `package.json`, deployed to Vercel, no npm publishing
- **No branch protection** — free-tier private repo, so `GITHUB_TOKEN` is sufficient (no PAT needed)
- **Current version** — `0.1.0` in `package.json`

### Key Discoveries:
- Yarn 3.8.7 with `nodeLinker: node-modules` — `npx auto` resolves from `node_modules/.bin` (`.yarnrc.yml:1`)
- Node v24 (`.nvmrc:1`)
- Existing workflows use `actions/checkout@v6`, `actions/setup-node@v6`, `actions/cache@v5`
- Quality control workflow already has the Yarn cache pattern we'll reuse (`quality-control.yml:24-27`)

## Desired End State

After implementation:
1. Every push to `main` triggers `auto shipit`
2. auto reads commits since the last tag, determines semver bump from conventional commit prefixes
3. A git tag (`v0.1.1`, `v0.2.0`, etc.) and GitHub Release are created with structured release notes
4. The `released` plugin comments on merged PRs and linked issues with the release version
5. Commits with no release-worthy prefix (`chore:`, `docs:`, `ci:`) do **not** trigger a release (default behavior of the conventional-commits plugin)
6. PRs labeled `skip-release` bypass the release even if commits would otherwise trigger one

### Verification:
- Push a `fix:` commit to `main` → tag + GitHub Release created, PR commented
- Push a `chore:` commit to `main` → no release
- Push a `feat:` commit to `main` → minor bump

## What We're NOT Doing

- No npm publishing (private app)
- No CHANGELOG.md committed back to repo (GitHub Releases serve as the changelog)
- No commitlint/commit-msg hook enforcement (conventional commits are already a team habit)
- No canary/prerelease branches (not needed for a single-app deploy)
- No Slack/Teams notifications (can add later via plugins)

## Implementation Approach

Three-phase approach: install and configure, add the CI workflow, then create labels and tag the initial version.

---

## Phase 1: Install and Configure auto

### Overview
Install auto and its plugins, create the `.autorc` configuration file.

### Changes Required:

#### 1. Install dev dependencies

```bash
yarn add -D auto @auto-it/git-tag @auto-it/conventional-commits @auto-it/released
```

#### 2. Create `.autorc`
**File**: `.autorc` (new file, project root)

```json
{
  "baseBranch": "main",
  "plugins": [
    "git-tag",
    "conventional-commits",
    ["released", {
      "message": ":rocket: This %TYPE is included in version %VERSION"
    }]
  ]
}
```

**Plugin roles:**
- `git-tag` — replaces the default `npm` plugin; creates git tags and GitHub Releases without npm publish
- `conventional-commits` — parses `fix:` (patch), `feat:` (minor), `BREAKING CHANGE:` (major) from commit messages; `chore:`, `docs:`, etc. default to `skip` (no release)
- `released` — after release, comments on each merged PR and linked issue with the version number, applies a `released` label

#### 3. Add release script to package.json
**File**: `package.json`

Add to `"scripts"`:
```json
"release": "auto shipit"
```

#### 4. Add release target to Makefile
**File**: `Makefile`

```makefile
release:
	yarn release
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn install` succeeds with new dependencies
- [x] `make check` still passes (no type/lint regressions)
- [x] `npx auto --version` prints a version number

#### Manual Verification:
- [x] `.autorc` exists with correct plugin configuration
- [x] `package.json` has `"release"` script

---

## Phase 2: Add Release Workflow

### Overview
Create a GitHub Actions workflow that runs `auto shipit` on every push to `main`.

### Changes Required:

#### 1. Create release workflow
**File**: `.github/workflows/release.yml` (new file)

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, 'ci skip') && !contains(github.event.head_commit.message, 'skip ci')"
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc

      - name: Yarn cache
        uses: actions/cache@v5
        with:
          path: .yarn/cache
          key: yarn-${{ hashFiles('yarn.lock') }}

      - run: make install

      - name: Create Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: make release
```

**Notes:**
- `fetch-depth: 0` — auto needs full git history and tags to calculate the next version
- `ci skip` / `skip ci` guard — prevents infinite loops if auto ever commits back (it won't with `git-tag`, but it's defensive)
- `permissions` — `contents: write` for tags/releases, `issues: write` and `pull-requests: write` for the `released` plugin to comment
- `GITHUB_TOKEN` — auto checks both `GH_TOKEN` and `GITHUB_TOKEN`; the built-in Actions token is sufficient since there's no branch protection

### Success Criteria:

#### Automated Verification:
- [x] Workflow YAML is valid: `gh workflow list` shows the new workflow after push

#### Manual Verification:
- [ ] Workflow appears in GitHub Actions tab after merging to `main` (verify after merge)

---

## Phase 3: Bootstrap Labels and Initial Tag

### Overview
Create the required GitHub labels and tag the current commit as `v0.1.0` so auto has a baseline to calculate future versions from.

### Changes Required:

#### 1. Create labels on the GitHub repo

Run locally (once):
```bash
GITHUB_TOKEN=$(gh auth token) npx auto create-labels
```

This creates: `major`, `minor`, `patch`, `skip-release`, `release`, `internal`, `documentation`, `released`, and the conventional commit type labels.

#### 2. Create initial version tag

Run locally (once):
```bash
git tag v0.1.0
git push origin v0.1.0
```

This gives auto a starting point. The next release will be calculated relative to this tag.

### Success Criteria:

#### Automated Verification:
- [x] `gh label list` shows the auto labels
- [x] `git tag --list` includes `v0.1.0`

#### Manual Verification:
- [x] Labels visible in the GitHub UI under Issues > Labels

---

## Testing Strategy

### End-to-End Validation (after all phases):

1. **Trigger a patch release:**
   - Create a branch, make a change, commit with `fix: test release automation`
   - Open PR referencing an issue (e.g., `Refs: #<issue-number>`)
   - Merge to `main`
   - Verify: tag `v0.1.1` created, GitHub Release exists with "Bug Fixes" section, PR receives a comment from the `released` plugin

2. **Trigger a minor release:**
   - Commit with `feat: add something`
   - Merge to `main`
   - Verify: tag `v0.2.0` created

3. **Verify skip behavior:**
   - Commit with `chore: update config`
   - Merge to `main`
   - Verify: no new tag or release created

4. **Verify skip-release label:**
   - Add `skip-release` label to a PR with a `feat:` commit
   - Merge to `main`
   - Verify: no release

### Dry Run (local, before merging):
```bash
GITHUB_TOKEN=$(gh auth token) npx auto shipit --dry-run
```

## References

- [intuit/auto documentation](https://intuit.github.io/auto/docs)
- [git-tag plugin](https://intuit.github.io/auto/docs/generated/git-tag)
- [conventional-commits plugin](https://intuit.github.io/auto/docs/generated/conventional-commits)
- [released plugin](https://intuit.github.io/auto/docs/generated/released)
- [GitHub Actions integration](https://intuit.github.io/auto/docs/build-platforms/github-actions)
- Previous discussion in this conversation comparing auto vs semantic-release vs autoship
