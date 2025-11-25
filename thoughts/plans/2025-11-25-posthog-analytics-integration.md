# PostHog Analytics Integration Implementation Plan

## Overview

Integrate the existing PostHog analytics library (`src/lib/posthog.ts`) into landing page components to capture user behavior, form funnel data, and lead scoring information.

## Current State Analysis

### What Exists
- PostHog initialized in `src/instrumentation-client.ts` with `posthog-js ^1.298.0`
- Comprehensive analytics library at `src/lib/posthog.ts` with typed tracking functions
- CSP configured to allow PostHog in `next.config.js`

### What's Missing
- No components import or use the analytics library
- No CTA click tracking
- No form funnel tracking
- No FAQ interaction tracking
- No UTM parameter capture on page load

### Key Discoveries
- BookingForm renders 4 steps (step 5 defined but not rendered), submits on step 4
- All CTAs use `Link` wrapping `Button` pattern with no existing onClick handlers
- Mobile nav has onClick to close menu - must preserve this behavior
- Form uses react-hook-form with per-step validation via `trigger()`

## Desired End State

All user interactions are tracked in PostHog:
- CTA clicks with location context
- Form funnel with field-level tracking
- FAQ accordion interactions
- Pricing tier engagement
- UTM parameters captured for attribution
- Session recordings triggered on form start

### Verification
- Events appear in PostHog Live Events view
- Form funnel visualization shows all 4 steps
- Person properties include lead score and form data
- No console errors from analytics code

## What We're NOT Doing

