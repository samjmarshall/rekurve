# PostHog Analytics Implementation Design

## Overview

This document outlines the comprehensive PostHog Product Analytics implementation for the Rekurve landing page. The goal is to capture valuable user behavior insights and lead data to optimize conversion funnels and inform business decisions.

## Business Goals

1. **Understand conversion funnel drop-offs** - Where are we losing potential leads?
2. **Field-level form analysis** - Which form fields cause hesitation or abandonment?
3. **CTA performance** - Which CTAs drive the most conversions?
4. **Lead scoring** - Identify high-intent visitors for prioritization
5. **Session recordings** - Watch real user behavior on high-intent actions
6. **UTM tracking** - Prepare for paid campaign attribution

---

## Current State

### Existing Setup
- PostHog initialized in `src/instrumentation-client.ts`
- Google Analytics helpers exist in `src/lib/analytics.ts` (unused)
- **No analytics tracking** currently implemented in components

### Components Requiring Tracking
| Component | File | Tracking Needed |
|-----------|------|-----------------|
| Navbar | `src/components/navbar.tsx` | CTA clicks, nav link clicks |
| Hero | `src/components/sections/Hero.tsx` | CTA clicks (primary/secondary) |
| Pricing | `src/components/sections/Pricing.tsx` | Tier views, CTA clicks per tier |
| BookingForm | `src/components/sections/BookingForm.tsx` | Full funnel + field-level |
| FAQ | `src/components/sections/FAQ.tsx` | Accordion interactions, search |
| FinalCTA | `src/components/sections/FinalCTA.tsx` | CTA clicks, email clicks |

---

## Implementation Design

### 1. PostHog Analytics Library (`src/lib/posthog.ts`)

Create a centralized analytics library with typed functions for all tracking needs.

#### Module Structure
```typescript
// Types
export type CTALocation = 'header' | 'hero_primary' | 'hero_secondary' | ...
export type FormStep = 1 | 2 | 3 | 4 | 5
export type FAQCategory = 'ROI & Results' | 'Pricing' | 'Technical' | ...

// Tracking modules
export const ctaTracking = { click, viewed }
export const formTracking = { started, fieldInteraction, stepCompleted, abandoned, submitted }
export const faqTracking = { expanded, searched, collapsed }
export const sectionTracking = { viewed, scrollDepth, timeSpent }
export const pricingTracking = { tierViewed, tierCTAClicked }
export const linkTracking = { externalClick, emailClick, navClick }
export const sessionTracking = { initialize }
export const recordingControl = { start, stop }

// Consolidated export
export const analytics = { cta, form, faq, section, pricing, link, session, recording }
```

### 2. Event Taxonomy

#### CTA Events
| Event Name | Properties | Trigger |
|------------|------------|---------|
| `cta_clicked` | `location`, `cta_text`, `page_section` | Any CTA button click |
| `cta_viewed` | `location` | CTA enters viewport |

#### Form Events (5-Step Funnel)
| Event Name | Properties | Trigger |
|------------|------------|---------|
| `booking_form_started` | `entry_point` | First form interaction |
| `form_step_viewed` | `step`, `step_name` | Step becomes visible |
| `form_field_interaction` | `field`, `step`, `action`, `value_length`, `has_error`, `time_spent_ms` | Field focus/blur/change/error |
| `form_field_error` | `field`, `step`, `error_message` | Validation error shown |
| `form_step_completed` | `step`, `step_name`, `fields_completed`, `fields_with_errors`, `time_spent_ms` | Next button clicked successfully |
| `booking_form_abandoned` | `last_step`, `last_field`, `reason`, `time_spent_on_step_ms` | User leaves without completing |
| `booking_form_submitted` | `company_size`, `industry`, `timeline`, `current_mrr`, `challenges_count`, `booking_method` | Form submitted |

#### FAQ Events
| Event Name | Properties | Trigger |
|------------|------------|---------|
| `faq_expanded` | `question_id`, `question`, `category` | Accordion opened |
| `faq_collapsed` | `question_id` | Accordion closed |
| `faq_searched` | `query`, `results_count`, `has_results` | Search input changed |

