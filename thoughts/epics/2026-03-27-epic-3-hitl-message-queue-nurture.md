# Epic 3: HITL Message Queue + Nurture Sequences

**GitHub Issue:** samjmarshall/www#87
**Type:** Epic
**Milestone:** M0: Pilot Validation
**Labels:** epic, enhancement
**Priority:** P0 (Critical)
**Estimate:** 5-10 hours (1 week at current capacity)
**Start:** 2026-04-14
**Target:** 2026-04-18

---

## Goal

Build the human-in-the-loop message approval system — the consultant's daily workspace. AI drafts follow-up messages based on lead stage and qualification gaps, the consultant reviews and approves (or edits) with one tap, and the system sends via SMS or email. This is the core value loop: AI thinks, consultant approves, system sends, pipeline moves forward.

## Business Context

**Problem:** The consultant's biggest risk is dropping follow-ups. Without systematic outreach, warm leads go cold and the consultant has no pipeline when lots become available. Manual follow-up is inconsistent and time-consuming.
**Opportunity:** Near-100% follow-up compliance. AI handles the thinking (who to contact, what to say, when), consultant just approves. Morning routine: 5 minutes approving messages over coffee.
**Success metrics:** Queue populated with relevant draft messages. Approve-to-send takes <5 seconds. Messages sent via correct channel (SMS/email). All activity logged.
**Stakeholders:** Pilot consultant (Creation Homes QLD), Sam.

## Scope

**In Scope:**
- AI message drafting: generates contextual follow-ups based on lead stage, gaps, and timing
- Action queue view (default/home screen): priority-sorted list of pending messages
- Each queue item shows: lead name/score, recommended action, drafted message, AI reasoning
- Actions: one-tap approve, edit then approve, snooze (with date), dismiss
- iMessage sending via device-bridge service (consultant's personal number) — see [ADR-001](../../docs/architecture-decisions/adr001-imessage-integration-for-sales-automation.md) (In Progress)
- Twilio SMS as fallback for non-iMessage recipients or device-offline scenarios (fallback strategy TBD per ADR-001)
- Inbound message webhook: lead replies captured into conversation log, trigger AI analysis
- Manual takeover support: consultant replies via native Messages app are captured and logged
- HubSpot email integration: sends email on approval, logs as activity
- Priority sorting: hot+time-sensitive > new leads (speed-to-lead) > warm overdue > nurture on schedule
- Basic nurture: AI generates next-step recommendations per lead stage and queues drafts on schedule
- Conversation log: all sent/received messages visible on lead profile (including manually-sent messages)
- Original message preserved when edited (for future learning)

**Out of Scope:**
- Batch approval for nurture messages (post-MVP)
- AI voice/tone learning from edits (data logged but not trained on in MVP)
- Inbound message handling/parsing (post-MVP)
- Escalation logic for complex replies (post-MVP)
- Auto-approval of any message type

## Key Deliverables

1. **AI message drafting** — Claude API function that generates contextual SMS/email drafts per lead
2. **Action queue view** — Mobile-first, priority-sorted, swipe/tap interactions
3. **Approve/edit/snooze/dismiss flow** — One-tap approve sends immediately; edit opens inline editor
4. **Twilio SMS sending** — Sends on approval, handles delivery status
5. **HubSpot email sending** — Sends on approval, logs as timeline activity
6. **Nurture scheduling** — AI determines next touchpoint timing per lead stage, queues draft at appropriate time
7. **Conversation log** — Chronological message history on lead profile

## Breakdown into Stories/Tasks

> Child issues will be created via `/create_plan`. Indicative breakdown:

- [ ] Implement AI message drafting function (context-aware by stage/gaps/timing)
- [ ] Create tRPC `messages` router (queue CRUD, status transitions)
- [ ] Build action queue view (priority-sorted, mobile-first)
- [ ] Implement approve action (triggers send via correct channel)
- [ ] Implement edit-and-approve flow (inline editor, preserves original)
- [ ] Implement snooze action (with date picker) and dismiss
- [ ] Integrate iMessage device-bridge service for text sending on approval (ADR-001)
- [ ] Integrate Twilio SMS as fallback (scope TBD per ADR-001)
- [ ] Build inbound message webhook handler (capture replies + manual sends)
- [ ] Integrate HubSpot email sending on approval + activity logging
- [ ] Build conversation log on lead profile page (automated + manual messages)
- [ ] Implement nurture scheduling logic (next-step timing by stage)
- [ ] Create tRPC `nurture` router (sequence management)

## Dependencies

- **Epic 2 complete:** Leads exist with scores, stages, and qualification data
- **ADR-001 accepted:** iMessage integration approach finalised — device-bridge service selected, API validated, Australian number support confirmed
- iMessage device-bridge service provisioned on consultant's iPhone, API keys set
- Twilio account provisioned as SMS fallback (scope TBD per ADR-001)
- HubSpot email sending permissions configured
- Claude API integration working (from Epic 2)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| iMessage device-bridge service unreliable or shuts down | Medium | Retain Twilio SMS as fallback; consultant can always send manually from Messages app |
| Apple flags consultant's iMessage for spam | Low | Pilot volume (~20-50 leads) is well below empirical 50/day threshold; personal conversational style reduces spam signals |
| Consultant's iPhone goes offline | Medium | Queue holds messages until device reconnects; Twilio fallback for time-sensitive items (TBD per ADR-001) |
| AI drafts require heavy editing | Medium | Iterate on prompts with consultant feedback; log edits for future tuning |
| Message queue overwhelming if too many nurture items | Medium | Priority sorting ensures hot/urgent items surface first; nurture items are low priority |
| Manual replies not captured by webhook | Medium | Validate during setup that device-bridge service captures outbound messages sent natively |

## Success Criteria

- [ ] Opening the app shows priority-sorted action queue as the default view
- [ ] Each queue item displays lead context, drafted message, and AI reasoning
- [ ] One-tap approve sends iMessage from consultant's personal number via device-bridge service
- [ ] Fallback to Twilio SMS when iMessage unavailable (scope per ADR-001)
- [ ] One-tap approve sends email via HubSpot (logged as activity)
- [ ] Inbound replies captured via webhook and visible in conversation log
- [ ] Consultant's manual replies (sent from native Messages app) captured and logged
- [ ] Edit flow preserves original draft alongside edited version
- [ ] Snooze removes item from queue until specified date
- [ ] Conversation log shows full message history on lead profile
- [ ] Nurture sequences generate appropriate drafts on schedule (unqualified: 3-4 touches / 2 weeks, nurture: 1-2 / month, warm: weekly)

## References

- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (HITL Message Queue, Nurture Sequences sections)
- [ADR-001: iMessage Integration for Sales Automation](../../docs/architecture-decisions/adr001-imessage-integration-for-sales-automation.md) (In Progress)
- Nurture cadence by stage defined in design doc
- Priority order defined in design doc
