# AI-Enabled Incident Response

**Date:** 2026-04-30
**Author:** Sam Marshall (with Claude via `/brainstorm`)
**Status:** Design — pending implementation
**Branch context:** `claude/ai-incident-response-ZfjTM`

---

## 1. Context & goals

Rekurve runs a Next.js / Vercel / Drizzle+Neon stack with a single pre-PMF pilot customer (Creation Homes QLD). Today the codebase has **zero** monitoring, alerting, error tracking, or incident response infrastructure: no PostHog, no Sentry, no Vercel Drains, no on-call vendor, no Anthropic SDK calls, no `/api/webhooks/incident` endpoint. Failures are detected manually.

The goal is an end-to-end automated incident response workflow where:

1. Deterministic detection from PostHog, Vercel, and synthetic uptime checks fires structured alerts.
2. A single incident-management vendor dedupes and routes those alerts.
3. An AI triage agent receives the incident first, classifies severity, fetches context, opens a GitHub issue with a diagnosis, and either escalates to a human on-call or acknowledges the incident.
4. Humans handle the actual fix.

**Pre-PMF constraints shape every choice.** Vendor count, monthly spend, and operational complexity must stay low. We accept lower feature ceilings in exchange for fewer moving parts and reversible vendor decisions.

## 2. Scope: Phase B now, Phase C later

The original brief described three tiers of ambition. We selected **Phase B with C as a Phase 2 follow-up**.

| Phase | Scope | Status |
|---|---|---|
| **A** | Detection-first MVP. Error tracking + uptime + on-call. No AI. | Subsumed by B |
| **B** | A + AI triage that classifies, enriches, opens an issue, and escalates. **Stops at "issue opened with diagnosis."** No code changes. | **In scope now (4 weeks)** |
| **C** | B + agent attempts a fix, opens a PR, runs CI, tags a human reviewer. | **Phase 2** — after Phase B has run ≥4 weeks with measurable triage accuracy |

The hand-off design is intentional: Phase 2 is one new step in the existing agent flow (post a `@claude` mention on the GitHub issue, handing off to the [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)), not a rebuild.

## 3. Vendor selections

### 3.1 On-call / incident management — Better Stack

A 4-vendor comparison (Better Stack, Spike.sh, Squadcast, PagerDuty) settled on **Better Stack** for these reasons:

- **One bundle, one bill (~$29/mo annual).** Replaces uptime + on-call + status page + log management. Eliminates 3 line items at pre-PMF.
- **Native log management** is the agent's primary "what was happening at T-5min" data source. Without it, we'd add Axiom (~$25+/mo).
- **Mobile app supports iOS Critical Alerts** (bypass silent + DND/Focus) and Android high-priority notifications. Unlimited phone calls + SMS on Team plan.
- **Webhook contracts are standard.** Defection to PagerDuty Pro or Spike.sh is a vendor swap, not a code rewrite.

**Skipped:** PagerDuty (overpriced AI add-ons at $400–$700/mo, unjustifiable when our LLM lives in our own app), incident.io / Rootly (duplicate AI spend), Opsgenie (Atlassian EOL — no new sales since June 2025), Grafana OnCall (OSS archived 24 March 2026).

**Pre-commit smoke test (Week 1 gate):** install both apps, send a test critical alert, confirm silent-mode bypass on real devices. If Better Stack's app fails the test, defect to PagerDuty Professional ($25/user/mo) — one-vendor swap.

### 3.2 Detection layer — PostHog-led

PostHog handles errors *and* product analytics from one vendor. Sentry is the easy alternative if PostHog Error Tracking proves rough — same webhook contract.

| Source | What it catches | Alert destination |
|---|---|---|
| **PostHog Error Tracking** (GA) | Client + server exceptions, new issues, volume spikes | Better Stack incoming webhook |
| **PostHog Insight alerts** | Threshold breaches on signup conversion, payment success rate, DAU | Better Stack incoming webhook |
| **Vercel Log Drain** | Runtime logs, 5xx, uncaught exceptions, WAF deny events | Better Stack log management → log alerts |
| **Vercel deploy webhook** | Production build failures | Better Stack incoming webhook |
| **GitHub Actions `post-deploy.yml`** (release event) | Verified-production release event (SHA + optional release tag) | Better Stack Telemetry log ingest (release marker, not an alert source) |
| **GitHub Actions `post-deploy.yml`** (migration heartbeat, P1) | Production DB migration failure — schema out of sync with live code | Better Stack heartbeat monitor (high-severity escalation) |
| **GitHub Actions `post-deploy.yml`** (verification heartbeat, P3-P4) | Production E2E / integration test failure — blocks subsequent deploys including Renovate CVE patches | Better Stack heartbeat monitor (business-hours escalation) |
| **Better Stack Uptime** | 5–10 production endpoints, 1-minute frequency, 2 regions | Better Stack incident (native) |

