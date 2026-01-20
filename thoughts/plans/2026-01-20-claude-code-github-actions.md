# Claude Code GitHub Actions Implementation Plan

## Overview

Implement Claude Code GitHub Actions to automate development workflows, with particular focus on auto-fixing Renovate dependency update failures. This plan implements the design from `thoughts/designs/2026-01-20-claude-code-github-actions.md` incrementally, validating each workflow before proceeding.

## Current State Analysis

### Existing Workflows
- `quality-control.yml` - Lint (`make check`), type check, npm audit
- `claude.yml` - Interactive `@claude` mentions (read-only permissions)
- `claude-code-review.yml` - Auto PR review via official plugin (read-only)

### Key Discovery
The existing `claude.yml` has **read-only permissions**, which limits Claude's ability to make changes. The design calls for upgrading to write permissions while protecting `main`.

## Desired End State

After implementation:
1. Interactive `@claude` can make commits on non-main branches
2. Renovate CI failures are automatically fixed by Claude
3. New issues are auto-triaged with appropriate labels
4. Non-Renovate PRs get auto-generated descriptions (unless labeled to skip)
5. PRs touching sensitive files receive security-focused review

### Verification
- Each workflow triggers correctly on its specified events
- Claude can commit changes on feature branches
- Claude cannot commit to `main` branch
- Cost remains within $20-50/month estimate

## What We're NOT Doing

- Automating `/commit`, `/brainstorm`, `/create_plan` (require local interaction)
- `/design_review` with Playwright (requires MCP setup on runner)
- Modifying `claude-code-review.yml` (already working as expected)

## Implementation Approach

Implement one workflow at a time with validation after each:
1. Update interactive Claude → test with `@claude` comment
2. Add Renovate auto-fix → test with failing Renovate PR
3. Add issue triage → test by opening new issue
4. Add PR description → test by opening new PR
5. Add security review → test with PR touching sensitive files

---

## Phase 1: Update Interactive Claude Workflow

### Overview
Upgrade `claude.yml` to have write permissions while protecting the `main` branch.

### Changes Required

#### 1. Update `.github/workflows/claude.yml`
**File**: `.github/workflows/claude.yml`
**Changes**: Add write permissions, `claude` label trigger, main branch protection, Node.js setup

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]
  pull_request:
    types: [labeled]

