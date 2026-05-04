---
name: ticket-writer
description: Single entry point for turning a design, plan, PRD, or in-chat spec into either a single GitHub Issue or a parent epic with child issues. Use when the user wants to create, review, or improve any ticket destined for a coding agent or another developer to pick up. Covers atomic issues, bug reports, technical tasks, spikes, and epic breakdowns using tracer-bullet vertical slices. Output is AFK-ready by default — written so a coding agent days later can produce the right work without the original chat context.
---

# Ticket Writer Skill

Single entry point for ticket creation. Two shapes of work:

1. **Atomic issue** — one user story, bug, technical task, or spike. Use the workflow in this file.
2. **Epic + child issues** — a design / plan / PRD broken into independently-grabbable vertical slices. Use the workflow in **[references/epic-breakdown.md](references/epic-breakdown.md)**.

Every ticket body must be **AFK-ready** by default — durable enough that a coding agent picking it up days later, with no access to the original chat context, can produce the right work. The principles are in **[references/agent-brief.md](references/agent-brief.md)** and they apply to atomic issues and epic children alike.

Guide experienced engineers through writing these tickets via a skeptical, thorough, iterative collaborative process.

## Core Philosophy

**Tickets are communication artifacts** that eliminate wasted development time. Well-written tickets reduce clarification questions by 70% and improve first-time-right rates from 60% to 85%. Answer the fundamental questions: **Who, What, Why, How, When, Where** before any code is written.

**Be skeptical and thorough**: Challenge vague requirements, identify missing information, push for concrete examples. A 10-minute investment in ticket clarity saves hours of development confusion.

Use writing-clearly-and-concisely skill if available

---

## Interactive Workflow

When users request help with tickets, follow this collaborative process:

### 1. Assess Ticket Type and Context

Ask clarifying questions:
- **Type**: User story, bug, technical task, epic/project, or spike?
- **Destination**: GitHub Issue or local file (`thoughts/tickets/...`)?
- **State**: Starting from scratch, improving existing, or reviewing?
- **Audience**: Who will implement this?
- **Purpose**: What problem is being solved?

### 2. Guide Information Gathering

Walk through essential components systematically. **Challenge ambiguity actively**:

**For ALL tickets:**
- **Title**: Action-oriented, specific, scannable (not vague like "Dashboard updates")
- **Why**: Business context, user impact, problem being solved
- **What**: Clear definition of "done" with testable criteria
- **How**: Resources, context, technical guidance (not prescriptive implementation)
- **Dependencies**: Blockers, related tickets, prerequisite work
- **Effort**: Estimated number of days required for an skilled engineer to complete work

**For User Stories:**
- Story format: "As a [persona], I want [goal] so that [benefit]"
- User perspective and concrete benefit
- NOT just technical work disguised as user stories

**For Bugs:**
- Impact level and affected user count
- Detailed reproduction steps (chronological, numbered)
- Expected vs. actual behavior
- Environment details (device, OS, browser, version)
- Visual evidence (screenshots, videos)

**For Epics/Projects:**
- High-level goal and business value
- Scope boundaries (in/out of scope)
- Success metrics
- Breakdown into smaller deliverables
- **Management Effort Estimate**: Hours over duration (days/weeks) of development work
- **Development Effort Estimate**: Total developer days required

### 3. Challenge Red Flags

Actively identify and push back on:

**Vague language:**
- "Make it work properly" → What specific behavior defines "works"?
- "Improve performance" → What's the target metric?
- "User-friendly interface" → What specific usability criteria?

**Missing context:**
- Who is affected? How many users?
- What's the business impact?
- Why now vs. later?

**Size issues:**
- Can this be completed in 1-2 days? If not, break it down.
- Is this too small (<30 minutes)? Combine with related work.

**Untestable criteria:**
- How will QA know it's done?
- What are the pass/fail conditions?
- Are success criteria measurable?

### 4. Iterative Refinement

Present draft tickets and explicitly ask:
- "Is criterion X specific enough, or should we add detail?"
- "The acceptance criteria seem testable, but criterion 3 might be ambiguous-should we break it down?"
- "I notice we haven't specified [edge case]-should we add that?"

Continue refining until passing the **"Ready for Development" test**: A developer unfamiliar with the context could complete it without asking clarifying questions.

### 5. Apply the AFK-agent body principles, then offer a template

Every ticket body — atomic issue or epic child — must satisfy the principles in **[references/agent-brief.md](references/agent-brief.md)**:

