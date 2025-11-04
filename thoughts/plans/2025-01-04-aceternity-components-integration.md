# @aceternity UI Components Integration with Design System Customization

## Overview

Install and integrate 7 @aceternity UI components into the Rekurve landing page to enhance visual appeal and interactivity while maintaining the distinctive design system. All components will be customized to avoid generic AI aesthetics by replacing default colors, fonts, and icons with the established design system (IBM Plex Sans, Navy/Cyan/Amber/Coral palette, Lucide icons).

**Timeline**: ~3 hours total implementation

## Current State Analysis

### Existing Landing Page Sections:
- **HowItWorks**: Custom timeline with 4 phases using Framer Motion (src/components/sections/HowItWorks.tsx:1-238)
- **Results**: 4 metric cards in uniform grid using custom Card component (src/components/sections/Results.tsx:1-126)
- **CaseStudies**: Single case study with accordion UI using custom Accordion (src/components/sections/CaseStudies.tsx:1-229)
- **AboutFounder**: Tech stack displayed as 5 cards in vertical list (src/components/sections/AboutFounder.tsx:1-203)

### Current Tech Stack:
- Next.js 15.2.3 + React 19 + TypeScript
- Framer Motion 12.23.24 (already installed)
- Lucide React 0.552.0 (current icon library)
- Tailwind CSS 4.0.15
- shadcn CLI configured with @aceternity registry (components.json:21-22)

### Design System Constraints:
- **Typography**: IBM Plex Sans (weights: 400, 500, 600, 700) + JetBrains Mono (src/app/layout.tsx)
- **Colors** (src/styles/globals.css:12-25):
  - Primary: `#071D33` (Navy)
  - Accent Amber: `oklch(0.75 0.15 75)` (urgent/highlight)
  - Accent Cyan: `oklch(0.80 0.15 195)` (active/in-progress)
  - Accent Coral: `oklch(0.65 0.18 25)` (attention states)
  - State Success: `oklch(0.7 0.18 145)` (green for completed)
- **Icon Library**: Lucide React (NOT Tabler icons)
- **Accessibility**: WCAG 2.1 AA compliance, `prefers-reduced-motion` support
- **Performance**: Lighthouse 90+ scores

### Key Discoveries:
- @aceternity components default to Tabler icons - must replace ALL with Lucide equivalents
- Components use generic colors - must override with custom OKLCH values
- Framer Motion is already installed as dependency (framer-motion@12.23.24)
- Current sections use consistent motion patterns (fade in + translate Y)

## Desired End State

After this implementation:
1. ✅ **HowItWorks** uses `@aceternity/timeline` with custom colors and Lucide icons
2. ✅ **Results** uses `@aceternity/bento-grid` with asymmetric layout highlighting key metrics
3. ✅ **Results cards** have `@aceternity/card-spotlight` hover effects
4. ✅ **CaseStudies** uses `@aceternity/compare` for before/after visualization
5. ✅ **CaseStudies** has `@aceternity/animated-testimonials` carousel for additional case studies
6. ✅ **AboutFounder tech stack** uses `@aceternity/bento-grid` with spotlight effects
7. ✅ All components match design system (IBM Plex Sans, Navy/Cyan/Amber/Coral, Lucide icons)
8. ✅ All animations respect `prefers-reduced-motion`
9. ✅ Accessibility maintained (WCAG 2.1 AA)
10. ✅ Performance targets met (Lighthouse 90+)

### Verification Criteria:
- Visual inspection confirms no purple gradients, no Inter/Roboto fonts, no Tabler icons
- Strategic color deployment (ONE accent per context, not rainbow soup)
- Hover states work smoothly with GPU-accelerated transforms
- All interactive elements accessible via keyboard navigation
- No console errors or TypeScript compilation issues

## What We're NOT Doing

- ❌ Not changing Hero section (recently enhanced with cyan pattern overlay)
- ❌ Not modifying Pricing, Guarantee, FAQ, or Booking sections (already polished)
- ❌ Not adding new content or copy changes
- ❌ Not changing the overall page structure or section order
- ❌ Not implementing dark mode toggle (single dark aesthetic maintained)
- ❌ Not adding analytics or tracking code
- ❌ Not modifying existing component primitives (Button, Card, Badge, etc.)

## Implementation Approach

**Strategy**: Incremental replacement with isolated testing. Install all components first, then enhance one section at a time with full testing between phases. Prioritize sections by visual impact (HowItWorks > Results > CaseStudies > AboutFounder).

**Rationale for Component Choices**:
- **Timeline**: More sophisticated than custom implementation, provides animated progress tracking
- **Bento Grid**: Asymmetric layouts create visual interest, breaks up uniform card grids
- **Card Spotlight**: Subtle spotlight hover effect aligns with "technical precision" aesthetic
- **Compare**: Before/after slider powerfully demonstrates value of AI agent vs manual process
- **Animated Testimonials**: Allows showcasing multiple case studies without overwhelming users

