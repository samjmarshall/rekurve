# Phase 3: Hero & Above-Fold Sections

**Status:** ⏳ **PENDING**
**Estimated Duration:** 2-3 hours
**Previous Phase:** [Phase 2: Design System ⏳](./phase-2-design-system.md)
**Next Phase:** [Phase 4: Social Proof & Process](./phase-4-social-proof.md)

---

## Overview

Implement the critical above-fold content that captures attention and communicates the value proposition. These sections must load quickly and compel visitors to scroll/book.

---

## Sections to Implement

### 1. **Hero Section**
**File:** `src/components/sections/Hero.tsx`

**Key Elements:**
- Headline: "Autonomous AI Sales Agents That Work 24/7"
- Subheadline: Value proposition (20+ hours saved, $100K pipeline)
- Primary CTA: "See How It Works" (scroll to booking)
- Secondary CTA: "Watch 2-Min Demo"
- Background: Layered with atmospheric depth (not flat gradient)
- Badge: "Former AWS SRE" for credibility

**Design Notes:**
- Navy background with subtle texture
- Headline in IBM Plex Sans Bold, large size
- Accent cyan for "AI Sales Agents"
- Animated entrance (FadeInUp stagger)

### 2. **Problem Section**
**File:** `src/components/sections/Problem.tsx`

**Key Elements:**
- Headline: "Sales Teams Waste 40% of Time on Manual Work"
- 3-4 pain points displayed as cards:
  - Manual lead research (15+ hours/week)
  - Follow-up email chaos
  - Inconsistent qualification
  - Lost opportunities

**Design Notes:**
- White background
- Cards with icons (lucide-react)
- ScrollReveal animation on cards
- Use accent coral for attention (pain = problem)

### 3. **Solution Section**
**File:** `src/components/sections/Solution.tsx`

**Key Elements:**
- Headline: "Meet Your 24/7 Virtual SDR"
- Key capabilities (NOT features list):
  - Intelligent lead research
  - Multi-channel outreach
  - Adaptive messaging
  - Automated qualification
  - Meeting booking

**Design Notes:**
- Light background with subtle pattern
- Large capability cards with icons
- Use accent cyan for "active" feeling
- Show agent personality (not just automation)

---

## Implementation Steps

### Step 1: Create Sections Directory
```bash
mkdir -p src/components/sections
```

### Step 2: Update Main Page
**File:** `src/app/page.tsx`

Replace T3 placeholder with:
```typescript
import Hero from '@/components/sections/Hero'
import Problem from '@/components/sections/Problem'
import Solution from '@/components/sections/Solution'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Solution />
    </main>
  )
}
```

### Step 3: Implement Hero Section
- Large, bold headline
- Value proposition clearly stated
- CTAs prominently displayed
- Background with depth

### Step 4: Implement Problem Section
- Empathize with pain points
- Show understanding of target audience
- Use specific, measurable pain (hours wasted)

### Step 5: Implement Solution Section
- Position as AI agent (NOT automation tool)
- Focus on intelligence and autonomy
- Show how it solves pain points

---

## Success Criteria

### Automated Verification:
- [ ] Page builds without errors
- [ ] No TypeScript warnings
- [ ] All sections render

### Manual Verification:
- [ ] Hero headline is large and readable
- [ ] CTAs are clickable and styled correctly
- [ ] Problem cards display with icons
- [ ] Solution section emphasizes "agent" positioning
- [ ] Animations work (FadeInUp, ScrollReveal)
- [ ] Mobile responsive (test at 375px)
- [ ] Custom fonts load (IBM Plex Sans)

### Performance:
- [ ] Above-fold content loads in < 1.5s
- [ ] No layout shift (CLS < 0.1)
- [ ] Images optimized (if any)

---

## Copy Guidelines

### Positioning (Critical!)
**ALWAYS use "AI Agent" language:**
- ✅ "Autonomous AI sales agents"
- ✅ "Your 24/7 virtual SDR"
- ✅ "Intelligent decision-making"

**NEVER use automation language:**
- ❌ "Automate your sales"
- ❌ "Sales automation tool"
- ❌ Generic "AI" without specifics

### Tone
- Professional but approachable
- Confident (no hedge words)
- Specific numbers (20+ hours, $100K)
- Technical credibility (AWS SRE background)

---

## Detailed Implementation Reference

**Original Plan:** [`../2025-11-03-landing-page-implementation.md`](../2025-11-03-landing-page-implementation.md) (Lines 815-1141)

Contains:
- Complete section code
- Copy examples
- Animation specifications
- Design system usage

---

## Next Steps

After Phase 3:
1. Test above-fold sections thoroughly
2. Verify positioning language is correct
3. Check mobile responsiveness
4. Proceed to Phase 4 (Social Proof & Process)

**Next Phase:** [Phase 4: Social Proof & Process](./phase-4-social-proof.md)

---

**Created:** 2025-01-03
**Status:** ⏳ Pending
**Blocked by:** Phase 2 (Design System)
