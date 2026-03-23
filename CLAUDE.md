# CLAUDE.md

The role of this file is to describe common mistakes and confusion points that agents might encounter when they work in this project. If you encounter something in this project that surprises you, please alert the developer working with you and indicate that this is the case in the CLAUDE.md file to help prevent future agents from having the same issue.

---

## Quick Start: Current Project State

**Status**: Pre-PMF validation phase. Running free Release Pilot to validate use cases.

**Project Tracking**: [GitHub Project](https://github.com/users/samjmarshall/projects/2) - all tasks, roadmap, and progress tracked via GitHub Issues.

**GitHub Repository**: `samjmarshall/www` - use this repo for all issue creation and management.

---

## AI Agent Working Guidelines

### Development Workflow

**Before Starting**:
1. Read relevant strategic docs (see Common Tasks Reference table)
2. Understand the "why" before implementing the "what"
3. Check if similar patterns exist in the codebase using the **@agent-codebase-analyzer**

**During Development**:
1. Follow the frontend-design skill exactly (no generic Tailwind defaults)
2. Use agent positioning language consistently
3. Include specific metrics and results
4. Test accessibility (keyboard nav, screen readers, color contrast)
5. Verify performance (Lighthouse 90+ targets)

**After Completing**:
1. Run `yarn check` (lint + typecheck)
2. Test in browser (multiple screen sizes)
3. Verify all links and references work
4. Check motion respects `prefers-reduced-motion`

### Design Review Workflow

**When to use**: After implementing any UI/UX changes in `src/`.

When you've made visual changes (components, styles, layouts), follow this verification process:

#### Automated Pre-Check (Before Design Review)

Run these checks first:
```bash
yarn check            # Lint + TypeCheck
```

Fix any errors before proceeding to design review.

#### Design Review Process

1. **Start dev server**:
   ```bash
   yarn dev
   ```

2. **Navigate to your changes** in the browser (`http://localhost:3000`)

3. **Self-review checklist** (quick sanity check):
   - [ ] Functionality works as intended
   - [ ] No console errors in browser
   - [ ] Basic responsive behavior looks correct (resize browser)
   - [ ] Colors match brand guidelines (not Tailwind defaults)
   - [ ] Typography match brand guidelines (not Inter/Roboto)

4. **Run design review**:
   Use **@agent-design-reviewer** to comprehensively review the changes, and reply back to the user with the design and review report. Your final reply must contain the markdown report and nothing else.

5. **Address feedback**:
   - Fix any [Blocker] or [High-Priority] issues immediately
   - Consider [Medium-Priority] improvements
   - Decide on Nits based on time/impact

6. **Iterate if needed**:
   - Make adjustments based on feedback
   - Use **@agent-design-reviewer** again for significant changes
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

#### When to Skip Design Review

Skip the automated review for:
- Non-visual changes (backend logic, APIs, config)
- Documentation-only changes
- Trivial fixes (typos, whitespace)
- Changes outside `src/`

But still manually verify:
- Changes work as expected
- No regressions in related features
- Code follows existing patterns

### Browser Automation & Playwright

**When to use**: Any task requiring browser interaction, navigation, clicking, form filling, or UI validation via Playwright MCP.

**CRITICAL: Always delegate to @agent-ui-navigator**

Do NOT use Playwright MCP tools directly (`mcp__playwright__*`). Instead, spawn the **@agent-ui-navigator** agent with a detailed prompt describing:
1. The URL to navigate to
2. The specific actions to perform (clicks, types, scrolls)
3. What to observe and report back

**Why**: The ui-navigator agent isolates verbose browser context from the main conversation thread, keeping the interaction clean and focused.

**Example prompt for ui-navigator**:
```
Navigate to http://localhost:3000
1. Take a snapshot of the page
2. Find and click the "Book a call" button in the header
3. Wait 2 seconds for any animations
4. Report what happened after the click
```

**When NOT to skip ui-navigator**:
- Even for "simple" navigation tasks, use the agent
- Even for single click operations, use the agent
- The overhead is minimal and consistency matters