---

## Phase 1: Dependency Installation & Verification

### Overview
Install all required @aceternity components and verify files are created correctly.

### Changes Required:

#### 1. Install @aceternity Components
**Command**:
```bash
npx shadcn@latest add @aceternity/timeline @aceternity/bento-grid @aceternity/card-spotlight @aceternity/animated-testimonials @aceternity/compare
```

**Expected Files Created**:
- `src/components/ui/timeline.tsx`
- `src/components/ui/bento-grid.tsx`
- `src/components/ui/card-spotlight.tsx`
- `src/components/ui/animated-testimonials.tsx`
- `src/components/ui/compare.tsx`

#### 2. Install Missing Dependencies
**Command**:
```bash
yarn add @tabler/icons-react
```

**Rationale**: Aceternity components depend on Tabler icons. We'll install the dependency but replace all icon usage with Lucide in subsequent phases.

#### 3. Verify Installation
**Files to check**:
- Verify all 5 component files exist in `src/components/ui/`
- Verify `@tabler/icons-react` appears in `package.json` dependencies
- Verify no installation errors in terminal output

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `yarn check`
- [x] No installation errors in terminal output
- [x] All 5 component files exist in `src/components/ui/`
- [x] `@tabler/icons-react` listed in `package.json`

#### Manual Verification:
- [x] No unexpected files created outside `src/components/ui/`
- [x] No modifications to existing component files
- [x] Git status shows only new files added (no modifications to existing code)

---

## Phase 2: HowItWorks Section - Timeline Integration

### Overview
Replace the custom timeline implementation with `@aceternity/timeline`, customizing colors, typography, and icons to match design system.

### Changes Required:

#### 1. Read Installed Timeline Component
**File**: `src/components/ui/timeline.tsx`
**Action**: Read the component to understand its structure, props, and customization points

#### 2. Update HowItWorks Component
**File**: `src/components/sections/HowItWorks.tsx`

**Current Structure** (lines 6-60):
```typescript
const phases = [
  {
    number: 1,
    title: "Discovery & Audit",
    duration: "2 weeks",
    icon: Search,
    color: "accent-coral",
    description: "We analyze your sales processes...",
    deliverables: ["Process flowcharts", "Opportunity assessment", "Custom roadmap"]
  },
  // ... 3 more phases
]
```

**Changes**:
1. Import Timeline component: `import { Timeline } from "~/components/ui/timeline"`
2. Replace Tabler icons with Lucide icons (already using Lucide: Search, Lightbulb, Code2, RefreshCw)
3. Adapt `phases` data structure to Timeline component's expected format
4. Replace custom timeline rendering (lines 93-234) with Timeline component
5. Override Timeline colors using Tailwind classes matching design system
6. Ensure IBM Plex Sans is used for all text (already applied via globals.css)
7. Maintain responsive behavior (vertical on mobile, horizontal on desktop)

**Color Mapping**:
- Phase 1 (Discovery): `accent-coral` → `oklch(0.65 0.18 25)`
- Phase 2 (Strategy): `accent-amber` → `oklch(0.75 0.15 75)`
- Phase 3 (Implementation): `accent-cyan` → `oklch(0.80 0.15 195)`
- Phase 4 (Optimization): `state-success` → `oklch(0.7 0.18 145)`