- **Durability over precision** — describe interfaces and behaviour, not file paths or line numbers (those go stale).
- **Behavioural, not procedural** — say *what* the system should do, let the agent decide *how*.
- **Complete, testable acceptance criteria** — each one binary pass/fail, mechanically verifiable.
- **Explicit Out-of-Scope section** — defensive contract that stops gold-plating.

Then, based on ticket type, offer the relevant per-type template:

- **User stories**: See [references/story-template.md](references/story-template.md)
- **Bugs**: See [references/bug-template.md](references/bug-template.md)
- **Technical tasks**: See [references/task-template.md](references/task-template.md)
- **Epics/Projects**: See [references/epic-template.md](references/epic-template.md) — and follow the breakdown workflow in [references/epic-breakdown.md](references/epic-breakdown.md) for the children.
- **Spikes**: See [references/spike-template.md](references/spike-template.md)

---

## Acceptance Criteria Best Practices

Acceptance criteria are THE MOST IMPORTANT part of any ticket. Push for clarity.

### Work-Readiness Tag (HITL vs AFK)

Every ticket should carry one of two tags in its body, right under the title:

- **AFK** (Away From Keyboard) - a Claude Code agent can implement and merge this without human interaction. All decisions are resolved; acceptance criteria are testable; scope is clear.
- **HITL** (Human In The Loop) - requires human judgment during implementation: architectural decision, design review, UX trade-off, or security call.

Prefer AFK where possible. If a ticket is HITL, note *why* in one line (e.g. "HITL - needs design review before shipping", "HITL - schema trade-off needs product input").

For GitHub, this goes in the issue body, not as a label. Format:

    **Work-readiness:** AFK

    or

    **Work-readiness:** HITL - <reason>

When breaking an epic down, mark each child ticket. A well-decomposed epic is mostly AFK with a few HITL tickets gating the rest.

### Characteristics of Good Acceptance Criteria

**Testable** (binary pass/fail):
- ✅ "User receives email within 2 minutes"
- ❌ "Email is sent quickly"

**Specific** (no ambiguity):
- ✅ "Password must be minimum 8 characters with 1 uppercase, 1 number, 1 special character"
- ❌ "Password must be secure"

**Measurable** (quantifiable when possible):
- ✅ "Page loads in <2 seconds on 3G connection"
- ❌ "Page loads fast"

**Complete** (covers all scenarios):
- Include: happy path, error cases, edge cases, platform variations

**Independent** (each criterion stands alone):
- Can test each criterion separately
- Order doesn't matter

### Challenge Weak Criteria

If you see these, push back:
- "Feature works properly" → What specific behavior defines "works"?  
- "Users are happy with it" → What measurable user behavior?  
- "No bugs" → What's the definition of acceptable quality?  
- "Looks good" → What are the specific visual requirements?  
- "Performs well" → What's the performance target?

### Format Options

**Checklist** (most common):
```
- [ ] User can click "Forgot Password" on login page
- [ ] Entering email triggers reset within 2 minutes
- [ ] Reset email contains unique, expiring link (24hr)
- [ ] User can set new password meeting complexity rules
```

**Given/When/Then** (BDD style):
```
Given I am a registered user who forgot my password
When I click "Forgot Password" and enter my email
Then I should receive a reset email within 2 minutes
```

---

## Work Breakdown Strategy

### The "1-2 Day Rule"

**Ideal ticket size**: Can be completed in 1-2 days by one developer (including implementation, testing, code review, fixes).

**If >2 days**: Break it down into a parent epic + tracer-bullet child slices. Use the workflow in **[references/epic-breakdown.md](references/epic-breakdown.md)** — it covers vertical-slice rules, the quiz-the-user loop, dependency-ordered publishing, and parent/child wiring via `gh`.

### Tracer-bullet vertical slices (summary)

A child slice cuts through every relevant layer end-to-end (schema + API + UI + tests + docs as applicable). Not a horizontal layer cake.

| Bad (horizontal by layer) | Good (vertical by behaviour) |
|---|---|
| Issue 1: Build all schema | Issue 1: Password reset path (schema + API + UI + test) |
| Issue 2: Build all APIs | Issue 2: Password change path (schema + API + UI + test) |
| Issue 3: Build all UIs | Issue 3: Password complexity rules (validation + UI hint + test) |
| → Nothing shippable until all complete | → Each issue shippable on its own |

A completed slice is demoable or verifiable on its own. Prefer many thin slices over few thick ones. Each slice gets its own `**Work-readiness:** AFK / HITL — <reason>` tag.

---

## System-Specific Guidance

### GitHub Issues

**Philosophy**: Issues are the foundation of GitHub project management-lightweight, markdown-based, and deeply integrated with code.

**Key fields**: Title, Body (markdown), Labels, Assignees, Projects, Milestones, Linked PRs