#### Section Events
| Event Name | Properties | Trigger |
|------------|------------|---------|
| `section_viewed` | `section`, `visibility_percent` | Section enters viewport |
| `scroll_depth_reached` | `depth_percent` (25/50/75/100) | Scroll milestones |
| `section_time_spent` | `section`, `time_ms` | Section exits viewport |

#### Pricing Events
| Event Name | Properties | Trigger |
|------------|------------|---------|
| `pricing_tier_viewed` | `tier`, `interaction_type` | Tier card visible/hovered |
| `pricing_cta_clicked` | `tier` | Tier CTA clicked |

### 3. Person Properties (Lead Scoring)

Set on form submission and engagement:

```typescript
// Form data properties
company_size: string
industry: string
timeline: string
current_mrr: string
challenges_count: number

// Engagement properties
form_started: boolean
form_completed: boolean
form_abandoned_at_step: number
last_cta_clicked: string
pricing_tier_interest: string
faq_interactions: number
engagement_score: number
lead_score: number (0-100)

// Attribution properties
utm_source, utm_medium, utm_campaign, utm_term, utm_content
first_referrer: string
first_landing_page: string
```

### 4. Lead Scoring Algorithm

```typescript
function calculateLeadScore(factors): number {
  let score = 0

  // Company size (0-30 points)
  // Larger companies = higher score for B2B

  // Timeline urgency (0-25 points)
  // "immediate" = 25, "6-12 months" = 5

  // Current MRR (0-30 points)
  // Higher revenue = higher score

  // Challenges count (0-15 points)
  // More pain points = more motivated

  // Pricing tier interest (0-15 points)
  // Enterprise interest = highest

  return Math.min(score, 100)
}
```

### 5. Session Recording Triggers

Start recording on high-intent actions:
- Form interaction begins (`booking_form_started`)
- CTA clicked (optional, may be too broad)

This captures the full session for users who show buying intent.

### 6. UTM Parameter Capture

On page load:
1. Parse URL for `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
2. Set as person properties via `setPersonPropertiesForFlags()`
3. Capture `utm_captured` event with all params

---

## Component Integration Plan

### Navbar (`navbar.tsx`)
```typescript
// Desktop nav CTA
<Link href="#booking-form" onClick={() => analytics.cta.click('header')}>

// Mobile nav CTA
<Link onClick={() => analytics.cta.click('mobile_nav')}>

// Nav link clicks
<Link onClick={() => analytics.link.navClick(navItem.link, false)}>
```

### Hero (`Hero.tsx`)
```typescript
// Primary CTA
<Link href="#booking-form" onClick={() => analytics.cta.click('hero_primary')}>

// Secondary CTA
<Link href="#how-it-works" onClick={() => analytics.cta.click('hero_secondary')}>
```

### Pricing (`Pricing.tsx`)
```typescript
// Track tier visibility with IntersectionObserver
useEffect(() => {
  analytics.pricing.tierViewed(tier.id)
}, [inView])

// CTA clicks
<Button onClick={() => analytics.cta.click(`pricing_${tier.id}`)}>
```

### BookingForm (`BookingForm.tsx`)
```typescript
// Track form start (first field focus)
const handleFormStart = useCallback(() => {
  if (!formStarted) {
    analytics.form.started()
    setFormStarted(true)
  }
}, [formStarted])

// Track field interactions
<Input
  onFocus={() => {
    handleFormStart()
    analytics.form.fieldInteraction({ field: 'firstName', step: 1, action: 'focus' })
  }}
  onBlur={() => analytics.form.fieldInteraction({ field: 'firstName', step: 1, action: 'blur', value_length: value.length })}
/>