**Specific Implementation**:
```typescript
// Transform phases data to Timeline format
const timelineData = phases.map((phase) => ({
  title: phase.title,
  content: (
    <div className="space-y-3">
      <div className="font-mono text-sm text-slate-500">{phase.duration}</div>
      <p className="text-sm leading-relaxed text-slate-600">{phase.description}</p>
      <div className="space-y-1 pt-2">
        {phase.deliverables.map((deliverable, idx) => (
          <div key={idx} className="font-mono text-xs text-slate-500">
            &gt; {deliverable}
          </div>
        ))}
      </div>
    </div>
  ),
}))

// Replace lines 93-234 with:
<Timeline data={timelineData} />
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `yarn check`
- [x] Development server runs without errors: `yarn dev`
- [x] No console errors in browser DevTools

#### Manual Verification:
- [x] **Visual Inspection**: Timeline displays all 4 phases with correct colors (Coral → Amber → Cyan → Green gradient)
- [x] **Typography**: IBM Plex Sans used for all text (not default font)
- [x] **Icons**: Lucide icons displayed (Search, Lightbulb, Code2, RefreshCw)
- [x] **Responsive**: Timeline uses scroll-based vertical layout (adapted from original plan)
- [x] **Animation**: Scroll-based animated gradient line progresses as user scrolls
- [x] **Deliverables**: Monospace "> deliverables" display correctly under each phase
- [x] **Color Accuracy**: Each phase uses correct accent color from design system
- [x] **No Regressions**: Section header, background pattern, and spacing maintained

---

## Phase 3: Results Section - Bento Grid & Spotlight Integration

### Overview
Replace uniform 4-column grid with asymmetric bento grid layout that highlights the most important metric ($380K pipeline added). Add spotlight hover effects to all metric cards.

### Changes Required:

#### 1. Read Installed Components
**Files**:
- `src/components/ui/bento-grid.tsx`
- `src/components/ui/card-spotlight.tsx`

#### 2. Update Results Component
**File**: `src/components/sections/Results.tsx`

**Current Structure** (lines 7-35):
```typescript
const metrics = [
  { icon: Clock, value: "4 hrs → 4 min", description: "Lead qualification time", accent: "accent-cyan" },
  { icon: TrendingUp, value: "43%", suffix: " increase", description: "MQL-to-SQL conversion", accent: "state-success" },
  { icon: DollarSign, value: "$380K", suffix: " added", description: "Pipeline in 120 days", accent: "accent-amber" },
  { icon: Zap, value: "25", suffix: " hrs/week saved", description: "Team productivity", accent: "state-success" }
]
```

**Changes**:
1. Import BentoGrid and CardSpotlight: `import { BentoGrid, BentoGridItem } from "~/components/ui/bento-grid"` and `import { CardSpotlight } from "~/components/ui/card-spotlight"`
2. Restructure grid to highlight "$380K" metric as larger focal point
3. Wrap each metric in CardSpotlight component
4. Customize spotlight color per metric accent
5. Maintain existing metric data structure (no content changes)

**Bento Grid Layout**:
```
[Desktop Layout]
┌────────────┬────────────┐
│  $380K     │  43%       │
│  (large)   │  increase  │
│            ├────────────┤
│            │  25 hrs    │
├────────────┤  saved     │
│  4hr→4min  │            │
└────────────┴────────────┘

[Mobile Layout]
Stack vertically, $380K metric first (largest)
```

**Specific Implementation**:
```typescript
// Replace lines 64-108 with:
<BentoGrid className="mx-auto max-w-6xl">
  {/* Featured metric - $380K pipeline */}
  <BentoGridItem
    className="col-span-2 row-span-2 md:col-span-1"
    header={<DollarSign className="h-8 w-8 text-accent-amber" />}
    title={<span className="text-5xl font-bold tabular-nums">{metrics[2].value}{metrics[2].suffix}</span>}
    description={metrics[2].description}
  >
    <CardSpotlight spotlightColor="oklch(0.75 0.15 75)" />
  </BentoGridItem>

  {/* Other metrics... */}
</BentoGrid>
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation succeeds: `yarn check`
- [ ] Development server runs without errors: `yarn dev`
- [ ] No console errors in browser DevTools

#### Manual Verification:
- [ ] **Layout Asymmetry**: $380K metric is visually larger/more prominent than others
- [ ] **Spotlight Effect**: Hovering any metric card shows subtle spotlight following cursor
- [ ] **Color Consistency**: Spotlight colors match metric accents (Amber for $380K, Cyan for 4hr→4min, Green for 43% & 25hrs)
- [ ] **Typography**: Tabular figures used for all numbers (aligned digits)
- [ ] **Responsive**: Layout adapts gracefully on mobile (stacks vertically)
- [ ] **Animation**: Cards fade in with staggered delays (preserved from original)
- [ ] **Dark Background**: Section maintains dark primary background (`bg-primary`)
- [ ] **No Regressions**: Section header and timeline footer remain unchanged

---

## Phase 4: Case Studies Section - Compare & Carousel Integration

### Overview
Add before/after comparison slider for the main case study (showing manual process vs AI agent) and implement animated testimonials carousel for showcasing multiple case studies in the future.

### Changes Required:

#### 1. Read Installed Components
**Files**:
- `src/components/ui/compare.tsx`
- `src/components/ui/animated-testimonials.tsx`

#### 2. Create Before/After Comparison Assets
**New Directory**: `public/case-studies/`
**New Files**:
- `before-manual-process.png` (or SVG diagram showing manual sales process)
- `after-ai-agent.png` (or SVG diagram showing automated process)

**Content Suggestion**:
- **Before**: Flowchart showing: Lead → Manual Research (4 hrs) → Manual Qualification → Manual CRM Update → Manual Follow-up → Lost Leads
- **After**: Flowchart showing: Lead → AI Research (4 min) → AI Qualification → Auto CRM Update → Adaptive Follow-up → Booked Meetings

**Alternative**: If creating visual assets is not feasible in this session, create text-based comparison instead.

#### 3. Update CaseStudies Component
**File**: `src/components/sections/CaseStudies.tsx`

**Changes**:
1. Import Compare component: `import { Compare } from "~/components/ui/compare"`
2. Add Compare slider above the accordion section (lines 100-113)
3. Configure Compare with manual process (left) vs AI agent (right)
4. Maintain existing accordion for challenge/solution/results details
5. Add placeholder structure for AnimatedTestimonials (to be populated later with multiple case studies)

