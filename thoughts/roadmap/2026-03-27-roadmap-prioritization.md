# Roadmap Prioritization - March 27, 2026

> **Date:** 2026-03-27
> **Status:** Approved
> **Scope:** Major pivot to Creation Homes new home builder pilot. Close locksmith issues, deprioritize old website work, create MVP epics.

---

## Context

### Discovery Summary

| Factor | Status |
|--------|--------|
| **Pilot stage** | Design validated, haven't started building |
| **Blocker** | None — just hadn't prioritized |
| **Capacity** | 5-10 hours/week |
| **Time off** | None through early May |
| **Pilot customer** | Ready and waiting (Creation Homes QLD sales consultant) |
| **Locksmith pilot** | Dead — fully pivoted to new home builders |
| **Focus** | 100% on Creation Homes MVP |

### What Changed Since Last Prioritization (Dec 19, 2025)

- **Major pivot:** From generic AI sales automation to AI sales assistant for QLD new home builders
- **New pilot customer:** Creation Homes QLD sales consultant (replaces locksmith)
- **Validated design:** Full system design completed and validated (`thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`)
- **HubSpot ready:** Consultant has independent HubSpot account set up
- **Locksmith abandoned:** No discovery conversation happened; fully pivoted

---

## Approved Changes

### Section 1: Issues to Close (3 issues)

| # | Title | Reason |
|---|-------|--------|
| 29 | Conduct first discovery conversation with locksmith friend | Locksmith pilot abandoned — pivoted to new home builders |
| 30 | Build AI sales agent for locksmith Release Pilot | Locksmith pilot abandoned |
| 31 | Document locksmith discovery findings and use cases | Locksmith pilot abandoned |

### Section 2: Issues to Move to Post-PMF: Scaling (6 issues)

| # | Title | Current Milestone | Reason |
|---|-------|-------------------|--------|
| 33 | Identify and qualify second pilot candidate | M0: Pilot Validation | Focus on Creation Homes first — second pilot after validation |
| 37 | Fix: form_step_completed not firing for step 4 | M0: Pilot Validation | Old website booking form bug — irrelevant to new app |
| 44 | Fix BookingForm back button timeout | M0: Pilot Validation | Old website booking form bug — irrelevant to new app |
| 18 | Research and Purchase Business Insurance | M1: Business Foundation | Not blocking pilot — revisit when taking paying customers |
| 19 | Open Business Bank Account | M1: Business Foundation | Not blocking pilot — revisit when taking paying customers |
| 15 | Set Up Essential Business Tools Stack | M4: Sales Infrastructure | HubSpot integration is part of the MVP build itself |

### Section 3: Issues to Keep Active in M0 (3 issues)

| # | Title | Action |
|---|-------|--------|
| 14 | Validate use cases through Release Pilots | Update description for Creation Homes pivot |
| 32 | Define pilot success metrics framework | Reframe for Creation Homes (pipeline coverage, lot-match speed, follow-up compliance) |
| 50 | Adopt Vercel AI SDK as agent framework | Keep — core tech decision still valid |

### Section 4: New Epics Created (4 issues)

| Epic | # | Title | Week | Dates | Estimate |
|------|---|-------|------|-------|----------|
| 1 | #85 | MVP Foundation — Scaffold, Database, Auth & HubSpot | Week 1 | Mar 31 - Apr 4 | 5-10 hrs |
| 2 | #86 | Lead Management + AI Qualification Scoring | Week 2 | Apr 7 - Apr 11 | 5-10 hrs |
| 3 | #87 | HITL Message Queue + Nurture Sequences | Week 3 | Apr 14 - Apr 18 | 5-10 hrs |
| 4 | #88 | Lot Matcher + Mobile Polish | Week 4 | Apr 21 - Apr 25 | 5-10 hrs |

Epic files: `thoughts/epics/2026-03-27-epic-*.md`

### Section 5: No Changes

**Post-PMF: Scaling** — All 25 issues remain correctly parked.
**Tech Debt** — #65 and #66 remain, revisit monthly.

---

## Weekly Focus (4-Week MVP Sprint)

| Week | Dates | Focus | Hours | Key Deliverable |
|------|-------|-------|-------|-----------------|
| **1** | Mar 31 - Apr 4 | Foundation | 5-10 | Auth flow works, all tables exist, HubSpot connected |
| **2** | Apr 7 - Apr 11 | Lead Management + AI | 5-10 | Lead entry forms, AI scoring, pipeline board |
| **3** | Apr 14 - Apr 18 | HITL Queue + Nurture | 5-10 | Message queue, approve/send flow, Twilio + email |
| **4** | Apr 21 - Apr 25 | Lot Matcher + Polish | 5-10 | Lot matching, reverse matching, mobile polish |

