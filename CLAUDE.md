# Rekurve AI Sales Agents

Autonomous AI sales agents that handle lead research, qualification, follow-up, meeting booking and quote generation.

---

## Quick Start: Current Project State

**Active Project**: Next.js 15 landing page

**Tech Stack**:
- Next.js 15.2.3 (App Router) + React 19 + TypeScript
- Tailwind CSS 4.0.15
- Yarn 3.8.7 (PnP mode)
- Environment validation: @t3-oss/env-nextjs

**Key Commands**:
```bash
yarn dev              # Development server (Turbo mode)
yarn check            # Lint + TypeCheck
yarn build            # Production build
yarn test:e2e         # Run E2E tests
yarn check:e2e        # Run E2E tests (CI mode)
```

**Status**: Pre-PMF validation phase. Running free Release Pilot to validate use cases.

**Project Tracking**: [GitHub Project](https://github.com/users/samjmarshall/projects/2) - all tasks, roadmap, and progress tracked via GitHub Issues.

**GitHub Repository**: `samjmarshall/www` - use this repo for all issue creation and management.

---

## Repository Structure

```
www/                                    # Next.js 15 landing page application
├── src/
│   ├── app/                            # App Router (Next.js 15)
│   │   ├── layout.tsx                  # Root layout with fonts & providers
│   │   ├── page.tsx                    # Landing page
│   │   ├── privacy/                    # Privacy policy page
│   │   ├── robots.ts                   # robots.txt generation
│   │   └── sitemap.ts                  # sitemap.xml generation
│   ├── components/
│   │   ├── sections/                   # Page sections
│   │   │   ├── Hero.tsx               # Hero section with CTA
│   │   │   ├── Problem.tsx            # Pain points section
│   │   │   ├── Solution.tsx           # Solution overview
│   │   │   ├── Results.tsx            # Results/metrics section
│   │   │   ├── HowItWorks.tsx         # Process steps
│   │   │   ├── CaseStudies.tsx        # Client case studies
│   │   │   ├── Pricing.tsx            # Three-tier pricing
│   │   │   ├── Guarantee.tsx          # Risk reversal section
│   │   │   ├── AboutFounder.tsx       # Founder credibility
│   │   │   ├── FAQ.tsx                # Frequently asked questions
│   │   │   ├── FinalCTA.tsx           # Bottom CTA section
│   │   │   └── BookingForm.tsx        # Multi-step booking form
│   │   ├── ui/                         # Reusable UI components
│   │   │   ├── Button.tsx, Card.tsx, Badge.tsx
│   │   │   ├── Accordion.tsx, input.tsx, select.tsx
│   │   │   └── sparkles.tsx, glowing-effect.tsx, compare.tsx
│   │   ├── navbar.tsx                  # Main navigation
│   │   ├── footer.tsx                  # Site footer
│   │   └── logo.tsx                    # Brand logo component
│   ├── lib/
│   │   ├── posthog.ts                  # PostHog analytics client
│   │   ├── posthog-server.ts           # Server-side PostHog
│   │   ├── analytics.ts                # Analytics utilities
│   │   ├── utils.ts                    # General utilities
│   │   └── canonical-url.ts, open-graph.ts
│   ├── providers/                      # React context providers
│   ├── hooks/                          # Custom React hooks
│   ├── icons/                          # Custom icon components
│   ├── styles/globals.css              # Global styles
│   ├── env.js                          # Environment variable schema
│   ├── instrumentation.ts              # Server instrumentation
│   └── instrumentation-client.ts       # Client instrumentation
├── public/
│   ├── llms.txt                        # AI search optimization
│   ├── case-studies/                   # Case study assets
│   └── illustrations/                  # Marketing illustrations
├── docs/                               # Strategic documentation
│   ├── business/                       # Business strategy & validation
│   │   ├── AI Sales Lead Automation Impact Analysis.md  # Devoli case study
│   │   └── Rekurve MVP Business Case Validation.md      # GTM strategy
│   ├── sales/                          # Sales assets & templates
│   │   ├── grand-slam-offer-deck.md    # Pitch deck outline
│   │   └── value-based-pricing-proposals.md  # Pricing templates
│   ├── marketing/                      # Marketing & positioning
│   │   ├── messaging-guide.md          # AI Agent positioning & language
│   │   └── technical-case-study-guide.md     # Case study creation
│   └── pr_template.md                  # PR description template
├── .claude/                            # Claude Code configuration
│   ├── agents/                         # Custom agent definitions
│   │   ├── design-reviewer.md          # UI/UX design review
│   │   ├── ui-navigator.md             # Playwright browser automation
│   │   ├── codebase-*.md               # Code exploration agents
│   │   ├── thoughts-*.md               # Thoughts directory agents
│   │   └── web-search-researcher.md    # Web research agent
│   ├── commands/                       # Slash commands
│   └── skills/                         # Reusable skills
│       ├── ui-aesthetics/              # Distinctive UI design principles
│       ├── brand-guidelines/           # Rekurve brand colors/typography
│       ├── ticket-writer/              # Jira/Linear ticket templates
│       ├── brainstorming/              # Idea refinement process
│       └── writing-clearly-and-concisely/
├── e2e/                                # Playwright E2E tests
│   ├── fixtures/                       # Test fixtures
│   ├── pages/                          # Page object models
│   │   └── sections/                   # Section page objects
│   ├── data/                           # Test data factories
│   ├── utils/                          # Test utilities (analytics helper)
│   ├── features/                       # Feature-specific tests
│   └── journeys/                       # End-to-end journey tests
├── thoughts/                           # Implementation notes
│   ├── plans/                          # Detailed implementation plans
│   └── designs/                        # Design explorations
├── CLAUDE.md                           # This file (project instructions)
├── .mcp.json                           # MCP server configuration
├── next.config.ts                      # Next.js configuration
├── package.json                        # Dependencies (Yarn 3.8.7)
└── tsconfig.json                       # TypeScript config
```

---

## Performance Requirements

**Lighthouse Targets**:
- Performance: 90+
- Accessibility: 90+ (WCAG 2.1 AA)
- Best Practices: 90+
- SEO: 90+

**Core Web Vitals**:
- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2s
- Cumulative Layout Shift: < 0.1
- Total Page Weight: < 3MB

---

## AI Search Optimization (llms.txt)

**File**: `public/llms.txt`

Provides structured information for AI assistants (ChatGPT, Claude, Perplexity). Update when:
- Pricing changes
- Service offerings change
- New features added
- Founder credentials update
- Guarantee terms change

---

## Strategic Document Reference

**Business Strategy** (`docs/business/`):
- `AI Sales Lead Automation Impact Analysis.md` - Core case study validating speed-to-lead economics, 12x capacity gain
- `Rekurve MVP Business Case Validation.md` - GTM strategy, target personas, technical architecture recommendations (treat as hypothesis until validated)

**Sales - Active** (`docs/sales/`):
- `pilot-program.md` - Release Pilot program overview, qualification criteria, expectations, agreement template
- `discovery-conversation-guide.md` - Structured questions for validation conversations with prospects

**Marketing - Active** (`docs/marketing/`):
- `messaging-guide.md` - AI Agent positioning and language guidelines (simplified for pre-PMF stage)

**Archived** (`docs/sales/archive/`, `docs/marketing/archive/`):
- `grand-slam-offer-deck.md` - Pitch deck (for post-PMF paid sales)
- `value-based-pricing-proposals.md` - Pricing negotiation framework (for post-PMF)
- `technical-case-study-guide.md` - Case study creation guide (for when we have completed pilots)

---

## AI Agent Working Guidelines

### Development Workflow

**Before Starting**:
1. Read relevant strategic docs (see Common Tasks Reference table)
2. Understand the "why" before implementing the "what"
3. Check if similar patterns exist in the codebase using the **@agent-codebase-analyzer**

**During Development**:
1. Follow the ui-aesthetics skill exactly (no generic Tailwind defaults)
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

---

## Questions? Start Here

- **Business strategy**: `docs/business/Rekurve MVP Business Case Validation.md`
- **Market positioning & messaging**: `docs/marketing/messaging-guide.md`
- **Pilot program details**: `docs/sales/pilot-program.md`
- **Discovery conversations**: `docs/sales/discovery-conversation-guide.md`
