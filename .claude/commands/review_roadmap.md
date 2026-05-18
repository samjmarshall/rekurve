---
description: Review and prioritize GitHub Project issues for PMF alignment
model: opus
effort: max
---

# Roadmap Review

Use and follow the roadmap-review skill exactly as written.

## Pre-fetch GitHub Project Data

Before starting the collaborative review, fetch the current project state:

1. **List project items with all fields:**
```bash
gh project item-list 2 --owner samjmarshall --format json --limit 100
```

2. **Get project field definitions:**
```bash
gh project field-list 2 --owner samjmarshall --format json
```

3. **List all issues with milestones:**
```bash
gh issue list --repo samjmarshall/www --state all --json number,title,state,milestone,labels --limit 100
```

## Context to Read

- `thoughts/docs/sales/pilot-program.md` - Current pilot strategy
- `thoughts/docs/business/Rekurve MVP Business Case Validation.md` - Business case
- Recent designs in `thoughts/designs/` - Past decisions

## Then Begin Collaborative Review

Follow the roadmap-review skill's question flow to understand:
- Current reality and progress
- Blockers and constraints
- Available capacity
- Time off or scheduling constraints
- Warm leads or active prospects

Then categorize issues and propose specific changes.

## Output

Write the final approved roadmap prioritization to:
`thoughts/roadmap/YYYY-MM-DD-roadmap-prioritization.md`

STOP after writing - do not implement changes automatically.