// Track step completion
const handleNextStep = async () => {
  const isValid = await trigger(fieldsToValidate)
  if (isValid) {
    analytics.form.stepCompleted({
      step: currentStep,
      step_name: getStepName(currentStep),
      fields_completed: fieldsToValidate,
      fields_with_errors: Object.keys(errors),
      time_spent_ms: getStepTime()
    })
    setCurrentStep(currentStep + 1)
  }
}

// Track submission
const onSubmit = (data) => {
  analytics.form.submitted({
    company_size: data.companySize,
    industry: data.industry,
    timeline: data.timeline,
    current_mrr: data.currentMRR,
    challenges: data.challenges,
    booking_method: data.bookingMethod
  })
}

// Track abandonment (on unmount or page leave)
useEffect(() => {
  return () => {
    if (formStarted && !isSubmitted && currentStep < 5) {
      analytics.form.abandoned(currentStep)
    }
  }
}, [formStarted, isSubmitted, currentStep])
```

### FAQ (`FAQ.tsx`)
```typescript
// Track accordion changes
<Accordion
  onValueChange={(openItems) => {
    // Find newly opened items
    const newlyOpened = openItems.filter(id => !prevOpenItems.includes(id))
    newlyOpened.forEach(id => {
      const item = faqData.find(f => f.id === id)
      if (item) analytics.faq.expanded(id, item.question, item.category)
    })
  }}
>

// Track search
<input
  onChange={(e) => {
    setSearchQuery(e.target.value)
    // Debounced tracking
    analytics.faq.searched(e.target.value, filteredFAQs.length)
  }}
/>
```

### FinalCTA (`FinalCTA.tsx`)
```typescript
// Primary CTA
<Link onClick={() => analytics.cta.click('final_cta_primary')}>

// Email CTA
<Link onClick={() => {
  analytics.cta.click('final_cta_email')
  analytics.link.emailClick('contact@rekurve.ai', 'final_cta')
}}>
```

### Root Layout (`layout.tsx`)
```typescript
// Initialize tracking on app load
useEffect(() => {
  analytics.session.initialize()
}, [])
```

---

## PostHog Dashboard Setup (Post-Implementation)

### Recommended Dashboards

1. **Conversion Funnel**
   - Form step progression funnel
   - Drop-off analysis by step
   - Correlation analysis for conversions

2. **CTA Performance**
   - Click rates by location
   - Conversion rates by CTA source

3. **Lead Quality**
   - Lead score distribution
   - Company size breakdown
   - Timeline urgency breakdown

4. **Engagement**
   - FAQ interaction patterns
   - Section view rates
   - Scroll depth distribution

### Cohorts to Create

| Cohort Name | Definition |
|-------------|------------|
| Form Starters | `form_started = true` |
| Form Completers | `form_completed = true` |
| Form Abandoners | `form_started = true AND form_completed != true` |
| High-Intent Leads | `lead_score >= 70` |
| Pricing Researchers | `pricing_tier_viewed is set` |
| FAQ Researchers | `faq_interactions >= 3` |

---

## Implementation Order

1. **Create analytics library** (`src/lib/posthog.ts`)
2. **Update BookingForm** - highest value, most complex
3. **Update Navbar & Hero CTAs** - quick wins
4. **Update Pricing** - tier tracking
5. **Update FAQ** - interaction tracking
6. **Update FinalCTA** - CTA tracking
7. **Add session initialization** - UTM capture
8. **Test all tracking** - verify in PostHog

---

## Testing Checklist

- [ ] Events appear in PostHog Live Events
- [ ] Person properties are set correctly
- [ ] Form funnel shows all 5 steps
- [ ] Session recordings trigger on form start
- [ ] UTM parameters are captured from URL
- [ ] Lead scores are calculated and stored
- [ ] No console errors from analytics code
- [ ] Analytics doesn't break if PostHog fails to load

---

## Future Enhancements

1. **A/B Testing** - Use PostHog feature flags to test CTA copy
2. **Heatmaps** - Enable and analyze click patterns
3. **Scroll maps** - Understand content engagement
4. **Surveys** - In-app feedback collection
5. **Experiment tracking** - Test pricing page layouts
