# Rekurve AI Sales Automation Agency

## Project Overview

**Rekurve** is an AI automation agency building autonomous AI sales agents for professional services firms in Brisbane, Australia (expanding to Melbourne). This repository contains strategic documentation, business plans, and landing page specifications for the agency.

**Target Market**: Professional services firms (consulting, accounting, marketing agencies) with 10-50 employees.

**Core Offering**: Autonomous AI sales agents that handle lead research, qualification, multi-channel outreach, and meeting booking—delivering 20+ hours weekly in time savings and $100K+ pipeline growth.

---

## Repository Structure

```
www/
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
│   ├── commands/                      # Slash commands
│   └── skills/                        # Reusable skills
│       └── ui-aesthetics/             # Distinctive UI design principles
└── CLAUDE.md                          # This file
```

---

## Business Context

### Value Proposition
"Autonomous AI Sales Agents That Work 24/7" - NOT just automation, but intelligent agents that:
- Research prospects and enrich data
- Qualify leads using custom criteria
- Execute multi-channel campaigns (Email, LinkedIn, SMS)
- Adapt messaging based on engagement patterns
- Book qualified meetings automatically

### Positioning Strategy
**Critical**: We position as **"AI Agents"** not "automation services" to justify premium pricing and differentiate from commodity Zapier/Make alternatives.

**Language Framework**:
- ✅ "Deploy autonomous AI sales agents"
- ✅ "Your 24/7 virtual SDR"
- ✅ "Intelligent decision-making, not just workflows"
- ❌ "We'll automate your CRM"
- ❌ "Simple workflow automation"

See `/docs/ai_agent_positioning_guide.md` for complete messaging framework.

### Pricing Tiers
1. **AI-Assisted Sales System** (Foundation): $9,500 setup + $2,500/mo
2. **Intelligent Sales Agent** (Growth): $20,000 setup + $4,500/mo
3. **Autonomous AI Sales Agent** (Enterprise): Custom pricing

All packages include **5× ROI guarantee** in 120 days.

---

## Technical Approach

### Tech Stack (for implementation)
- **Orchestration**: n8n (self-hosted on AWS) for workflow management
- **Intelligence**: GPT-4 API for NLP, content generation, decision logic
- **Data**: Clay, Clearbit, Apollo APIs for real-time enrichment
- **CRM Integration**: HubSpot, Salesforce, Pipedrive APIs
- **Infrastructure**: AWS (Lambda for serverless, EC2 for n8n, PostgreSQL)

### Architecture Philosophy
**Enterprise-grade reliability with SRE principles**:
- 99.9% uptime SLA
- Production-grade monitoring and alerting
- Idempotent operations (no duplicate sends)
- Graceful error handling and retry logic
- Comprehensive logging and observability

**Why this matters**: Founder's background as AWS SRE is a key differentiator. Technical credibility justifies premium pricing.

---

## Design Philosophy: Distinctive UI Aesthetics

**Target Audience**: Pre-sales engineers, sales ops managers, sales leadership—technically sophisticated professionals.

**Visual Identity**: Technical precision meets operational confidence. Think Linear's sophistication + Grafana's data viz aesthetic + Superhuman's speed signals.

### Critical Design Rules

**Avoid Generic "AI Slop"**:
- ❌ No purple gradients on white backgrounds
- ❌ No Inter/Roboto/default system fonts
- ❌ No uniform blue-500/gray-100 Tailwind defaults
- ❌ No generic chat bubble interfaces
- ❌ No rainbow color soup

**Instead, Use**:
- ✅ IBM Plex Sans + JetBrains Mono (distinctive typography)
- ✅ Data viz-inspired color palette (amber, cyan, coral accents)
- ✅ Strategic color deployment (single accent per context)
- ✅ Layered backgrounds with atmospheric depth
- ✅ Terminal/technical aesthetics where appropriate

### Typography System
```typescript
// Fonts
--font-sans: IBM Plex Sans (400, 500, 600, 700)
--font-mono: JetBrains Mono (400, 500)

// Usage
Headlines: IBM Plex Sans Bold, -0.02em letter-spacing
Body: IBM Plex Sans Regular/Medium
Technical elements: JetBrains Mono (IDs, timestamps, code)
Numbers: Tabular figures (font-variant-numeric: tabular-nums)
```

