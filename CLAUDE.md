# Rekurve AI Sales Automation Agency

**Rekurve** is an AI automation agency building autonomous AI sales agents for professional services firms in Brisbane, Australia (expanding to Melbourne). This repository contains strategic documentation, business plans, and landing page specifications for the agency.

**Target Market**: Professional services firms (consulting, accounting, marketing agencies) with 10-50 employees.

**Core Offering**: Autonomous AI sales agents that handle lead research, qualification, multi-channel outreach, and meeting booking—delivering 20+ hours weekly in time savings and $100K+ pipeline growth.

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

## TIER 1: QUICK REFERENCE

### Target Market & Core Offering

**Who**: Professional services firms (consulting, accounting, marketing agencies) with 10-50 employees in Brisbane/Melbourne, Australia

**What**: Autonomous AI sales agents (NOT automation tools) that handle:
- Lead research & enrichment
- Qualification using custom criteria
- Multi-channel outreach (Email, LinkedIn, SMS)
- Adaptive messaging based on engagement
- Automated meeting booking

**Results**: 20+ hours saved weekly, $100K+ pipeline growth, 8.6× average ROI

### Critical Positioning Language

**ALWAYS Use** (agent positioning):
- ✅ "Deploy autonomous AI sales agents"
- ✅ "Your 24/7 virtual SDR"
- ✅ "Intelligent decision-making, not just workflows"

**NEVER Use** (commodity automation):
- ❌ "We'll automate your CRM"
- ❌ "Simple workflow automation"
- ❌ Generic "AI" without specifics

**Why This Matters**: Agent positioning commands 30-50% premium vs automation services

### Design System Quick Reference

**Typography**:
- Headlines: IBM Plex Sans Bold (-0.02em tracking)
- Body: IBM Plex Sans Regular/Medium
- Technical: JetBrains Mono
- Numbers: Tabular figures

**Colors** (strategic deployment - ONE accent per context):
- Primary: `#071D33` (Navy)
- Accent Amber: `oklch(0.75 0.15 75)` - Urgent/highlight
- Accent Cyan: `oklch(0.70 0.15 195)` - Active/in-progress
- Accent Coral: `oklch(0.65 0.18 25)` - Attention states

**Avoid Generic AI Aesthetics**:
- ❌ Purple gradients on white
- ❌ Inter/Roboto fonts
- ❌ Uniform Tailwind defaults (blue-500/gray-100)
- ❌ Rainbow color soup

### Pricing Tiers (Quick Reference)

1. **AI-Assisted Sales System**: $9,500 setup + $2,500/mo
2. **Intelligent Sales Agent**: $20,000 setup + $4,500/mo
3. **Autonomous AI Sales Agent**: Custom pricing

All include **5× ROI guarantee** in 120 days.

### Common Tasks Reference

| Task | Reference Document |
|------|-------------------|
| Landing page copy | `docs/landing_page_prompt.md` + `docs/ai_agent_positioning_guide.md` |
| UI component design | `docs/landing_page_prompt.md` + `.claude/skills/ui-aesthetics/SKILL.md` |
| Pricing proposals | `docs/value_based_pricing_proposals.md` + `docs/pricing-ladder.md` |
| Objection handling | `docs/ai_agent_positioning_guide.md` (Objection Handling section) |
| Case studies | `docs/technical_case_study_complete.md` |
| Roadmap/planning | `docs/ai-agency-roadmap.md` |

---

## TIER 2: IMPLEMENTATION GUIDELINES

### Tech Stack & Architecture

**Landing Page Stack**:
- **Framework**: Next.js 15.2.3 (App Router, TypeScript, React 19)
- **Styling**: Tailwind CSS 4.0.15 (custom theme required)
- **UI Components**: shadcn/ui + Aceternity UI (customize to avoid generic look)
- **Animation**: Framer Motion for orchestrated reveals
- **Icons**: Lucide React (variable stroke-width: 1.5-2.5)
- **Forms**: React Hook Form + Zod validation
- **Analytics**: Google Analytics 4 + custom event tracking
- **Package Manager**: Yarn 3.8.7 (PnP)

**AI Agent Implementation Stack** (for future client projects):
- **Orchestration**: n8n (self-hosted on AWS)
- **Intelligence**: GPT-4 API for NLP, content generation, decision logic
- **Data**: Clay, Clearbit, Apollo APIs for real-time enrichment
- **CRM Integration**: HubSpot, Salesforce, Pipedrive APIs
- **Infrastructure**: AWS (Lambda, EC2, PostgreSQL)

### Recommended Code Structure

