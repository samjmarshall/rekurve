# Roadmap Prioritization - December 2025

> **Date:** 2025-12-10
> **Status:** Approved
> **Scope:** Review issues with milestones but no iteration/dates

---

## Context

### Discovery Summary

| Factor | Status |
|--------|--------|
| Capacity | 5-10 hours/week |
| Time off | Dec 20 - Jan 4 (confirmed) |
| Locksmith pilot | On track for Dec 15-19 |
| Metrics framework (#32) | Not started, no blockers |
| Unscheduled issues | Can wait — focus on core path |

### Filter Applied

Reviewed only issues that:
- ARE assigned to a milestone
- Do NOT have an iteration or start/end date set

11 issues matched this filter.

---

## Approved Changes

### Move to Post-PMF: Scaling (4 issues)

These M0 issues don't directly support getting the locksmith pilot live:

| # | Title | Current Milestone | Rationale |
|---|-------|-------------------|-----------|
| 13 | Create Warm Contact List (100 People) | M0: Pilot Validation | Lead gen — already have a lead |
| 24 | Update LinkedIn profile with AI Agent positioning | M0: Pilot Validation | Lead gen — premature |
| 34 | Research AI sales automation competitors | M0: Pilot Validation | Research — doesn't help current pilot |
| 35 | Define post-pilot conversion strategy | M0: Pilot Validation | Post-pilot — by definition comes later |

**Action:**
- Change milestone to "Post-PMF: Scaling"
- Clear Priority
- Clear Iteration
- Clear Start/End dates

### Keep in M0 Unscheduled (4 issues)

| # | Title | Why Keep |
|---|-------|----------|
| 14 | Validate use cases through Release Pilots | Tracking issue — ongoing |
| 33 | Identify and qualify second pilot candidate | Scheduled for Jan per Dec 1 plan |
| 37 | Fix: form_step_completed not firing for step 4 | Bug — fix when time allows |
| 44 | Fix BookingForm back button click timeout | Bug — fix when time allows |

**Action:** No changes — keep in M0, unscheduled

### Keep in Other Milestones Unscheduled (3 issues)

| # | Title | Milestone | Rationale |
|---|-------|-----------|-----------|
| 15 | Set Up Essential Business Tools Stack | M4: Sales Infrastructure | Only what's needed for pilot |
| 18 | Research and Purchase Business Insurance | M1: Business Foundation | Needed before paid work |
| 19 | Open Business Bank Account | M1: Business Foundation | Needed before paid work |

**Action:** No changes — keep in current milestones, unscheduled

---

## Confirmed Active Schedule (Dec 10-19)

| # | Title | Priority | Iteration | Start | End |
|---|-------|----------|-----------|-------|-----|
| 32 | Define pilot success metrics framework | P1 | Week 3: Metrics | Dec 10 | Dec 14 |
| 29 | Conduct first discovery conversation | P1 | Week 4: Discovery | Dec 15 | Dec 19 |
| 31 | Document locksmith discovery findings | P1 | Week 4: Discovery | Dec 15 | Dec 19 |

**Dec 20 - Jan 4:** Time off (no work scheduled)

---

## Implementation Checklist

### Move to Post-PMF: Scaling

```bash
# Issue #13
gh issue edit 13 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
gh project item-edit --project-id <project-id> --id <item-id> --field-id <priority-field-id> --clear
gh project item-edit --project-id <project-id> --id <item-id> --field-id <iteration-field-id> --clear

# Issue #24
gh issue edit 24 --repo samjmarshall/www --milestone "Post-PMF: Scaling"

# Issue #34
gh issue edit 34 --repo samjmarshall/www --milestone "Post-PMF: Scaling"

# Issue #35
gh issue edit 35 --repo samjmarshall/www --milestone "Post-PMF: Scaling"
```

### Update Active Issue Schedule

Issues #29, #31, #32 already have iterations and dates set from Dec 1 plan — verify they're current.

---

## Success Criteria

By Dec 19:
- [ ] Pilot success metrics documented (#32)
- [ ] Discovery conversation completed (#29)
- [ ] Findings documented (#31)

By end of January 2026:
- [ ] One live pilot with locksmith
- [ ] Real data on what works
- [ ] Foundation for case study

---

## References

- Previous prioritization: `thoughts/designs/2025-12-01-roadmap-prioritization-for-pmf.md`
- Pilot program: `docs/sales/pilot-program.md`
- PMF framework: roadmap-review skill
