# Rekurve Landing Page Implementation Plans

## Quick Start

**👉 Start here:** [`00-index.md`](./00-index.md)

The index provides:
- Overview of all 7 phases
- Current implementation status
- Quick links to each phase
- Success criteria
- Next steps

---

## Plan Structure

This directory contains the implementation plan broken into manageable phases:

### ✅ Completed Phases

| Phase | File | Status | Completion Date |
|-------|------|--------|----------------|
| **Phase 1** | [`phase-1-foundation.md`](./phase-1-foundation.md) | ✅ Complete | 2025-01-03 |

### ⏳ Pending Phases

| Phase | File | Estimated Time | Dependencies |
|-------|------|----------------|--------------|
| **Phase 2** | [`phase-2-design-system.md`](./phase-2-design-system.md) | 1-2 hours | Phase 1 ✅ |
| **Phase 3** | [`phase-3-hero-sections.md`](./phase-3-hero-sections.md) | 2-3 hours | Phase 2 |
| **Phase 4** | [`phase-4-social-proof.md`](./phase-4-social-proof.md) | 2-3 hours | Phase 3 |
| **Phase 5** | [`phase-5-conversion.md`](./phase-5-conversion.md) | 3-4 hours | Phase 4 |
| **Phase 6** | [`phase-6-supporting-content.md`](./phase-6-supporting-content.md) | 2-3 hours | Phase 5 |
| **Phase 7** | [`phase-7-testing.md`](./phase-7-testing.md) | 2-3 hours | Phase 6 |

**Total estimated time:** 13-18 hours

---

## How to Use These Plans

### For Claude Code Agents

When implementing a phase:

1. **Read the phase file completely** - Understand what needs to be built
2. **Check dependencies** - Ensure previous phases are complete
3. **Review detailed reference** - Original plan contains full code examples
4. **Implement sequentially** - Follow the steps in order
5. **Verify success criteria** - Test before moving to next phase
6. **Mark as complete** - Update the phase file and index

### For Human Developers

Each phase file contains:
- **Overview** - What this phase accomplishes
- **Components to create** - Specific files and their purpose
- **Implementation steps** - Ordered tasks
- **Success criteria** - How to verify completion
- **Reference to detailed code** - Link to original plan

### Using the `/implement_plan` Command

To implement a specific phase:

```bash
/implement_plan landing-page/phase-2-design-system.md
```

This will:
- Load the phase plan
- Track progress with checkboxes
- Guide implementation step-by-step
- Verify success criteria

---

## Current Progress

### Phase 1: Foundation Setup ✅
**Completed:** 2025-01-03

What was done:
- ✅ Next.js 15.5.6 project initialized
- ✅ Custom fonts (IBM Plex Sans + JetBrains Mono)
- ✅ Tailwind CSS 4 with distinctive color palette
- ✅ All dependencies installed
- ✅ Build verified (no errors)

### Phase 2: Design System ⏳
**Status:** Ready to start

Next steps:
- Create UI components (Button, Card, Badge, Accordion)
- Build motion wrappers (FadeInUp, ScrollReveal)
- Define TypeScript types
- Enhance utility functions

**To begin:**
```bash
/implement_plan landing-page/phase-2-design-system.md
```

---

## Phase Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Design System)
    ↓
Phase 3 (Hero Sections) ←→ Design components from Phase 2
    ↓
Phase 4 (Social Proof) ←→ Design components from Phase 2
    ↓
Phase 5 (Conversion) ←→ Form components + Design system
    ↓
Phase 6 (Supporting Content) ←→ All previous sections
    ↓
Phase 7 (Testing) ←→ Complete page
```

---

## Detailed Implementation Reference

For complete code examples and detailed specifications, see the original comprehensive plan:

**📄 [`../2025-11-03-landing-page-implementation.md`](../2025-11-03-landing-page-implementation.md)**

The original plan (2500+ lines) contains:
- Complete TypeScript code for all components
- Exact copy for each section
- Animation specifications
- Design system details
- Form validation schemas
- Data structures

**When to use it:**
- Need exact component code
- Want to see complete implementations
- Looking for specific copy examples
- Need animation timing details

---

## Project Location

**Root:** `/Users/sam/workspace/rekurve/www/rekurve-landing/`

```
rekurve-landing/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ✅ Custom fonts configured
│   │   └── page.tsx            ⏳ Next: Replace with sections
│   ├── components/             ⏳ Next: Create UI components
│   │   ├── ui/                 (Button, Card, Badge, Accordion)
│   │   ├── motion/             (FadeInUp, ScrollReveal)
│   │   └── sections/           (Hero, Problem, Solution, etc.)
│   ├── lib/
│   │   └── utils.ts            ✅ Exists, needs enhancement
│   ├── types/                  ⏳ Next: Create type definitions
│   └── styles/
│       └── globals.css         ✅ Custom theme configured
├── public/
├── package.json                ✅ All dependencies installed
└── tsconfig.json               ✅ TypeScript configured
```

---

## Quick Commands

```bash
# Navigate to project
cd /Users/sam/workspace/rekurve/www/rekurve-landing/

# Start dev server
yarn dev

# Run checks (lint + typecheck)
yarn check

# Build for production
yarn build

# Run Lighthouse audit
yarn dev
# In another terminal:
npx lighthouse http://localhost:3000 --view
```

---

## Key Principles

### Design System
- **Colors:** Navy primary + Amber/Cyan/Coral accents (ONE per context)
- **Fonts:** IBM Plex Sans (body) + JetBrains Mono (technical)
- **Animations:** Respect `prefers-reduced-motion`

### Positioning
- **Always:** "AI Agents" language (autonomous, intelligent)
- **Never:** "Automation" language (generic, commodity)
- **Specific:** 20+ hours saved, $100K pipeline, 8.6× ROI

### Performance
- **Lighthouse:** 90+ across all metrics
- **FCP:** < 1.5s
- **LCP:** < 2.5s
- **CLS:** < 0.1

### Accessibility
- **WCAG 2.1 Level AA** compliance
- Keyboard navigation
- Screen reader compatible

---

## Questions?

- **Strategic guidance:** See [`/CLAUDE.md`](../../CLAUDE.md) for business context
- **Design specs:** See [`/docs/landing_page_prompt.md`](../../docs/landing_page_prompt.md)
- **Positioning:** See [`/docs/ai_agent_positioning_guide.md`](../../docs/ai_agent_positioning_guide.md)

---

**Created:** 2025-01-03
**Last Updated:** 2025-01-03
**Status:** Phase 1 complete, Phase 2 ready to start