### Color System
```typescript
// Primary
--primary: #071D33 (Navy)

// Accents (use strategically, NOT all at once)
--accent-amber: oklch(0.75 0.15 75)   // Urgent/highlight
--accent-cyan: oklch(0.70 0.15 195)    // Active/in-progress
--accent-coral: oklch(0.65 0.18 25)    // Attention states

// Semantic states
--state-success: oklch(0.70 0.18 145)
--state-warning: oklch(0.75 0.15 75)
--state-error: oklch(0.58 0.22 25)
```

**See** `/docs/landing_page_prompt.md` for complete design system and implementation details.

---

## Content & Messaging Guidelines

### Tone of Voice
- **Professional but approachable**: Not stiff, not overly casual
- **Technical credibility**: Show expertise without jargon
- **Results-focused**: Always tie features to outcomes
- **Confident**: No hedge words ("try", "might", "could")
- **Specific**: Use exact numbers, not ranges

### Writing Patterns
**Good**:
- "Recover 20+ hours weekly"
- "Add $100K to your pipeline in 90 days"
- "8.6× average ROI in Year 1"

**Avoid**:
- "Save time" (too vague)
- "Increase revenue" (no specifics)
- "Great ROI" (not quantified)

### Social Proof Requirements
Always include:
- Specific numbers (hours saved, revenue added)
- Company details (size, industry, location)
- Before/after comparisons
- Timeline (results visible by week X)
- Attribution (name, title, photo)

---

## Key Strategic Documents

When working on this project, reference these docs for context:

### Business Strategy
- **`ai-agency-roadmap.md`**: Complete 6-month launch plan (Pre-launch → $28K-38K monthly revenue)
  - Phase 0: Pre-Launch Foundation (Weeks 1-4)
  - Phase 1: Month 1 - Launch & Initial Outreach
  - Phase 2-6: Scaling to 8-12 active clients + $12-18K MRR

- **`ai-agency-launch-blueprint.md`**: Comprehensive strategy and tactical execution

### Market Positioning
- **`ai_agent_positioning_guide.md`**: Critical for messaging
  - Why "AI Agent" positioning wins (30-50% higher perceived value)
  - Three-tier agent framework (Foundation → Growth → Enterprise)
  - Messaging by buyer type (CFO, CTO, VP Sales)
  - Technical credibility demonstration
  - Objection handling scripts

### Product Design
- **`landing_page_prompt.md`**: Complete landing page specification
  - Next.js 15+ implementation guide
  - Distinctive UI components (avoiding generic aesthetics)
  - 12 optimized sections (Hero → Final CTA)
  - Accessibility (WCAG 2.1 AA)
  - Performance targets (Lighthouse 90+)

### Pricing & Packaging
- **`value_based_pricing_proposals.md`**: How to price based on value, not hours
- **`pricing-ladder.md`**: Three-tier structure with clear differentiation
- **`offer-analysis.md`**: Grand Slam Offer framework applied

### Technical Validation
- **`technical_case_study_complete.md`**: Real-world implementation examples

---

## Development Guidelines

### When Code is Added

**Stack Recommendation**:
- **Framework**: Next.js 15+ (App Router, TypeScript)
- **Styling**: Tailwind CSS with custom theme (see color system above)
- **UI Components**: shadcn/ui + Aceternity UI (customized to avoid generic look)
- **Animation**: Framer Motion for orchestrated reveals
- **Icons**: Lucide React (variable stroke-width: 1.5-2.5)
- **Forms**: React Hook Form + Zod validation
- **Analytics**: Google Analytics 4 + custom event tracking

### Code Organization
```typescript
// Recommended structure when codebase is created
app/
  layout.tsx              // Root layout with fonts
  page.tsx                // Landing page
  globals.css             // Custom theme
components/
  sections/               // Page sections
    Hero.tsx
    Problem.tsx
    Solution.tsx
    ... (see landing_page_prompt.md)
  ui/                     // Reusable components
    Button.tsx
    Card.tsx
    Badge.tsx
  motion/                 // Animation wrappers
    FadeInUp.tsx
    ScrollReveal.tsx
lib/
  analytics.ts            // Event tracking
  utils.ts                // Helpers
types/
  index.ts                // TypeScript types
```

