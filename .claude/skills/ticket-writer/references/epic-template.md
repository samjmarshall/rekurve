# Epic/Project Template

> Body principles (durability, behaviour-not-files, AC, out-of-scope) are in **[agent-brief.md](agent-brief.md)** — every ticket body must satisfy them. This template gives the type-specific structure on top. For breaking the epic into vertical-slice children, follow **[epic-breakdown.md](epic-breakdown.md)**.

Use this template for large initiatives, features spanning multiple tickets, and multi-week work.

## Template Structure

```markdown
Title: [High-level goal or deliverable]
Example: Launch self-service password management system

## Goal
[What are we building and why does it matter?]

## Business Context
**Problem**: [What problem are we solving?]
**Opportunity**: [What value does this create?]
**Success metrics**: [How will we measure success?]
**Stakeholders**: [Who cares about this?]

## Scope

**In Scope**:
- Self-service password reset via email.
- Password change from user settings.
- Password complexity enforcement.
- Security logging and monitoring.
- Mobile and desktop support.

**Out of Scope** (explicitly):
- Social login integration (separate initiative).
- Multi-factor authentication (planned for Q2).
- Admin password reset tools (separate ticket).

## Key Deliverables
[Major vertical-slice components — each becomes a child issue]

1. Password reset flow (email-based).
2. Password change UI in settings.
3. Security and audit logging.
4. Email templates and notifications.
5. Documentation and user guides.

## Timeline (optional)
**Start date**: [Date]
**Target completion**: [Date]
**Milestones**: only if the epic spans more than ~2 weeks; otherwise omit and let the child issues drive cadence.

## Breakdown into child issues
[Wired via the sub-issue API per `epic-breakdown.md`]

## Dependencies
- Design team: Mockups needed by [date].
- Security team: Review required before production.
- Email service: Sending capability confirmed.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Email deliverability issues | High | Test with multiple providers; implement retry logic |
| Security vulnerabilities | Critical | Security review before launch; rate limiting |
| User adoption lower than expected | Medium | User testing before launch; clear communications |
```

## Guidelines

**Title style (this type):** High-level goal or deliverable phrasing — Launch, Migrate, Build, Ship. Should make sense to non-technical stakeholders.
Example: "Launch self-service password management system".

**When to use this template:** any work that breaches the 1–2 day rule from `SKILL.md` § Tracer-bullet vertical slices. Each child is a vertical slice; see `epic-breakdown.md`.
