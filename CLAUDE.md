# Rekurve AI Sales Agents

Autonomous AI sales agents that handle lead research, qualification, multi-channel follow-up, meeting booking and quote generation. Delivering 20+ hours weekly in time savings and $100K+ pipeline growth.

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
```

**Status**: Initialized, staged in git, ready for landing page implementation

---

## Repository Structure

```
www/                                    # Next.js 15 landing page application
├── src/
│   ├── app/                       # App Router (Next.js 15)
│   │   ├── layout.tsx            # Root layout with fonts
│   │   └── page.tsx              # Landing page (placeholder)
│   ├── styles/
│   │   └── globals.css           # Global styles
│   └── env.js                    # Environment variable schema
├── public/                        # Static assets
├── package.json                   # Dependencies (Yarn 3.8.7)
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js            # Tailwind 4 config
├── docs/                               # Strategic documentation
│   ├── ai-agency-roadmap.md           # 6-month implementation roadmap
│   ├── ai_agent_positioning_guide.md  # Market positioning and messaging
│   ├── landing_page_prompt.md         # Complete landing page specification
│   ├── high-converting_landing_pages_playbook.md
│   ├── value_based_pricing_proposals.md
│   ├── pricing-ladder.md              # Three-tier pricing structure
│   ├── offer-analysis.md
│   ├── grand_slam_offer_deck.md
│   ├── technical_case_study_complete.md
│   └── ai-agency-launch-blueprint.md
├── .claude/                           # Claude Code configuration
│   ├── agents/                        # Custom agent definitions
│   ├── commands/                      # Slash commands (/create_plan, /implement_plan, etc.)
│   └── skills/                        # Reusable skills
│       └── ui-aesthetics/             # Distinctive UI design principles
│       └── brand-guidelines           # Rekurve's official brand guidelines
├── thoughts/                          # Implementation plans and notes
│   └── plans/                         # Detailed implementation plans
├── CLAUDE.md                          # This file (project instructions)
└── .mcp.json                          # MCP server configuration
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

**Business Strategy**:
- `docs/ai-agency-roadmap.md` - Complete 6-month launch plan (Pre-launch → $28K-38K monthly revenue)
- `docs/ai-agency-launch-blueprint.md` - Comprehensive strategy and tactical execution

**Market Positioning**:
- `docs/ai_agent_positioning_guide.md` - Critical for messaging (why "AI Agent" wins, messaging by buyer type, objection handling)

**Product Design**:
- `docs/landing_page_prompt.md` - Complete landing page specification (Next.js 15+ implementation, 12 optimized sections, accessibility, performance targets)

**Pricing & Packaging**:
- `docs/value_based_pricing_proposals.md` - How to price based on value, not hours
- `docs/pricing-ladder.md` - Three-tier structure with clear differentiation
- `docs/offer-analysis.md` - Grand Slam Offer framework applied

**Technical Validation**:
- `docs/technical_case_study_complete.md` - Real-world implementation examples

---

## AI Agent Working Guidelines

### Development Workflow

**Before Starting**:
1. Read relevant strategic docs (see Common Tasks Reference table)
2. Understand the "why" before implementing the "what"
3. Check if similar patterns exist in the codebase using the @agent-codebase-analyzer

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
   Use @agent-design-review to comprehensively review the changes, and reply back to the user with the design and review report. Your final reply must contain the markdown report and nothing else.

5. **Address feedback**:
   - Fix any [Blocker] or [High-Priority] issues immediately
   - Consider [Medium-Priority] improvements
   - Decide on Nits based on time/impact

6. **Iterate if needed**:
   - Make adjustments based on feedback
   - Use @agent-design-review again for significant changes
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

---

## Questions? Start Here

- **Business strategy**: `docs/ai-agency-roadmap.md`
- **Market positioning**: `docs/ai_agent_positioning_guide.md`
- **Landing page design**: `docs/landing_page_prompt.md`
- **Pricing strategy**: `docs/value_based_pricing_proposals.md`
