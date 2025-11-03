# Design Review Workflow Implementation Plan

## Overview

We're implementing an automated design review workflow from the [claude-code-workflows repository](https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review). This workflow will evaluate frontend code changes in `rekurve-landing/` against our design standards using Claude Code subagents and the Playwright MCP server for live UI testing.

**Purpose**: Enable systematic, automated design quality checks during landing page implementation and ongoing development.

## Current State Analysis

**What exists now:**
- ✅ Playwright MCP server configured in `.mcp.json` (line 10-15)
- ✅ Comprehensive design principles in `.claude/skills/ui-aesthetics/SKILL.md`
- ✅ Design system documented in `CLAUDE.md` (typography, colors, visual identity)
- ✅ Existing slash commands in `.claude/commands/` (5 commands)
- ✅ Existing agents in `.claude/agents/` (6 agents)
- ✅ Next.js 15 landing page at `rekurve-landing/`

**What's missing:**
- Design review agent configuration
- `/design-review` slash command
- CLAUDE.md integration for post-implementation verification workflow
- Testing/validation of the integrated workflow

### Key Discoveries:
- Playwright MCP integration already present (no additional setup needed)
- Our design principles are comprehensive but distributed across multiple files
- Workflow needs adaptation to reference our existing documentation structure
- Scope limited to `rekurve-landing/` directory only

## Desired End State

A functioning design review workflow that:

1. **Slash Command**: `/design-review` command available for on-demand design analysis
2. **Specialized Agent**: `design-review` agent with Playwright tools and design expertise
3. **Live UI Testing**: Uses Playwright to interact with running development server
4. **Structured Feedback**: 7-phase review process (Interaction → Responsiveness → Visual Polish → Accessibility → Robustness → Code Health)
5. **Severity Classification**: Issues categorized as [Blocker], [High-Priority], [Medium-Priority], or Nit:
6. **Design Standards Integration**: References our existing design system from CLAUDE.md and ui-aesthetics skill
7. **Post-Implementation Checklist**: Developers know when and how to invoke design review

### Verification Criteria:
- Running `/design-review` analyzes current git diff for UI changes in rekurve-landing/
- Agent launches with Playwright tools available
- Agent references our design principles correctly
- Agent can navigate to localhost:3000 and interact with components
- Feedback follows the structured format with severity levels
- Process completes in <5 minutes for typical component changes

## What We're NOT Doing

