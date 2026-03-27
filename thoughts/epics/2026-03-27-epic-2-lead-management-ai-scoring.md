# Epic 2: Lead Management + AI Qualification Scoring

**GitHub Issue:** samjmarshall/www#86
**Type:** Epic
**Milestone:** M0: Pilot Validation
**Labels:** epic, enhancement
**Priority:** P0 (Critical)
**Estimate:** 5-10 hours (1 week at current capacity)
**Start:** 2026-04-07
**Target:** 2026-04-11

---

## Goal

Enable the consultant to capture leads from display home walk-ins and informal encounters, then have AI automatically qualify and score each lead. The pipeline board shows all leads by stage so the consultant always knows who needs attention and what to ask next.

## Business Context

**Problem:** The consultant only gets display home walk-ins — no inbound marketing leads. Without a system to capture, qualify, and track these leads, they lose potential buyers and can't maintain a warm pipeline for when lots become available.
**Opportunity:** Every walk-in and networking contact gets captured, scored, and tracked. The consultant never forgets a lead or misses a qualification gap.
**Success metrics:** Leads can be entered in <60 seconds (quick capture) or <3 minutes (full form). AI scoring runs within 5 seconds of save. Pipeline board accurately reflects lead stages.
**Stakeholders:** Pilot consultant (Creation Homes QLD), Sam.

## Scope

**In Scope:**
- Full enquiry form (mirrors Creation Homes Display Client Enquiry Form v1.2)
- Quick capture form (name + phone + notes) for informal encounters
- AI qualification via Claude API: `qualifyAndScore()` on lead create/update
- Lead scoring (0-100) with weighted factors: land status (30), finance (25), timeline (20), budget (10), property type (10), engagement (5)
- Land status sub-scoring (registered -> 30pts, under contract -> 22pts, searching -> 15pts, eventually -> 5pts, none -> 0pts)
- Qualification gap list: AI identifies missing fields and suggests next question
- Lead stages: unqualified (0-25), nurture (26-50), warm (51-75), hot (76-100)
- Pipeline board view: leads grouped by stage, card shows name/score/last contact/top gap
- Lead profile page: all qualification data, score breakdown, gap list, conversation history placeholder
- HubSpot sync: leads created/updated sync to HubSpot contacts

**Out of Scope:**
- Referral email intake/parsing (post-MVP)
- Voice-to-text input (post-MVP)
- Message drafting or sending (Epic 3)
- Lot matching (Epic 4)
- AI voice/tone learning

## Key Deliverables

1. **Full enquiry form** — All fields from Creation Homes form, mobile-optimised, validates on submit
2. **Quick capture form** — Minimal name + phone + notes, creates lead as "unqualified"
3. **AI scoring engine** — Claude API integration, weighted scoring, gap analysis, runs automatically
4. **Pipeline board** — Kanban-style view by stage, sortable, filterable by estate/FHOG/timeline
5. **Lead profile page** — Full detail view with score breakdown, gap list, and edit capability

## Breakdown into Stories/Tasks

> Child issues will be created via `/create_plan`. Indicative breakdown:

- [ ] Build full lead enquiry form (all Creation Homes fields)
- [ ] Build quick capture form (name + phone + notes)
- [ ] Create tRPC `leads` router (CRUD operations)
- [ ] Implement `qualifyAndScore()` Claude API function with weighted scoring
- [ ] Implement land status sub-scoring logic
- [ ] Implement qualification gap detection and next-question generation
- [ ] Build pipeline board view (leads by stage with cards)
- [ ] Build lead profile page (full detail, score breakdown, gap list)
- [ ] Wire HubSpot contact sync on lead create/update
- [ ] Add filters: estate preference, FHOG eligibility, timeline

## Dependencies

- **Epic 1 complete:** Route groups, tRPC, database, auth, HubSpot connection all working
- Claude API key provisioned and environment variable set
- Enquiry form field definitions finalised (confirmed via `Display-Client-Enquiry-Form-v1.2.md`)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API latency slows form submission | Medium | Score asynchronously — save lead immediately, score in background, update via optimistic UI or polling |
| Scoring accuracy insufficient initially | Medium | Tune prompts iteratively with real leads; consultant feedback loop |
| Form too long for mobile walk-in capture | Low | Quick capture exists as lightweight alternative; full form is optional detail entry |

## Success Criteria

- [ ] Consultant can enter a walk-in lead via full form in <3 minutes on mobile
- [ ] Consultant can quick-capture a networking contact in <60 seconds
- [ ] AI scores lead within 5 seconds of save, score appears on profile
- [ ] Pipeline board shows leads in correct stage buckets
- [ ] Tapping a lead card opens full profile with score breakdown and gap list
- [ ] Gap list suggests specific next question to ask
- [ ] Lead syncs to HubSpot as a contact

## References

- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (Qualification Schema, AI Scoring sections)
- Enquiry form: `docs/sales/Display-Client-Enquiry-Form-v1.2.md`
- Lead score weights and stage thresholds defined in design doc
