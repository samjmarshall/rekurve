# User Story Template

Use this template for user-facing features, new functionality, and customer-requested capabilities.

## Template Structure

```markdown
Title: [Verb] [specific feature] for [user type]
Example: Implement password reset functionality for registered users

## Story
As a [persona with specific context],
I want to [specific goal],
So that [concrete benefit or outcome].

Example:
As a registered user who has forgotten my password,
I want to reset it via email,
So that I can regain account access without contacting support.

## Context
**Current state**: [What exists today]
**Future state**: [What will exist after this work]
**Why now**: [Business driver, user pain point, strategic importance]
**Impact**: [Number of users, revenue impact, or strategic value]

Example:
Current state: Users must contact support to reset passwords (avg. 24hr response time)
Future state: Self-service password reset via email within minutes
Why now: Support tickets for password resets increased 40% this quarter
Impact: Affects ~200 users/month; reduces support burden by estimated 20 hours/month

## Acceptance Criteria
Use testable, binary pass/fail statements:

- [ ] User can access "Forgot Password" link from login page
- [ ] Entering registered email triggers reset email within 2 minutes
- [ ] Reset email contains unique, secure token (expires in 24 hours)
- [ ] Token allows one-time password change
- [ ] New password must meet complexity requirements:
  - Minimum 8 characters
  - At least one uppercase, one number, one special character
- [ ] User receives confirmation email after successful reset
- [ ] Failed attempts are logged for security monitoring
- [ ] Password reset works on mobile and desktop

**Format options:**
1. **Checklist** (most common): Clear, trackable, intuitive
2. **Given/When/Then** (BDD style): Given [context], When [action], Then [outcome]

## Resources
- Design mockups: [Figma link]
- Related documentation: [Confluence/Notion link]
- Similar implementation: [Ticket reference]
- Technical specs: [API docs, database schemas]
- User research: [Customer feedback, analytics]

## Technical Notes (Optional)
[Only if guidance is needed—avoid prescribing implementation]
- Suggested approach or architecture
- Security considerations
- Performance requirements
- Known constraints or limitations
- Integration points

Example:
- Use bcrypt for password hashing (cost factor: 12)
- Store reset tokens in Redis with TTL
- Rate limit: 3 reset attempts per hour per email
- Log all attempts to security_audit table

## Analytics/Tracking
[Events to log, metrics to measure]
- Track: password_reset_requested, password_reset_completed, password_reset_failed
- Success metric: >80% completion rate from email to reset

## Definition of Done
[Team-specific checklist—keep implicit items out of AC]
- Code reviewed and approved
- Unit tests written (>80% coverage)
- Integration tests passing
- Documented in user guide
- Deployed to staging
- QA sign-off
- Product owner approval

## GitHub Issues Formatting

When using GitHub Issues, format as:
```yaml
---
labels: [enhancement, frontend, user-experience]
assignees: [developer-username]
milestone: v1.2.0
project: Authentication Improvements
---
```

**Markdown tips:**
- Use task lists for acceptance criteria: `- [ ] User can access "Forgot Password" link`
- Reference related issues: `Related to #123`, `Blocks #456`
- Add alerts for important notes: `> [!NOTE] This requires backend API changes`
- Use code blocks for technical details
- Include mermaid diagrams for user flows if helpful
```

## Guidelines

**Title best practices:**
- Start with action verb (Implement, Add, Enable, Build)
- Be specific about what and for whom
- Keep it scannable (7-10 words max)

**Story format:**
- Always include persona, goal, and benefit
- Make persona specific with context (not just "user")
- Benefit should explain WHY, not repeat the goal
- Bad: "As a user, I want localStorage so I can save data"
- Good: "As a returning user, I want my preferences to persist so I don't reconfigure them each visit"

**Acceptance criteria:**
- 3-8 criteria is typical (more means break down the story)
- Each should be independently testable
- Include error cases and edge cases
- Specify platform variations if relevant
- Use concrete numbers and thresholds
- Avoid vague terms like "properly," "quickly," "secure"

**When to skip sections:**
- **Technical Notes**: Only needed if team needs guidance
- **Analytics**: Only if tracking is required
- **Resources**: Only if assets/docs exist

**Red flags to avoid:**
- Technical implementation disguised as user story
- Missing user benefit
- Vague acceptance criteria
- Story too large (>2 days of work)
- Multiple user personas in one story