- Section visibility tracking (requires IntersectionObserver, lower priority)
- Scroll depth tracking (can use PostHog's built-in heatmaps)
- Pricing tier hover tracking (adds complexity, low value)
- Form field timing (complex to implement correctly)

## Implementation Approach

Add onClick handlers to existing components that call the analytics library. Keep changes minimal - only add tracking, don't refactor component structure.

---

## Phase 1: CTA Tracking (Navbar, Hero, FinalCTA)

### Overview
Add click tracking to all CTA buttons across header, hero, and final CTA sections.

### Changes Required

#### 1. Navbar Component
**File**: `src/components/navbar.tsx`

**Add import:**
```typescript
import { analytics } from '~/lib/posthog'
```

**Desktop CTA (line 115-119):**
```typescript
<Link
  href="#booking-form"
  onClick={() => analytics.cta.click('header')}
>
  <Button variant="primary">
    Book a call
  </Button>
</Link>
```

**Mobile CTA (line 187-192):**
```typescript
<Link
  href="#booking-form"
  onClick={() => {
    analytics.cta.click('mobile_nav')
    setOpen(false)
  }}
  className="relative text-neutral-600 dark:text-neutral-300">
  Book a call
</Link>
```

#### 2. Hero Component
**File**: `src/components/sections/Hero.tsx`

**Add import:**
```typescript
import { analytics } from '~/lib/posthog'
```

**Secondary CTA - "How it Works" (line 72-76):**
```typescript
<Link
  href="#how-it-works"
  className="w-full sm:w-40"
  onClick={() => analytics.cta.click('hero_secondary')}
>
  <Button asChild variant="secondary" className="w-full text-center">
    How it Works
  </Button>
</Link>
```

**Primary CTA - "Book a call" (line 77-81):**
```typescript
<Link
  href="#booking-form"
  className="w-full sm:w-40"
  onClick={() => analytics.cta.click('hero_primary')}
>
  <Button asChild variant="primary" className="w-full text-center">
    Book a call
  </Button>
</Link>
```

#### 3. FinalCTA Component
**File**: `src/components/sections/FinalCTA.tsx`

**Add import:**
```typescript
import { analytics } from '~/lib/posthog'
```

**Primary CTA (line 33-38):**
```typescript
<Link
  href="#booking-form"
  className="mt-8"
  onClick={() => analytics.cta.click('final_cta_primary')}
>
  <Button variant="primary" className="group flex items-center gap-1">
    Book Your Call
    <ArrowRight className="group-hover:translate-x-1 h-4 w-4 stroke-1.25 transition-transform duration-200" />
  </Button>
</Link>
```

**Email CTA (line 40-45):**
```typescript
<Link
  href="mailto:contact@rekurve.ai?cc=support@rekurve.ai&subject=Rekurve%20Online%20Inquiry&body=Hi,%0A%0AI%20would%20like%20to%20know%20more."
  className="mt-8"
  onClick={() => {
    analytics.cta.click('final_cta_email')
    analytics.link.emailClick('contact@rekurve.ai', 'final_cta')
  }}
>
  <Button variant="ghost" className="group flex items-center gap-1">
    Or email us: contact@rekurve.ai
    <Mail className="group-hover:translate-x-1 stroke-1 transition-transform duration-200" />
  </Button>
</Link>
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes (lint + typecheck)
- [ ] No TypeScript errors on analytics imports

#### Manual Verification
- [ ] Click each CTA and verify `cta_clicked` event in PostHog Live Events
- [ ] Verify `location` property matches expected value for each CTA
- [ ] Mobile nav still closes after clicking CTA

---

## Phase 2: BookingForm Tracking

### Overview
Add comprehensive form funnel tracking including form start, step completion, field errors, and submission with lead scoring.

### Changes Required

#### 1. BookingForm Component
**File**: `src/components/sections/BookingForm.tsx`

**Add imports (after line 37):**
```typescript
import { analytics } from '~/lib/posthog'
import { useCallback, useRef } from 'react'
```

**Add state and refs (after line 89):**
```typescript
const [formStarted, setFormStarted] = useState(false)
const stepStartTimeRef = useRef<number>(Date.now())
```

**Add form start handler (after state declarations):**
```typescript
const handleFormStart = useCallback(() => {
  if (!formStarted) {
    analytics.form.started()
    setFormStarted(true)
  }
}, [formStarted])
```

**Add step name helper:**
```typescript
const getStepName = (step: number): 'basic_info' | 'company_details' | 'challenges' | 'goals' | 'booking_preference' => {
  const names = ['basic_info', 'company_details', 'challenges', 'goals', 'booking_preference'] as const
  return names[step - 1]
}
```

**Modify handleNextStep (line 125-148):**
```typescript
const handleNextStep = async () => {
  let fieldsToValidate: (keyof FormData)[] = []

  switch (currentStep) {
    case 1:
      fieldsToValidate = ['firstName', 'lastName', 'email']
      break
    case 2:
      fieldsToValidate = ['company', 'companySize', 'industry', 'location']
      break
    case 3:
      fieldsToValidate = ['challenges']
      break
    case 4:
      fieldsToValidate = ['goals', 'timeline']
      break
  }

  const isValid = await trigger(fieldsToValidate)
  if (isValid && currentStep < 5) {
    // Track step completion
    const timeSpentMs = Date.now() - stepStartTimeRef.current
    analytics.form.stepCompleted({
      step: currentStep as 1 | 2 | 3 | 4 | 5,
      step_name: getStepName(currentStep),
      fields_completed: fieldsToValidate,
      fields_with_errors: [],
      time_spent_ms: timeSpentMs,
    })

    // Reset timer for next step
    stepStartTimeRef.current = Date.now()
    setCurrentStep(currentStep + 1)
  } else if (!isValid) {
    // Track validation errors
    const errorFields = Object.keys(errors) as (keyof FormData)[]
    errorFields.forEach(field => {
      const errorMessage = errors[field]?.message
      if (errorMessage) {
        analytics.form.fieldInteraction({
          field,
          step: currentStep as 1 | 2 | 3 | 4 | 5,
          action: 'error',
          has_error: true,
          error_message: errorMessage,
        })
      }
    })
  }
}
```

**Modify onSubmit (line 156-175):**
```typescript
const onSubmit = (data: FormData) => {
  // Track form submission with lead data
  analytics.form.submitted({
    company_size: data.companySize,
    industry: data.industry,
    timeline: data.timeline,
    current_mrr: data.currentMRR,
    challenges: data.challenges,
    booking_method: data.bookingMethod,
  })

  console.log('Form submitted:', data)
  setIsSubmitted(true)

  setTimeout(() => {
    if (data.bookingMethod === 'calendly') {
      console.log('Redirect to Calendly: https://calendly.com/rekurve-ai')
    } else {
      console.log('Redirect to HubSpot: https://meetings.hubspot.com/rekurve-ai')
    }
  }, 2000)
}
```

**Add onFocus to first field in Step 1 to trigger form start (line 326-333):**
```typescript
<Input
  {...register('firstName')}
  type="text"
  id="firstName"
  placeholder="John"
  aria-invalid={!!errors.firstName}
  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
  onFocus={handleFormStart}
/>
```

**Add abandonment tracking effect (after form configuration):**
```typescript
// Track form abandonment on page leave
useEffect(() => {
  const handleBeforeUnload = () => {
    if (formStarted && !isSubmitted) {
      analytics.form.abandoned(currentStep as 1 | 2 | 3 | 4 | 5, undefined, 'page_leave')
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    // Also track if component unmounts while form in progress
    if (formStarted && !isSubmitted) {
      analytics.form.abandoned(currentStep as 1 | 2 | 3 | 4 | 5, undefined, 'component_unmount')
    }
  }
}, [formStarted, isSubmitted, currentStep])
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes
- [ ] No TypeScript errors

#### Manual Verification
- [ ] Focus first field triggers `booking_form_started` event
- [ ] Session recording starts when form begins
- [ ] Complete step 1 triggers `form_step_completed` with step=1
- [ ] Validation error triggers `form_field_interaction` with action='error'
- [ ] Submit triggers `booking_form_submitted` with all form data
- [ ] Person properties include `lead_score`, `company_size`, `timeline`
- [ ] Navigate away triggers `booking_form_abandoned`

---

## Phase 3: Pricing Tracking

### Overview
Add CTA click tracking for each pricing tier.

### Changes Required

#### 1. Pricing Component
**File**: `src/components/sections/Pricing.tsx`

**Add import:**
```typescript
import { analytics } from '~/lib/posthog'
```

**Modify CTA button (line 295-303):**
```typescript
<Button
  variant={tier.highlighted ? 'primary' : 'outline'}
  size="lg"
  className={cn('w-full', tier.highlighted && 'border-accent-green')}
  asChild
  onClick={() => analytics.cta.click(`pricing_${tier.id}` as 'pricing_foundation' | 'pricing_growth' | 'pricing_enterprise')}
>
  <a href="#booking-form">{tier.cta}</a>
</Button>
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes

#### Manual Verification
- [ ] Click Foundation CTA triggers `cta_clicked` with location='pricing_foundation'
- [ ] Click Growth CTA triggers `cta_clicked` with location='pricing_growth'
- [ ] Click Enterprise CTA triggers `cta_clicked` with location='pricing_enterprise'

---

## Phase 4: FAQ Tracking

### Overview
Add accordion expansion and search tracking to FAQ section.

### Changes Required

#### 1. FAQ Component
**File**: `src/components/sections/FAQ.tsx`

**Add import:**
```typescript
import { analytics } from '~/lib/posthog'
import { useRef, useCallback } from 'react'
```

**Add ref to track previous open items (after state declarations):**
```typescript
const prevOpenItemsRef = useRef<string[]>([])
```

**Add debounced search tracking:**
```typescript
const searchTimeoutRef = useRef<NodeJS.Timeout>()

const trackSearch = useCallback((query: string, resultsCount: number) => {
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current)
  }
  searchTimeoutRef.current = setTimeout(() => {
    if (query.length > 0) {
      analytics.faq.searched(query, resultsCount)
    }
  }, 500) // Debounce 500ms
}, [])
```

**Modify Accordion onValueChange (line 164-167):**
```typescript
<Accordion
  type="multiple"
  value={openItems}
  onValueChange={(newOpenItems) => {
    // Find newly opened items
    const newlyOpened = newOpenItems.filter(id => !prevOpenItemsRef.current.includes(id))
    newlyOpened.forEach(id => {
      const item = faqData.find(f => f.id === id)
      if (item) {
        analytics.faq.expanded(id, item.question, item.category as 'ROI & Results' | 'Pricing' | 'Technical' | 'Security & Compliance' | 'Support & Training')
      }
    })

    prevOpenItemsRef.current = newOpenItems
    setOpenItems(newOpenItems)
  }}
  className="space-y-4"
