# Rekurve — Developer Guide

## Architecture

### Application Stack

```mermaid
graph TD
    Browser --> Vercel[Vercel Edge Network]
    Vercel --> NextJS[Next.js 16 App Router]

    NextJS --> Website["(website) — marketing pages"]
    NextJS --> Application["(application) — authenticated app"]
    NextJS --> Login["(login) — auth flows"]
    NextJS --> API["/api — webhooks, auth"]

    Application --> tRPC_Server["tRPC Server (direct call)"]
    Browser -->|HTTP batch stream| tRPC_Client["tRPC Client"]
    tRPC_Client --> NextJS

    tRPC_Server --> Drizzle[Drizzle ORM]
    Drizzle --> Neon[(Neon Postgres)]

    NextJS --> BetterAuth["better-auth (email OTP)"]
    BetterAuth --> Resend[Resend — transactional email]
    BetterAuth --> Drizzle

    NextJS --> HubSpot[HubSpot API]
    NextJS --> PostHog[PostHog — analytics]

    GitHub[GitHub Actions] -->|CI/CD| Vercel
```

### Cloud Infrastructure

```mermaid
graph LR
    subgraph Hosting
        Vercel["Vercel — hosting, edge, previews"]
    end

    subgraph Database
        Neon["Neon Postgres — branch-per-PR, pooled + unpooled"]
    end

    subgraph Integrations
        HubSpot["HubSpot — CRM, contact sync, webhooks"]
        Resend["Resend — transactional email (OTP)"]
        PostHog["PostHog — analytics, session recording, errors"]
    end

    subgraph Development
        GitHub["GitHub — source, CI/CD, project management"]
        Renovate["Renovate — automated dependency updates"]
    end

    Vercel --> Neon
    Vercel --> HubSpot
    Vercel --> Resend
    Vercel --> PostHog
    GitHub --> Vercel
```

## Prerequisites

### Required

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v24 | See `.nvmrc` — use `nvm use` |
| Yarn | 3.8.7 | Enabled via Corepack: `corepack enable` |
| Git | Latest | — |

### Optional

