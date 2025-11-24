# Spike/Research Template

Use this template for exploratory work, technical investigation, proof-of-concept, and research tasks.

## Template Structure

```markdown
Title: [Investigate/Research/Explore/Evaluate] [topic] [purpose]
Example: Research authentication approaches for third-party API integration

## Research Question
[What are we trying to learn or decide?]

Example:
What authentication approach should we use for the Stripe API integration: OAuth 2.0, API keys, or JWT tokens? Evaluate based on security, implementation complexity, and maintenance burden.

## Context
[Why do we need this research?]

Example:
We need to integrate with Stripe for payment processing. Before building, we need to understand authentication options and select the approach that best balances security with implementation speed.

## Goals/Questions to Answer
- [ ] What authentication methods does Stripe support?
- [ ] What are security implications of each approach?
- [ ] What's the implementation complexity (time estimate)?
- [ ] What's the ongoing maintenance burden?
- [ ] What are best practices in industry?
- [ ] What do similar companies use?

## Deliverable
[What's the output of this spike?]

Example:
A written recommendation document with:
- Comparison table of authentication options
- Pros/cons of each approach
- Security considerations
- Implementation effort estimate
- Recommended approach with rationale

## Time Box
[Maximum time to spend—spikes should be time-limited]

Example: 4 hours maximum

## Acceptance Criteria
- [ ] All research questions answered
- [ ] Recommendation document written
- [ ] Approach vetted with security team
- [ ] Follow-up implementation tickets created
- [ ] Decision documented in Confluence

## Resources
- Stripe authentication docs: [link]
- Security team contact: [name]
- Similar integrations: [references]

## Follow-up Actions
[What happens after the spike?]
- Create implementation tickets based on recommendation
- Schedule review with team
- Get security approval if needed

## GitHub Issues Formatting

When using GitHub Issues, format as:
```yaml
---
labels: [spike, research, authentication]
assignees: [researcher-username]
milestone: Q1 Planning
project: Technical Research
---
```

**Markdown tips:**
- Use task lists for research questions: `- [ ] What authentication methods does Stripe support?`
- Link to findings in comments or use `<details>` for inline documentation
- Reference related spikes: `Related to spike #89`
- Use tables for comparison matrices
- Add code blocks for POC examples
- Link to external docs and resources
- Tag with `research` or `spike` label for easy filtering
- Close issue when spike is complete and link to follow-up tickets
```

## Guidelines

**Title best practices:**
- Start with research verb (Investigate, Research, Explore, Evaluate, Spike)
- Be specific about what you're researching
- Include the decision or outcome being sought
- Bad: "Look into authentication"
- Good: "Research authentication approaches for third-party API integration"

**Research question:**
- Frame as a clear, answerable question
- Include evaluation criteria
- Should drive the investigation
- Not too broad, not too narrow

**Time box:**
- ALWAYS include a time limit
- Typical spikes: 2-8 hours
- Larger research: 1-3 days maximum
- If uncertain after time box, create new spike or escalate decision

**Deliverable:**
- Must be concrete and tangible
- Usually: written document, comparison table, or POC code
- Should enable a decision
- Should create follow-up tickets

**Acceptance criteria:**
- Questions answered (not necessarily resolved)
- Deliverable created
- Decision documented
- Next steps identified

**Common spike types:**
1. **Technical feasibility**: "Can we do X with technology Y?"
2. **Approach comparison**: "Should we use approach A or B?"
3. **Tool evaluation**: "Which tool best fits our needs?"
4. **Performance investigation**: "Why is X slow?"
5. **Architecture spike**: "How should we structure this system?"
6. **Third-party evaluation**: "Which vendor should we use?"
7. **Bug investigation**: "What's causing this intermittent issue?"

**When to create a spike:**
- High uncertainty about approach
- Multiple valid options to evaluate
- Need to validate technical feasibility
- Requirements are unclear and need exploration
- Estimating main work is difficult without investigation

**When NOT to create a spike:**
- Requirements are clear
- Approach is obvious
- You're just delaying work
- Used as excuse for poor planning

**Red flags to avoid:**
- No time box (open-ended research)
- Vague deliverable ("figure it out")
- No clear research question
- No follow-up actions
- Too many questions (break into multiple spikes)
- Spike as a way to avoid making a decision

**After the spike:**
- ALWAYS create follow-up tickets
- Document the decision made
- Share findings with team
- Archive research in knowledge base