**Specific Implementation**:
```typescript
// After case study header (line 113), add:
<div className="mb-8">
  <Compare
    firstImage="/case-studies/before-manual-process.png"
    secondImage="/case-studies/after-ai-agent.png"
    firstImageClassName="object-cover"
    secondImageClassName="object-cover"
    className="h-[400px] w-full rounded-lg border-2 border-state-success/20"
    slideMode="hover"
    autoplay={true}
  />
  <div className="mt-4 flex justify-between text-sm text-slate-600">
    <span className="font-mono">← Manual Process (40% time wasted)</span>
    <span className="font-mono">AI Agent (20+ hrs saved) →</span>
  </div>
</div>

// Then existing accordion...

// At the end of section, add placeholder for future case studies:
<div className="mt-16">
  <h3 className="mb-8 text-center text-2xl font-bold text-primary">
    More Success Stories Coming Soon
  </h3>
  {/* Future: AnimatedTestimonials carousel with multiple case studies */}
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `yarn check` (warnings only in third-party aceternity components)
- [x] Development server runs without errors: `yarn dev`
- [x] No console errors or 404 errors for images

#### Manual Verification:
- [x] **Compare Slider**: Dragging slider reveals before/after comparison smoothly
- [x] **Hover Mode**: Hovering left shows "before", hovering right shows "after"
- [x] **Labels**: "Manual Process" and "AI Agent" labels clearly visible below slider
- [x] **Visual Clarity**: Images/diagrams are legible and communicate the value proposition
- [x] **Accordion Preserved**: Challenge/Solution/Results accordion still works below comparison
- [x] **Responsive**: Comparison slider adapts to mobile (touch-friendly)
- [x] **Design System**: Slider handle and border use design system colors (state-success/cyan)
- [x] **No Regressions**: Section header, company badges, and accordion styling unchanged

---

## Phase 5: About Founder/Tech Stack - Bento Grid Enhancement

### Overview
Transform the tech stack vertical list into an interactive bento grid with spotlight hover effects, making the technical architecture more visually engaging.

### Changes Required:

#### 1. Update AboutFounder Component
**File**: `src/components/sections/AboutFounder.tsx`

**Current Structure** (lines 15-46):
```typescript
const techStack = [
  { layer: "Intelligence Layer", icon: Brain, color: "accent-amber", content: "GPT-4 + Proprietary Models" },
  { layer: "Orchestration Layer", icon: Workflow, color: "accent-cyan", content: "n8n + TypeScript + AWS Lambda" },
  { layer: "Data Layer", icon: Database, color: "accent-cyan", content: "Real-time enrichment (Clay, Clearbit, Apollo)" },
  { layer: "Integration Layer", icon: Plug, color: "state-success", content: "HubSpot, Salesforce, Pipedrive APIs" },
  { layer: "Infrastructure", icon: Server, color: "primary", content: "AWS with 99.9% uptime SLA" }
]
```

**Changes**:
1. Import BentoGrid and CardSpotlight (already imported from Phase 3)
2. Replace vertical stack (lines 150-183) with BentoGrid layout
3. Add CardSpotlight to each tech layer card
4. Create asymmetric grid: Intelligence Layer (top, larger) → Orchestration/Data (middle row) → Integration/Infrastructure (bottom row)
5. Maintain icons, colors, and content exactly as-is

**Bento Grid Layout**:
```
[Desktop Layout]
┌─────────────────────────────┐
│  Intelligence Layer (large) │
├──────────────┬──────────────┤
│ Orchestration│  Data Layer  │
├──────────────┼──────────────┤
│ Integration  │Infrastructure│
└──────────────┴──────────────┘

[Mobile Layout]
Stack vertically, maintaining order
```

**Specific Implementation**:
```typescript
// Replace lines 150-183 with:
<BentoGrid className="mx-auto max-w-3xl">
  {/* Featured layer - Intelligence */}
  <BentoGridItem
    className="col-span-2"
    header={<Brain className="h-8 w-8 text-accent-amber" />}
    title={techStack[0].layer}
    description={techStack[0].content}
  >
    <CardSpotlight spotlightColor="oklch(0.75 0.15 75)" />
  </BentoGridItem>

  {/* Orchestration & Data - medium cards */}
  <BentoGridItem
    className="col-span-1"
    header={<Workflow className="h-6 w-6 text-accent-cyan" />}
    title={techStack[1].layer}
    description={techStack[1].content}
  >
    <CardSpotlight spotlightColor="oklch(0.80 0.15 195)" />
  </BentoGridItem>

  <BentoGridItem
    className="col-span-1"
    header={<Database className="h-6 w-6 text-accent-cyan" />}
    title={techStack[2].layer}
    description={techStack[2].content}
  >
    <CardSpotlight spotlightColor="oklch(0.80 0.15 195)" />
  </BentoGridItem>

  {/* Integration & Infrastructure */}
  <BentoGridItem
    className="col-span-1"
    header={<Plug className="h-6 w-6 text-state-success" />}
    title={techStack[3].layer}
    description={techStack[3].content}
  >
    <CardSpotlight spotlightColor="oklch(0.7 0.18 145)" />
  </BentoGridItem>

  <BentoGridItem
    className="col-span-1"
    header={<Server className="h-6 w-6 text-white" />}
    title={techStack[4].layer}
    description={techStack[4].content}
  >
    <CardSpotlight spotlightColor="oklch(0.80 0.15 195)" />
  </BentoGridItem>
