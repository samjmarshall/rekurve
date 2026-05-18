---
name: roadmap-review
description: Collaborative review and prioritization of GitHub Project issues for pre-PMF startups. Use when you need to reassess priorities, restructure milestones, or ensure work aligns with validation goals. Especially useful when capacity changes or strategy shifts.
skills: writing-clearly-and-concisely
---

# Roadmap Review & Prioritization

## Overview

Help founders review and restructure their GitHub Project to focus on what matters most for reaching product-market fit. Uses collaborative questioning to understand constraints, then proposes specific issue and milestone changes.

**When to use:**
- Feeling overwhelmed by too many priorities
- Capacity has changed (more or less time available)
- Strategy shift (e.g., moving from building to validating)
- Quarterly/monthly planning
- After completing a major milestone

## Pre-PMF Prioritization Framework

### The Core Principle

> "Pre-PMF, your single goal should be to make 10 customers very happy. Everything you prioritize should serve this goal."

### Six Prioritization Commandments

1. **Single Priority Focus**: Concentrate all resources on one goal
2. **Stones-First Planning**: Address major bets before minor improvements
3. **Ambitious Swings**: Pursue high-impact work, not incremental gains
4. **Shortened Deadlines**: Plan every 6 weeks instead of every quarter
5. **Just-in-Time Estimation**: Define work immediately before execution
6. **Consistent Debt Allocation**: Reserve 10-30% for maintenance

### What to Focus On Pre-PMF

- **Validation over building**: Learning > shipping features
- **Depth over breadth**: 3-5 customers who desperately need you
- **Pain points over feature requests**: Build for problems, not wishlists
- **Manual over automated**: Do things that don't scale first

### Common Pre-PMF Mistakes

| Mistake | Why It Hurts |
|---------|--------------|
| Scaling too early | Burns cash before validation |
| Too many priorities | Dilutes limited time |
| Building without customers | No feedback loop |
| Premature marketing/lead gen | You need 1 customer, not 100 |
| Infrastructure before validation | Optimizing the wrong thing |

### Signs You Should Deprioritize Something

- It assumes you have paying customers (you don't yet)
- It's about "scaling" or "efficiency" (premature)
- It's not directly helping your current pilot/customer
- You're building it "just in case" or "for later"
- A competitor doing it is not validation that you need it

## The Review Process

### Step 1: Gather Context

Fetch the current state of the GitHub Project:

```bash
# List all projects
gh project list --owner <owner> --format json

# Get project items with all fields
gh project item-list <project-number> --owner <owner> --format json --limit 100

# Get project field definitions
gh project field-list <project-number> --owner <owner> --format json

# List issues with milestones
gh issue list --repo <owner>/<repo> --state all --json number,title,state,milestone,labels --limit 100
```

Also read:
- `thoughts/docs/` - Non-technical project docs (strategy, messaging, pilot feedback)
- `thoughts/designs/` - Recent design decisions

### Step 2: Collaborative Discovery (One Question at a Time)

**Question 1: Current Reality**
> "What stage is your [current priority] at?"
> A) Haven't started
> B) In progress but early
> C) Actively building
> D) Live and getting data

**Question 2: Blockers**
> "What's blocking you from [the most important thing]?"
> A) Nothing - just hadn't prioritized it
> B) Need to finish [dependency] first
> C) Don't feel ready - need to build more
> D) Time/capacity constraints
> E) Something else

**Question 3: Capacity**
> "How many hours per week can you dedicate to this?"
> A) Less than 5 hours
> B) 5-10 hours
> C) 10-20 hours
> D) 20+ hours

**Question 4: Time Constraints**
> "Any upcoming time off or constraints I should know about?"
> (Open-ended - capture specific dates)

**Question 5: Warm Leads**
> "Do you have any warm leads or prospects ready to engage?"
> A) Yes, [details]
> B) Some possibilities but not confirmed
> C) No, need to find them

**Question 6: Validation of Approach**
> "Does focusing 100% on [recommended priority] feel right?"
> A) Yes
> B) Mostly, but [concern]
> C) I'm hesitant because [reason]
> D) I disagree because [reason]

### Step 3: Categorize Issues

Based on discovery, categorize every open issue:

**Category 1: Active Now**
- Directly supports current pilot/customer
- Can be done with current capacity
- Has clear timeline and deliverable

**Category 2: Blocked/Waiting**
- Depends on something else completing first
- Keep in backlog with dependency noted

**Category 3: Post-PMF (Deprioritize)**
- Assumes paying customers exist
- About scaling, efficiency, or marketing
- "Nice to have" but not validation-critical

**Category 4: Remove**
- No longer relevant to strategy
- Duplicate of another issue
- Solved by a different approach

### Step 4: Propose Changes

Present changes in sections, validating each:

**Section 1: Issues to Deprioritize**
List issues moving to Post-PMF backlog with:
- Issue number and title
- Current milestone
- Rationale (one line)

**Section 2: Issues to Keep Active**
List issues remaining active with:
- Issue number and title
- Proposed timing (week/dates)
- Priority (P1/P2)
- Dependencies

**Section 3: Milestone Cleanup**
- Which milestones are active vs paused
- Any milestones to remove

**Section 4: Weekly Focus**
- Simple table showing week-by-week focus
- Accounting for capacity constraints and time off

### Step 5: Confirm and Document

After user approves each section, write complete roadmap prioritization to:
`thoughts/roadmap/YYYY-MM-DD-roadmap-prioritization.md`

Include:
- Context and constraints discovered
- Strategic rationale
- Complete list of changes
- Implementation checklist
- Success criteria

## Issue Field Updates

When deprioritizing issues, update these fields:

**Move to Post-PMF:**
- Milestone: "Post-PMF: Scaling"
- Priority: (clear/remove)
- Iteration: (clear/remove)
- Start Date: (clear/remove)
- End Date: (clear/remove)

**Keep in current milestone but deprioritize:**
- Priority: (clear/remove)
- Iteration: (clear/remove)
- Start Date: (clear/remove)
- End Date: (clear/remove)
- Keep milestone unchanged

**Update active issues:**
- Priority: P1 or P2
- Iteration: Appropriate week
- Start Date: Specific date
- End Date: Specific date

## Key Principles

- **One question at a time**: Don't overwhelm with multiple questions
- **Multiple choice preferred**: Easier to answer than open-ended
- **Challenge assumptions**: "Do you really need X before Y?"
- **Protect focus**: Fewer priorities = faster progress
- **Respect constraints**: Work within real capacity, not ideal
- **Validate incrementally**: Check each section before continuing

## After Documentation

**STOP after writing the design document. Do NOT:**
- Make any GitHub changes automatically
- Create implementation plans
- Execute any commands

The user will use `/create_plan` or direct commands to implement the changes.

## References

- [OpenView: Pre-PMF Product Management](https://openviewpartners.com/blog/the-pre-pmf-guide-to-product-management/)
- [First Round: How Superhuman Found PMF](https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/)
- [Paul Graham: Do Things That Don't Scale](https://paulgraham.com/ds.html)
- [Sequoia: Arc PMF Framework](https://sequoiacap.com/article/pmf-framework/)
- [First Round: Levels of PMF](https://www.firstround.com/levels)