>
```

**Modify search input onChange (line 154):**
```typescript
onChange={(e) => {
  const query = e.target.value
  setSearchQuery(query)
  trackSearch(query, filteredFAQs.length)
}}
```

**Add FAQ bottom CTA tracking (line 219-224):**
```typescript
<a
  href="#booking-form"
  onClick={() => analytics.cta.click('faq_bottom')}
  className="inline-flex items-center font-mono text-accent-blue hover:text-accent-blue/70 transition-colors underline underline-offset-4"
>
  Book a free 30-minute call
</a>
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes

#### Manual Verification
- [ ] Expand FAQ item triggers `faq_expanded` with question and category
- [ ] Search input triggers `faq_searched` after 500ms debounce
- [ ] Click FAQ bottom CTA triggers `cta_clicked` with location='faq_bottom'

---

## Phase 5: Session Initialization (UTM Capture)

### Overview
Initialize analytics on page load to capture UTM parameters and referrer information.

### Changes Required

#### 1. Create Analytics Provider Component
**File**: `src/components/providers/AnalyticsProvider.tsx` (new file)

```typescript
'use client'

import { useEffect } from 'react'
import { analytics } from '~/lib/posthog'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.session.initialize()
  }, [])

  return <>{children}</>
}
```

#### 2. Add Provider to Root Layout
**File**: `src/app/layout.tsx`

