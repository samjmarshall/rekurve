# Landing Page Hero Redesign — 6 Concepts Implementation Plan

## Overview

Generate 6 distinct hero section designs for the Rekurve landing page, each on its own branch. The current hero targets "AI sales automation for service businesses" which is stale — Rekurve has pivoted to **AI sales assistant for New Home Sales Consultants at QLD volume builders**. These 6 concepts explore different audience angles and aesthetic directions to find the strongest above-the-fold positioning.

## Current State Analysis

The existing hero (`src/components/sections/Hero.tsx`) features:
- Headline: "Save 10+ Hours Weekly and Close 40% More Deals in 90 Days"
- Subtext: "Customer Enquiry → AI Generated Quote → Reviewed & Approved by Staff → Job Booked"
- Animated collision beams, rough notation highlights, stats marquee
- CTAs: "How it Works" + "Book a call"
- ~400 lines including CollisionMechanism, Explosion, and grid line components

**Problems:** Wrong audience (generic service businesses), wrong value prop (quote generation / speed to lead), overly complex animation code that dominates the file.

### Key Discoveries:
- Brand colors defined in `src/styles/globals.css:7-61` — primary: `#d97857`, accents: blue `#6a9bcc`, green `#788c5d`
- Fonts: IBM Plex Sans (body), JetBrains Mono (code). Brand guidelines also specify Play for headings but it's not currently loaded
- Framer Motion is the animation library (already a dependency)
- `react-rough-notation` used for headline annotations
- All CTAs funnel to `#booking-form` anchor with PostHog analytics tracking
- ScrollReveal component at `src/components/motion/ScrollReveal.tsx`
- Dark mode fully supported via `.dark` class

## Desired End State

6 git branches, each containing a distinct hero section implementation:
- `design/hero-v1-pipeline-builder` — Consultant-targeted, editorial aesthetic
- `design/hero-v2-speed-wins` — Consultant-targeted, high-energy/brutalist
- `design/hero-v3-ai-wingman` — Consultant-targeted, warm/organic
- `design/hero-v4-scale-without-headcount` — Management-targeted, refined/luxury
- `design/hero-v5-compliance-metrics` — Management-targeted, data-viz/dashboard
- `design/hero-v6-revenue-machine` — Management-targeted, bold/maximalist

Each branch modifies ONLY `src/components/sections/Hero.tsx` (and adds any needed assets to `public/`). The rest of the page remains unchanged — this isolates the hero experiment.

### Verification:
- `make check` passes on each branch
- `make build` succeeds on each branch
- Each hero is visually distinct in both light and dark mode
- Each hero has proper accessibility (heading hierarchy, contrast, reduced motion support)

## What We're NOT Doing

- Rebuilding any section other than Hero
- Updating copy in Problem, Solution, Results, Pricing, FAQ, BookingForm, etc.
- Changing the booking form, analytics, or CTA destinations
- Modifying the navbar, footer, or layout
- Adding new dependencies (use existing: framer-motion, react-rough-notation, lucide-react, etc.)
- Mobile-first responsive polish (these are concepts; responsive refinement comes after picking a winner)

## Implementation Approach

For each of the 6 designs:
1. Create branch from `main`
2. Apply `/copywriting` thinking for the audience-specific messaging
3. Apply `/frontend-design` + `/brand-guidelines` for the visual implementation
4. Apply `/baseline-ui` principles to avoid AI slop
5. Verify with `make check` and `make build`

Each hero must:
- Have a single `<h1>` with the primary value proposition
- Have a supporting subheadline/description
- Have 1-2 CTAs (primary: scroll to booking form, secondary: scroll to features/how-it-works)
- Support dark mode
- Respect `prefers-reduced-motion`
- Use PostHog analytics tracking on CTAs (existing `analytics.cta.click()` pattern)

---

## Design Concepts

### Consultant-Targeted (3 concepts)