### Performance Standards
- **Lighthouse Performance**: 90+
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Total Page Weight**: < 3MB

### Accessibility Requirements
- **WCAG 2.1 Level AA** compliance
- Color contrast: Minimum 4.5:1 for text
- Keyboard navigation: All interactive elements accessible
- Screen reader: Semantic HTML + ARIA labels
- Motion preferences: Respect `prefers-reduced-motion`

---

## AI Agent Working Guidelines

When working on this project:

### 1. Understand the Business Model First
Before making any technical decisions, understand:
- **Who is the customer?** Professional services firms (10-50 employees)
- **What's the pain point?** 40% of time wasted on manual sales work
- **What's the solution?** Autonomous AI agents (NOT simple automation)
- **How do we position it?** As a virtual SDR, not a tool

### 2. Maintain Positioning Consistency
Every word matters for positioning:
- Use "agent" language, not "automation"
- Emphasize autonomy and intelligence
- Show technical credibility (SRE background)
- Always include specific results (20+ hours, $100K, 8.6× ROI)

### 3. Prioritize Distinctive Design
Avoid generic SaaS aesthetics:
- Reference `/docs/landing_page_prompt.md` for design system
- Use custom color palette (not Tailwind defaults)
- Strategic color deployment (one accent per context)
- IBM Plex Sans + JetBrains Mono (not Inter)

### 4. Make Data-Driven Decisions
When uncertain, reference:
- **Roadmap** for timeline and priorities
- **Positioning guide** for messaging
- **Landing page spec** for design patterns
- **Pricing docs** for package structure

### 5. Ask Clarifying Questions
If requirements conflict or are unclear:
- **Market positioning** questions → See `ai_agent_positioning_guide.md`
- **Design questions** → See `landing_page_prompt.md` + `.claude/skills/ui-aesthetics/`
- **Business strategy** → See `ai-agency-roadmap.md`
- **Technical implementation** → Refer to tech stack section

---

## Common Tasks & Where to Find Answers

| Task | Reference Document |
|------|-------------------|
| Writing landing page copy | `landing_page_prompt.md` + `ai_agent_positioning_guide.md` |
| Designing UI components | `landing_page_prompt.md` + `.claude/skills/ui-aesthetics/SKILL.md` |
| Pricing a proposal | `value_based_pricing_proposals.md` + `pricing-ladder.md` |
| Handling objections | `ai_agent_positioning_guide.md` (Section: Objection Handling) |
| Creating case studies | `technical_case_study_complete.md` |
| Planning next quarter | `ai-agency-roadmap.md` |
| Designing a feature | `landing_page_prompt.md` (Design Philosophy section) |

---

## Success Metrics

### Business Goals (Year 1)
- **Month 1**: 2-3 pilot clients, $8K-15K revenue
- **Month 3**: 4-6 clients, $15K-25K revenue, 2-3 case studies
- **Month 6**: 8-12 clients, $28K-38K revenue, $12-18K MRR
- **Year 1**: $200K-400K revenue (solo) OR $500K-1M (with team)

### Website Metrics (Post-launch)
- **Conversion rate**: 10-15% (visitors → form submissions)
- **Booking rate**: 60-80% (form submissions → booked calls)
- **Time on page**: 3+ minutes average
- **Bounce rate**: < 40%

---

## Key Differentiators to Emphasize

1. **Technical Credibility**: Former AWS SRE building enterprise-grade systems
2. **Agent Positioning**: Autonomous intelligence, not simple automation
3. **Specific Results**: 20+ hours saved, $100K pipeline, 8.6× ROI
4. **5× ROI Guarantee**: Risk reversal, confidence signal
5. **Industry Focus**: Professional services specialization (not generalist)
6. **Brisbane/Melbourne**: Local market expertise, in-person available

---

## Questions? Start Here

- **Business strategy**: Read `ai-agency-roadmap.md`
- **Market positioning**: Read `ai_agent_positioning_guide.md`
- **Landing page design**: Read `landing_page_prompt.md`
- **Pricing strategy**: Read `value_based_pricing_proposals.md`

---

## Version History

- **2025-01-03**: Initial CLAUDE.md created based on existing strategic documentation

---

**Next Steps**: When ready to build the landing page, reference `/docs/landing_page_prompt.md` for complete technical specifications and design system.