Every signal converges on Better Stack as a single incident object before the agent ever sees it.

### 3.3 Agent runtime — Hybrid (custom now, action later)

**Phase B (now):** Custom Anthropic SDK agent in this app, behind `/api/webhooks/incident`. Full control over severity rubric, tool surface, prompt, cost ceiling.

**Phase 2 (later):** Triage agent's final step posts `@claude` on the issue it just created, handing off to `claude-code-action` (running in GitHub Actions, 6-hour job limit, repo-scoped) for the fix/PR loop.

### 3.4 Queue runtime — Inngest

Three-way comparison vs Vercel Workflows and QStash:

| Dimension | **Inngest** | Vercel Workflows | QStash |
|---|---|---|---|
| GA status | Mature (5+ yrs) | Public beta since Oct 2025; 462 releases — high churn | Mature |
| Step functions w/ checkpointing | ✅ | ✅ | ❌ |
| Cron triggers | ✅ | ❌ (sleep only) | ✅ |
| Cost predictability | Per-step, clear | Events + Data Written + Retained — opaque | Per-message, clear |
| Free tier | 50k steps/mo | Exists, exact limits unconfirmed | 500/day |

**Picked Inngest.** Production maturity matters for the on-call path. Vercel Workflows is reconsidered when GA + transparent pricing + cron land — likely late 2026 or 2027.

## 4. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DETECTION                                                │
│    PostHog (errors + insight alerts)                        │
│    Vercel (build/deploy failures, runtime logs via Drain)   │
│    Better Stack (uptime checks, log alerts)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ webhook (signed)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. INCIDENT MANAGEMENT (Better Stack)                       │
│    - Dedupes alert storms                                   │
│    - Owns on-call rotation + status page                    │
│    - Has one synthetic on-call user: "AI Triage"            │
│      (its only contact channel = outbound webhook)          │
└──────────────────────┬──────────────────────────────────────┘
                       │ webhook → "AI Triage" user paged first
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TRIAGE AGENT (this app)                                  │
│    POST /api/webhooks/incident  (HMAC-verified)             │
│      → enqueue Inngest job (escapes Vercel timeout)         │
│      → Anthropic SDK agent (Sonnet 4.6) w/ tool surface:    │
│          - PostHog query (events, exceptions, replay link)  │
│          - Better Stack logs query                          │
│          - Vercel deployments + recent commits              │
│          - GitHub: create issue, search recent issues       │
│          - Better Stack: ack incident, escalate humans      │
│      → writes diagnosis into GitHub issue                   │
│      → if severity ≥ P2: escalates to next on-call human    │
│      → else (P3): ack the incident, leave issue for review  │
└─────────────────────────────────────────────────────────────┘
```

**Failure-mode posture:** any failure of the agent (timeout, API error, classification refusal, Inngest retry exhaustion) defaults to "escalate to human." The agent is the *first* responder, never the *only* responder.

**Phase 2 hook-in:** the `escalate-or-ack` step gains a sibling `phase-2-handoff` step that posts a `@claude` comment on the issue when severity is P3 *and* diagnosis confidence is high. Until Phase 2 ships, that step is suppressed by a single feature flag.

## 5. Detection layer

### 5.1 PostHog

- Client + server SDKs in Next.js (`posthog-js`, `posthog-node`). Source maps uploaded at build time via the PostHog Vercel integration.
- Error Tracking GA — alerts on new issues, reopens, and volume spikes. Single webhook destination = Better Stack incoming webhook URL.
- Two starter Insight alerts: signup conversion (% deviation from 7-day rolling mean) and pilot-customer DAU floor.
- Session replay enabled but not an alert source — context the agent fetches by URL during triage.

### 5.2 Vercel

- **Log Drain** to Better Stack as the destination ($0.50/GB pipe). Better Stack handles parsing, retention, log-based alerts.
- Native deploy notifications on the Slack channel; webhook to Better Stack for production build failures.
- Firewall (WAF) deny events flow through the log drain. Better Stack alert if `action=deny` rate exceeds a threshold (cheap MVP; revisit if traffic grows).
- Web Analytics / Speed Insights *not* wired to incidents in Phase B. Core Web Vitals regressions are slow-burn issues, not 2 a.m. pages.

### 5.3 Better Stack

- 5–10 uptime checks (homepage, marketing pages, API health, signup) at 1-minute frequency from 2 regions.
- 3 starter log-alert rules: `level=error` rate spike, `5xx` rate per minute, "uncaught exception" string match.
- One inbound webhook URL that everything posts into → Better Stack creates the incident → routes to the synthetic "AI Triage" on-call user → fires *outbound* webhook to our app.

**Single funnel in, single funnel out.** Swapping any detection vendor changes one webhook URL.

## 6. Triage agent

### 6.1 Severity rubric

Enforced both in the system prompt and as a structured-output schema validated post-hoc.

| Severity | Definition | Action after triage |
|---|---|---|
| **P0** | Site down, payment broken, auth broken, data corruption | Page primary + secondary on-call; write detailed issue |
| **P1** | High error rate, critical funnel broken (signup/checkout), partial outage | Page primary on-call; write issue |
| **P2** | Degraded UX, single non-critical feature broken, error rate up but stable | Page primary on-call; write issue |
| **P3** | Minor / single-user / known-class error / no user impact | **Ack Better Stack, write issue, no page** |

Prompt bias: **"when in doubt, round up severity."** Cost of false-paging a human is much lower than missing a real P1.

### 6.2 Tool surface

```
READ TOOLS (context-fetching):
  queryPostHog(filter, timeRange)        // events, exceptions, replay URL
  queryBetterStackLogs(query, timeRange) // structured log search
  listVercelDeployments(hoursBack)       // who shipped what when
  getGitDiffSinceLastDeploy()            // what changed
  getFileFromRepo(path)                  // read source at the stack-trace line
  searchGitHubIssues(query)              // dedupe — is this already open?