These speak to the individual new home sales consultant. Their pain: low lead volume, no qualified pipeline ready when lots drop, other consultants winning allocations. Their desire: a warm pipeline on tap, instant lot-lead matching, never missing a follow-up.

---

### V1: "The Pipeline Builder" — Editorial Aesthetic

**Branch:** `design/hero-v1-pipeline-builder`

**Audience:** New home sales consultant who feels behind — low walk-in volume, no pipeline, watching other consultants win lots.

**Headline:** `Your Pipeline, Always Ready`
**Subheadline:** `When a lot drops in Logan, you already have three qualified buyers. AI qualification, scoring, and follow-up — so you never scramble for a lead again.`
**CTA Primary:** `Start Building Your Pipeline`
**CTA Secondary:** `See How It Works`

**Aesthetic Direction:**
- Editorial/magazine feel — large, confident typography with generous whitespace
- Load the Play font for the `<h1>` (per brand guidelines for headings)
- Warm, muted background tones from the brand palette (`#faf9f5` light / `#141413` dark)
- A subtle, abstract representation of a pipeline (horizontal flow of dots/nodes transitioning from cold → warm → hot using brand accent colors: blue → orange → green)
- No heavy animation — a single, slow fade-in stagger on load. The confidence comes from the typography and spacing, not motion.
- Asymmetric layout: headline left-weighted, pipeline visualization right

**Visual Elements:**
- Pipeline visualization: 3-4 abstract lead nodes flowing left-to-right, each with a status dot (blue=new, orange=qualifying, green=ready). CSS-only or minimal Framer Motion.
- A faint grid or noise texture background (existing `public/grid.svg` or `public/noise.svg`)
- Trust signal below CTAs: "Built for QLD new home sales consultants"

---

### V2: "Speed Wins" — High-Energy/Brutalist

**Branch:** `design/hero-v2-speed-wins`

**Audience:** Competitive consultant who wants to win. Lot drops are a race — first consultant with a buyer wins.

**Headline:** `First to the Lot. First to the Sale.`
**Subheadline:** `New lot in Springfield? Your AI already matched 4 qualified buyers. While other consultants are still checking spreadsheets, you're booking contracts.`
**CTA Primary:** `Get First-Mover Advantage`
**CTA Secondary:** `Watch the Demo`

**Aesthetic Direction:**
- High-energy, urgent, competitive. Monospace typography (JetBrains Mono for headline — breaking convention intentionally)
- Stark contrast — near-black background with bright primary orange accents
- An animated "lot alert" notification that slides in: `🔔 New lot available: Lot 42, Springfield Central — 4 matched buyers`
- Terminal/command-line inspired elements — the AI feels like a powerful tool, not a cute chatbot
- Sharp edges, no border-radius. Brutalist grid structure.

**Visual Elements:**
- A mock "lot alert" card with monospace text, glowing orange border, animated entrance
- Counter or ticker: "Avg. match time: 4.2 seconds" with tabular-nums
- Dark mode primary — light mode is the alternate here
- Animated accent line that draws across the top of the hero on load

---

### V3: "Your AI Wingman" — Warm/Organic

**Branch:** `design/hero-v3-ai-wingman`

**Audience:** Consultant who's good at closing but drowning in admin. Wants a reliable partner, not a robot.

**Headline:** `You Close. Your AI Handles the Rest.`
**Subheadline:** `Follow-ups sent. Leads scored. Pipeline organized. Your AI assistant manages the work between conversations — so every walk-in gets the attention they deserve.`
**CTA Primary:** `Meet Your AI Assistant`
**CTA Secondary:** `How It Works`

**Aesthetic Direction:**
- Warm, approachable, human. Rounded shapes, generous padding, soft shadows
- Warm gradient background: subtle shift from `#faf9f5` to a slightly warmer cream tone
- Conversational UI element — a mock "AI suggestion" card that shows a drafted follow-up message with an "Approve & Send" button, demonstrating the HITL workflow
- Illustrations or icons that feel hand-drawn or organic (not corporate clip art)
- Smooth, gentle animations — elements float in softly

