# PostHog User Identification Implementation Plan

## Overview

Implement early user identification in PostHog to link anonymous sessions to identified users as soon as email is captured (Step 1), optimize costs with `person_profiles: 'identified_only'`, and improve property handling using `$set` vs `$set_once` best practices.

## Current State Analysis

### Existing Implementation
- PostHog initialized in `src/instrumentation-client.ts:4-8`
- User identification only happens at form submission (`src/lib/posthog.ts:439-451`)
- No `person_profiles` config set (defaults to creating profiles for all users)
- All properties set with basic `posthog.identify()` without `$set`/`$set_once` distinction

### Key Discoveries
- `formTracking.submitted()` already calls `posthog.identify(email, {...properties})`
- Step 1 collects email, which is sufficient for early identification
- No reset mechanism exists for form restart scenarios

## Desired End State

1. **Early Identification**: Users identified immediately after Step 1 completion (when email is captured)
2. **Cost Optimization**: `person_profiles: 'identified_only'` configured to avoid creating profiles for anonymous users
3. **Property Best Practices**: Proper use of `$set` (overwritable) vs `$set_once` (immutable first-touch data)
4. **Reset Handling**: `posthog.reset()` called when user restarts form with different email

### Verification
- [ ] Anonymous page views do NOT create person profiles (check PostHog Persons tab)
- [ ] Completing Step 1 creates a person profile with email
- [ ] Completing form updates person properties without duplicating `$set_once` values
- [ ] Changing email and resubmitting creates proper identity linkage

## What We're NOT Doing

- Server-side identification (not needed for landing page)
- Cross-device identification (no auth system)
- Feature flags based on identification (future enhancement)

## Implementation Approach

Three targeted changes:
1. Add config to PostHog init
2. Create early identification after Step 1 (with reset on email change)
3. Refactor submission identification with proper property handling

---

## Phase 1: Add `person_profiles` Configuration

### Overview
Configure PostHog to only create person profiles for identified users, reducing costs.

### Changes Required

#### 1. Update PostHog Initialization
**File**: `src/instrumentation-client.ts`
**Changes**: Add `person_profiles: 'identified_only'` to init config

```typescript
import { env } from './env';
import posthog from 'posthog-js'

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY as string, {
  api_host: "/relay-HYIX",
  ui_host: 'https://us.posthog.com',
  person_profiles: 'identified_only', // Only create profiles when identify() is called
  defaults: '2025-05-24'
});
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes

#### Manual Verification
- [ ] Visit site without submitting form - no person profile created in PostHog
- [ ] Complete Step 1 - person profile created with email

---

## Phase 2: Implement Early Identification After Step 1

### Overview
Identify users as soon as Step 1 is completed and email is captured, linking all subsequent events to the user.

### Changes Required

#### 1. Add Early Identify Function to PostHog Library
**File**: `src/lib/posthog.ts`
**Changes**: Add new `identifyLead()` function in formTracking

```typescript
// Add to formTracking object (after stepViewed function, around line 348)

/**
 * Identify user early when email is captured (Step 1 complete)
 * This links all subsequent events to this person
 */
identifyLead: (leadData: {
  email: string
  firstName: string
  lastName: string
  phone?: string
}) => {
  if (!isPostHogReady()) return

  const { email, firstName, lastName, phone } = leadData

  // Check if we're already identified with this email
  const currentId = posthog.get_distinct_id()
  if (currentId === email) {
    return // Already identified with this email
  }

  posthog.identify(email, {
    // Properties that can be updated
    $set: {
      email: email,
      name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
    },
    // Properties that should only be set once (first-touch attribution)
    $set_once: {
      first_seen: new Date().toISOString(),
      initial_referrer: document.referrer || 'direct',
      initial_landing_page: window.location.pathname,
      initial_utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      initial_utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      initial_utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    },
  })

  safeCapture('lead_identified', {
    identification_point: 'step_1_complete',
  })
},
```

#### 2. Add Reset Function for Email Changes
**File**: `src/lib/posthog.ts`
**Changes**: Add reset function to handle email changes

```typescript
// Add to formTracking object (after identifyLead)

/**
 * Reset identification when user changes email
 * Call this before re-identifying with a new email
 */
resetIdentity: () => {
  if (!isPostHogReady()) return

  posthog.reset()

  safeCapture('identity_reset', {
    reason: 'email_changed',
  })
},
```

#### 3. Update BookingForm to Call Early Identify
**File**: `src/components/sections/BookingForm.tsx`
**Changes**: Call `identifyLead` when Step 1 completes successfully

In the `handleNextStep` function, after validating Step 1 fields and before incrementing the step:

```typescript
// Inside handleNextStep, in the case 1 block, after validation succeeds
// Around line 182-195, modify to:

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

  // Early identification after Step 1 (when we have email)
  if (currentStep === 1) {
    const formValues = watch()
    analytics.form.identifyLead({
      email: formValues.email,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      phone: formValues.phone,
    })
  }

  // Reset timer for next step
  stepStartTimeRef.current = Date.now()
  setCurrentStep(currentStep + 1)
}
```

#### 4. Track Email Changes and Reset Identity
**File**: `src/components/sections/BookingForm.tsx`
**Changes**: Add email change tracking to reset identity if user goes back and changes email

Add a ref to track the last identified email and handle changes:

```typescript
// Add after other refs (around line 92)
const lastIdentifiedEmailRef = useRef<string | null>(null)