**Hierarchy**: Issues (atomic) → Projects (kanban boards) → Milestones (releases/goals)

**Linking & References**:
- Reference issues with `#123` syntax
- Cross-repo: `owner/repo#123`
- Link PRs: "Closes #123", "Fixes #456", "Resolves #789" in PR description
- Task lists: `- [ ] Task item` for sub-tasks

**Best practices**:
- Leverage labels for categorization (bug, enhancement, documentation, etc.)
- Pin important issues for visibility
- Use Projects for kanban workflow
- Convert discussions to issues when actionable
- Use milestones for version/sprint grouping

**Markdown Features**:
- Task lists for acceptance criteria: `- [ ] Criterion`
- Code blocks with syntax highlighting
- Alerts: `> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`
- Collapsible sections: `<details><summary>...</summary></details>`
- Tables for structured data
- Mermaid diagrams for technical documentation

#### Parent/Child & Dependency Linking

**On epic breakdowns, linking is part of creation.** Once the breakdown plan is approved, create issues and wire relationships in the same turn. Don't ask about linking separately.

**Parent/child (sub-issues)** - REST API:

```bash
# Fetch the REST numeric id (not the GraphQL node_id):
CHILD_ID=$(gh api /repos/OWNER/REPO/issues/<CHILD_NUM> --jq .id)

# Link - -F for integer, not -f:
gh api -X POST /repos/OWNER/REPO/issues/<PARENT_NUM>/sub_issues \
  -F "sub_issue_id=$CHILD_ID"
```

Gotchas:
- `sub_issue_id` must be an integer - `-F`, not `-f`. Strings get `422 "not of type integer"`.
- Use the REST numeric `.id`, not the GraphQL `node_id`.
- Shows as sub-issue progress on the parent (e.g. "3/10").

**Blocked-by / blocks** - no native typed field on classic issues. Use body-text sections; they render as cross-references and surface in Projects views:

```markdown
## Blocked by
- #<N> - <short reason>

## Blocks
- #<N> - <short reason>
```

Bake these into the body **at creation time**. Create issues **in dependency order** so each body can reference numbers above it.

**Sequence** (one turn, no mid-flow prompts):

1. Create the first child (no blocked-by refs).
2. Capture its number. Remaining children will be `N+1 … N+k` barring concurrent creates.
3. Draft remaining bodies with `#N` refs baked in.
4. Create them sequentially.
5. Link every child as a sub-issue of the parent.
6. Add every child to the project, capture the item id.
7. Set project fields via one aliased GraphQL mutation per item.

Stop to confirm only if the plan changes - never for mechanics.

#### GitHub Projects Integration

When issues are added to a GitHub Project, set these fields:

| Field | Description | Values |
|-------|-------------|--------|
| **Priority** | Urgency/importance | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) |
| **Estimate** | Days of effort | Number (e.g., 0.5, 1, 2, 3, 5) |
| **Size** | T-shirt sizing | XS (<2hrs), S (half-day), M (1-2 days), L (3-5 days), XL (1+ week) |
| **Iteration** | Sprint/cycle | Current iteration name or "Backlog" |
| **Start date** | When work begins | YYYY-MM-DD format |
| **End date** | Target completion | YYYY-MM-DD format |

**Setting fields via CLI:**
```bash
# Add issue to project
gh project item-add <PROJECT_NUMBER> --owner <OWNER> --url <ISSUE_URL>

# Update project item fields (get item ID first)
gh project item-list <PROJECT_NUMBER> --owner <OWNER> --format json

# Use gh api for field updates
gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(...) }'
```

**Best practices for GitHub Projects:**
- Set Priority and Size during ticket creation
- Assign Iteration during sprint planning
- Update Start date when work begins
- Estimate in days, not hours (more realistic)
- Size correlates with Estimate: XS=0.25, S=0.5, M=1-2, L=3-5, XL=5+

#### Related Tickets

### File

**Save tickets to:** `thoughts/tickets/YYYY-MM-DD-<feature-name>.md`
**Save epics to:** `thoughts/epics/YYYY-MM-DD-<project-epic-name>.md`
- Keep issues small (1-2 days)

#### Related Tickets

Add a related tickets section at the bottom of the file.

**For ALL tickets:** Link parent ticket if one exists

**For Epics/Projects:** Link all child tickets

---

## Definition of Ready Checklist

Before marking "Ready for Development," ensure:

**All tickets:**
- [ ] Title is clear, specific, action-oriented
- [ ] Type is appropriate
- [ ] Description explains WHY this work matters
- [ ] Acceptance criteria are testable and complete
- [ ] Priority is set appropriately
- [ ] Estimated by team
- [ ] Can be completed within one sprint
- [ ] No blocking dependencies (or documented)
- [ ] Team understands requirements (no unresolved questions)
- [ ] Work-readiness tag set (AFK or HITL with reason)

**User stories:**
- [ ] Story format complete
- [ ] User benefit is clear
- [ ] Design mockups attached (for UI work)

**Bugs:**
- [ ] Impact level assigned
- [ ] Reproduction steps detailed
- [ ] Expected vs. actual behavior stated
- [ ] Environment details included
- [ ] Screenshot/video attached
- [ ] Affected users quantified

**Technical tasks:**
- [ ] Technical approach outlined
- [ ] Success criteria measurable
- [ ] Testing plan included

---

## Quality Checks

Before finalizing:

**"New Developer Test"**: Could someone unfamiliar pick this up and complete it without questions?

**"QA Test"**: Could QA test using only acceptance criteria, without asking "what did you mean?"

**"Why Test"**: Is the answer to "why are we doing this?" in the ticket?

**"Scope Test"**: Can this be done in 1-2 days, or should it be broken down?

---

## Tips for Experienced Engineers

**Respect expertise**:
- Describe desired OUTCOME, not exact implementation
- Example: ✅ "Fetch user data on page load; update when user ID changes"
- Not: ❌ "Use React hooks with useEffect for data fetching"

**Highlight non-obvious details**:
- Hidden dependencies, tribal knowledge, "gotchas"
- Areas where previous attempts failed
- Performance requirements, security considerations, scale factors

**Technical precision**:
- Use correct terminology
- Be specific about versions, platforms, environments
- Include concrete metrics

---

## Common Anti-Patterns

Watch for and challenge:
- **Vague titles**: "Login issue" → "Fix login button unresponsive after autofill on Safari iOS 17"
- **Missing "why"**: Just describing what without business context
- **Implementation in stories**: "localStorage implemented" → "preferences persist across sessions"
- **Unmeasurable criteria**: "Make it work properly" → "Page loads in <2 seconds"
- **Tickets too large**: "Build authentication system" → Break into signup, login, email confirmation (each 1-2 days)
- **No visual evidence** (bugs): Text only → Screenshot with annotation or video
- **No reproduction steps** (bugs): "App crashes sometimes" → Detailed numbered steps
- **Assuming knowledge**: Using undefined acronyms → Define terms, link discussions

---

## Workflow Example

**User request**: "Help me write a ticket for adding dark mode to our app"

**Your response**:

"I'll help you create a comprehensive ticket for dark mode. Let me ask some clarifying questions first:

1. **Ticket type**: Is this a user story (customer-facing feature) or task (UI implementation)?

2. **Scope**: 
   - Entire app or specific pages?
   - Persist across sessions?
   - Manual toggle, system preference, or both?

3. **Context**:
   - Why now? User requests? Accessibility? Market standard?
   - How many users affected?
   - Design mockups or style guide available?

4. **Destination**: GitHub Issue or local file (`thoughts/tickets/...`)?

Once you answer these, I'll help you craft a detailed ticket with proper acceptance criteria, technical considerations, and all context your team needs."

This approach:
- Asks clarifying questions before diving in
- Identifies ambiguities early
- Demonstrates thoroughness
- Sets expectations for collaboration

---

## Creating Issues via `gh` CLI

Use the `gh` CLI for all GitHub operations. Common operations:

- Create: `gh issue create --title "…" --body "$(cat <<'EOF' … EOF)" --label "…"`
- Update: `gh issue edit <N> --body "…" --add-label "…"`
- Comment: `gh issue comment <N> --body "…"`
- Close: `gh issue close <N> --comment "…"`
- Search: `gh issue list --label "…" --state open --json number,title,labels`

After plan approval, create tickets, wire sub-issue relationships, add to the project, and set fields in one turn. Linking and field assignment are part of "create".

---

## Key Principles Summary

1. **Clarity over brevity**: Invest time upfront to save multiples later. Use writing-clearly-and-concisely skill if available.
2. **Testable acceptance criteria**: Binary pass/fail, no ambiguity
3. **Context is king**: Answer Who/What/Why/How/When/Where
4. **Right-sized work**: 1-2 days ideal; break down larger work
5. **Visual evidence**: Screenshots for UI, videos for bugs
6. **Be skeptical**: Challenge vague requirements, identify gaps
7. **Respect teammates**: Well-written tickets respect everyone's time
8. **Iterate**: First draft is rarely perfect; refine collaboratively
9. **Enforce standards**: Use Definition of Ready rigorously