```typescript
src/
├── app/
│   ├── layout.tsx              # Root layout with fonts
│   ├── page.tsx                # Landing page
│   └── globals.css             # Custom theme (design system)
├── components/
│   ├── sections/               # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── Problem.tsx
│   │   ├── Solution.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Results.tsx
│   │   ├── CaseStudies.tsx
│   │   ├── Pricing.tsx
│   │   ├── Guarantee.tsx
│   │   ├── FAQ.tsx
│   │   ├── AboutFounder.tsx
│   │   └── FinalCTA.tsx
│   ├── ui/                     # Reusable components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── [other primitives]
│   └── motion/                 # Animation wrappers
│       ├── FadeInUp.tsx
│       └── ScrollReveal.tsx
├── lib/
│   ├── analytics.ts            # Event tracking
│   └── utils.ts                # Helpers
└── types/
    └── index.ts                # TypeScript types
```

### Performance Requirements

**Lighthouse Targets**:
- Performance: 90+
- Accessibility: 90+ (WCAG 2.1 AA)
- Best Practices: 90+
- SEO: 90+

**Core Web Vitals**:
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Total Page Weight: < 3MB

### Content & Messaging Rules

**Tone of Voice**:
- Professional but approachable (not stiff, not casual)
- Technical credibility without jargon
- Results-focused (tie features to outcomes)
- Confident (no hedge words: "try", "might", "could")
- Specific (exact numbers, not ranges)

**Writing Patterns**:
✅ "Recover 20+ hours weekly"
✅ "Add $100K to your pipeline in 90 days"
✅ "8.6× average ROI in Year 1"

❌ "Save time" (too vague)
❌ "Increase revenue" (no specifics)
❌ "Great ROI" (not quantified)

**Social Proof Requirements**:
- Specific numbers (hours saved, revenue added)
- Company details (size, industry, location)
- Before/after comparisons
- Timeline (results visible by week X)
- Attribution (name, title, photo)

### Design Implementation Guidelines

**Typography System**:
```typescript
// Font configuration
--font-sans: IBM Plex Sans (weights: 400, 500, 600, 700)
--font-mono: JetBrains Mono (weights: 400, 500)

// Usage
Headlines: IBM Plex Sans Bold, -0.02em letter-spacing
Body: IBM Plex Sans Regular (400) or Medium (500)
Technical elements: JetBrains Mono (IDs, timestamps, code snippets)
Numbers: font-variant-numeric: tabular-nums
```

**Color System**:
```typescript
// Primary
--primary: #071D33 (Navy - main brand color)

// Accents (use strategically - ONE per context, not all at once)
--accent-amber: oklch(0.75 0.15 75)   // Urgent/highlight states
--accent-cyan: oklch(0.70 0.15 195)    // Active/in-progress states
--accent-coral: oklch(0.65 0.18 25)    // Attention/warning states

// Semantic states
--state-success: oklch(0.70 0.18 145)
--state-warning: oklch(0.75 0.15 75)
--state-error: oklch(0.58 0.22 25)
```

**Visual Identity**: Technical precision meets operational confidence
- Target aesthetic: Linear's sophistication + Grafana's data viz + Superhuman's speed signals
- Layered backgrounds with atmospheric depth
- Terminal/technical aesthetics where appropriate
- Data viz-inspired elements

**Complete design system**: See `docs/landing_page_prompt.md`

### Accessibility Requirements

- **WCAG 2.1 Level AA** compliance mandatory
- Color contrast: Minimum 4.5:1 for text, 3:1 for large text
- Keyboard navigation: All interactive elements accessible via keyboard
- Screen reader: Semantic HTML + appropriate ARIA labels
- Motion preferences: Respect `prefers-reduced-motion` media query
- Focus indicators: Visible focus states on all interactive elements

---

## TIER 3: STRATEGIC CONTEXT

### Business Model

**Value Proposition**: "Autonomous AI Sales Agents That Work 24/7"
- NOT just automation
- NOT a tool or software
- IS an intelligent agent that makes decisions

**Target Customer Pain Point**: 40% of time wasted on manual sales work (research, qualification, follow-ups)

**Solution**: Virtual SDR that works 24/7, learns from engagement patterns, and adapts messaging

**Positioning Differentiation**: "AI Agents" vs "automation services" = 30-50% higher perceived value

### Pricing Strategy & Rationale

**Three-Tier Structure**:

1. **AI-Assisted Sales System** (Foundation)
   - Setup: $9,500
   - Monthly: $2,500
   - Target: Small firms testing AI sales
   - Deliverable: Semi-automated workflows + manual oversight

2. **Intelligent Sales Agent** (Growth)
   - Setup: $20,000
   - Monthly: $4,500
   - Target: Mid-size firms scaling outbound
   - Deliverable: Autonomous agent with adaptive logic

3. **Autonomous AI Sales Agent** (Enterprise)
   - Setup: Custom (typically $40K-60K)
   - Monthly: Custom (typically $8K-12K)
   - Target: Established firms with complex sales processes
   - Deliverable: Fully autonomous multi-channel agent

**All packages include**: 5× ROI guarantee in 120 days (risk reversal)