**Add import:**
```typescript
import { AnalyticsProvider } from '~/components/providers/AnalyticsProvider'
```

**Wrap children with provider (in the body, around existing content):**
```typescript
<body>
  <AnalyticsProvider>
    {/* existing content */}
  </AnalyticsProvider>
</body>
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes
- [ ] `yarn build` succeeds

#### Manual Verification
- [ ] Visit page with UTM params (e.g., `?utm_source=test&utm_medium=cpc`)
- [ ] Verify `utm_captured` event in PostHog
- [ ] Verify person properties include UTM values
- [ ] Verify `page_viewed` event captures referrer and landing page

---

## Phase 6: Testing & Verification

### Overview
Comprehensive testing of all tracking implementations.

### Testing Steps

1. **Open PostHog Live Events view**

2. **Test CTA tracking:**
   - Click header "Book a call" → verify `cta_clicked` location='header'
   - Click hero "How it Works" → verify `cta_clicked` location='hero_secondary'
   - Click hero "Book a call" → verify `cta_clicked` location='hero_primary'
   - Click each pricing tier CTA → verify correct location
   - Click final CTA buttons → verify locations
   - Click FAQ bottom link → verify location='faq_bottom'
   - Test mobile nav CTA → verify location='mobile_nav'

3. **Test form funnel:**
   - Focus first field → verify `booking_form_started`
   - Verify session recording started
   - Complete step 1 → verify `form_step_completed` step=1
   - Trigger validation error → verify `form_field_interaction` action='error'
   - Complete all steps and submit → verify `booking_form_submitted`
   - Check person properties for lead_score

4. **Test FAQ tracking:**
   - Expand FAQ item → verify `faq_expanded`
   - Type in search → verify `faq_searched` after debounce

5. **Test UTM capture:**
   - Visit with `?utm_source=test&utm_campaign=test`
   - Verify `utm_captured` event
   - Verify person properties

6. **Test error handling:**
   - Block PostHog in browser → verify no console errors
   - Verify page still functions normally

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes
- [ ] `yarn build` succeeds
- [ ] No console errors in browser

#### Manual Verification
- [ ] All events appear in PostHog Live Events
- [ ] Form funnel shows 4 steps in PostHog Funnels
- [ ] Person properties populated correctly
- [ ] Session recordings capture form interactions
- [ ] Analytics gracefully degrades if PostHog unavailable

---

## References

- Design document: `thoughts/designs/posthog-analytics-implementation.md`
- Analytics library: `src/lib/posthog.ts`
- PostHog docs: https://posthog.com/docs/product-analytics
