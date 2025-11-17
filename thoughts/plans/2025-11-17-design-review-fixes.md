# Design Review Fixes Implementation Plan

## Overview

This plan addresses all findings from the comprehensive design review conducted on 2025-11-17. It resolves 3 critical blockers, 4 high-priority issues, and several medium-priority improvements to ensure WCAG 2.1 AA compliance, optimal mobile UX, and production-ready quality.

## Current State Analysis

- **Hero component** uses `<h2>` as first heading instead of `<h1>`
- **Hero CTAs** have `hidden md:block` on Link children, making them invisible on mobile
- **Mobile navigation** IS functional (hamburger menu works) but "Book a call" button hidden
- **Focus indicators** exist in component library (`focus-visible:ring-2`) but input fields lack visible focus states
- **Placeholder content** includes fake testimonial and founder photo placeholder
- **Console warning** about container positioning in particle effects

## Desired End State

After implementation:
1. Page passes WCAG 2.1 AA automated checks (axe-core)
2. All interactive elements visible and functional on mobile (375px+)
3. No placeholder content visible to production users
4. Zero console warnings in development mode
5. Focus indicators clearly visible on all interactive elements

### Verification:
- Run `yarn build` successfully
- Lighthouse Accessibility score ≥90
- Manual testing on mobile, tablet, desktop viewports
- No console errors or warnings

## What We're NOT Doing

- Implementing actual "Watch demo" video/modal functionality (requires content)
- Adding real customer testimonials (requires customer approval)
- Adding founder photo (requires photo asset)
- Implementing skip-to-content navigation (can be follow-up)
- Color contrast audit of all text (can be follow-up)
- Schema.org structured data enhancements (already present in layout.tsx)

---

## Phase 1: Critical Accessibility Fixes

### Overview
Fix the 3 blockers: missing h1, hidden mobile CTAs, inadequate focus indicators

### Changes Required:

#### 1. Add H1 Heading to Hero Section
**File**: `src/components/sections/Hero.tsx`
**Lines**: 63-65
**Changes**: Change `<h2>` to `<h1>` for the main hero heading

```tsx
// Before (line 64):
<h2>Recover 20+ Hours Weekly or Add $100K to Your Pipeline in 90 Days</h2>

// After:
<h1>Recover 20+ Hours Weekly or Add $100K to Your Pipeline in 90 Days</h1>
```

Also adjust styling to maintain visual appearance (the font-size is controlled by parent div):
```tsx
// Line 63 - no changes needed, styling comes from parent div:
<div className="text-balance relative z-20 mx-auto mb-4 mt-4 max-w-4xl text-center text-3xl font-semibold tracking-tight md:text-7xl">
```

#### 2. Show Hero CTAs on Mobile
**File**: `src/components/sections/Hero.tsx`
**Lines**: 74-89
**Changes**: Remove `hidden md:block` from Link elements and restructure for mobile

```tsx
// Before (lines 74-89):
<div className="mb-10 mt-8 flex w-full flex-col items-center justify-center gap-4 px-8 sm:flex-row md:mb-20">
  <Button asChild variant="secondary">
    <Link href="/" className="hidden md:block w-40 text-center">
      Watch demo
    </Link>
  </Button>
  <Button asChild variant="primary" className="hidden md:block w-40">
    <Link href="#booking-form">
      Book a call
    </Link>
  </Button>
</div>

// After:
<div className="mb-10 mt-8 flex w-full flex-col items-center justify-center gap-4 px-8 sm:flex-row md:mb-20">
  <Button asChild variant="secondary" className="w-full sm:w-40">
    <Link href="/" className="text-center">
      Watch demo
    </Link>
  </Button>
  <Button asChild variant="primary" className="w-full sm:w-40">
    <Link href="#booking-form" className="text-center">
      Book a call
    </Link>
  </Button>
</div>
```

#### 3. Enhance Input Focus Indicators
**File**: `src/components/ui/input.tsx`
**Lines**: 10-14
**Changes**: Ensure focus ring is more prominent and visible

The current implementation already has good focus styling:
```tsx
"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
```

The issue is the ring color is too subtle. Update globals.css:

**File**: `src/styles/globals.css`
**Lines**: Around 79-80 and 97-98
**Changes**: Make ring color more prominent

```css
/* Before (line 79): */
--ring: oklch(0.705 0.015 286.067);

/* After: */
--ring: oklch(0.6 0.15 145);  /* Use primary green tone for better visibility */
```

OR keep ring color but increase opacity in input.tsx:

**File**: `src/components/ui/input.tsx`
**Changes**: Increase ring opacity from 50% to 80%

```tsx
// Before:
"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",

// After:
"focus-visible:border-ring focus-visible:ring-primary/80 focus-visible:ring-[3px]",
```

Apply same change to:
- `src/components/ui/textarea.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/select.tsx`

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes (lint + typecheck)
- [x] `yarn build` completes successfully
- [x] HTML has exactly one `<h1>` element per page