**Visual Elements:**
- Mock message card: "Draft follow-up for Sarah Chen (walk-in, Mar 28)" with a preview of the AI-drafted message and approve/edit buttons
- Small trust indicators: "You review everything before it sends" with a shield icon
- Accent green (`#788c5d`) used for "approved" states to create a feeling of growth/nature

---

### Management-Targeted (3 concepts)

These speak to the sales manager or builder principal. Their pain: inconsistent consultant performance, leads falling through cracks, no visibility into pipeline health. Their desire: every consultant performing at peak, every lead followed up, data to make decisions.

---

### V4: "Scale Without Headcount" — Refined/Luxury

**Branch:** `design/hero-v4-scale-without-headcount`

**Audience:** Builder principal or sales manager evaluating tools. Cares about ROI, efficiency, team performance.

**Headline:** `Every Consultant. Peak Performance. Zero New Hires.`
**Subheadline:** `AI-powered lead qualification, follow-up automation, and lot matching for your entire sales team. Enterprise reliability built for volume builders.`
**CTA Primary:** `Book a Strategy Call`
**CTA Secondary:** `View Capabilities`

**Aesthetic Direction:**
- Refined, premium, confident. Geometric precision.
- Clean layout with mathematical spacing (8px grid strictly enforced)
- Restrained color — mostly neutrals with strategic use of primary orange for the single most important element (CTA)
- Subtle geometric pattern or architectural line drawing in the background (nods to home building)
- Typography: Large, light-weight heading (Play at 300 weight if available, or IBM Plex Sans light)

**Visual Elements:**
- Three compact metric pills below the subheadline: "100% Follow-up Compliance" | "3x Pipeline Depth" | "< 5 min Qualification"
- A thin, elegant divider line with the Rekurve logo mark
- No animation except a single refined fade-in on load

---

### V5: "The Metrics That Matter" — Data-Viz/Dashboard

**Branch:** `design/hero-v5-compliance-metrics`

**Audience:** Data-driven sales manager who manages by numbers. Wants visibility and control.

**Headline:** `See Every Lead. Track Every Follow-Up. Miss Nothing.`
**Subheadline:** `Real-time pipeline visibility across your entire sales team. AI scores leads, drafts follow-ups, and flags at-risk deals — so nothing falls through the cracks.`
**CTA Primary:** `Request a Demo`
**CTA Secondary:** `Explore Features`

**Aesthetic Direction:**
- Dashboard/data-visualization inspired. Grid-based layout with clear information hierarchy.
- A mock mini-dashboard embedded in the hero: pipeline funnel chart, follow-up compliance gauge, lead score distribution
- Monospace numbers (JetBrains Mono) for all metrics — tabular-nums
- Blue accent (`#6a9bcc`) as the dominant accent here (data/info color)
- Clean card-based layout with subtle borders and shadows

**Visual Elements:**
- Mini dashboard mockup with 3 cards: Pipeline Health (funnel), Response Time (gauge), AI Actions Today (counter)
- Animated counters that tick up on scroll-into-view
- Subtle grid background pattern

---

### V6: "Revenue Machine" — Bold/Maximalist

**Branch:** `design/hero-v6-revenue-machine`

**Audience:** Builder principal focused on growth. Wants to see the money.

**Headline:** `Turn Walk-Ins Into Contracts. Automatically.`
**Subheadline:** `Your sales consultants focus on closing. AI handles qualification, scoring, follow-up, and lot matching. More contracts. Same team.`
**CTA Primary:** `See the ROI`
**CTA Secondary:** `Talk to Us`

**Aesthetic Direction:**
- Bold, maximalist, confident. Large numbers dominate.
- Full-width hero with a dramatic gradient: dark charcoal to primary orange glow
- Oversized typography — the headline should feel like it owns the viewport
- Key stats displayed huge: "$966K avg. package" | "13,000 lot shortfall" | "$58K buyer incentives"
- Market urgency baked in — reference the FHOG deadline, Olympics escalation
- Orange (`#d97857`) used generously — this is the boldest of all 6 designs

