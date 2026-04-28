---
title: Feature documentation checklist
created: 2026-04-28
related-skill: document-feature
---

# Feature documentation checklist

Work through these one at a time using `/document-feature {slug}`. Each produces `docs/feature/{slug}.md`.

Order is foundation-first — each later feature assumes a reader who skimmed the earlier docs. Adjust as needed.

## Source inventory

Customer = the **Creation Homes QLD pilot consultant** (primary user of the app). Marketing-site features below serve a secondary audience (prospective Rekurve customers).

Features below are derived from closed `released`-labelled issues across Epic 1 (#85), Epic 2 (#86), Epic 3 (#87), and the marketing site. Epic 4 (#88, lot matcher) is **not yet built** — skip until shipped. Each row links the GitHub issue and the design/plan/epic in `thoughts/`.

## Pilot app — consultant-facing

### Foundation

- [x] **`auth-email-otp`** — Email OTP login + redirect flow
  - Issues: #91, #92 · Plan: `thoughts/plans/2026-03-29-91-better-auth-email-otp.md`, `thoughts/plans/2026-03-30-login-page-auth-flow.md` · Epic: #85
  - Surface: `src/app/(login)/login/`, better-auth config

- [x] **`dashboard-app-shell`** — Mobile-responsive empty shell, route-group layout, navigation
  - Issue: #94 · Plan: `thoughts/plans/2026-03-31-94-dashboard-app-shell.md` · Epic: #85
  - Surface: `src/app/(application)/layout.tsx`, dashboard nav

### Lead management (Epic 2)

- [x] **`quick-capture-form`** — <60s name + phone + notes capture for informal encounters
  - Issue: #98 · Plan: `thoughts/plans/2026-04-05-ENG-98-quick-capture-form.md` · Epic: #86
  - Surface: `src/app/(application)/leads/new/`

- [x] **`full-lead-enquiry-form`** — Full Creation Homes Display Enquiry form (mobile-optimised)
  - Issue: #97 · Plan: `thoughts/plans/2026-04-03-97-lead-enquiry-form.md` · Epic: #86
  - Surface: `src/app/(application)/leads/new/`, full-form variant

- [x] **`ai-qualification-scoring`** — Claude-powered weighted score (0–100), stage assignment, gap detection + next-question suggestion
  - Issue: #99 · Plan: `thoughts/plans/2026-04-08-99-ai-qualification-scoring-engine.md` · Epic: #86
  - Surface: scoring engine in `src/server/`, `qualifyAndScore()`

- [x] **`pipeline-board`** — Kanban view, leads grouped by stage (unqualified/nurture/warm/hot)
  - Issue: #100 · Plans: `thoughts/plans/2026-04-09-100-pipeline-board-view.md`, `thoughts/plans/2026-04-10-100-pipeline-board-design-fixes.md` · Epic: #86
  - Surface: `src/app/(application)/pipeline/`

- [x] **`lead-profile`** — Full detail view, score breakdown, gap list, edit
  - Issue: #101 · Plans: `thoughts/plans/2026-04-09-101-lead-profile-page.md`, `thoughts/plans/2026-04-10-101-lead-profile-design-fixes.md` · Epic: #86
  - Surface: `src/app/(application)/leads/[id]/`

- [x] **`hubspot-contact-sync`** — One-way create/update sync of leads → HubSpot contacts
  - Issues: #95, #102 · Plans: `thoughts/plans/2026-04-01-95-hubspot-api-client-setup.md`, `thoughts/plans/2026-04-08-102-hubspot-contact-sync.md`, `thoughts/plans/2026-04-09-102-hubspot-property-setup-e2e.md` · Epic: #85, #86
  - Surface: `src/server/` HubSpot client + sync calls in leads router

### HITL message queue & nurture (Epic 3)

- [x] **`ai-message-drafting`** — `draftMessage()` Claude call generates outreach drafts on demand
  - Issues: #126, #127 · Plans: `thoughts/plans/2026-04-12-ENG-126-messages-router.md`, `thoughts/plans/2026-04-13-ENG-127-draft-message.md` · Epic: #87
  - Surface: messages tRPC router, AI drafting fn

- [x] **`action-queue`** — Home-screen priority-sorted draft review (approve / edit / dismiss / snooze)
  - Issue: #128 · Plan: `thoughts/plans/2026-04-13-ENG-128-action-queue-view.md` · Epic: #87
  - Surface: `src/app/(application)/dashboard/`, draft-row + queue components
  - Note: also covers fix #152 (queue row visibility on dispatch failure) — `thoughts/plans/2026-04-27-ENG-152-action-queue-disappear-on-dispatch-failure.md`

- [x] **`hubspot-email-dispatch`** — Approval-time email send via HubSpot, activity logged on contact
  - Issue: #130 · Plan: `thoughts/plans/2026-04-25-ENG-130-hubspot-email-outlook-dispatch.md` · Design: `thoughts/designs/2026-04-27-email-compose-providers.md` · Epic: #87
  - Surface: messages router dispatch path

- [x] **`lead-conversation-history`** — Conversation log on lead profile (this branch)
  - Issue: #131 · Plan: `thoughts/plans/2026-04-26-ENG-131-conversation-log-lead-profile.md` · Epic: #87
  - Surface: `src/app/(application)/leads/[id]/_components/`

- [x] **`nurture-scheduler`** — Cron-driven cadence that auto-creates queued drafts for stale leads
  - Issue: #132 · Plans: `thoughts/plans/2026-04-20-ENG-132-nurture-scheduler.md`, `thoughts/plans/2026-04-21-ENG-132-nurture-scheduler-e2e.md` · Design: `thoughts/designs/2026-04-21-nurture-scheduler-e2e.md` · Epic: #87
  - Surface: nurture tRPC router + scheduled job

## Marketing site — visitor-facing (rekurve.ai)

- [ ] **`marketing-homepage`** — Hero, Problem, Solution, Results, HowItWorks, AboutFounder, Pricing, FAQ, FinalCTA
  - Issues: #1, #3 · Surface: `src/app/(website)/`, `_components/sections/`

- [ ] **`booking-form`** — Multi-step lead capture on the homepage feeding bookings + PostHog events
  - Surface: `src/app/(website)/_components/sections/BookingForm.tsx`
  - Note: tied into PostHog tracking — fixes #37, #38, #39, #40, #41, #44 are in scope

- [x] **`posthog-analytics`** — User identification, event taxonomy, dashboards/funnels/alerts, session recordings
  - Designs: `thoughts/designs/2025-11-25-posthog-analytics-implementation.md`, `thoughts/designs/2025-11-26-posthog-dashboards-funnels-alerts.md`
  - Plans: `thoughts/plans/2025-11-25-posthog-analytics-integration.md`, `2025-11-27-posthog-dashboards-funnels-alerts.md`, `2025-11-27-posthog-user-identification.md`
  - Surface: `src/instrumentation*.ts`, providers

## How to use

1. Pick the next unchecked item.
2. Run `/document-feature {slug}` — the skill handles recon, interview, draft, plain-language pass, and index update.
3. Tick the box here when `docs/feature/{slug}.md` lands.
4. Skip or fold an item if it overlaps with one already documented (note the merge here).

## Out of scope (not yet shipped)

Epic 4 (Lot Matcher) issues #133–#142 and OAuth migration #150 are open — document after they ship. Spike #153 (Vercel Workflows) and Lot Matcher items below are forward-looking, so they belong in `thoughts/designs/` for now, not `docs/feature/`.
