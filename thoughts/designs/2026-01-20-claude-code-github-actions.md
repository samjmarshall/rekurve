# Claude Code GitHub Actions Implementation Design

## Overview

Implement Claude Code GitHub Actions to automate development workflows, with particular focus on auto-fixing Renovate dependency update failures. This design maps the existing local Claude Code workflow (skills, commands, agents) to GitHub Actions automation.

## Current State

### Existing Local Workflow

**Slash Commands (10):**
- `/brainstorm` - Idea refinement, writes to `thoughts/designs/`
- `/create_plan` - Implementation planning, writes to `thoughts/plans/`
- `/validate_plan` - Plan verification
- `/implement_plan` - Plan execution
- `/iterate_plan` - Plan updates
- `/commit` - Git commits (Conventional Commits)
- `/describe_pr` - PR description generation
- `/design_review` - UI/UX review with Playwright
- `/write_ticket` - Ticket creation (Jira/Linear/GitHub)
- `/review_roadmap` - GitHub Project prioritization

**Sub-agents (9):**
- `design-reviewer` - Visual/UX review with Playwright MCP
- `ui-navigator` - Browser automation via Playwright MCP
- `codebase-locator` - Find files by feature/task
- `codebase-analyzer` - Implementation analysis
- `codebase-pattern-finder` - Find similar implementations
- `thoughts-locator` - Discover design docs
- `thoughts-analyzer` - Extract insights from thoughts/
- `web-search-researcher` - Web research

**Skills (5):**
- `ui-aesthetics` - Design principles
- `brand-guidelines` - Rekurve colors/typography
- `ticket-writer` - Ticket templates
- `writing-clearly-and-concisely` - Strunk's rules
- `roadmap-review` - Pre-PMF prioritization

### Existing GitHub Workflows

1. **quality-control.yml** - Lint, type check, npm audit
2. **claude.yml** - Interactive `@claude` (read-only permissions)
3. **claude-code-review.yml** - Auto PR review via official plugin

### Renovate Configuration

- Extends `github>V2-Digital/renovate-config`
- Schedule: 9-16 Sydney time, weekdays
- Max 10 concurrent PRs

## How Claude Code Action Works

Claude Code Action runs the full Claude Code CLI on GitHub runners. The existing `.claude/` directory is automatically loaded:

| Local File | Action Behavior |
|------------|-----------------|
| `CLAUDE.md` | Loaded as project instructions |
| `.claude/commands/*.md` | Can be invoked via `prompt` input |
| `.claude/skills/*.md` | Available when referenced |
| `.claude/agents/*.md` | Partially supported (no auto-spawn) |
| `.claude/settings.json` | Loaded automatically |

**Two execution modes:**
1. **Interactive Mode** - `@claude` mention triggers response
2. **Automation Mode** - `prompt` input triggers immediate execution

## Proposed Workflows

### 1. Renovate CI Auto-Fix (Primary Use Case)

**Trigger:** Quality Control workflow fails on `renovate/*` branch

**Purpose:** Automatically fix breaking changes from dependency updates

**File:** `.github/workflows/claude-renovate-fix.yml`

```yaml
name: Claude Auto-Fix Renovate

on:
  workflow_run:
    workflows: ["Quality Control"]
    types: [completed]

jobs:
  auto-fix:
    if: |
      github.event.workflow_run.conclusion == 'failure' &&
      startsWith(github.event.workflow_run.head_branch, 'renovate/')

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

### 2. Interactive Claude (Updated)

**Trigger:** `@claude` mention or `claude` label applied

**Purpose:** Interactive assistance with write permissions

**File:** `.github/workflows/claude.yml` (replace existing)

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
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
      (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude'))) ||
      (github.event_name == 'pull_request' && github.event.label.name == 'claude')

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
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          additional_permissions: |
            actions: read

          claude_args: |
            --max-turns 20
```

**Changes from current:**
- Added `contents: write` and `pull-requests: write`
- Added `pull_request: labeled` trigger with `claude` label
- Added `fetch-depth: 0` for full git history
- Added Node.js setup for `make check`
- Added `--max-turns 20` for cost control

### 3. Issue Triage & Auto-Labeling

**Trigger:** Issue opened

**Purpose:** Automatically categorize and label new issues

**File:** `.github/workflows/claude-issue-triage.yml`

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

### 4. Auto PR Description

**Trigger:** PR opened (non-Renovate)

**Purpose:** Generate PR descriptions from diff

**File:** `.github/workflows/claude-pr-description.yml`

```yaml
name: Claude PR Description

on:
  pull_request:
    types: [opened]

jobs:
  describe:
    if: |
      !startsWith(github.event.pull_request.head.ref, 'renovate/')

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
            5. Update the PR: `gh pr edit ${{ github.event.pull_request.number }} --body-file /tmp/description.md`

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
```

### 5. Security Review on Sensitive Paths

**Trigger:** PR touches sensitive files

**Purpose:** Security-focused review (OWASP Top 10)

**File:** `.github/workflows/claude-security-review.yml`

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
            ## Security Review

            ### Findings
            - **[SEVERITY]** File:line - Description of issue

            ### Recommendations
            - Specific fix suggestions
            ```

            If no issues:
            ```
            ## Security Review
            No security concerns identified in this PR.
            ```

          claude_args: |
            --max-turns 5
            --allowedTools "Bash(gh pr:*),Read,Glob,Grep"
```

## Workflow Summary

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Renovate Auto-Fix | `claude-renovate-fix.yml` | CI failure on `renovate/*` | Auto-fix dependency breaks |
| Interactive Claude | `claude.yml` | `@claude` or `claude` label | Interactive assistance |
| Code Review | `claude-code-review.yml` | PR opened (existing) | Auto code review |
| Issue Triage | `claude-issue-triage.yml` | Issue opened | Auto-label issues |
| PR Description | `claude-pr-description.yml` | PR opened (non-Renovate) | Generate descriptions |
| Security Review | `claude-security-review.yml` | PR touches sensitive paths | Security analysis |

## Cost Considerations

**Estimated monthly cost:** $20-50 based on PR volume

**Cost control measures:**
- `--max-turns` limits on all workflows (3-20 depending on complexity)
- `--allowedTools` restrictions to limit scope
- Conditional triggers (only Renovate branches, only sensitive paths)
- Skip Renovate PRs for description generation

## Community Insights

**Top patterns from research:**
1. Auto PR code review (most common)
2. Security review on sensitive paths
3. Issue triage & labeling
4. CI failure auto-fix (growing adoption)

**Notable implementations:**
- Boris Cherny (Claude Code creator): 5 parallel Claude instances, subagents
- Production case study: 80%+ of code changes written by Claude Code
- TELUS (57k employees): 30% faster PR turnaround times

## What's NOT Automated

| Local Workflow | Reason |
|----------------|--------|
| `/commit` | Commits happen locally |
| `/brainstorm` | Interactive, requires real-time dialogue |
| `/create_plan` | Complex multi-step planning |
| `/design_review` with Playwright | Requires Playwright MCP setup on runner |
| Sub-agents | Action doesn't auto-spawn, but Claude can still search/read |

## Implementation Notes

1. **CLAUDE_CODE_OAUTH_TOKEN** is already configured (used by existing workflows)
2. **No new secrets required**
3. Existing `claude-code-review.yml` can remain as-is
4. New workflows are additive (no breaking changes)

## References

- [Claude Code Action Repository](https://github.com/anthropics/claude-code-action)
- [Official Solutions Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md)
- [Custom Automations Documentation](https://github.com/anthropics/claude-code-action/blob/main/docs/custom-automations.md)
- [ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