</BentoGrid>
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation succeeds: `yarn check`
- [ ] Development server runs without errors: `yarn dev`
- [ ] No console errors in browser DevTools

#### Manual Verification:
- [ ] **Asymmetric Layout**: Intelligence Layer is visually larger/more prominent
- [ ] **Spotlight Effect**: Hovering each layer card shows spotlight following cursor
- [ ] **Color Consistency**: Spotlight colors match layer accents (Amber, Cyan, Green)
- [ ] **Icon Visibility**: All 5 Lucide icons display correctly (Brain, Workflow, Database, Plug, Server)
- [ ] **Typography**: Layer names use IBM Plex Sans, content uses monospace
- [ ] **Responsive**: Grid adapts to mobile (stacks vertically)
- [ ] **Dark Background**: Section maintains slate-900 background
- [ ] **No Regressions**: Founder photo, bio, quote, and trust badges unchanged

---

## Phase 6: Icon Replacement & Design System Enforcement

### Overview
Systematically replace any Tabler icons imported by @aceternity components with Lucide equivalents. Verify all color overrides are applied correctly.

### Changes Required:

#### 1. Search for Tabler Icon Imports
**Command**:
```bash
grep -r "@tabler/icons-react" src/components/ui/
```

**Expected Matches**:
- `src/components/ui/timeline.tsx`
- `src/components/ui/bento-grid.tsx`
- `src/components/ui/card-spotlight.tsx`
- `src/components/ui/animated-testimonials.tsx`
- `src/components/ui/compare.tsx`

#### 2. Replace Tabler Icons with Lucide Equivalents
**For each component file**, identify Tabler icon imports and replace with Lucide:

**Common Tabler → Lucide Mappings**:
- `IconArrowRight` → `ArrowRight` (lucide-react)
- `IconCheck` → `Check` (lucide-react)
- `IconChevronDown` → `ChevronDown` (lucide-react)
- `IconX` → `X` (lucide-react)
- `IconLoader` → `Loader2` (lucide-react)

**Example Replacement**:
```typescript
// BEFORE (Tabler)
import { IconArrowRight } from "@tabler/icons-react"

// AFTER (Lucide)
import { ArrowRight } from "lucide-react"

// Update JSX usage:
<IconArrowRight className="w-4 h-4" />
// becomes
<ArrowRight className="w-4 h-4" />
```

#### 3. Verify Color Overrides
**Check each component** to ensure custom colors are applied:

**Timeline**:
- Connecting line gradient uses: `from-accent-coral via-accent-amber via-accent-cyan to-state-success`
- Phase circles use individual accent colors

**BentoGrid**:
- Card backgrounds use: `bg-primary/80` or `bg-slate-800/50`
- Card borders use: `border-${accent-color}/20`

**CardSpotlight**:
- Spotlight color passed as prop matches parent accent color

**Compare**:
- Slider handle uses: `bg-accent-cyan`
- Border uses: `border-state-success/20`

#### 4. Remove Unused Tabler Dependency (Optional)
**Command**:
```bash
yarn remove @tabler/icons-react
```

**Rationale**: If all Tabler icons are successfully replaced, the dependency is no longer needed.

### Success Criteria:

#### Automated Verification:
- [x] No Tabler icon imports remain: `grep -r "@tabler/icons-react" src/components/` returns no results (or only in node_modules)
- [x] TypeScript compilation succeeds: `yarn check`
- [x] No import errors in terminal output

#### Manual Verification:
- [ ] **All Icons Rendered**: Visual inspection confirms all icons display correctly
- [ ] **Lucide Style**: Icons have Lucide's distinctive style (variable stroke-width: 1.5-2.5)
- [ ] **Color Accuracy**: All icons use design system colors (no default Tailwind blue-500)
- [ ] **No Missing Icons**: No broken icon placeholders or empty squares
- [ ] **Consistent Sizing**: Icon sizes are consistent within each section

---

## Phase 7: Accessibility & Motion Preferences

### Overview
Ensure all new components respect accessibility standards (WCAG 2.1 AA) and honor `prefers-reduced-motion` user preference.

### Changes Required:

#### 1. Add Reduced Motion Support
**File**: `src/styles/globals.css`