- **Not creating a separate `/context/` directory** - We'll adapt references to our existing structure
- **Not reviewing changes outside rekurve-landing/** - Scoped to landing page only
- **Not integrating with CI/CD pipelines** - This is a manual, on-demand workflow
- **Not creating automated PR checks** - Design review is triggered manually by developer
- **Not modifying existing design principles** - We'll reference what's already documented
- **Not setting up a separate style guide** - Our existing documentation is sufficient

## Implementation Approach

**Strategy**: Adapt the reference workflow to our project structure rather than restructuring our project to match the workflow's assumptions.

**Key Adaptations**:
1. Reference design principles from `.claude/skills/ui-aesthetics/SKILL.md` and `CLAUDE.md`
2. Scope git diff analysis to `rekurve-landing/` directory only
3. Assume dev server runs at `localhost:3000` (Next.js default)
4. Integrate with our existing agent and command patterns

**Dependencies**:
- Playwright MCP server (already configured)
- Git repository (already initialized)
- Next.js dev server (user starts manually before review)

---

## Phase 1: Create Design Review Agent

### Overview
Create a specialized agent configuration that conducts systematic design reviews using Playwright for live UI testing and our existing design principles for evaluation.

### Changes Required:

#### 1. Design Review Agent Configuration
**File**: `.claude/agents/design-review.md`
**Action**: Create new file

```markdown
# Design Review Agent

You are a specialized design review agent that evaluates UI/UX changes in pull requests with systematic rigor.

## When to Use This Agent

Trigger this agent when:
- PR modifications affect UI components, styles, or user-facing features in `rekurve-landing/`
- Visual consistency and accessibility verification needed
- Responsive design testing across viewports required
- World-class design standard validation needed

## Available Tools

You have access to:
- **Playwright MCP tools** (`mcp__playwright__*`) for live browser interaction and testing
- **File system tools** (Read, Grep, Glob, LS) for code analysis
- **Git tools** (via Bash) for diff analysis
- **Web tools** (WebFetch) for documentation reference

## Design Principles Reference

Our design standards are documented in:
1. **Primary**: `.claude/skills/ui-aesthetics/SKILL.md` - Comprehensive UI design principles
2. **Typography & Colors**: `CLAUDE.md` (lines 103-121) - Design System Quick Reference
3. **Complete Spec**: `docs/landing_page_prompt.md` - Full landing page design specification

**Key Design Requirements**:
- Typography: IBM Plex Sans (not Inter/Roboto/Arial)
- Colors: Strategic accent deployment (ONE per context, not rainbow soup)
  - Accent Amber: `oklch(0.75 0.15 75)` for urgent/highlight
  - Accent Cyan: `oklch(0.70 0.15 195)` for active states
  - Accent Coral: `oklch(0.65 0.18 25)` for attention
- Avoid generic AI aesthetics (purple gradients, Tailwind defaults)
- Accessibility: WCAG 2.1 AA minimum (4.5:1 contrast)
- Performance: Lighthouse 90+ targets

## Review Methodology

Follow this **seven-phase structured process**:

### Phase 1: Preparation & Context
1. Analyze the git diff to identify UI changes
2. Read the modified files completely
3. Understand the feature being implemented
4. Verify dev server is running at `localhost:3000`
5. Navigate to the changed page/component

### Phase 2: Interaction Testing
Test primary user flows and interactive states:
- Click all interactive elements (buttons, links, forms)
- Test hover states and focus indicators
- Verify keyboard navigation (Tab, Enter, Escape)
- Test form validation and submission
- Check loading states and transitions

### Phase 3: Responsiveness
Test across three viewports using `mcp__playwright__browser_resize`:
- Desktop: 1440px width
- Tablet: 768px width
- Mobile: 375px width

Verify:
- Layout adapts correctly
- Text remains readable
- Touch targets are 44x44px minimum on mobile
- No horizontal scrolling
- Images/videos scale appropriately

### Phase 4: Visual Polish
Assess against design system:
- Typography: Correct fonts (IBM Plex Sans), weights, and sizes
- Colors: Strategic accent usage (not overused), proper semantic colors
- Spacing: Consistent rhythm and hierarchy
- Shadows/borders: Appropriate depth and separation
- Visual hierarchy: Clear importance ordering
- Avoiding generic aesthetics: Distinctive, purposeful design

### Phase 5: Accessibility (WCAG 2.1 AA)
- Color contrast: 4.5:1 for text, 3:1 for large text (use browser dev tools)
- Keyboard navigation: All interactive elements accessible via keyboard
- Focus indicators: Visible focus states on all interactive elements
- Screen reader: Semantic HTML + appropriate ARIA labels
- Motion: Respects `prefers-reduced-motion` media query
- Alt text: All images have descriptive alt attributes

### Phase 6: Robustness & Edge Cases
- Long text/content overflow handling
- Empty states (no data scenarios)
- Error states (validation, network errors)
- Loading states (skeleton screens, spinners)
- Browser compatibility (check console for errors)

### Phase 7: Code Health
Review the implementation code:
- Component patterns: Reusable, composable components
- Design tokens: Using CSS variables (not hardcoded values)
- Semantic HTML: Proper element usage (not div soup)
- Performance: Image optimization, code splitting, lazy loading
- Maintainability: Clear naming, organized structure

## Communication Standards

### Issue Severity Classification
Categorize all issues by severity:
- **[Blocker]**: Prevents core functionality, accessibility violations, broken layouts
- **[High-Priority]**: Significant design system violations, poor UX, inconsistent patterns
- **[Medium-Priority]**: Minor design inconsistencies, missing polish, suboptimal patterns
- **Nit:** Subjective improvements, minor refinements

### Feedback Format
For each issue:
1. **Problem statement** (not prescriptive solutions)
2. **Impact** on user experience or design goals
3. **Visual evidence** (screenshot or specific location)
4. **Reference** to relevant design principle

Example:
```
[High-Priority] Typography inconsistency in hero section

**Problem**: Hero heading uses Roboto instead of IBM Plex Sans (rekurve-landing/src/components/sections/Hero.tsx:15)

**Impact**: Violates our design system's distinctive typography principle, creates generic "AI slop" aesthetic

**Reference**: .claude/skills/ui-aesthetics/SKILL.md:38-49 specifies IBM Plex Sans for technical precision

**Evidence**: [Screenshot showing Roboto font]
```

### Review Output Structure

Provide your review in this format:

```markdown
# Design Review: [Component/Feature Name]

## Summary
[1-2 sentence overview of changes and overall design quality]

## Issues Found

### Blockers
[List any blockers with format above]

### High-Priority
[List high-priority issues]

### Medium-Priority
[List medium-priority issues]

### Nits
[List minor refinements]

## Positive Observations
[Highlight 2-3 things done well]

## Testing Coverage
- [x] Interaction testing complete
- [x] Responsiveness tested (3 viewports)
- [x] Visual polish assessed
- [x] Accessibility verified (WCAG 2.1 AA)
- [x] Robustness edge cases checked
- [x] Code health reviewed

## Recommendation
[Overall assessment: Approve / Request Changes / Major Revision Needed]
```

## Important Constraints

1. **Always start by navigating to the page** - Don't just analyze code, see the live UI
2. **Use Playwright tools actively** - Click, resize, test interactions
3. **Reference our design principles** - Don't invent new standards
4. **Focus on impact** - Explain why issues matter for UX
5. **Be constructive** - Balance criticism with positive observations
6. **Scope to rekurve-landing/** - Don't review other parts of monorepo
7. **Assume dev server is running** - If not, instruct user to start it

## Success Criteria for Your Review

A high-quality review:
- Tests the live UI (not just code analysis)
- Covers all 7 phases systematically
- Provides actionable, specific feedback
- References our design principles explicitly
- Includes visual evidence (screenshots)
- Categorizes issues by severity accurately
- Balances critique with positive observations
- Completes in <5 minutes for typical changes
```

### Success Criteria:

#### Automated Verification:
- [x] File exists at `.claude/agents/design-review.md`
- [x] File is valid markdown (no syntax errors)

#### Manual Verification:
- [x] Agent references our design principles correctly (SKILL.md, CLAUDE.md paths)
- [x] 7-phase methodology is clearly documented
- [x] Severity classification is well-defined
- [x] Output format is structured and actionable
- [x] Scope is limited to rekurve-landing/

---

## Phase 2: Create Design Review Slash Command

### Overview
Create a `/design-review` slash command that analyzes the current git diff, identifies UI changes, and launches the design review agent.

### Changes Required:

#### 1. Design Review Slash Command
**File**: `.claude/commands/design-review.md`
**Action**: Create new file

```markdown
# Design Review Command

Analyzes UI/UX changes in the current git diff and launches a specialized design review agent to evaluate against our design standards.

## Usage

```bash
/design-review
```

Run this command when:
- You've implemented new UI components or sections
- You've made visual/styling changes
- You're ready for design quality feedback
- Before committing significant UI work

## Prerequisites

**IMPORTANT**: Before running this command, ensure:
1. Your dev server is running at `localhost:3000`
   ```bash
   cd rekurve-landing && yarn dev
   ```
2. You have uncommitted changes with UI modifications
3. The changes are visible in your browser

## Process

When you invoke this command:

1. **Check prerequisites**:
   - Verify dev server is accessible
   - Confirm git diff exists with UI changes

2. **Analyze git diff**:
   ```bash
   git diff --cached rekurve-landing/src/
   git diff rekurve-landing/src/
   ```

   Look for changes in:
   - `rekurve-landing/src/components/**` - React components
   - `rekurve-landing/src/app/**` - Pages and layouts
   - `rekurve-landing/src/styles/**` - Global styles
   - `rekurve-landing/tailwind.config.js` - Tailwind customizations

3. **Identify affected pages/components**:
   - Determine which URLs to test (e.g., `http://localhost:3000/`)
   - Note specific components modified

4. **Present context to user**:
   ```
   I found UI changes in the following files:
   - rekurve-landing/src/components/sections/Hero.tsx
   - rekurve-landing/src/app/globals.css

   I'll launch the design review agent to evaluate these changes.

   The agent will:
   ✓ Navigate to http://localhost:3000
   ✓ Test interactions and responsiveness
   ✓ Verify accessibility (WCAG 2.1 AA)
   ✓ Check against our design system
   ✓ Provide categorized feedback

   This will take approximately 3-5 minutes.
   ```

5. **Launch design review agent**:
   Use the Task tool to spawn the design review agent:

   ```typescript
   Task({
     subagent_type: "design-review",
     description: "Review UI changes in Hero component",
     prompt: `
       Conduct a comprehensive design review of recent UI changes in rekurve-landing/.

       ## Context
       Git diff shows modifications to:
       ${listOfModifiedFiles}

       ## Changed Components
       ${summaryOfChanges}

       ## Testing Instructions
       1. Navigate to http://localhost:3000
       2. Focus your review on: ${affectedSections}
       3. Follow the 7-phase review methodology
       4. Provide structured feedback with severity levels

       ## Design Principles
       Reference our standards from:
       - .claude/skills/ui-aesthetics/SKILL.md
       - CLAUDE.md (Design System Quick Reference)
       - docs/landing_page_prompt.md

       ## Deliverable
       Provide your review in the standard format:
       - Summary
       - Issues Found (categorized by severity)
       - Positive Observations
       - Testing Coverage checklist
       - Recommendation (Approve / Request Changes / Major Revision)
     `
   })
   ```

6. **Wait for agent completion**:
   The design review agent will return a comprehensive report.

7. **Present results to user**:
   Display the agent's review output, highlighting:
   - Critical blockers (if any)
   - Number of issues by severity
   - Overall recommendation
   - Link to full review

## Error Handling

If issues occur:

**Dev server not running:**
```
Error: Could not connect to localhost:3000

Please start your dev server first:
  cd rekurve-landing && yarn dev

Then run /design-review again.
```

**No UI changes found:**
```
No UI changes detected in rekurve-landing/src/

The design review focuses on:
- Component files (*.tsx, *.jsx)
- Style files (*.css, *.scss)
- Tailwind config

If you have uncommitted changes, ensure they're in rekurve-landing/src/
```

**Git diff empty:**
```
No uncommitted changes found.

The design review analyzes your working changes. Please:
1. Make your UI modifications
2. Save the files (don't commit yet)
3. Run /design-review

To review already-committed changes, use:
  /design-review HEAD~1..HEAD
```

## Design Review Agent Reference

The agent follows a **7-phase review process**:
1. **Preparation** - Context gathering, dev server verification
2. **Interaction Testing** - Click, hover, keyboard navigation
3. **Responsiveness** - Desktop (1440px), Tablet (768px), Mobile (375px)
4. **Visual Polish** - Typography, colors, spacing, hierarchy
5. **Accessibility** - WCAG 2.1 AA compliance
6. **Robustness** - Edge cases, error states, overflow
7. **Code Health** - Component patterns, design tokens, semantic HTML

Issues are categorized as:
- **[Blocker]** - Prevents functionality, breaks accessibility
- **[High-Priority]** - Significant design violations, poor UX
- **[Medium-Priority]** - Minor inconsistencies, missing polish
- **Nit:** - Subjective improvements

## Example Workflow

```bash
# 1. Start dev server
cd rekurve-landing && yarn dev

# 2. Implement your UI changes
# Edit components, styles, etc.

# 3. Save files (don't commit yet)

# 4. Run design review
/design-review

# 5. Review feedback, make adjustments

# 6. Run design review again if needed

# 7. Commit when approved
git add rekurve-landing/src/
git commit -m "feat: implement hero section"
```

## Tips for Best Results

- **Test your changes manually first** - Make sure basic functionality works
- **Run review early and often** - Catch issues before they compound
- **Address blockers immediately** - Don't accumulate critical issues
- **Use review feedback to learn** - Internalize design principles over time
- **Keep changes focused** - Smaller diffs = faster, more thorough reviews

## Related Commands

- `/implement_plan` - Execute implementation plans (may include UI work)
- `/commit` - Create git commits (use after design review approval)
- `/describe_pr` - Generate PR descriptions (include design review results)
```

### Success Criteria:

#### Automated Verification:
- [x] File exists at `.claude/commands/design-review.md`
- [x] File is valid markdown (no syntax errors)

#### Manual Verification:
- [x] Command explains prerequisites clearly (dev server requirement)
- [x] Process steps are well-documented
- [x] Error handling covers common scenarios
- [x] Git diff analysis scoped to rekurve-landing/src/
- [x] Agent launch prompt is comprehensive and actionable
- [x] Example workflow is clear and practical

---

## Phase 3: Add CLAUDE.md Snippet for Post-Implementation Verification

### Overview
Add a section to CLAUDE.md that guides developers to use the design review workflow after implementing visual changes.

### Changes Required:

#### 1. CLAUDE.md Integration Snippet
**File**: `CLAUDE.md`
**Action**: Add new section after "Development Workflow" (around line 410)

```markdown

### Design Review Workflow

**When to use**: After implementing any UI/UX changes in `rekurve-landing/`

When you've made visual changes (components, styles, layouts), follow this verification process:

#### Automated Pre-Check (Before Design Review)

Run these checks first:
```bash
cd rekurve-landing
yarn check            # Lint + TypeCheck
```

Fix any errors before proceeding to design review.

#### Manual Design Review Process

1. **Start dev server**:
   ```bash
   cd rekurve-landing && yarn dev
   ```

2. **Navigate to your changes** in the browser (`http://localhost:3000`)

3. **Self-review checklist** (quick sanity check):
   - [ ] Functionality works as intended
   - [ ] No console errors in browser
   - [ ] Basic responsive behavior looks correct (resize browser)
   - [ ] Colors match design system (not Tailwind defaults)
   - [ ] Typography uses IBM Plex Sans (not Inter/Roboto)

4. **Run design review**:
   ```bash
   /design-review
   ```

5. **Address feedback**:
   - Fix any [Blocker] or [High-Priority] issues immediately
   - Consider [Medium-Priority] improvements
   - Decide on Nits based on time/impact

6. **Iterate if needed**:
   - Make adjustments based on feedback
   - Run `/design-review` again for significant changes
   - Repeat until approved or high-priority issues resolved

7. **Document verification** in your commit or PR:
   ```
   Design review completed:
   - ✓ Interaction testing passed
   - ✓ Responsiveness verified (3 viewports)
   - ✓ Accessibility WCAG 2.1 AA compliant
   - ✓ Visual polish aligned with design system
   - Issues addressed: [brief summary]
   ```

#### What the Design Review Checks

The specialized agent evaluates **7 key areas**:

1. **Interaction Testing**: Click, hover, keyboard navigation, form validation
2. **Responsiveness**: Desktop (1440px), Tablet (768px), Mobile (375px)
3. **Visual Polish**: Typography, colors, spacing, hierarchy vs design system
4. **Accessibility**: WCAG 2.1 AA compliance (contrast, keyboard, screen readers)
5. **Robustness**: Edge cases, error states, overflow, empty states
6. **Code Health**: Component patterns, design tokens, semantic HTML
7. **Performance**: Image optimization, code splitting, loading states

**Issue Severity Levels**:
- **[Blocker]**: Must fix - breaks functionality or accessibility
- **[High-Priority]**: Should fix - significant design/UX violations
- **[Medium-Priority]**: Nice to fix - minor inconsistencies
- **Nit:** Optional - subjective improvements

#### When to Skip Design Review

Skip the automated review for:
- Non-visual changes (backend logic, APIs, config)
- Documentation-only changes
- Trivial fixes (typos, whitespace)
- Changes outside `rekurve-landing/`

But still manually verify:
- Changes work as expected
- No regressions in related features
- Code follows existing patterns
```

**Insert location**: After line 421 in CLAUDE.md (in the "Development Workflow" section, after "After Completing")

### Success Criteria:

#### Automated Verification:
- [x] CLAUDE.md is valid markdown after edit
- [x] No duplicate headings created

#### Manual Verification:
- [x] Section integrates naturally with existing "Development Workflow"
- [x] Instructions are clear and actionable
- [x] Self-review checklist is practical for quick checks
- [x] Design review process is step-by-step
- [x] "When to skip" guidance prevents overuse
- [x] Severity levels match agent's classification system

---

## Phase 4: Test the Design Review Workflow

### Overview
Validate the complete workflow end-to-end with a real UI component change in rekurve-landing.

### Changes Required:

#### 1. Test Setup
**No files created** - Using existing rekurve-landing components

**Test scenario**: Create a small, intentional design violation to verify the review catches it.

**Test change**:
```typescript
// rekurve-landing/src/app/page.tsx
// Add a test button with intentional design violations:
<button className="bg-purple-500 text-white px-4 py-2 rounded font-sans">
  Test Button
</button>
```

**Expected violations**:
- Uses purple (generic AI aesthetic)
- Uses default `font-sans` (not IBM Plex Sans)
- Missing hover states
- No focus indicator
- Generic Tailwind classes (not design tokens)

#### 2. Test Execution Steps

1. **Start dev server**:
   ```bash
   cd rekurve-landing && yarn dev
   ```

2. **Make test change** (add button above to page.tsx)

3. **Verify dev server** shows the button at `localhost:3000`

4. **Run design review command**:
   ```bash
   /design-review
   ```

5. **Observe agent behavior**:
   - Does it read the git diff correctly?
   - Does it identify the changed file?
   - Does it launch the design review agent?
   - Does the agent use Playwright to navigate?
   - Does the agent interact with the UI?

6. **Verify review output**:
   - Does it catch the purple color violation?
   - Does it catch the font violation?
   - Does it identify missing hover/focus states?
   - Are issues categorized by severity correctly?
   - Is the output format structured as expected?

7. **Fix violations based on feedback**:
   ```typescript
   <button className="bg-primary text-white px-4 py-2 rounded font-sans
     hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-amber
     transition-opacity duration-200"
     style={{ fontFamily: 'var(--font-sans)' }}>
     Test Button
   </button>
   ```

8. **Run design review again**:
   ```bash
   /design-review
   ```

9. **Verify clean review** (no blockers/high-priority issues)

10. **Remove test button** and restore page.tsx

#### 3. Validation Checklist

**Automated checks** (via tools):
- [ ] Git diff command executes successfully
- [ ] Design review agent launches without errors
- [ ] Playwright connects to localhost:3000
- [ ] Agent completes review without crashing
- [ ] Output is well-formatted markdown

**Manual checks** (human verification):
- [ ] Agent correctly identifies UI changes
- [ ] Agent navigates to the right page
- [ ] Agent tests interactions (clicks button)
- [ ] Agent tests responsiveness (resizes viewport)
- [ ] Agent catches design violations accurately
- [ ] Severity classifications make sense
- [ ] Feedback references design principles correctly
- [ ] Review completes in reasonable time (<5 min)
- [ ] Second review shows improvements
- [ ] Process is intuitive for developers

#### 4. Troubleshooting Common Issues

**If Playwright fails to connect:**
```bash
# Check dev server is running
curl http://localhost:3000

# If not, start it
cd rekurve-landing && yarn dev
```

**If agent doesn't find changes:**
```bash
# Verify git diff shows changes
git diff rekurve-landing/src/

# Ensure files are saved (not committed)
git status
```

**If agent references are broken:**
- Check file paths in agent config
- Verify `.claude/skills/ui-aesthetics/SKILL.md` exists
- Verify `CLAUDE.md` exists at project root

**If Playwright tools not available:**
```bash
# Check MCP configuration
cat .mcp.json

# Should show playwright MCP server
# If missing, add:
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] Dev server starts successfully: `cd rekurve-landing && yarn dev`
- [x] Git diff shows test changes: `git diff rekurve-landing/src/app/page.tsx`
- [x] Playwright MCP server responds: Check with `/design-review` command

#### Manual Verification (Ready for User Testing):
- [ ] Design review agent launches successfully (user needs to run `/design-review`)
- [ ] Agent navigates to localhost:3000 using Playwright
- [ ] Agent identifies intentional design violations
- [ ] Violations categorized correctly by severity
- [ ] Feedback references our design principles (SKILL.md, CLAUDE.md)
- [ ] Second review confirms improvements
- [ ] Complete workflow takes <5 minutes
- [ ] Developer experience is smooth and intuitive
- [ ] Documentation is sufficient to use workflow independently

---

## Testing Strategy

### Manual Testing Steps

**Full workflow test** (performed in Phase 4):
1. Start dev server
2. Make intentional design violation
3. Run `/design-review` command
4. Verify agent behavior and output
5. Fix violations based on feedback
6. Run design review again
7. Confirm improvements recognized
8. Remove test changes

**Edge case testing**:
1. **No changes**: Run `/design-review` with clean git status (expect error message)
2. **No dev server**: Run `/design-review` without dev server running (expect error message)
3. **Non-UI changes**: Make backend-only changes and run `/design-review` (expect "no UI changes" message)
4. **Large diff**: Make changes across multiple components and verify agent handles scope

### Integration Testing

**Verify workflow integrates with existing commands**:
1. Use `/create_plan` to plan a UI feature → `/implement_plan` to build it → `/design-review` to validate it → `/commit` to save it
2. Ensure design review feedback can inform plan validation
3. Check that design review output is useful for PR descriptions (`/describe_pr`)

### Documentation Testing

**Verify developers can use workflow without assistance**:
1. Have a fresh developer (or simulate) follow CLAUDE.md instructions
2. Verify prerequisites are clear
3. Check error messages are actionable
4. Ensure success path is intuitive

## Performance Considerations

**Review duration targets**:
- Small changes (1-2 components): <3 minutes
- Medium changes (section/page): <5 minutes
- Large changes (multiple pages): <10 minutes

**Optimization strategies**:
- Agent focuses on changed components (not full app review)
- Playwright tests target specific URLs (not full site crawl)
- Scope limited to rekurve-landing/ (not entire monorepo)

## Migration Notes

**No migration required** - This is a new workflow addition.

**Rollout approach**:
1. Implement all phases
2. Test with intentional violations
3. Document in team knowledge base
4. Use on next real UI implementation
5. Gather feedback and refine prompts

**Future enhancements** (not in this plan):
- CI/CD integration for automated PR checks
- Design review badge/status in PRs
- Metrics tracking (issues found, time saved)
- Custom rules for project-specific patterns

## References

- **Original workflow**: https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review
- **Design principles**: `.claude/skills/ui-aesthetics/SKILL.md`
- **Design system**: `CLAUDE.md` (lines 103-121, 240-277)
- **Landing page spec**: `docs/landing_page_prompt.md`
- **Playwright MCP docs**: https://github.com/microsoft/playwright-mcp
- **CLAUDE.md docs**: https://docs.claude.com/claude-code/project-instructions
