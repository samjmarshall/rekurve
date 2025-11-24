# Epic/Project Template

Use this template for large initiatives, features spanning multiple tickets, and multi-week work.

**Jira: Epic | Linear: Project**

## Template Structure

```markdown
Title: [High-level goal or deliverable]
Example: Launch self-service password management system

## Goal
[What are we building and why does it matter?]

Example:
Build a complete self-service password management system allowing users to reset, change, and manage their account passwords without support intervention, reducing support burden and improving user experience.

## Business Context
**Problem**: [What problem are we solving?]
**Opportunity**: [What value does this create?]
**Success metrics**: [How will we measure success?]
**Stakeholders**: [Who cares about this?]

Example:
Problem: Password reset requests account for 25% of support tickets (~800/month)
Opportunity: Reduce support costs by ~$15K/month; improve user satisfaction (NPS+8 expected)
Success metrics: 
  - 80% of password resets completed without support
  - Average reset time <5 minutes
  - Support ticket reduction of 70% within first quarter
Stakeholders: Support team, product team, finance, end users

## Scope

**In Scope**:
- Self-service password reset via email
- Password change from user settings
- Password complexity enforcement
- Security logging and monitoring
- Mobile and desktop support

**Out of Scope** (explicitly):
- Social login integration (separate initiative)
- Multi-factor authentication (planned for Q2)
- Admin password reset tools (separate ticket)

## Key Deliverables
[Break down into major components]

1. Password reset flow (email-based)
2. Password change UI in settings
3. Security and audit logging
4. Email templates and notifications
5. Documentation and user guides

## Timeline
**Start date**: [Date]
**Target completion**: [Date]
**Milestones**:
- M1: Design and database schema complete (Week 1)
- M2: Backend API implemented (Week 2-3)
- M3: Frontend UI complete (Week 4)
- M4: Testing and QA (Week 5)
- M5: Production deployment (Week 6)

## Breakdown into Stories/Tasks
[Reference to child tickets]

**Backend work**:
- ENG-101: Design password management database schema
- ENG-102: Implement password reset API endpoints
- ENG-103: Build password change API logic
- ENG-104: Add security logging

**Frontend work**:
- ENG-105: Build password reset UI flow
- ENG-106: Build password change settings page
- ENG-107: Add client-side validation

**Supporting work**:
- ENG-108: Create email templates
- ENG-109: Write user documentation
- ENG-110: QA testing plan

## Dependencies
- Design team: Mockups needed by [date]
- Security team: Review required before production
- Email service: Sending capability confirmed

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Email deliverability issues | High | Test with multiple providers; implement retry logic |
| Security vulnerabilities | Critical | Security review before launch; rate limiting |
| User adoption lower than expected | Medium | User testing before launch; clear communications |

## Success Criteria
[How we know this epic is truly complete]
- All child tickets completed and deployed
- Success metrics instrumented and tracking
- Documentation published
- Support team trained
- Post-launch monitoring shows <1% error rate

## GitHub Issues Formatting

When using GitHub Issues, format as:
```yaml
---
labels: [epic, feature, authentication]
assignees: [team-lead-username]
milestone: Q1 2025
project: Password Management Initiative
---
```

**Markdown tips:**
- Use task lists for breakdown: `- [ ] ENG-101: Design password management schema`
- Link child issues: `- [ ] #101 Design password schema`
- Use tables for risks and dependencies
- Create milestone for tracking child issues
- Reference in child issues: `Part of epic #100`
- Use mermaid diagrams for architecture overview
- Add project board for visual tracking
- Use GitHub Projects (beta) for timeline visualization
```

## Guidelines

**Title best practices:**
- High-level goal or deliverable (not implementation detail)
- Should make sense to non-technical stakeholders
- Bad: "Refactor authentication microservice"
- Good: "Launch self-service password management system"

**Goal section:**
- Single paragraph explaining the big picture
- Should answer "what and why" at high level
- Understandable by anyone in the company

**Business context:**
- Connect to company goals or user pain points
- Include quantifiable metrics when possible
- Identify key stakeholders
- Explain opportunity cost if not done

**Scope boundaries:**
- MUST include "Out of Scope" section
- Be explicit about what's NOT included
- Prevents scope creep
- Helps with prioritization decisions

**Timeline:**
- Be realistic but optimistic
- Include buffer for unknowns
- Break into clear milestones
- Milestones should be independently verifiable

**Breakdown:**
- Epic should be broken into 5-15 stories
- Each story should be 1-2 days
- Group logically (frontend, backend, supporting)
- Reference child ticket IDs when available

**Dependencies:**
- External dependencies (design, legal, security)
- Technical dependencies (infrastructure, APIs)
- Team dependencies (waiting on other teams)

**Risks:**
- Identify 3-5 key risks
- Assess impact (High/Medium/Low)
- Provide mitigation strategy for each

**Success criteria:**
- Beyond just "tickets done"
- Include metrics being tracked
- Include rollout criteria
- Include training/documentation

**When to create an epic:**
- Work spans 2+ weeks
- Involves multiple developers
- Cuts across multiple components
- Has business-level visibility
- Needs coordination across teams

**When NOT to create an epic:**
- Single developer, single sprint
- Pure technical refactoring with no coordination
- Bug fixes (even complex ones)
- Small feature additions

**Red flags to avoid:**
- Vague goal without clear outcome
- No scope boundaries
- Unrealistic timeline
- No breakdown into smaller work
- Missing dependencies
- No success criteria beyond "done"