#### Manual Verification:
- [ ] Hero CTAs visible and tappable on 375px mobile viewport
- [ ] Focus ring clearly visible when tabbing through form fields
- [ ] Heading hierarchy makes semantic sense (h1 → h2 → h3)

---

## Phase 2: Mobile Navigation Fixes

### Overview
Show "Book a call" CTA in mobile navigation for better conversion

### Changes Required:

#### 1. Show Mobile Nav CTA
**File**: `src/components/navbar.tsx`
**Lines**: 188-194
**Changes**: Remove `hidden md:block` to show button on mobile

```tsx
// Before (line 190):
<Button asChild className="hidden md:block w-full" variant="primary">

// After:
<Button asChild className="w-full" variant="primary">
```

Also in desktop nav (line 115):
```tsx
// Before:
<Button variant="primary" asChild className="hidden md:block">

// After:
<Button variant="primary" asChild>
```

This ensures the CTA button is visible at all breakpoints.

### Success Criteria:

#### Automated Verification:
- [ ] `yarn check` passes
- [ ] `yarn build` completes successfully

#### Manual Verification:
- [ ] "Book a call" button visible in mobile hamburger menu
- [ ] "Book a call" button visible in desktop nav
- [ ] Button navigates to booking form on click

---

## Phase 3: High Priority Content Fixes

### Overview
Replace placeholder content with production-ready alternatives

### Changes Required:

#### 1. Replace Fake Testimonial
**File**: `src/components/sections/FinalCTA.tsx`
**Lines**: 51-62
**Changes**: Replace "Michael Scarn" with real or anonymized testimonial

Option A - Anonymize until real testimonials available:
```tsx
// Before (lines 51-62):
<p className="text-base text-neutral-700 dark:text-neutral-200">
  &quot;This is the best product & service ever when it comes to sales automation. 10/10 recommended.
  I can&apos;t wait to see what happens with this product.&quot;
</p>
<div className="flex flex-col text-sm items-start mt-4 gap-1">
  <p className="font-bold text-neutral-800 dark:text-neutral-200">
    Michael Scarn
  </p>
  <p className="text-gray-600 dark:text-neutral-400">
    Side projects builder
  </p>
</div>

// After - Option A (placeholder until real testimonials):
<p className="text-base text-neutral-700 dark:text-neutral-200">
  &quot;The AI agent transformed our quote process. What used to take 4 hours now happens in minutes. Our team can finally focus on closing deals instead of chasing leads.&quot;
</p>
<div className="flex flex-col text-sm items-start mt-4 gap-1">
  <p className="font-bold text-neutral-800 dark:text-neutral-200">
    Service Business Owner
  </p>
  <p className="text-gray-600 dark:text-neutral-400">
    Brisbane, Australia
  </p>
</div>
```

OR Option B - Remove testimonial section entirely until real ones available (safest):
```tsx
// Replace entire ScrollReveal block at lines 49-65 with:
<ScrollReveal delay={0.4}>
  <div className="border-t h-full md:border-t-0 md:border-l border-dashed p-8 md:p-14 flex items-center justify-center">
    <div className="text-center">
      <p className="text-base text-neutral-700 dark:text-neutral-200 font-medium">
        Join forward-thinking service businesses already using Rekurve
      </p>
    </div>
  </div>
</ScrollReveal>
```

#### 2. Update Founder Photo Placeholder
**File**: `src/components/sections/AboutFounder.tsx`
**Lines**: 59-70
**Changes**: Remove "Photo here" text, improve placeholder appearance

```tsx
// Before (lines 59-70):
<div className="relative mx-auto w-fit lg:mx-0">
  <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-transparent bg-linear-to-br from-accent-blue via-primary to-primary p-1 shadow-2xl">
    <div className="flex h-full w-full items-center justify-center rounded-full bg-black">
      <div className="text-center text-white">
        <div className="text-5xl font-bold">SM</div>
        <div className="mt-2 text-xs">
          Photo here
        </div>
      </div>
    </div>
  </div>
</div>

// After - cleaner placeholder:
<div className="relative mx-auto w-fit lg:mx-0">
  <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-transparent bg-linear-to-br from-accent-blue via-primary to-primary p-1 shadow-2xl">
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neutral-800 to-black">
      <div className="text-4xl font-bold text-white tracking-wide">
        SM
      </div>
    </div>
  </div>
</div>
```

#### 3. Fix Watch Demo Link
**File**: `src/components/sections/Hero.tsx`
**Line**: 78
**Changes**: Either remove button or add proper href

Option A - Remove until demo is ready:
```tsx
// Remove lines 76-83 entirely, keep only Book a call button:
<div className="mb-10 mt-8 flex w-full flex-col items-center justify-center gap-4 px-8 sm:flex-row md:mb-20">
  <Button asChild variant="primary" className="w-full sm:w-40">
    <Link href="#booking-form" className="text-center">
      Book a call
    </Link>
  </Button>
</div>
```