jobs:
  claude:
    # Trigger conditions + NEVER run on main branch
    if: |
      github.ref != 'refs/heads/main' &&
      github.event.pull_request.base.ref != 'main' &&
      (
        (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
        (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
        (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
        (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude'))) ||
        (github.event_name == 'pull_request' && github.event.label.name == 'claude')
      )

    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
      actions: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

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

      - name: Run Claude Code
        id: claude
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          additional_permissions: |
            actions: read
          claude_args: |
            --max-turns 20
```

### Success Criteria

#### Automated Verification
- [x] Workflow YAML is valid: `gh workflow view claude.yml`
- [ ] PR checks pass: `gh pr checks`

#### Manual Verification
- [ ] Create a test PR on a feature branch
- [ ] Comment `@claude please add a code comment to the Hero component explaining what it does`
- [ ] Verify Claude responds and commits the change
- [ ] Verify the commit appears on the PR
- [ ] Test that PRs targeting `main` do NOT trigger Claude with write permissions

---

## Phase 2: Renovate CI Auto-Fix

### Overview
Automatically fix CI failures on Renovate dependency update PRs.

### Changes Required

#### 1. Create `.github/workflows/claude-renovate-fix.yml`
**File**: `.github/workflows/claude-renovate-fix.yml`
**Changes**: New workflow triggered by Quality Control failures on `renovate/*` branches

```yaml
name: Claude Auto-Fix Renovate

on:
  workflow_run:
    workflows: ["Quality Control"]
    types: [completed]

jobs:
  auto-fix:
    # Only run on failed Renovate PRs, never on main
    if: |
      github.event.workflow_run.conclusion == 'failure' &&
      startsWith(github.event.workflow_run.head_branch, 'renovate/') &&
      github.event.workflow_run.head_branch != 'main'

    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      actions: read
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_branch }}
          fetch-depth: 0

      - name: Get PR number
        id: pr
        run: |
          PR_NUMBER=$(gh pr list --head "${{ github.event.workflow_run.head_branch }}" --json number --jq '.[0].number')
          echo "number=$PR_NUMBER" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ github.token }}

      - name: Get failed job logs
        id: logs
        run: |
          JOBS=$(gh run view ${{ github.event.workflow_run.id }} --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .name')
          gh run view ${{ github.event.workflow_run.id }} --log-failed > /tmp/failed-logs.txt
          echo "jobs=$JOBS" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ github.token }}

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

      - name: Run Claude Auto-Fix
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          track_progress: true
          prompt: |
            ## Context
            This is a Renovate dependency update PR that failed CI.

            **Branch**: ${{ github.event.workflow_run.head_branch }}
            **PR**: #${{ steps.pr.outputs.number }}
            **Failed Jobs**: ${{ steps.logs.outputs.jobs }}

            ## Failed CI Logs
            ```
            $(cat /tmp/failed-logs.txt | head -500)
            ```

            ## Your Task
            1. Analyze the CI failure logs above
            2. Identify what broke due to the dependency update
            3. Fix the breaking changes (type errors, API changes, deprecations)
            4. Run `make check` to verify your fix works
            5. If fixed, commit with message: "fix: resolve breaking changes from dependency update"
            6. If you cannot fix it, comment on the PR explaining what manual intervention is needed

            ## Guidelines
            - Focus on minimal changes to fix the break
            - Don't refactor unrelated code
            - Check the package's changelog/migration guide if needed (use WebFetch)
            - Common fixes: type updates, API signature changes, import path changes

          claude_args: |
            --max-turns 15
            --allowedTools "Read,Edit,Write,Glob,Grep,Bash(make:*),Bash(git:*),Bash(gh pr comment:*),WebFetch"
```

### Success Criteria

#### Automated Verification
- [x] Workflow YAML is valid: `gh workflow view claude-renovate-fix.yml`

#### Manual Verification
- [ ] Wait for a Renovate PR that fails CI (or manually create a failing one)
- [ ] Verify the workflow triggers after Quality Control fails
- [ ] Verify Claude analyzes the logs and attempts a fix
- [ ] Verify Claude commits the fix or comments explaining the issue

---

## Phase 3: Issue Triage & Auto-Labeling

### Overview
Automatically categorize and label new issues.

### Changes Required

#### 1. Create `.github/workflows/claude-issue-triage.yml`
**File**: `.github/workflows/claude-issue-triage.yml`
**Changes**: New workflow triggered when issues are opened

```yaml
name: Claude Issue Triage

on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Run Claude Triage
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            ## Issue to Triage
            **Title**: ${{ github.event.issue.title }}
            **Author**: ${{ github.event.issue.user.login }}
            **Body**:
            ```
            ${{ github.event.issue.body }}
            ```

            ## Your Task
            Analyze this issue and apply appropriate labels using:
            `gh issue edit ${{ github.event.issue.number }} --add-label "label1,label2"`

            ## Available Labels
            - `bug` - Something isn't working
            - `enhancement` - New feature or improvement
            - `question` - Needs clarification
            - `documentation` - Documentation updates
            - `good first issue` - Simple enough for newcomers
            - `priority:high` - Urgent/blocking
            - `priority:low` - Nice to have

            ## Guidelines
            - Apply 1-3 labels max
            - Don't add a comment unless the issue is unclear and needs more info
            - Be conservative with priority labels

          claude_args: |
            --max-turns 3
            --allowedTools "Bash(gh issue:*),Read"
```

### Success Criteria

#### Automated Verification
- [x] Workflow YAML is valid: `gh workflow view claude-issue-triage.yml`

#### Manual Verification
- [ ] Open a new test issue with a clear bug description
- [ ] Verify the workflow triggers
- [ ] Verify Claude adds appropriate labels (e.g., `bug`)
- [ ] Delete the test issue

---

## Phase 4: Auto PR Description

### Overview
Generate PR descriptions from diff for non-Renovate PRs.

### Changes Required

#### 1. Create `.github/workflows/claude-pr-description.yml`
**File**: `.github/workflows/claude-pr-description.yml`
**Changes**: New workflow triggered when PRs are opened

```yaml
name: Claude PR Description

on:
  pull_request:
    types: [opened]

jobs:
  describe:
    # Skip Renovate PRs and PRs with skip-description label
    if: |
      !startsWith(github.event.pull_request.head.ref, 'renovate/') &&
      !contains(github.event.pull_request.labels.*.name, 'skip-description')

    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude PR Description
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            Generate a PR description for PR #${{ github.event.pull_request.number }}.

            ## Instructions
            1. Read the PR template at `docs/pr_template.md` if it exists
            2. Get the diff: `gh pr diff ${{ github.event.pull_request.number }}`
            3. Get commits: `gh pr view ${{ github.event.pull_request.number }} --json commits`
            4. Analyze changes and write a clear description
            5. Write the description to /tmp/description.md
            6. Update the PR: `gh pr edit ${{ github.event.pull_request.number }} --body-file /tmp/description.md`

            ## Description Format
            If no template exists, use:
            ```markdown
            ## Summary
            [1-3 bullet points of what changed]

            ## Changes
            [Detailed breakdown by area]

            ## Testing
            [How to verify the changes]
            ```

          claude_args: |
            --max-turns 5
            --allowedTools "Read,Glob,Bash(gh pr:*),Write(/tmp/*)"
        env:
          GH_TOKEN: ${{ github.token }}
```

### Success Criteria

#### Automated Verification
- [x] Workflow YAML is valid: `gh workflow view claude-pr-description.yml`

#### Manual Verification
- [ ] Create a new PR with an empty description
- [ ] Verify the workflow triggers
- [ ] Verify Claude generates a meaningful description
- [ ] Test with `skip-description` label to verify it's skipped

---

## Phase 5: Security Review on Sensitive Paths

### Overview
Security-focused review (OWASP Top 10) when PRs touch sensitive files.

### Changes Required

#### 1. Create `.github/workflows/claude-security-review.yml`
**File**: `.github/workflows/claude-security-review.yml`
**Changes**: New workflow triggered when PRs modify sensitive files

```yaml
name: Claude Security Review

on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - "src/lib/**"
      - "src/env.js"
      - "next.config.ts"
      - "**/*.env*"
      - "**/auth/**"

jobs:
  security:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude Security Review
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            Perform a security-focused review of PR #${{ github.event.pull_request.number }}.

            ## Focus Areas (OWASP Top 10)
            - Injection vulnerabilities (SQL, XSS, command injection)
            - Broken authentication/authorization
            - Sensitive data exposure (API keys, secrets, PII)
            - Security misconfiguration
            - Insecure dependencies

            ## Review Process
            1. Get the diff: `gh pr diff ${{ github.event.pull_request.number }}`
            2. Analyze each changed file for security issues
            3. Rate findings: CRITICAL, HIGH, MEDIUM, LOW
            4. Comment on the PR with findings

            ## Output Format
            If issues found:
            ```
            ## 🔒 Security Review

            ### Findings
            - **[SEVERITY]** File:line - Description of issue

            ### Recommendations
            - Specific fix suggestions
            ```

            If no issues:
            ```
            ## 🔒 Security Review
            ✅ No security concerns identified in this PR.
            ```

          claude_args: |
            --max-turns 5
            --allowedTools "Bash(gh pr:*),Read,Glob,Grep"
        env:
          GH_TOKEN: ${{ github.token }}
```

### Success Criteria

#### Automated Verification
- [x] Workflow YAML is valid: `gh workflow view claude-security-review.yml`

#### Manual Verification
- [ ] Create a PR that modifies `src/lib/` or `src/env.js`
- [ ] Verify the workflow triggers
- [ ] Verify Claude provides a security-focused review comment

---

## Testing Strategy

### Per-Workflow Testing
Each phase includes specific manual verification steps.

### Integration Testing
After all workflows are implemented:
1. Open a PR that triggers multiple workflows (e.g., touches sensitive files + has no description)
2. Verify workflows don't conflict
3. Check Action run times and costs

### Cost Monitoring
- Review GitHub Actions usage after 1 week
- Check Claude API costs via Anthropic dashboard
- Adjust `--max-turns` if costs exceed estimate

## References

- Design document: `thoughts/designs/2026-01-20-claude-code-github-actions.md`
- [Claude Code Action Repository](https://github.com/anthropics/claude-code-action)
- [Official Solutions Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md)