// Add a useEffect to handle email changes when going back to step 1
// Add after the abandonment useEffect (around line 160)
useEffect(() => {
  // Only check if we're on step 1 and have previously identified
  if (currentStep === 1 && lastIdentifiedEmailRef.current) {
    const currentEmail = watch('email')
    if (currentEmail && currentEmail !== lastIdentifiedEmailRef.current) {
      // User changed their email, reset identity
      analytics.form.resetIdentity()
      lastIdentifiedEmailRef.current = null
    }
  }
}, [currentStep, watch])

// Update the early identification call to track the email
// In handleNextStep, after calling identifyLead:
if (currentStep === 1) {
  const formValues = watch()
  analytics.form.identifyLead({
    email: formValues.email,
    firstName: formValues.firstName,
    lastName: formValues.lastName,
    phone: formValues.phone,
  })
  lastIdentifiedEmailRef.current = formValues.email // Track identified email
}
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes

#### Manual Verification
- [ ] Complete Step 1 with email "test1@example.com" - person profile created
- [ ] All subsequent form events linked to "test1@example.com" person
- [ ] Go back to Step 1, change email to "test2@example.com", proceed - new person created
- [ ] Check PostHog that both persons exist with correct event linkage

---

## Phase 3: Refactor Submission Identification with Best Practices

### Overview
Update the existing `formTracking.submitted()` function to use proper `$set` vs `$set_once` property handling.

### Changes Required

#### 1. Update submitted() Function
**File**: `src/lib/posthog.ts`
**Changes**: Refactor the identify call in `submitted()` to use proper property modifiers

Replace lines 439-451 with:

```typescript
// Identify the person with proper property handling
posthog.identify(formData.email, {
  // Properties that should update on each submission
  $set: {
    email: formData.email,
    name: `${formData.first_name} ${formData.last_name}`,
    first_name: formData.first_name,
    last_name: formData.last_name,
    phone: formData.phone,
    company: formData.company,
    company_size: formData.company_size,
    industry: formData.industry,
    location: formData.location,
    timeline: formData.timeline,
    current_mrr: formData.current_mrr,
    challenges_count: formData.challenges.length,
    lead_score: leadScore,
    last_form_submission: new Date().toISOString(),
  },
  // Properties that should only be set once (first conversion)
  $set_once: {
    first_form_submission: new Date().toISOString(),
    first_challenges: formData.challenges.join(', '),
    first_goals: formData.goals,
    first_timeline: formData.timeline,
    first_company_size: formData.company_size,
    first_lead_score: leadScore,
    conversion_source: document.referrer || 'direct',
  },
})
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes

#### Manual Verification
- [ ] Submit form - person has both `$set` and `$set_once` properties
- [ ] If same email submits again (hypothetically), `first_*` properties remain unchanged
- [ ] `last_form_submission` updates on each submission

---

## Testing Strategy

### Unit Tests
- Not applicable for this analytics integration (side effects only)

### Integration Tests
- Not applicable (PostHog is external service)

### Manual Testing Steps

1. **Anonymous Tracking Test**
   - Open site in incognito
   - Scroll around, don't fill form
   - Check PostHog: NO person profile should exist (only anonymous events)

2. **Early Identification Test**
   - Fill Step 1 with email "early-test@example.com"
   - Click Next
   - Check PostHog: Person profile created with email, first_seen set

3. **Full Funnel Test**
   - Complete entire form
   - Check PostHog: Person has all properties, both `$set` and `$set_once` values

4. **Email Change Test**
   - Start with "email1@test.com", complete Step 1
   - Go back to Step 1, change to "email2@test.com"
   - Complete form
   - Check PostHog: Two persons exist, events properly attributed

5. **Cost Verification**
   - Check PostHog billing/usage
   - Confirm person profiles only created for identified users

## Performance Considerations

- `posthog.identify()` is async and non-blocking
- `posthog.reset()` clears local storage - minimal performance impact
- No additional network requests beyond existing PostHog calls

## References

- PostHog Identify Documentation: https://posthog.com/docs/product-analytics/identify
- PostHog Person Properties: https://posthog.com/docs/product-analytics/person-properties
- Current implementation: `src/lib/posthog.ts:439-451`
- Form component: `src/components/sections/BookingForm.tsx`