WRITE TOOLS (3 total, every call audit-logged):
  createGitHubIssue(title, body, labels) // labels include severity + "ai-triage"
  escalateIncident(incidentId, reason)   // pages next on-call human
  acknowledgeIncident(incidentId, reason)// closes Better Stack incident
```

**Phase B safety boundary:** no `editFile`, no `runShell`, no `createBranch`, no `openPR`. The agent literally cannot change code. That capability arrives in Phase 2 via the `@claude` mention handoff.

### 6.3 Decision flow (Inngest steps)

```
step.run("classify",        () => agent classifies severity from payload alone)
step.run("fetch-context",   () => agent calls read tools, max 8 turns)
step.run("dedupe",          () => check searchGitHubIssues — if dupe, comment & exit)
step.run("write-diagnosis", () => agent drafts issue body)
step.run("create-issue",    () => Octokit createIssue, capture URL)
step.run("escalate-or-ack", () => P3 → ack; P0/P1/P2 → escalate human)
```

Each `step.run` is checkpointed by Inngest. Step 5 failure does not re-bill steps 1–4's Anthropic tokens.

### 6.4 Cost & safety ceilings

- **Model:** Claude Sonnet 4.6 (triage is structured classification + retrieval; Opus is overkill, Haiku risks misclassification).
- Max **15 tool turns** total → hard cutoff escalates to human.
- Max ~50k input tokens, ~4k output tokens per incident (~$0.25/incident at Sonnet pricing).
- Inngest function timeout: **5 minutes** wall clock.
- Per-hour rate limit: max 10 triages/hour (5/hour for the first week of live operation). 11th and beyond bypass agent and page directly. Prevents runaway spend during alert storms.

## 7. Database schema

New Drizzle tables in `src/db/schema.ts`. Migration via `make db_generate` then `make db_migrate` (per CLAUDE.md — never `drizzle-kit push`).

```typescript
// One row per Better Stack incident, lifecycle state
export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  betterStackIncidentId: text("better_stack_incident_id").notNull().unique(),
  source: text("source").notNull(),                // posthog|vercel|uptime|logs
  rawPayload: jsonb("raw_payload").notNull(),
  severity: text("severity"),                      // P0|P1|P2|P3, null until classified
  status: text("status").notNull().default("triage_pending"),
                                                   // triage_pending|triage_running|
                                                   // diagnosed|escalated|acked|triage_failed
  githubIssueUrl: text("github_issue_url"),
  diagnosis: text("diagnosis"),                    // markdown the agent wrote
  agentTokensUsed: integer("agent_tokens_used"),
  agentToolCallsCount: integer("agent_tool_calls_count"),
  costUsdCents: integer("cost_usd_cents"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Every tool call the agent made, for replay/debugging
export const incidentAuditLog = pgTable("incident_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").references(() => incidents.id).notNull(),
  step: text("step").notNull(),                    // matches Inngest step name
  toolName: text("tool_name"),                     // e.g. "queryPostHog"
  toolInput: jsonb("tool_input"),
  toolOutput: jsonb("tool_output"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

The unique constraint on `betterStackIncidentId` is the **idempotency key**. Better Stack retrying a webhook is a no-op upsert.

## 8. GitHub integration

### 8.1 Auth — GitHub App

Single-purpose app `incident-triage-bot`, installed only on `samjmarshall/www`. Scoped permissions:

- `issues: write`
- `contents: read`
- `pull_requests: read`

Private key stored in Vercel as `GITHUB_APP_PRIVATE_KEY` (`--sensitive`). A PAT would work but ties the bot to a person and grants more scope than needed. The App is ~1 hour of setup for years of cleaner audit and revocability.

### 8.2 Issue template

Rendered by the agent into the body:

```markdown
## Summary
[1-sentence what's broken, in user terms]

## Detection
- Source: <PostHog|Vercel|Better Stack>
- Severity: P{0|1|2|3}  (← agent's classification)
- First seen: <timestamp>  | Better Stack: <link>

## Diagnosis
<markdown — what the agent thinks is happening, with linked evidence>

## Recent context
- Last deploy: <SHA + author + timestamp>
- Recent commits touching the suspect file: <list>
- Related open issues: <linked>

## Suggested next steps
<bullets — what a human reviewer should check>

---
*Triaged by AI on <ts>. Audit log: incident <uuid>.*
```

Labels applied: `incident`, `severity:Px`, `ai-triage`, `source:<name>`. The label set is what `claude-code-action` will filter on in Phase 2.

## 9. Secrets, webhook auth, observability

### 9.1 Secrets inventory

Added to `src/env.ts` validation; pulled from Vercel via `make env_pull`; all marked `--sensitive` per CLAUDE.md.

```
ANTHROPIC_API_KEY              # triage agent
INNGEST_EVENT_KEY              # ingress to Inngest
INNGEST_SIGNING_KEY            # verify Inngest → /api/inngest calls
BETTER_STACK_WEBHOOK_SECRET    # verify inbound webhook HMAC
BETTER_STACK_API_TOKEN         # outbound: ack/escalate, log queries
POSTHOG_PROJECT_API_KEY        # outbound: query events, exceptions
VERCEL_API_TOKEN               # outbound: list deployments, fetch logs
GITHUB_APP_ID                  # public-ish but env-pinned
GITHUB_APP_PRIVATE_KEY         # signs JWTs to mint installation tokens
GITHUB_APP_INSTALLATION_ID     # for samjmarshall/www
```

No new public env vars — none of this should ever ship to the client.

### 9.2 Inbound webhook auth

`POST /api/webhooks/incident`:

```
1. Read header `x-betterstack-signature` (hex HMAC-SHA256, exact name TBD)
2. Compute HMAC-SHA256(body, BETTER_STACK_WEBHOOK_SECRET)
3. timingSafeEqual() the two — reject 401 on mismatch
4. Reject if request body > 256KB (defensive)
5. Reject if `x-betterstack-timestamp` is older than 5 minutes (replay protection)
```

Mirrors the pattern at `src/app/api/cron/daily/route.ts` (`CRON_SECRET` constant-time compare) — same shape, signed body instead of bearer header.

**Public-endpoint hardening:** rate-limit `/api/webhooks/incident` to 60 req/min per IP at the Next.js middleware layer. Vercel Firewall logs any 401s into the same drain → Better Stack → which would itself raise an incident on a denied-rate spike. Loop closes.

### 9.3 Observability — three layers, no new vendor

1. **Inngest dashboard** — every triage run as a clickable timeline. Free, included.
2. **`incident_audit_log` table** — full tool-call replay queryable from your DB. Indexed on `incident_id` and `created_at`.
3. **`/admin/incidents` internal page** (Phase B Week 4) — recent incidents, severity, agent classification, GitHub issue link, cost in USD, hover-to-see-diagnosis. Not glamorous; it's the thing you'll actually use to review whether the agent is doing the right thing.

**Cost dashboard:** `costUsdCents` summed in a daily Inngest cron and reported into a single PostHog metric. If daily agent spend > $5 → fires an alert through the same pipe (the system monitors itself).

## 10. Phased rollout

Each week is independently shippable.

### Week 1 — Detection pipe (no agent yet)

- Wire PostHog SDK + Error Tracking + 2 starter Insight alerts.
- Configure Vercel Log Drain → Better Stack.
- Set up Better Stack uptime checks (5 endpoints) and 3 log-alert rules.
- Create the synthetic "AI Triage" on-call user with a placeholder webhook (`httpbin.org/200`).
- **Enable the BetterStack release event** in `.github/workflows/post-deploy.yml` (job `release-event`) — uncomment the "Send release event to BetterStack" step and add `BETTERSTACK_INGESTING_HOST` (var) + `BETTERSTACK_SOURCE_TOKEN` (secret). Already-live PostHog annotation in the same step is the working reference.
- **Enable the BetterStack failure heartbeats** in `.github/workflows/post-deploy.yml` — uncomment two commented-out steps:
  - `Notify BetterStack — production migration failed (P1)` in the `setup` job. Provision a heartbeat monitor with high-severity / out-of-hours escalation; store its URL in secret `BETTERSTACK_HEARTBEAT_MIGRATION`. Failed migrations leave schema out of sync with already-deployed code.
  - `Notify BetterStack — production verification failed (P3-P4)` in the `override-status` job. Provision a separate heartbeat monitor with business-hours-only escalation; store its URL in secret `BETTERSTACK_HEARTBEAT_VERIFICATION`. These failures block subsequent deploys (including Renovate CVE patches) so they're real incidents, just not 2 a.m. pages.
- **Pre-commit smoke test:** install Better Stack mobile apps, send test critical alert on real devices, verify silent-mode bypass. **Gate:** if it fails, defect to PagerDuty Pro.

**Outcome:** every signal converges into Better Stack as a real incident, paging humans correctly. Alert taxonomy validated *before* an agent enters the picture.

### Week 2 — Endpoint + queue + agent in shadow mode

- Build `POST /api/webhooks/incident`, Drizzle migration, Inngest function, GitHub App.
- Implement all read tools and `createGitHubIssue` write tool.
- Agent runs end-to-end **but** `escalateIncident` and `acknowledgeIncident` are stubbed to log-only. Every real incident still pages a human via Better Stack's normal flow. Issues tagged `ai-triage:shadow`.

**Outcome:** ~10–20 real incidents through the agent with zero blast radius. Compare agent severity vs the human's actual fix to measure classification accuracy.

### Week 3 — Agent goes live

- **Gate:** shadow-mode showed ≥80% severity agreement on a sample of incidents.
- Flip feature flag to enable real `escalateIncident` / `acknowledgeIncident`.
- Conservative ceiling: max 5 triages/hour for the first week (vs design's 10).

### Week 4 — Admin UI, cost dashboard, runbook

- `/admin/incidents` page.
- Daily cost cron + PostHog metric.
- Written runbook: "agent did the wrong thing — how do I override?"
- Retrospective + go/no-go on Phase 2.

## 11. Testing strategy

- **Unit (Rstest):** severity classifier against ~50 fixture payloads spanning all four tiers. Pure function — feed the agent a prompt + assert the parsed output schema.
- **Integration (Neon branch, real DB per CLAUDE.md):** seed an incident row, invoke the Inngest function with a recorded payload, assert DB state transitions and GitHub issue creation (Octokit hits a test repo).
- **E2E:** weekly synthetic incident drill — Better Stack cron fires a fake "AI Triage Drill" incident every Monday morning. Validates the full pipe end-to-end.
- **Snapshot-test the prompt template, not the model output.** Don't TDD the LLM.

## 12. Phase 2 design (preview)

Triggered after Phase B has run ≥4 weeks with measurable accuracy.

**Readiness criteria (proposed, confirm in retrospective):**

- Agent has triaged ≥30 real incidents
- ≥85% severity agreement with human reviewers
- ≥90% useful-diagnosis rate per human reviewer

**Implementation:** single-PR change adding the `phase-2-handoff` Inngest step. Conservative scope:

- Only **P3 incidents with diagnosis confidence ≥ "high"** trigger the `@claude` mention.
- Lower-risk auto-PR scope first: small bug, single file, known error class.
- Promote to P2 only after Phase 2 has shipped ~10 successful PRs.

The `claude-code-action` runs in GitHub Actions, has 6-hour job limits, repo-scoped permissions via the existing GitHub App, and writes its own PR. Our triage agent stops the moment it posts the comment.

## 13. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Better Stack mobile app fails the silent-mode test | Low | Critical — missed page | Pre-commit smoke test on real devices; defection plan to PagerDuty Pro is one-vendor-swap |
| Agent confidently misclassifies severity (e.g. P0 → P2) | Medium | High | Shadow mode in Week 2 measures agreement; admin override; prompt bias toward rounding up |
| GitHub issue noise from duplicate / flaky alerts | Medium | Medium | `searchGitHubIssues` dedupe step; label hygiene; weekly issue-review ritual |
| Cost runaway during alert storm | Low | Medium | Per-hour cap (10 → 5 in Week 3); daily cost-alert at $5; Better Stack already dedupes upstream |
| PostHog Error Tracking source-maps flakiness | Medium | Medium | Known sharp edge; fallback is Sentry swap (1-day migration since webhook contract is identical) |
| Vendor concentration on Better Stack | Low | High | Webhook contracts are standard; swap to PagerDuty/Spike.sh = vendor change, not code rewrite |
| Phase 2 agent commits a destructive change | Phase 2 only | Critical | PR-only; human review required; scope discipline (P3 + high-confidence first) |
| GitHub App private key leak | Low | High | Vercel `--sensitive`; rotation runbook; App scoped to one repo with minimal perms |

## 14. Non-goals (Phase B)

YAGNI ruthlessly:

- No customer-facing incident system / multi-tenant — internal only.
- No SLO/SLA tracking, error budgets, or MTTR dashboards. Phase B is detection→triage, not measurement.
- No on-call schedule management UI — Better Stack owns it.
- No staging-environment triage. Only production incidents fire the agent. Staging issues are logged but skipped.
- No autoremediation, no code changes, no PRs. That's Phase 2.
- No multi-region / multi-cloud failover.
- No Slack bot for the agent. The GitHub issue is the artefact. Slack noise comes from Better Stack natively.

## 15. Open questions deferred to implementation

1. Exact Better Stack HMAC header name + format — confirm against their docs in Week 2 PR (could be `x-better-stack-signature` not `x-betterstack-signature`).
2. PostHog Insight alert starter thresholds — need 2 weeks of baseline data before setting them. Default: 50% deviation from 7-day rolling mean.
3. Severity-rubric edge cases (e.g. flaky uptime check from one region) — to be tuned during Week 2 shadow review.
4. Phase 2 readiness criteria — confirm 30 incidents / 85% agreement / 90% useful-diagnosis numbers in the Phase B retrospective.
5. Daily cost ceiling — $5 is a guess. May need adjustment based on incident volume.

## 16. Vendor / pricing summary

| Vendor | Phase B monthly cost (3 users) | Notes |
|---|---|---|
| Better Stack Team plan | ~$29 | Bundles uptime + on-call + status + logs |
| Inngest | $0 | 50k steps/mo free covers pre-PMF volume |
| PostHog | $0 | 1M events/mo free; Error Tracking included |
| Vercel Drains | ~$1–5 | $0.50/GB; depends on log volume |
| Anthropic API | ~$5–15 | ~$0.25 per triage × ~30/mo expected |
| GitHub | $0 | Within existing org plan |
| **Total** | **~$35–55/mo** | All vendors offer reversible exits |

## 17. References

- [Better Stack pricing](https://betterstack.com/pricing)
- [Better Stack iOS & Android mobile apps docs](https://betterstack.com/docs/uptime/ios-and-android-mobile-apps/)
- [PostHog error tracking alerts](https://posthog.com/docs/error-tracking/alerts)
- [Vercel Drains docs](https://vercel.com/docs/drains)
- [Vercel Workflows public beta announcement](https://vercel.com/changelog/open-source-workflow-dev-kit-is-now-in-public-beta)
- [Inngest Next.js quickstart](https://www.inngest.com/docs/getting-started/nextjs-quick-start)
- [Atlassian — Migrate from Opsgenie](https://www.atlassian.com/software/opsgenie/migration) (EOL context)
- [Grafana OnCall maintenance-mode blog](https://grafana.com/blog/grafana-oncall-maintenance-mode/) (don't use)
- [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) (Phase 2 hand-off target)

## 18. Next steps

This design is ready for either of:

- **`/write_ticket`** — break it into milestone tickets (one per week of rollout).
- **`/create_plan`** — produce a step-by-step implementation plan starting with Week 1's detection pipe.

No source files in `src/` are touched until one of those produces a sequenced plan.