**Pricing Philosophy**: Value-based, not hourly. Price anchored to:
- Time saved (20+ hours weekly = $10K-15K/month in opportunity cost)
- Pipeline value ($100K+ in new opportunities)
- ROI multiple (8.6× average in Year 1)

**See**: `docs/value_based_pricing_proposals.md` for full framework

### Key Differentiators

1. **Technical Credibility**: Former AWS SRE building enterprise-grade systems (99.9% uptime SLA, production monitoring, idempotent operations)
2. **Agent Positioning**: Autonomous intelligence, not simple workflow automation
3. **Specific Results**: 20+ hours saved, $100K pipeline, 8.6× ROI (always quantified)
4. **5× ROI Guarantee**: Strong risk reversal, signals confidence
5. **Industry Focus**: Professional services specialization (not generalist)
6. **Local Expertise**: Brisbane/Melbourne market knowledge, in-person available

### Architecture Philosophy (for Client Projects)

**Enterprise-grade reliability with SRE principles**:
- 99.9% uptime SLA
- Production-grade monitoring and alerting (Grafana + CloudWatch)
- Idempotent operations (no duplicate sends)
- Graceful error handling and retry logic with exponential backoff
- Comprehensive logging and observability
- Infrastructure as Code (Terraform)

**Why this matters**: Founder's AWS SRE background is a key differentiator. Technical credibility justifies premium pricing and builds trust with technically sophisticated buyers (pre-sales engineers, sales ops managers).

### Target Buyer Personas

**Primary Decision Makers**:
1. **VP Sales / Sales Director**: Cares about pipeline, quota attainment, team efficiency
2. **Sales Ops Manager**: Cares about process, data quality, tool integration
3. **Pre-Sales Engineer**: Cares about technical feasibility, reliability, integration complexity

**Secondary Influencers**:
- CFO: ROI, cost vs benefit
- CTO: Security, scalability, vendor risk

**Messaging by Buyer**: See `docs/ai_agent_positioning_guide.md`

### Success Metrics & Goals

**Business Goals (Year 1)**:
- **Month 1**: 2-3 pilot clients, $8K-15K revenue
- **Month 3**: 4-6 clients, $15K-25K revenue, 2-3 case studies
- **Month 6**: 8-12 clients, $28K-38K revenue, $12-18K MRR
- **Year 1**: $200K-400K revenue (solo) OR $500K-1M (with team)

**Website Metrics (Post-launch)**:
- Conversion rate: 10-15% (visitors → form submissions)
- Booking rate: 60-80% (form submissions → booked calls)
- Time on page: 3+ minutes average
- Bounce rate: < 40%

### Strategic Document Reference

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

### When Working on This Project

**1. Understand the Business Model First**
Before making technical decisions:
- **Customer**: Professional services firms (10-50 employees)
- **Pain Point**: 40% of time wasted on manual sales work
- **Solution**: Autonomous AI agents (NOT simple automation)
- **Positioning**: Virtual SDR, not a tool

**2. Maintain Positioning Consistency**
Every word matters:
- Use "agent" language, not "automation"
- Emphasize autonomy and intelligence
- Show technical credibility (SRE background)
- Always include specific results (20+ hours, $100K, 8.6× ROI)

**3. Prioritize Distinctive Design**
Avoid generic SaaS aesthetics:
- Reference `docs/landing_page_prompt.md` for design system
- Use custom color palette (not Tailwind defaults)
- Strategic color deployment (ONE accent per context)
- IBM Plex Sans + JetBrains Mono (not Inter/Roboto)

**4. Make Data-Driven Decisions**
When uncertain, reference:
- Roadmap for timeline and priorities
- Positioning guide for messaging
- Landing page spec for design patterns
- Pricing docs for package structure

**5. Ask Clarifying Questions**
If requirements conflict or are unclear:
- **Market positioning** → `docs/ai_agent_positioning_guide.md`
- **Design questions** → `docs/landing_page_prompt.md` + `.claude/skills/ui-aesthetics/`
- **Business strategy** → `docs/ai-agency-roadmap.md`
- **Technical implementation** → Refer to tech stack section above

### Development Workflow

**Before Starting**:
1. Read relevant strategic docs (see Common Tasks Reference table)
2. Understand the "why" before implementing the "what"
3. Check if similar patterns exist in the codebase

**During Development**:
1. Follow the design system exactly (no generic Tailwind defaults)
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

#### Manual Design Review Process

1. **Start dev server**:
   ```bash
   yarn dev
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
- Changes outside `src/`

But still manually verify:
- Changes work as expected
- No regressions in related features
- Code follows existing patterns

---

## Version History

- **2025-01-03**: Initial CLAUDE.md created based on existing strategic documentation

---

## Questions? Start Here

- **Business strategy**: `docs/ai-agency-roadmap.md`
- **Market positioning**: `docs/ai_agent_positioning_guide.md`
- **Landing page design**: `docs/landing_page_prompt.md`
- **Pricing strategy**: `docs/value_based_pricing_proposals.md`