**Prep task:** Set up Twilio account and phone number during Weeks 1-2 so it's ready for Epic 3.

### Key Milestones

| Date | Milestone | Validation |
|------|-----------|------------|
| Apr 4 | Foundation live | Login works, empty dashboard, HubSpot syncs |
| Apr 11 | Leads working | Enter lead, AI scores it, pipeline board shows stages |
| Apr 18 | Messages flowing | AI drafts, consultant approves, SMS/email sent |
| Apr 25 | MVP complete | Lot matching works, mobile-ready, ready for live pilot |

---

## Post-MVP: Live Pilot (May onwards)

After the 4-week build:
- Consultant starts using the app with real walk-in leads
- Monitor and iterate based on real usage
- Measure success metrics (#32)
- Gather case study material
- Decide on second pilot candidate

---

## Implementation Checklist

### Phase 1: Close & Move Issues

```bash
# Close locksmith issues
gh issue close 29 --repo samjmarshall/www --comment "Closed — locksmith pilot abandoned. Pivoted to Creation Homes new home builder pilot."
gh issue close 30 --repo samjmarshall/www --comment "Closed — locksmith pilot abandoned. Pivoted to Creation Homes new home builder pilot."
gh issue close 31 --repo samjmarshall/www --comment "Closed — locksmith pilot abandoned. Pivoted to Creation Homes new home builder pilot."

# Move to Post-PMF: Scaling
gh issue edit 33 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
gh issue edit 37 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
gh issue edit 44 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
gh issue edit 18 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
gh issue edit 19 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
gh issue edit 15 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
```

### Phase 2: Create Iterations

Create 4 new iterations on the project board (5-day work weeks):

| Iteration | Title | Start | Duration |
|-----------|-------|-------|----------|
| 1 | Week 1: Foundation | 2026-03-30 | 7 |
| 2 | Week 2: Leads | 2026-04-06 | 7 |
| 3 | Week 3: Messages | 2026-04-13 | 7 |
| 4 | Week 4: Matching | 2026-04-20 | 7 |

> **Note:** GitHub iterations use calendar days (7 = full week). Start dates are Mondays.

### Phase 3: Add Issues to Project Board

All 18 issues (#85-102) need to be added to the project:

```bash
PROJECT_ID="PVT_kwHOAHz9qs4AjXIr"
for i in 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102; do
  ISSUE_ID=$(gh api graphql -f query="{ repository(owner:\"samjmarshall\",name:\"www\") { issue(number:$i) { id } } }" --jq '.data.repository.issue.id')
  gh api graphql -f query="mutation { addProjectV2ItemById(input: { projectId: \"$PROJECT_ID\", contentId: \"$ISSUE_ID\" }) { item { id } } }" --jq '.data.addProjectV2ItemById.item.id'
  echo "Added #$i"
done
```

### Phase 4: Set Project Board Fields

After adding issues and creating iterations, set fields using the GraphQL API.

**Field IDs:**

| Field | ID |
|-------|-----|
| Status | `PVTSSF_lAHOAHz9qs4AjXIrzgbvEfE` |
| Priority | `PVTSSF_lAHOAHz9qs4AjXIrzgbvEfw` |
| Size | `PVTSSF_lAHOAHz9qs4AjXIrzgbvEf0` |
| Iteration | `PVTIF_lAHOAHz9qs4AjXIrzgbvEf8` |
| Start date | `PVTF_lAHOAHz9qs4AjXIrzgbvEgA` |
| End date | `PVTF_lAHOAHz9qs4AjXIrzgbvEgE` |

**Option IDs:**

| Field | Value | ID |
|-------|-------|----|
| Status | Backlog | `f75ad846` |
| Status | Ready | `08afe404` |
| Priority | P0 | `79628723` |
| Priority | P1 | `0a877460` |
| Priority | P2 | `da944a9c` |
| Size | S | `9592a5a3` |
| Size | M | `9728cbdc` |
| Size | L | `c53df028` |

**Epic Parents:**

| # | Title | Status | Priority | Size | Iteration | Start | End |
|---|-------|--------|----------|------|-----------|-------|-----|
| 85 | Epic 1: MVP Foundation | Ready | P1 | L | Week 1: Foundation | 2026-03-31 | 2026-04-04 |
| 86 | Epic 2: Lead Management + AI Scoring | Backlog | P1 | L | Week 2: Leads | 2026-04-07 | 2026-04-11 |
| 87 | Epic 3: HITL Message Queue + Nurture | Backlog | P1 | L | Week 3: Messages | 2026-04-14 | 2026-04-18 |
| 88 | Epic 4: Lot Matcher + Mobile Polish | Backlog | P1 | L | Week 4: Matching | 2026-04-21 | 2026-04-25 |

**Epic 1 Child Issues (Week 1: Foundation):**

| # | Title | Status | Priority | Size | Iteration | Start | End |
|---|-------|--------|----------|------|-----------|-------|-----|
| 89 | Route Group Scaffold | Ready | P1 | S | Week 1: Foundation | 2026-03-31 | 2026-03-31 |
| 90 | Drizzle ORM + Neon Setup | Ready | P1 | M | Week 1: Foundation | 2026-03-31 | 2026-04-01 |
| 91 | better-auth — Email OTP | Backlog | P1 | M | Week 1: Foundation | 2026-04-01 | 2026-04-02 |
| 95 | HubSpot API Client Setup | Backlog | P1 | M | Week 1: Foundation | 2026-04-01 | 2026-04-02 |
| 92 | Login Page & Auth Redirect | Backlog | P2 | S | Week 1: Foundation | 2026-04-02 | 2026-04-03 |
| 93 | tRPC Dual-Client Setup | Backlog | P1 | M | Week 1: Foundation | 2026-04-02 | 2026-04-03 |
| 94 | Dashboard App Shell | Backlog | P2 | M | Week 1: Foundation | 2026-04-03 | 2026-04-04 |

> **Execution order:** #89 + #90 (parallel) → #91 + #95 (parallel) → #92 + #93 (parallel) → #94

**Epic 2 Child Issues (Week 2: Leads):**

| # | Title | Status | Priority | Size | Iteration | Start | End |
|---|-------|--------|----------|------|-----------|-------|-----|
| 96 | tRPC Leads Router & Schema | Backlog | P1 | M | Week 2: Leads | 2026-04-07 | 2026-04-07 |
| 97 | Full Lead Enquiry Form | Backlog | P1 | M | Week 2: Leads | 2026-04-08 | 2026-04-09 |
| 98 | Quick Capture Form | Backlog | P2 | S | Week 2: Leads | 2026-04-08 | 2026-04-08 |
| 99 | AI Qualification & Scoring | Backlog | P1 | M | Week 2: Leads | 2026-04-08 | 2026-04-09 |
| 102 | HubSpot Contact Sync | Backlog | P1 | M | Week 2: Leads | 2026-04-08 | 2026-04-09 |
| 100 | Pipeline Board View | Backlog | P1 | M | Week 2: Leads | 2026-04-10 | 2026-04-11 |
| 101 | Lead Profile Page | Backlog | P2 | M | Week 2: Leads | 2026-04-10 | 2026-04-11 |

> **Execution order:** #96 (gate) → #97 + #98 + #99 + #102 (parallel) → #100 + #101 (parallel)

**Existing M0 Issues:**

| # | Title | Change |
|---|-------|--------|
| 14 | Validate use cases through Release Pilots | No date changes — umbrella goal tracked by epic completion |
| 32 | Define pilot success metrics framework | Set P2, start 2026-04-07, end 2026-04-11 |
| 50 | Adopt Vercel AI SDK | Set P1, start 2026-03-31, end 2026-04-04 — embedded in Epic 1 build |

### Phase 5: External Service Setup

Prep tasks to unblock development (not GitHub issues — just do them):

| Service | Needed By | Action |
|---------|-----------|--------|
| Neon Postgres | Week 1 (Mar 31) | Provision via Vercel integration, get `DATABASE_URL` |
| HubSpot API | Week 1 (Mar 31) | Get `HUBSPOT_ACCESS_TOKEN` from consultant's account |
| Claude API | Week 2 (Apr 7) | Provision key for AI scoring, set `ANTHROPIC_API_KEY` |
| Twilio | Week 3 (Apr 14) | Create account, buy AU phone number, get SID + auth token |
| `BETTER_AUTH_SECRET` | Week 1 (Mar 31) | Generate with `openssl rand -base64 32` |

---

## References

- Previous prioritization: `thoughts/roadmap/2025-12-19-roadmap-prioritization.md`
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- Pilot program: `docs/sales/pilot-program.md`
- Epic files: `thoughts/epics/2026-03-27-epic-*.md`
- Enquiry form: `docs/sales/Display-Client-Enquiry-Form-v1.2.md`