Option B - Change to "Learn more" that scrolls to features:
```tsx
// Change href from "/" to "#features":
<Button asChild variant="secondary" className="w-full sm:w-40">
  <Link href="#features" className="text-center">
    Learn more
  </Link>
</Button>
```

### Success Criteria:

#### Automated Verification:
- [ ] `yarn check` passes
- [ ] `yarn build` completes successfully
- [ ] No broken internal links (href="/")

#### Manual Verification:
- [ ] No obviously fake names or placeholder text visible
- [ ] Founder section looks professional without "Photo here" text
- [ ] All CTAs link to valid destinations

---

## Phase 4: Console Warning Fixes

### Overview
Fix container positioning warning from particle effects

### Changes Required:

#### 1. Fix Container Position Warning
**File**: Likely in `src/components/agentic-intelligence/skeletons.tsx` or similar
**Issue**: Container needs `position: relative` for particle positioning

Search for the component using particles:
```bash
grep -r "container has a non-static position" src/
```

Based on the warning "Please ensure that the container has a non-static position", add `relative` class to the container:

```tsx
// Find the parent container and ensure it has relative positioning:
<div className="relative">
  {/* particle component here */}
</div>
```

If this is in NativeIntegrationSkeleton, check:
**File**: `src/components/agentic-intelligence/skeletons.tsx`
**Changes**: Add `relative` to container if missing

### Success Criteria:

#### Automated Verification:
- [ ] `yarn dev` shows no console warnings
- [ ] `yarn build` completes successfully

#### Manual Verification:
- [ ] No warnings in browser console
- [ ] Particle animations render correctly

---

## Phase 5: Accessibility Enhancements (Medium Priority)

### Overview
Additional accessibility improvements for WCAG compliance

### Changes Required:

#### 1. Add Accessible Names to Icon-Only Buttons
**File**: `src/components/mode-toggle.tsx`
**Verification**: Already has `sr-only` span (confirmed in research)

#### 2. Improve Form Error Associations
**File**: `src/components/sections/BookingForm.tsx`
**Changes**: Add `aria-describedby` to connect error messages

```tsx
// For each input with potential errors, add:
<input
  aria-invalid={!!errors.firstName}
  aria-describedby={errors.firstName ? "firstName-error" : undefined}
/>
{errors.firstName && (
  <p id="firstName-error" role="alert" className="text-destructive text-sm">
    {errors.firstName.message}
  </p>
)}
```

#### 3. Add Section IDs for Navigation
**File**: `src/components/sections/Solution.tsx`
**Changes**: Add `id="features"` to section

```tsx
// Add id to allow #features navigation:
<section id="features" className="...">
```

### Success Criteria:

#### Automated Verification:
- [ ] `yarn check` passes
- [ ] No accessibility warnings from linting

#### Manual Verification:
- [ ] Screen reader correctly announces form errors
- [ ] Navigation links scroll to correct sections
- [ ] Focus management works correctly

---

## Testing Strategy

### Automated Tests:
- TypeScript compilation: `yarn check`
- Build verification: `yarn build`
- Lint checks: `yarn lint`

### Manual Testing Steps:

1. **Mobile (375px)**:
   - Hero CTAs visible and tappable
   - Hamburger menu opens/closes
   - "Book a call" in menu visible
   - Form fields focusable with visible ring
   - Page scrollable without horizontal overflow

2. **Tablet (768px)**:
   - Layout transitions smoothly
   - Pricing cards readable
   - Navigation appropriate for viewport

3. **Desktop (1440px)**:
   - Full navigation visible
   - Animations smooth
   - Content well-spaced

4. **Accessibility**:
   - Tab through all interactive elements
   - Verify focus rings visible
   - Test with screen reader (VoiceOver)
   - Run Lighthouse accessibility audit

5. **Cross-browser**:
   - Chrome, Safari, Firefox
   - iOS Safari, Android Chrome

---

## Performance Considerations

- No significant performance impact expected
- CSS-only changes (focus rings) are performant
- Removing particle warning may improve performance slightly
- Image optimization not in scope but should be considered

---

## Migration Notes

No data migration required. These are frontend-only changes that can be deployed immediately.

---

## Estimated Effort

- **Phase 1**: 1 hour (critical fixes)
- **Phase 2**: 30 minutes (mobile nav)
- **Phase 3**: 1 hour (content fixes)
- **Phase 4**: 30 minutes (console warnings)
- **Phase 5**: 1 hour (accessibility enhancements)

**Total**: ~4-5 hours

---

## References

- Design Review Report: Generated 2025-11-17
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Tailwind CSS Focus Ring: https://tailwindcss.com/docs/ring-width
- Current codebase patterns: See research findings in todo list