| Tool | Purpose | Install |
|------|---------|---------|
| Neon CLI (`neonctl`) | Database branching | `npm i -g neonctl` |
| Playwright browsers | E2E tests | `yarn playwright install` |
| Claude Code CLI | AI-assisted workflows | [claude.ai/code](https://claude.ai/code) |

### Environment Setup

```bash
cp .env.example .env
# Fill in the values below
```

| Variable | Group | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Database | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Database | Neon direct connection (migrations) |
| `BETTER_AUTH_SECRET` | Auth | 32+ char secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Auth | App URL (`http://localhost:3000` for dev) |
| `RESEND_API_KEY` | Email | Resend API key for OTP delivery |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot | Private app access token |
| `HUBSPOT_CLIENT_SECRET` | HubSpot | Private app client secret (webhook validation) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics | PostHog ingest host (reverse-proxied) |
| `POSTHOG_ERROR_TRACKING_API_KEY` | Analytics | PostHog error tracking key |
| `POSTHOG_PROJECT_ID` | Analytics | PostHog project ID (numeric) |
| `ROBOTS_TXT` | SEO | `Disallow` (default) or `Allow` |

Environment validation is enforced at build time via `src/env.js` (uses `@t3-oss/env-nextjs` + Zod). Set `SKIP_ENV_VALIDATION=1` to bypass during Docker builds or CI steps that don't need the full env.

### Make Targets

All commands go through the `Makefile`. Prefer `make` targets over raw `yarn`/`npm` commands.

| Target | Description |
|--------|-------------|
| `make install` | Install dependencies (`yarn`) |
| `make build` | Clean build (`rm -rf .next` + `yarn build`) |
| `make start` | Local dev server (`yarn dev --turbo`) |
| `make check` | Lint + typecheck (`biome check` + `tsc --noEmit`) |
| `make fix` | Auto-fix lint + formatting |
| `make test` | Run Rstest unit tests |
| `make test_coverage` | Unit tests with Istanbul coverage |
| `make test_e2e` | Run Playwright E2E tests |
| `make audit` | NPM security audit (production deps) |
| `make db_generate` | Generate Drizzle migration files |
| `make db_push` | Push schema to database |
| `make db_studio` | Open Drizzle Studio GUI |
| `make release` | Semantic release via `auto shipit` |
| `make clean` | Remove `.next`, `node_modules`, caches |

## CI/CD Pipeline

### Active Workflows

#### Quality Control (`quality-control.yml`)

- **Trigger**: Push to `main`, PRs targeting `main`
- **Jobs**:
  - **Lint & Type Check** — `make check`
  - **NPM Audit** — `make audit` (production dependencies)
  - **Unit Tests** — `make test_coverage` with Istanbul coverage summary posted as a PR comment

#### Release (`release.yml`)

- **Trigger**: Push to `main` (skips if commit message contains `ci skip` or `skip ci`)
- **Job**: Semantic release via `auto shipit` — creates GitHub releases and git tags

#### Neon Branch Cleanup (`neon.yml`)

- **Trigger**: PR closed
- **Job**: Deletes the PR's Neon preview branch (`preview/<branch-name>`)

#### Post-Deploy Verification (`post-deploy.yml`)

- **Trigger**: Vercel `deployment.ready` event (`repository_dispatch`)
- **Steps**:
  1. Resolve the Neon branch database URL for the deployment environment
  2. Record pre-migration timestamp (for rollback)
  3. Run `db:check` and `db:migrate` against the branch database
  4. Run Playwright E2E tests against the live Vercel URL
- **Rollback on failure**:
  - Preview: resets Neon branch to parent
  - Production: point-in-time restore to pre-migration timestamp

### Deployment Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant QC as Quality Control
    participant Vercel
    participant PD as Post-Deploy
    participant Neon

    Dev->>GH: Push / Open PR
    GH->>QC: Trigger (lint, audit, test)
    GH->>Vercel: Trigger build
    Vercel->>Vercel: Build + Deploy
    Vercel->>GH: deployment.ready event
    GH->>PD: Trigger post-deploy
    PD->>Neon: Resolve branch DB URL
    PD->>Neon: Run migrations
    PD->>Vercel: E2E tests against live URL
    alt E2E fails
        PD->>Neon: Rollback (reset branch or PITR)
    end
```

### Planned Claude CI Workflows

These workflows are defined in `.github/todo/` and will be activated as the project matures.

| Workflow | File | Purpose |
|----------|------|---------|
| `@claude` Agent | `claude.yml` | Responds to `@claude` mentions in issues/PRs |
| Code Review | `claude-code-review.yml` | Automated PR code review |
| PR Description | `claude-pr-description.yml` | Auto-generate PR descriptions |
| Issue Triage | `claude-issue-triage.yml` | Auto-label and categorize new issues |
| Renovate Fix | `claude-renovate-fix.yml` | Auto-fix Renovate dependency update breakage |
| Security Review | `claude-security-review.yml` | Security-focused PR review |

### Dependency Management

Automated via [Renovate](https://docs.renovatebot.com/). Configuration in `.github/renovate.json`:

- Extends shared org config (`github>V2-Digital/renovate-config`)
- Schedule: weekdays, 9am–4pm AEST
- Max 10 concurrent PRs

## Development Workflows

### SDLC Overview

```mermaid
flowchart LR
    A[Brainstorm] --> B[Write Ticket]
    B --> C[Create Plan]
    C --> D[Implement]
    D --> E[Validate]
    E --> F[Design Review]
    F --> G[Commit]
    G --> H[Describe PR]
    H --> I[PR Review]
    I --> J[Merge]

    style A fill:#f3f4f6,stroke:#6b7280
    style J fill:#d1fae5,stroke:#059669
```

Not every task uses every step. Small fixes can skip straight to Implement → Commit. The full flow is available when needed.

### Interactive Claude Workflows

These commands are invoked inside [Claude Code](https://claude.ai/code) via slash commands.

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/brainstorm` | Socratic exploration of rough ideas into a design doc | Before writing code — refine what you're building |
| `/write_ticket` | Collaborative ticket writing | Creating GitHub issues with clear scope |
| `/review_roadmap` | GitHub Project prioritization review | Re-assessing milestone priorities |
| `/create_plan` | Research-heavy plan creation → `thoughts/plans/` | Starting a new feature or significant change |
| `/iterate_plan` | Update existing plan with new feedback | Plan needs revision after code review or discovery |
| `/implement_plan <path>` | Execute a plan phase-by-phase | Working through an approved plan |
| `/validate_plan <path>` | Verify implementation matches plan intent | After implementing — check nothing was missed |
| `/commit` | Structured conventional commit | Ready to commit (follows repo conventions) |
| `/design_review` | Visual/accessibility/brand review via Playwright | After UI/UX changes, before committing |
| `/describe_pr` | Generate PR description from diff + template | Before opening a PR |

### Automated: Ralph Loop

Ralph is a headless Claude agent that implements plans unattended, section by section.

**How it works:**
1. Creates a git worktree for isolation
2. Parses the plan file for the next incomplete section
3. Runs Claude in implement mode (code changes, checkbox updates)
4. Runs Claude in validate mode (verification, commit)
5. Repeats until all sections are complete
6. Records JSONL metrics for cost/performance tracking

**Usage:**

```bash
scripts/ralph.sh <plan-path> [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--max-turns N` | 15 | Max Claude agent turns per session |
| `--max-budget USD` | 5.00 | Max USD per session |
| `--model MODEL` | opus | Claude model: `opus`, `sonnet`, `haiku` |
| `--implement-prompt PATH` | `.claude/prompts/ralph-implement.md` | Override implement prompt |
| `--validate-prompt PATH` | `.claude/prompts/ralph-validate.md` | Override validate prompt |
| `--granularity MODE` | section | `section` or `checkbox` |
| `--no-portless` | — | Skip Portless dev server |
| `--no-neon` | — | Skip Neon branch even if migrations detected |
| `--dry-run` | — | Parse plan and print sections without running Claude |

**Environment:** Set `NEON_PROJECT_ID` for automatic Neon branch provisioning.

**When to use Ralph vs interactive `/implement_plan`:**
- Use **Ralph** for well-defined plans where you want hands-off execution (e.g., overnight runs, large multi-section plans)
- Use **`/implement_plan`** when you want to stay in the loop, review changes as they happen, or the plan requires judgment calls

### Contributing Workflow

Step-by-step for human developers and AI agents:

1. **Branch** — Create a branch from `main`
2. **Plan** — Use `/brainstorm` or `/create_plan` (or write code directly for small changes)
3. **Implement** — Write code, use `/implement_plan` for plan-driven work
4. **Check locally** — `make check` + `make test`
5. **Review UI** — Run `/design_review` if you touched anything visual
6. **Commit** — Use `/commit` for conventional commit messages
7. **Push + PR** — Push branch, use `/describe_pr` to generate the PR description
8. **CI** — Quality Control workflow runs automatically on PR
9. **Preview** — Vercel deploys a preview, post-deploy runs migrations + E2E
10. **Merge** — Review + merge → Release workflow creates a tag

### Prerequisites by Task Type

| Task | Node + Yarn | `.env` vars | Neon CLI | Playwright | Claude Code |
|------|:-----------:|:-----------:|:--------:|:----------:|:-----------:|
| Frontend development | Yes | Core set | — | — | — |
| Backend / API | Yes | + `DATABASE_URL` | Optional | — | — |
| E2E testing | Yes | + test env | — | Yes | — |
| AI-assisted development | Yes | Full set | Optional | Optional | Yes |
| Ralph automation | Yes | Full set | Optional | Optional | Yes + plan file |
