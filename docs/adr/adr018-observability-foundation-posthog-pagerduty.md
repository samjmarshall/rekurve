---
Status: 'Proposed'
Deciders: 'Sam Marshall'
Date: '2026-06-05'
# prettier-ignore
---

# Run observability and on-call on existing tools (PostHog + PagerDuty free + a DIY dead-man's-switch) instead of the Better Stack bundle

## Context and Problem Statement

The [2026-04-30 AI-incident-response design](../../thoughts/designs/2026-04-30-ai-incident-response.md) selected **Better Stack** as a single paid bundle (~$29/mo) covering six roles: uptime checks, log management + Vercel log drain, on-call + mobile paging, a public status page, the single incident-dedup funnel, and CI failure heartbeats. None of it was provisioned — every touchpoint is still commented-out (PR #266) or a `webhook.site` placeholder.

Since that design, **PostHog shipped Logs** (beta, an OTLP/HTTP receiver) on a vendor already in the stack: PostHog already runs product analytics, error tracking, and insight alerts (issue #200). That collapses most of Better Stack's value into a tool we already pay nothing for. The forces in tension are vendor count, fixed monthly cost, and operational simplicity for a one-consultant pilot on one side, against feature ceilings — native uptime, a status page, mature log-based alerting, bundled iOS Critical Alerts — on the other.

Do we buy the Better Stack bundle as designed, or assemble monitoring, logging, alerting, uptime, and on-call from tools already in the stack plus free tiers?

## Decision Drivers

- **Minimize vendor count and fixed cost pre-PMF.** Every paid line item and extra dashboard is operational overhead for a single-consultant pilot. Prefer $0 and accounts already in use.
- **Consolidate the data the deferred AI triage agent will need.** That agent's `queryBetterStackLogs` context tool (2026-04-30 design §6) should point at one queryable store holding logs, exceptions, and analytics — not a separate log vendor.
- **Reversibility over feature ceiling.** Accept lower ceilings in exchange for low-lock-in choices that swap by config, not rewrite.
- **Human paging must not depend on our own app's uptime.** Whatever pages the on-call has to work when the app is down.
- **Detection latency adequate for a pilot, not best-in-class.** ~5–10 minutes to detect an outage is acceptable; sub-minute synthetic monitoring is not required yet.
- **Fit the existing Inngest + Vercel serverless runtime.** No long-running processes; reuse the scheduled-cron pattern already proven by the outbox sweep ([adr014](adr014-outbox-pattern-for-inngest-delivery.md)).

## Considered Options

1. Existing tools + free tiers — PostHog (logs + errors + analytics + alerts) + PagerDuty free (dedup funnel + on-call + mobile) + a DIY Inngest→PostHog dead-man's-switch for uptime
2. Better Stack Team bundle (~$29/mo) — one paid vendor for uptime + log management + on-call + status page + dedup funnel + CI heartbeats (the 2026-04-30 design)
3. Hybrid — PostHog for logs + errors, plus a dedicated external uptime monitor (UptimeRobot / Better Stack free) and PagerDuty free for paging
4. Vercel-native + bolt-ons — Vercel Observability (+ Observability Plus) for logs and infra metrics, plus PagerDuty free and an external monitor for the roles Vercel does not cover

## Decision Outcome

Chosen option: "1. Existing tools + free tiers", because it is the only option that adds **zero new vendors and ~$0/mo** while consolidating the deferred agent's context into one store and keeping every seam reversible (OTLP is a standard exporter swap; PagerDuty ingests the generic Events API v2) — at the price of a deliberately-scoped uptime blind spot that a no-code external monitor can close later.

Concretely: PostHog receives application logs over **OTLP** through a logger seam extending `src/instrumentation.ts`, flushed with `forceFlush()` via Next.js `after()` so Vercel does not freeze the function before logs ship. PostHog error-tracking, insight, and log alerts all fire generic webhooks templated to **PagerDuty's Events API v2**, which is the single dedup funnel and pages the on-call through its mobile app. Uptime is a **dead-man's-switch**: an Inngest cron (~2 min, modeled on the outbox sweep) runs a cheap Neon `SELECT 1` and emits a heartbeat **log** only on success; a PostHog **Logs** alert (`count < 1` over a 5-minute window, fixed 5-minute evaluation) pages when the heartbeat stops. CI migration/verify failures `curl` the same Events API v2. Business metrics stay in PostHog insights; infra metrics stay in Vercel's Observability dashboard. The deferred AI triage agent (2026-04-30 design §6/§8) slots in later as a **parallel** consumer that enriches incidents but never gates human paging.

### Positive Consequences

- **~$0/mo incremental** (vs ~$35–55/mo for the bundle), with **no new vendor signup** — logs reuse the existing PostHog project and `phc_…` token; PagerDuty free covers on-call.
- **One queryable context store for the future agent.** Logs, exceptions, and analytics all live in PostHog, with MCP log-query tools available — the agent's single `queryPostHogLogs` tool replaces `queryBetterStackLogs` with no other change.
- **Logs are a two-way door.** The OTLP exporter re-points to Axiom / Grafana / Better Stack via an env + `instrumentation.ts` change; the app's `log.*` call-sites never move. The only non-portable artifacts are in-PostHog saved views/alerts and ≤14 days of history.
- **Human paging is independent of app uptime.** PagerDuty pages directly off detection; the agent is additive. This is strictly safer than the 2026-04-30 design's "agent-first, escalate-on-silence" flow.
- **The dead-man's-switch catches the highest-probability outage for free.** Inngest executes a cron by calling back into the Vercel `/api/inngest` route, so a Vercel outage stops the heartbeat too — not just an Inngest one.
- **Architectural ADRs are decoupled from the log vendor.** [adr014](adr014-outbox-pattern-for-inngest-delivery.md) and [adr010](adr010-inngest-source-of-truth-for-followup-plan.md) now name "the logging backend," with this ADR as the vendor of record — so the next swap does not re-stale them.

### Negative Consequences

- **PostHog Logs is beta.** 14-day retention, server-side only (browser structured logs are out of scope — error tracking already captures client exceptions), and a **mandatory `forceFlush()`** via `after()` or logs silently drop on Vercel serverless. We accept beta churn against the two-way-door exit.
- **A deliberately-accepted uptime blind spot.** An internal monitor cannot see failures only an outsider sees — DNS/domain, TLS cert, CDN/edge, region-specific Vercel issues — and it is blind precisely **during a PostHog outage** (PostHog is both heartbeat sink and alarm). This hole stays open until the no-code external-monitor fast-follow is added; it is a known, revisit-at-PMF gap, not an oversight.
- **Detection latency is ~5–10 minutes** (2-min heartbeat, 5-min window, 5-min evaluation cadence), not sub-minute. Acceptable for the pilot, not at scale.
- **Lost Better Stack capabilities:** public status page, log alerting richer than count-over-window thresholds, >3-month incident history, and bundled iOS Critical Alerts. The status page is already a non-goal; the rest are accepted ceilings.
- **PagerDuty free limits:** 5 users, 1 schedule, 1 escalation policy, 100 SMS/phone per month (push unlimited). Fine for a ≤3-person pilot; a constraint at team growth.
- **PagerDuty free DND/silent-mode bypass is unverified.** A real-device smoke test gates trust for 2 a.m. pages; if it fails, the fallback is a paid PagerDuty tier or Better Stack — a vendor swap, not a code change.
- **Alert→PagerDuty mapping lives outside version-controlled app code** (PostHog Hog Functions + GitHub Actions `curl`) until the agent introduces the app-mediated bridge.
- **Three free tiers replace one bundle.** More accounts and dashboards to hold in your head, even at $0.

## Pros and Cons of the Options

### 1. Existing tools + free tiers (chosen)

PostHog for logs/errors/analytics/alerts, PagerDuty free as the dedup funnel + pager, a DIY Inngest→PostHog dead-man's-switch for uptime.

| Pros                                                                                                            | Cons                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ~$0/mo, no new vendor — reuses the PostHog project + token already in the stack                                | PostHog Logs is beta: 14-day retention, server-only, mandatory `forceFlush()` footgun                                          |
| One queryable store (logs + errors + analytics) for the deferred agent; MCP log tools included                | Uptime blind spot to DNS/TLS/CDN/region + PostHog-as-SPOF-watcher, until an external monitor is added                          |
| Two-way door on logs — OTLP exporter re-points by config; call-sites don't move                               | ~5–10 min detection latency, not sub-minute                                                                                    |
| Heartbeat reuses the proven outbox-sweep cron pattern; catches Vercel-down for free                           | Alert→PagerDuty mapping lives in Hog Functions / CI, not app code, until the agent's bridge lands                              |
| Human paging independent of app uptime; agent is additive                                                     | Three free-tier accounts to operate instead of one bundle                                                                      |

### 2. Better Stack Team bundle (~$29/mo)

One vendor for uptime + logs + on-call + status page + funnel + heartbeats — the original design.

| Pros                                                                                          | Cons                                                                                                              |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Real external uptime + status page + mature log alerting out of the box                        | A new paid vendor and a new account, for capabilities a single-consultant pilot barely exercises                |
| Single bill, single funnel, single mobile app with iOS Critical Alerts                         | Splits the agent's context across two stores (Better Stack logs + PostHog errors/analytics)                     |
| Log drain is a managed pipe — no `forceFlush()` footgun to own                                 | Adds a vendor whose log-management value PostHog Logs now largely duplicates                                    |
|                                                                                                | Reverses less cleanly — log data and alert rules live in a vendor-specific surface                              |

### 3. Hybrid — PostHog logs/errors + external uptime monitor + PagerDuty free

Option 1, but stand up a real external HTTP monitor (UptimeRobot / Better Stack free) now instead of deferring it.

- Good, because it closes the uptime blind spot immediately and gives a true outside-vantage check plus a watcher-of-the-watcher for PostHog outages.
- Good, because the external monitor needs no app code — it is purely dashboard setup.
- Bad, because it adds a fourth account to operate for a risk that is low pre-PMF (TLS/DNS are Vercel-managed; the residual is edge/region failures). This is exactly the fast-follow Option 1 defers, not a different architecture — so it is a sequencing choice, not a competing design.

### 4. Vercel-native + bolt-ons

Lean on Vercel Observability (+ Observability Plus, $1.20/1M events) for logs and infra metrics.

- Bad, because Vercel has no native uptime monitoring and no on-call — you still need PagerDuty free and an external monitor, so it does not reduce vendor count.
- Bad, because Vercel runtime-log retention is 1 day on Pro (30 with the paid add-on), and the logs are not the same queryable OTLP store the agent wants.
- Good, because the infra-metrics dashboard is already included on Pro at $0 — which is why this ADR keeps Vercel for infra metrics while sending application logs to PostHog.

## Open Questions

- **PagerDuty free DND/silent-mode bypass** — real-device smoke test (carried over from the 2026-04-30 design's Week-1 gate). A failure forces a paid tier or Better Stack.
- **Heartbeat auto-resolve** — does a PostHog Logs alert emit a *resolve* webhook when `count ≥ 1` again, so PagerDuty can auto-close the incident, or is an explicit "heartbeat resumed" path required?
- **PostHog Logs beta** — confirm the project-settings opt-in and the EU endpoint (`eu.i.posthog.com`) to match the existing region.
- **Heartbeat tuning** — 2-min cron vs 5-min window vs 5-min evaluation: confirm detection latency and false-positive behaviour during single-region Inngest blips.

## Links

- Design: [2026-06-05-observability-foundation-posthog-pagerduty](../../thoughts/designs/2026-06-05-observability-foundation-posthog-pagerduty.md)
- Supersedes the vendor foundation of: [2026-04-30 AI-incident-response design](../../thoughts/designs/2026-04-30-ai-incident-response.md) (§3.1, §5.2, §5.3, §16); its AI triage agent design (§6, §8) still stands, with `queryBetterStackLogs` re-targeted to PostHog Logs
- Re-homes the logging/alert destination named in: [adr014](adr014-outbox-pattern-for-inngest-delivery.md), [adr010](adr010-inngest-source-of-truth-for-followup-plan.md)
- Reuses the scheduled-cron pattern of: [adr014](adr014-outbox-pattern-for-inngest-delivery.md)
- Vendor docs: [PostHog Logs](https://posthog.com/docs/logs), [PostHog Logs alerts](https://posthog.com/docs/logs/alerts), [PagerDuty Events API v2](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/)
