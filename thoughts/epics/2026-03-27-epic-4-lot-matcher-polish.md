# Epic 4: Lot Matcher + Mobile Polish

**GitHub Issue:** samjmarshall/www#88
**Type:** Epic
**Milestone:** M0: Pilot Validation
**Labels:** epic, enhancement
**Priority:** P0 (Critical)
**Estimate:** 5-10 hours (1 week at current capacity)
**Start:** 2026-04-21
**Target:** 2026-04-25

---

## Goal

Build the lot-lead matching system — the consultant's secret weapon. When a lot becomes available, enter it in 30 seconds and instantly see which pipeline leads match. One tap queues outreach to matched leads. Reverse matching shows hot leads which lots suit them. Polish the entire app for mobile use in a display home environment.

## Business Context

**Problem:** When lots become available (especially exclusive territory windows of ~1 week), the consultant who has a qualified buyer ready wins the allocation. Without instant matching, the consultant scrambles through memory or spreadsheets while competitors with warmer pipelines close the deal.
**Opportunity:** Lot-to-lead matching in seconds, not hours. The consultant can respond to lot availability within minutes with targeted outreach to qualified, finance-ready buyers.
**Success metrics:** Lot entry <30 seconds. Match results appear within 5 seconds. Outreach queued with one tap. All three views (action queue, pipeline, lot matcher) usable on mobile in a display home.
**Stakeholders:** Pilot consultant (Creation Homes QLD), Sam.

## Scope

**In Scope:**
- Lot entry form: estate/suburb, lot number, land size (m2 + frontage), price, availability type (first-come/exclusive/developer direct), exclusivity window
- AI lot-lead matching: `matchLeadsToLot()` runs on lot creation, cross-references location preference, budget fit, block compatibility, readiness, FHOG eligibility
- Match output: ranked list with match strength (strong/partial/stretch), fit reasoning, missing info, pre-drafted outreach
- Lot matcher view: enter lot -> see matches -> one-tap queue outreach
- Persistent lot list with match counts ("Springfield lot: 3 strong matches")
- Reverse matching: hot lead profile shows compatible available lots
- Push notifications: new lead entered, lot-match found, lead replied, lead score turned hot
- Mobile UX polish across all views (action queue, pipeline, lot matcher)
- Lot status tracking: available -> matched -> sold -> expired

**Out of Scope:**
- Land developer API integrations (manual entry only)
- Automated lot availability monitoring
- Map/geographic visualisation of lots
- Estate directory or lot catalogue
- Analytics or reporting dashboards

## Key Deliverables

1. **Lot entry form** — Minimal fields, 30-second entry, mobile-optimised
2. **AI lot-lead matching** — Claude API function cross-referencing lot specs against all pipeline leads
3. **Lot matcher view** — Third dashboard tab: enter lot, see ranked matches, queue outreach
4. **Reverse matching** — Hot lead profile surfaces compatible available lots automatically
5. **Push notifications** — Key events trigger browser/PWA push notifications
6. **Mobile polish** — All three views optimised for phone use in display home context

## Breakdown into Stories/Tasks

> Child issues will be created via `/create_plan`. Indicative breakdown:

- [ ] Build lot entry form (estate, dimensions, price, availability type, window)
- [ ] Create tRPC `lots` router (CRUD, status transitions)
- [ ] Implement `matchLeadsToLot()` AI matching function
- [ ] Build lot matcher view with ranked match results
- [ ] Implement one-tap "queue outreach" from match results
- [ ] Build persistent lot list with match counts
- [ ] Implement reverse matching on hot lead profiles
- [ ] Implement lot status tracking (available/matched/sold/expired)
- [ ] Set up push notifications (service worker + notification triggers)
- [ ] Mobile UX polish: action queue swipe gestures, responsive layouts, touch targets
- [ ] End-to-end testing: lot entry -> match -> outreach -> send

## Dependencies

- **Epics 1-3 complete:** Full pipeline of scored leads, working message queue, sending infrastructure
- Sufficient test leads in the system to validate matching (can seed with realistic data)
- Push notification permissions from consultant's browser/device

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too few leads to demonstrate meaningful matching | Medium | Seed pipeline with realistic test data during development; real leads accumulate over weeks 1-3 |
| Push notification permissions blocked | Low | PWA push is additive; core functionality works without it; SMS fallback for critical alerts |
| Matching quality poor with sparse lead data | Medium | Partial matches still valuable — surface what's known and flag what's missing |
| Mobile polish scope creep | Medium | Focus on the three core views only; settings and config stay desktop-friendly |

## Success Criteria

- [ ] Consultant can enter a lot in <30 seconds on mobile
- [ ] Match results appear within 5 seconds with ranked leads
- [ ] Each match shows strength, reasoning, and missing info
- [ ] One tap queues pre-drafted outreach message to matched lead
- [ ] Lot list shows all active lots with match counts
- [ ] Hot lead profile shows compatible available lots (reverse match)
- [ ] Push notification fires when a new lot-match is found
- [ ] All three views (action queue, pipeline, lot matcher) are usable on mobile
- [ ] Full end-to-end flow works: enter lot -> see matches -> approve outreach -> message sent

## References

- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Lot-Lead Matching, Dashboard UX sections)
- Match criteria: location preference, budget fit, block compatibility, readiness, FHOG eligibility
- Availability types: first-come-first-served, exclusive territory (~1 week window), developer direct