**Visual Elements:**
- Three large stat blocks with market data (pulled from the validated design doc)
- A subtle urgency banner: "First Home Owner Grant drops to $15K after June 2026"
- Animated gradient glow behind the headline
- Strong visual weight — this hero commands attention

---

## Phase 1: Branch Setup & Shared Prep

### Overview
Create all 6 branches from main and verify the base builds cleanly.

### Steps:
1. Ensure `main` is up to date
2. Create 6 branches: `design/hero-v1-pipeline-builder` through `design/hero-v6-revenue-machine`
3. Verify `make check` and `make build` pass on the base

### Success Criteria:

#### Automated Verification:
- [x] All 6 branches created from main
- [x] `make check` passes on base

---

## Phase 2: Implement Each Hero (6 iterations)

### Overview
Implement each hero design on its respective branch. Each implementation follows the same process:

### Process per branch:
1. Check out the branch
2. Replace `src/components/sections/Hero.tsx` with the new design
3. Add any static assets to `public/` if needed
4. Run `make check` to verify no lint/type errors
5. Run `make build` to verify production build succeeds
6. Commit the changes

### Per-design Implementation Notes:

**V1 (Pipeline Builder):** Focus on typography scale and whitespace. The pipeline visualization can be pure CSS with flexbox and colored dots. Keep it under 150 lines.

**V2 (Speed Wins):** The "lot alert" card is the hero's signature element. Use Framer Motion for the slide-in. Dark mode is the primary experience here.

**V3 (AI Wingman):** The mock message card is key — make it feel like a real app preview. Use existing Card component from `src/components/ui/Card.tsx`.

**V4 (Scale Without Headcount):** Restraint is the design principle. If in doubt, remove elements. The whitespace IS the design.

**V5 (Compliance Metrics):** The mini-dashboard is the centerpiece. Use CSS grid for the 3-card layout. Animated counters with Framer Motion's `useInView`.

**V6 (Revenue Machine):** Go big. Oversized type, dramatic gradients, bold stats. This is the most visually intense design.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes on each branch
- [x] `make build` succeeds on each branch

#### Manual Verification:
- [ ] Each hero is visually distinct (not 6 variations of the same thing)
- [ ] Light and dark mode both look intentional on each design
- [ ] Heading hierarchy: single `<h1>` per hero
- [ ] CTAs link to `#booking-form` and `#how-it-works` (or equivalent anchors)
- [ ] `prefers-reduced-motion` disables animations
- [ ] PostHog CTA tracking calls present
- [ ] No horizontal scroll or overflow issues at 1280px viewport

---

## Phase 3: Visual Review

### Overview
Run `/design_review` on each branch to catch accessibility, contrast, and brand issues.

### Success Criteria:

#### Manual Verification:
- [ ] All 6 designs pass WCAG AA contrast requirements
- [ ] Focus states visible on all interactive elements
- [ ] No brand guideline violations flagged
- [ ] Each design communicates a clear, distinct value proposition within 5 seconds

---

## Testing Strategy

### Automated:
- `make check` (lint + typecheck) on each branch
- `make build` (production build) on each branch

### Manual:
- Visual inspection at 1280px, 768px, and 375px viewports
- Dark mode toggle on each design
- Reduced motion preference test
- Screen reader pass on heading + CTA structure

## References

- Validated product design: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- Brand guidelines: `.claude/skills/brand-guidelines/SKILL.md`
- Frontend design skill: `.claude/skills/frontend-design/SKILL.md`
- Current hero: `src/components/sections/Hero.tsx`
- Project pivot memory: `memory/project_pivot_new_home_sales.md`
- Pilot customer: `memory/pilot_customer_creation_homes.md`
