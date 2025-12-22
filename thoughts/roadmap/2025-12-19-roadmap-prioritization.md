# Roadmap Prioritization - December 19, 2025

> **Date:** 2025-12-19
> **Status:** Approved
> **Scope:** Add AI agent research tickets (#47-51) to roadmap, schedule January work

---

## Context

### Discovery Summary

| Factor | Status |
|--------|--------|
| **Locksmith pilot stage** | Discovery not started |
| **Blocker** | None - just hadn't prioritized |
| **Capacity** | 5-10 hours/week |
| **Time off** | Dec 20 - Jan 4 |
| **Locksmith lead** | Warm, ready for January |
| **Build approach** | Parallel - learn while building, discovery locked Week 1 |

### What Happened Today

Extensive research on AI agent implementation patterns:
- Reviewed awesome-llm-apps collection (50+ examples)
- Deep-dived AI Email GTM Agent (lead follow-up patterns)
- Deep-dived AI Recruitment Agent (meeting booking patterns)
- Reviewed Vercel AI SDK cookbook (10 relevant recipes)
- **Decision**: Use Vercel AI SDK (TypeScript) over Agno (Python)

Created 5 new tickets:
- #47: Investigation (complete)
- #48: AI Email GTM patterns (superseded)
- #49: Appointment scheduling (superseded)
- #50: Adopt Vercel AI SDK (primary implementation)
- #51: Advanced AI SDK patterns (P2 future)

---

## Approved Changes

### Close as Completed Research (3 issues)

| # | Title | Reason |
|---|-------|--------|
| 47 | Investigate awesome-llm-apps patterns | Research complete, framework decision made (Vercel AI SDK) |
| 48 | Adapt AI Email GTM Agent patterns | Superseded by #50, patterns documented |
| 49 | Implement appointment scheduling system | Superseded by #50, patterns documented |

**Close reason:** "Completed - research captured in #50 (Vercel AI SDK adoption)"

### Assign to M0: Pilot Validation (1 issue)

| # | Title | Rationale |
|---|-------|-----------|
| 50 | Adopt Vercel AI SDK as agent framework | Primary implementation ticket for locksmith pilot |

### Assign to Post-PMF: Scaling (1 issue)

| # | Title | Rationale |
|---|-------|-----------|
| 51 | Advanced AI SDK patterns (Generative UI, SQL Agent, Slack) | P2 enhancements after core agent works |

---

## January 2025 Schedule

### Week-by-Week Focus

| Week | Dates | Focus | Hours | Issues |
|------|-------|-------|-------|--------|
| - | Dec 20 - Jan 4 | **Time Off** | 0 | - |
| **1** | Jan 6-10 | Discovery + Start Building | 5-10 | #29, #31, #50 (Phase 1) |
| **2** | Jan 13-17 | Build Core Agent | 5-10 | #50 (Phase 2), #30 |
| **3** | Jan 20-24 | Build + Test with Pilot | 5-10 | #50 (Phase 2), #30 |
| **4** | Jan 27-31 | Live Pilot + Iterate | 5-10 | #30, #32 |

### Key Milestones

| Date | Milestone | Validation |
|------|-----------|------------|
| Jan 10 | Discovery complete | Findings documented in #31 |
| Jan 17 | Agent foundation working | Phase 1 of #50 complete |
| Jan 24 | Basic agent for locksmith | Can demo to pilot |
| Jan 31 | Live pilot running | Measuring success metrics (#32) |

### Issue Schedule Detail

| # | Title | Priority | Week | Start | End |
|---|-------|----------|------|-------|-----|
| 29 | Conduct discovery conversation | P1 | Week 1 | Jan 6 | Jan 10 |
| 31 | Document locksmith findings | P1 | Week 1 | Jan 6 | Jan 10 |
| 50 | Adopt Vercel AI SDK (Phase 1) | P1 | Week 1-2 | Jan 6 | Jan 17 |
| 50 | Adopt Vercel AI SDK (Phase 2) | P1 | Week 2-3 | Jan 13 | Jan 24 |
| 30 | Build AI sales agent for pilot | P1 | Week 2-4 | Jan 13 | Jan 31 |
| 32 | Define pilot success metrics | P2 | Week 4 | Jan 27 | Jan 31 |

### Keep Unscheduled in M0

| # | Title | Rationale |
|---|-------|-----------|
| 14 | Validate use cases through Release Pilots | Tracking issue - ongoing |
| 33 | Identify second pilot candidate | After locksmith validated |
| 37 | Fix: form_step_completed not firing | Bug - fix when time allows |
| 44 | Fix BookingForm back button timeout | Bug - fix when time allows |
| 3 | Implement AI Agent Positioning | When building materials |

---

## Implementation Checklist

### Close Issues

```bash
# Close #47 - research complete
gh issue close 47 --repo samjmarshall/www --comment "Completed - research captured in #50 (Vercel AI SDK adoption). Framework decision: Vercel AI SDK over Agno."

# Close #48 - superseded
gh issue close 48 --repo samjmarshall/www --comment "Closed - superseded by #50. Patterns from AI Email GTM Agent documented and translated to TypeScript/Zod."

# Close #49 - superseded
gh issue close 49 --repo samjmarshall/www --comment "Closed - superseded by #50. Scheduling patterns captured in MeetingBookerAgent design."
```

### Update Milestones

```bash
# #50 - Add to M0: Pilot Validation
gh issue edit 50 --repo samjmarshall/www --milestone "M0: Pilot Validation"

# #51 - Add to Post-PMF: Scaling
gh issue edit 51 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
```

### Update Active Issue Dates (when project scope available)

Issues #29, #30, #31, #32, #50 need iteration and date fields set in GitHub Project.

---

## Success Criteria

### By Jan 10 (End of Week 1)
- [ ] Discovery conversation with locksmith completed (#29)
- [ ] Findings and use cases documented (#31)
- [ ] Vercel AI SDK foundation set up (#50 Phase 1)

### By Jan 24 (End of Week 3)
- [ ] Core agents implemented (research, qualify, quote, follow-up)
- [ ] Basic demo-able for locksmith pilot
- [ ] Human-in-the-loop pattern working

### By Jan 31 (End of Week 4)
- [ ] Live pilot with locksmith (#30)
- [ ] Success metrics being measured (#32)
- [ ] First real data on what works

### By End of February
- [ ] Pilot complete with results
- [ ] Case study material gathered
- [ ] Decision on second pilot candidate

---

## Strategic Notes

### Why Discovery Before Heavy Building

The pilot program doc emphasizes:
> "We're pre-product-market-fit. We need to validate that AI sales agents solve real problems."

Building in parallel is fine, but discovery must happen Week 1 to:
1. Validate assumptions about locksmith use case
2. Learn actual pain points (may differ from assumptions)
3. Shape what we build based on real needs

### Why Vercel AI SDK

Decision factors from research:
- TypeScript-native (matches Next.js 15 stack)
- Zod schemas (type-safe structured output)
- Native streaming (first-class `streamText`, `streamObject`)
- Human-in-the-loop pattern built-in (`addToolOutput()`)
- MCP integration recipe available
- Familiar DX for Next.js developer

### Key Patterns to Implement

From AI SDK cookbook research:
1. **Human-in-the-Loop** - Quote/email approval before send
2. **Multi-Step Tools** - Lead research → qualify → quote pipeline
3. **Generate Object** - Structured leads, quotes with Zod
4. **Stream Object** - Progressive UI updates
5. **MCP Tools** - Calendar, email integrations (later)

---

## References

- Previous prioritization: `thoughts/roadmap/2025-12-10-roadmap-prioritization.md`
- Pilot program: `docs/sales/pilot-program.md`
- Business case: `docs/business/Rekurve MVP Business Case Validation.md`
- AI SDK research: Issues #47, #48, #49, #50, #51
- awesome-llm-apps: `docs/awesome-llm-apps/`
