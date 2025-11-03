# Phase 2: Design System & Core Components

**Status:** ✅ **COMPLETE**
**Estimated Duration:** 1-2 hours
**Completion Date:** 2025-01-03
**Previous Phase:** [Phase 1: Foundation Setup ✅](./phase-1-foundation.md)
**Next Phase:** [Phase 3: Hero & Above-Fold Sections](./phase-3-hero-sections.md)

---

## Overview

Build reusable UI components and animation wrappers that follow the distinctive design system. These components will be used throughout all 12 sections of the landing page.

---

## Components to Create

### 1. **Utility Functions**
**File:** `src/lib/utils.ts`

Enhance existing utils with:
- `cn()` - Class name merger (clsx + tailwind-merge)
- `formatNumber()` - Format numbers with commas
- `formatCurrency()` - Format USD currency

### 2. **TypeScript Types**
**File:** `src/types/index.ts`

Define interfaces for:
- `PricingTier` - Pricing card structure
- `Testimonial` - Customer testimonial data
- `CaseStudy` - Case study structure
- `FormStep` & `FormField` - Multi-step form types
- `FAQItem` - FAQ structure

### 3. **Button Component**
**File:** `src/components/ui/Button.tsx`

Variants:
- `primary` - Accent amber with hover scale
- `secondary` - Outlined with cyan hover
- `outline` - Border only
- `ghost` - Transparent with subtle hover

Sizes: `sm`, `md`, `lg`, `xl`

### 4. **Card Component**
**File:** `src/components/ui/Card.tsx`

Sub-components:
- `Card` - Container with shadow
- `CardHeader` - Top section with padding
- `CardTitle` - Bold heading
- `CardDescription` - Muted text
- `CardContent` - Body content

### 5. **Badge Component**
**File:** `src/components/ui/Badge.tsx`

Variants:
- `default` - Slate background
- `amber` - Accent amber
- `cyan` - Accent cyan
- `coral` - Accent coral
- `success` - Green for completion
- `outline` - Transparent with border

### 6. **Accordion Component**
**File:** `src/components/ui/Accordion.tsx`

Built on `@radix-ui/react-accordion`:
- Accessible keyboard navigation
- Smooth expand/collapse animation
- Chevron icon rotation
- Custom styling

### 7. **Motion Components**
**File:** `src/components/motion/FadeInUp.tsx`
**File:** `src/components/motion/ScrollReveal.tsx`

Animation wrappers using Framer Motion:
- `FadeInUp` - Fade in while sliding up
- `ScrollReveal` - Reveal on scroll with Intersection Observer

---

## Implementation Steps

### Step 1: Utility Functions
```bash
# Enhance existing file
src/lib/utils.ts
```

Add:
- Number formatting with Intl.NumberFormat
- Currency formatting (USD, no decimals)
- Keep existing `cn()` function

### Step 2: TypeScript Types
```bash
# Create new directory and file
mkdir -p src/types
touch src/types/index.ts
```

Define all interfaces for components and data structures.

### Step 3: UI Components
```bash
# Create UI components directory
mkdir -p src/components/ui

# Create component files
touch src/components/ui/Button.tsx
touch src/components/ui/Card.tsx
touch src/components/ui/Badge.tsx
touch src/components/ui/Accordion.tsx
```

Implement each component with:
- TypeScript types
- Variants using `class-variance-authority`
- Forwarded refs for composition
- Accessible markup

### Step 4: Motion Components
```bash
# Create motion directory
mkdir -p src/components/motion

# Create motion wrappers
touch src/components/motion/FadeInUp.tsx
touch src/components/motion/ScrollReveal.tsx
```

Use Framer Motion for animations:
- Respect `prefers-reduced-motion`
- Smooth cubic-bezier easing
- Stagger children option

---

## Success Criteria

### Automated Verification:
- [x] All components build without TypeScript errors
- [x] No ESLint warnings
- [x] `yarn check` passes

### Manual Verification:
- [ ] Button variants render correctly (all 4 variants × 4 sizes)
- [ ] Card components display with proper spacing
- [ ] Badge variants show correct colors
- [ ] Accordion expands/collapses smoothly
- [ ] Motion animations work (check with dev server)
- [ ] All components are accessible (keyboard navigation works)

### Component Testing:
Create a test page to verify components:

```bash
# Create temporary test page
touch src/app/test-components/page.tsx
```

Display all component variants to verify styling and functionality.

---

## Design System Alignment

### Colors
Use the custom color palette defined in Phase 1:
- **Primary:** Navy (#071D33)
- **Accents:** Amber, Cyan, Coral (use ONE per context)
- **States:** Success, Warning, Error, Info

### Typography
- **Sans:** IBM Plex Sans (body text, headlines)
- **Mono:** JetBrains Mono (technical elements)
- **Numbers:** Use `tabular-nums` class for alignment

### Spacing
- Consistent padding: `p-6` for cards, `p-4` for compact
- Gap between elements: `gap-2`, `gap-4`, `gap-6`

### Animations
- **Duration:** 200ms for interactions, 600ms for entrances
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` for natural feel
- **Reduced Motion:** Always respect user preferences

---

## Detailed Implementation Reference

For detailed code examples and complete component implementations, see:

**Original Plan:** [`../2025-11-03-landing-page-implementation.md`](../2025-11-03-landing-page-implementation.md) (Lines 339-814)

The original plan contains:
- Complete TypeScript code for all components
- Prop interfaces and type definitions
- Variant configurations
- Animation specifications

---

## Dependencies Required

All dependencies already installed in Phase 1:
- ✅ `clsx` + `tailwind-merge` - Class name utilities
- ✅ `class-variance-authority` - Component variants
- ✅ `@radix-ui/react-accordion` - Accordion primitive
- ✅ `framer-motion` - Animation library
- ✅ `lucide-react` - Icons

---

## Next Steps After Completion

Once Phase 2 is complete:

1. **Verify components work** - Test all variants and animations
2. **Check accessibility** - Keyboard navigation, screen reader support
3. **Proceed to Phase 3** - Implement Hero and above-fold sections

**Next Phase:** [Phase 3: Hero & Above-Fold Sections](./phase-3-hero-sections.md)

---

## Notes

- Components follow React best practices (forwardRef, displayName)
- All components are client-side compatible (use `'use client'` where needed)
- Animations respect `prefers-reduced-motion` preference
- Color usage follows "ONE accent per context" rule
- **Path imports:** All components use `~/` alias (e.g., `import { cn } from "~/lib/utils"`), consistent with existing codebase convention

---

**Created:** 2025-01-03
**Status:** ⏳ Pending
**Blocked by:** None (Phase 1 complete)