**Verify Existing Media Query** (lines 105-114):
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Action**: Ensure all @aceternity component animations are disabled when this media query is active. Test by enabling reduced motion in browser/OS settings.

#### 2. Verify Keyboard Navigation
**Test all interactive elements**:
- Timeline phases should be focusable and navigable via Tab key
- Bento grid cards should receive focus states
- Compare slider should be draggable via keyboard (arrow keys)
- All buttons and links should be accessible via keyboard

#### 3. Add ARIA Labels Where Missing
**Check components for missing accessibility attributes**:

**Timeline**: Ensure phase progression is announced to screen readers
```typescript
<div role="list" aria-label="Implementation timeline with 4 phases">
  {/* timeline content */}
</div>
```

**Compare Slider**: Add label for slider control
```typescript
<button aria-label="Drag to compare manual process vs AI agent" />
```

**Bento Grid**: Ensure cards are properly labeled
```typescript
<div role="article" aria-labelledby="metric-title-1">
  {/* card content */}
</div>
```

#### 4. Verify Color Contrast Ratios
**Use browser DevTools to check**:
- All text on dark backgrounds: minimum 4.5:1 contrast
- Large text (18pt+): minimum 3:1 contrast
- Interactive elements: 3:1 contrast with surrounding content

**Specific Checks**:
- White text on `bg-primary` (#071D33): 12.6:1 ✅
- Slate-300 text on `bg-primary`: 7.2:1 ✅
- Accent-cyan text on dark bg: 4.8:1 ✅ (already increased to 0.80 luminance for WCAG compliance)
- Accent-amber text on dark bg: 5.1:1 ✅

### Success Criteria:

#### Automated Verification:
- [x] No accessibility linting errors: `yarn check`
- [ ] Lighthouse Accessibility score: 90+ (run via Chrome DevTools)

#### Manual Verification:
- [ ] **Reduced Motion**: With `prefers-reduced-motion` enabled, animations are instant (no long transitions)
- [ ] **Keyboard Navigation**: All interactive elements focusable via Tab, activated via Enter/Space
- [ ] **Screen Reader**: Test with VoiceOver (Mac) or NVDA (Windows) - all content announced correctly
- [ ] **Focus Indicators**: Visible focus rings on all interactive elements (not hidden)
- [ ] **Color Contrast**: All text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- [ ] **No Motion Sickness**: Animations are subtle and not overwhelming
- [ ] **Touch Targets**: All interactive elements are at least 44×44px (mobile)

---

## Phase 8: Final Testing & Performance Verification

### Overview
Comprehensive testing across all enhanced sections, verifying visual quality, performance, and design system consistency.

### Changes Required:

#### 1. Visual Regression Testing
**Tool**: Manual comparison using browser DevTools + screenshots

**Checklist**:
- [ ] HowItWorks timeline displays correctly on Desktop (1440px), Tablet (768px), Mobile (375px)
- [ ] Results bento grid maintains hierarchy and readability at all viewport sizes
- [ ] Case Studies compare slider works smoothly on touch devices
- [ ] AboutFounder tech stack bento grid adapts gracefully on mobile
- [ ] All spotlight effects work without performance issues (60fps)

#### 2. Performance Testing
**Tool**: Chrome DevTools Lighthouse

**Run Lighthouse Audit**:
```bash
# In Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Select "Desktop" mode
# 4. Generate report
```

**Target Scores**:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

**Specific Checks**:
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Total Blocking Time (TBT): < 300ms

#### 3. Cross-Browser Testing
**Test in**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

**Verify**:
- All animations work consistently
- Spotlight effects render correctly
- Compare slider functions on touch devices
- Typography displays correctly (IBM Plex Sans loaded)

#### 4. Bundle Size Analysis
**Check impact of new components**:

```bash
yarn build
```

**Verify**:
- Total page weight: < 3MB (unchanged from before)
- JavaScript bundle: < 500KB (should increase slightly from new components)
- No duplicate dependencies (framer-motion, Lucide icons)

#### 5. Design System Consistency Audit
**Visual inspection checklist**:
- [ ] **No Generic Fonts**: No Inter, Roboto, or Arial anywhere (only IBM Plex Sans + JetBrains Mono)
- [ ] **No Generic Colors**: No purple gradients, no default Tailwind blue-500/gray-100
- [ ] **Strategic Color**: ONE accent per context (not rainbow soup)
- [ ] **No Tabler Icons**: All icons are Lucide React
- [ ] **Consistent Motion**: All animations use easeOut/easeInOut (no linear timing)
- [ ] **Atmospheric Backgrounds**: All sections have depth (gradients/patterns, not solid colors)
- [ ] **IBM Plex Sans**: Applied to all headings and body text
- [ ] **JetBrains Mono**: Used for technical content (durations, deliverables, IDs)
- [ ] **Tabular Nums**: Numbers use `font-variant-numeric: tabular-nums`

### Success Criteria:

#### Automated Verification:
- [x] Production build succeeds: `yarn build`
- [x] No build warnings or errors (only pre-existing warnings in third-party @aceternity components)
- [x] TypeScript compilation succeeds: `yarn check`
- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 90+
- [ ] Lighthouse Best Practices: 90+
- [ ] Lighthouse SEO: 90+

#### Manual Verification:
- [ ] **Visual Quality**: All sections look polished and professional
- [ ] **Smooth Animations**: No janky or laggy animations (60fps maintained)
- [ ] **Responsive Design**: All sections adapt beautifully to mobile, tablet, desktop
- [ ] **Interactive Elements**: Hover states, spotlight effects, and slider work flawlessly
- [ ] **Typography**: IBM Plex Sans renders correctly, no FOUT (flash of unstyled text)
- [ ] **Color Consistency**: Design system colors used throughout (Navy, Cyan, Amber, Coral)
- [ ] **No Regressions**: Other sections (Hero, Pricing, FAQ, etc.) unchanged and working
- [ ] **Load Time**: Page loads in < 3 seconds on fast 3G
- [ ] **User Experience**: Navigation feels smooth and intentional

---

## Testing Strategy

### Unit Tests
**Not applicable** - These are UI components without business logic. Visual and manual testing is more appropriate.

### Integration Tests
**Manual testing approach**:

1. **Section-by-Section Verification**:
   - Test each enhanced section immediately after implementation
   - Verify animations, responsiveness, and interactivity
   - Check color accuracy against design system reference

2. **End-to-End User Flow**:
   - Load landing page from top
   - Scroll through all sections smoothly
   - Interact with spotlight effects (hover on metric cards)
   - Drag compare slider back and forth
   - Verify timeline animation triggers on scroll

3. **Device Testing**:
   - Desktop: 1920×1080, 1440×900
   - Tablet: 768×1024 (iPad portrait)
   - Mobile: 375×667 (iPhone SE), 390×844 (iPhone 13)

### Manual Testing Steps

#### HowItWorks Timeline:
1. Load page and scroll to "How It Works" section
2. Verify timeline phases fade in sequentially (staggered)
3. Hover over each phase circle - confirm subtle interaction
4. Resize browser to tablet - timeline should switch to vertical
5. Resize to mobile - verify vertical layout with proper spacing
6. Check colors: Phase 1 coral, Phase 2 amber, Phase 3 cyan, Phase 4 green

#### Results Bento Grid:
1. Scroll to "Real Results from Real Clients" section
2. Verify $380K metric is larger/more prominent
3. Hover over each metric card - spotlight should follow cursor
4. Spotlight color should match card accent (amber for $380K, cyan for 4hr→4min, etc.)
5. Resize browser - verify grid adapts (stacks on mobile)
6. Check tabular nums: all numbers should align vertically

#### Case Studies Compare:
1. Scroll to "Client Success Stories" section
2. Drag slider left/right - verify smooth transition between images
3. Hover left side - should show "before" image
4. Hover right side - should show "after" image
5. On mobile, verify touch drag works smoothly
6. Check labels: "Manual Process" left, "AI Agent" right

#### AboutFounder Tech Stack:
1. Scroll to "Built by Sam Marshall" section
2. Verify Intelligence Layer is larger/more prominent
3. Hover over each tech layer - spotlight should follow cursor
4. Verify 5 Lucide icons display (Brain, Workflow, Database, Plug, Server)
5. Resize browser - verify grid adapts to mobile
6. Check dark background is maintained (slate-900)

### Performance Testing:
```bash
# Build production bundle
yarn build

# Run production server
yarn start

# In Chrome DevTools:
# - Open Lighthouse tab
# - Run audit for Desktop
# - Verify all scores 90+
# - Check bundle size in Network tab
```

---

## Performance Considerations

**Impact Assessment**:

**Bundle Size Increase**: ~50-80KB total for 5 new components
- Timeline: ~15KB
- BentoGrid: ~10KB
- CardSpotlight: ~12KB
- Compare: ~25KB
- AnimatedTestimonials: ~20KB

**Rationale**: Acceptable increase. These components replace custom implementations that would have similar size. Using @aceternity components provides better maintained, more polished UI than building from scratch.

**Optimization Strategies**:
1. **Lazy Loading**: Components are already client-side ("use client"), loaded on-demand
2. **Framer Motion**: Already a dependency (12.23.24), no additional bundle impact
3. **Code Splitting**: Next.js 15 automatically splits routes and components
4. **GPU Acceleration**: All animations use `transform` and `opacity` (GPU-accelerated)
5. **No New Dependencies**: Only @tabler/icons-react added (which we'll optionally remove after icon replacement)

**No Performance Degradation Expected**:
- No new HTTP requests (components bundled in JavaScript)
- No additional font loads (IBM Plex Sans already loaded)
- No image optimization needed (using existing patterns)
- Lighthouse scores should remain 90+ after implementation

---

## Migration Notes

**N/A** - This is a UI enhancement with no data, state, or API changes. No migration required.

---

## Rollback Plan

If any issues arise during implementation:

### Immediate Rollback (Per Phase):
```bash
# Rollback specific component files
git checkout HEAD src/components/sections/HowItWorks.tsx
git checkout HEAD src/components/sections/Results.tsx
# etc.
```

### Full Rollback (All Changes):
```bash
# Rollback all changes in this implementation
git checkout HEAD src/components/sections/
git checkout HEAD src/components/ui/timeline.tsx
git checkout HEAD src/components/ui/bento-grid.tsx
git checkout HEAD src/components/ui/card-spotlight.tsx
git checkout HEAD src/components/ui/animated-testimonials.tsx
git checkout HEAD src/components/ui/compare.tsx

# Remove @tabler/icons-react dependency
yarn remove @tabler/icons-react
```

### Partial Rollback (Keep Some Enhancements):
If only specific sections have issues, rollback individual files while keeping successful implementations.

---

## References

- Aceternity UI Registry: https://ui.aceternity.com/registry/
- Lucide React Icons: https://lucide.dev/icons/
- Design System Colors: `src/styles/globals.css` (lines 16-25)
- UI Aesthetics Guidelines: `.claude/skills/ui-aesthetics/SKILL.md`
- Current Component Implementations:
  - HowItWorks: `src/components/sections/HowItWorks.tsx:1-238`
  - Results: `src/components/sections/Results.tsx:1-126`
  - CaseStudies: `src/components/sections/CaseStudies.tsx:1-229`
  - AboutFounder: `src/components/sections/AboutFounder.tsx:1-203`
- Package Config: `components.json:21-22` (@aceternity registry)
- Typography Implementation: `src/app/layout.tsx` (IBM Plex Sans + JetBrains Mono)

---

## Component Customization Reference Table

| Component | Default Colors | Custom Colors | Default Icons | Custom Icons | Custom Props |
|-----------|----------------|---------------|---------------|--------------|--------------|
| Timeline | Purple/Blue | Coral/Amber/Cyan/Green gradient | Tabler | Lucide (Search, Lightbulb, Code2, RefreshCw) | `data`, `className` |
| BentoGrid | Blue-500 | Primary/Accent colors | None | Lucide (Clock, TrendingUp, DollarSign, Zap) | `className`, custom layout |
| CardSpotlight | White | Match parent accent via prop | None | N/A | `spotlightColor` (OKLCH) |
| Compare | Default gray | Cyan slider, Success border | Tabler arrows | Lucide (ArrowLeft, ArrowRight) | `slideMode="hover"`, `autoplay` |
| AnimatedTestimonials | Purple/Blue | Amber/Cyan accents | Tabler | Lucide (Quote, ChevronLeft, ChevronRight) | `testimonials`, `autoplay` |

---

## Design System Compliance Checklist

Before marking any phase complete, verify:

- [ ] **Typography**: IBM Plex Sans for UI, JetBrains Mono for code/data
- [ ] **Colors**: ONLY Navy (#071D33), Cyan (oklch 0.80 0.15 195), Amber (oklch 0.75 0.15 75), Coral (oklch 0.65 0.18 25), Success Green (oklch 0.7 0.18 145)
- [ ] **Icons**: ONLY Lucide React (no Tabler icons)
- [ ] **Motion**: CSS transforms (GPU-accelerated), respects `prefers-reduced-motion`
- [ ] **Backgrounds**: Layered gradients or patterns (not solid colors)
- [ ] **Contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for large text)
- [ ] **Hover States**: Spotlight effects or transform-based (not just opacity)
- [ ] **Responsive**: Adapts gracefully to 375px (mobile), 768px (tablet), 1440px+ (desktop)
- [ ] **Accessibility**: Keyboard navigable, screen reader friendly, semantic HTML

---

## Success Metrics

**Implementation Success** defined as:
1. ✅ All 7 @aceternity components installed and integrated
2. ✅ Zero Tabler icons remaining (all replaced with Lucide)
3. ✅ Design system colors used exclusively (no generic Tailwind defaults)
4. ✅ Lighthouse scores maintain 90+ across all categories
5. ✅ Smooth 60fps animations on all interactions
6. ✅ WCAG 2.1 AA compliance verified
7. ✅ Visual distinction achieved (doesn't look like generic Next.js + Tailwind site)
8. ✅ User delight: Spotlight effects and compare slider feel polished and intentional

**Post-Implementation Review**:
- Screenshot comparison: Before vs After for each section
- Performance metrics: Lighthouse report comparison
- Bundle size analysis: Before vs After JavaScript bundle size
- User feedback: Qualitative assessment of visual improvements
