# PostHog Dashboards, Funnels & Lead Alerts Implementation Plan

## Overview

Expand the PostHog analytics integration to include full lead details in form submissions, enabling real-time email notifications to `sales@rekurve.ai` when leads submit the booking form. This also enables PostHog dashboards, funnels, and threshold alerts.

## Current State Analysis

### What Exists
- PostHog analytics library at `src/lib/posthog.ts` with comprehensive tracking
- Form tracking implemented (`started`, `stepCompleted`, `fieldInteraction`, `submitted`, `abandoned`)
- Lead scoring function `calculateLeadScore()` at `src/lib/posthog.ts:586-639`
- BookingForm collects 13 fields but only passes 6 to analytics

### What's Missing
- `formTracking.submitted()` doesn't include contact details (name, email, phone)
- No `posthog.identify()` call to link form submissions to person records
- Lead score not included in the event (only in person properties)
- `goals` and `location` fields not passed to analytics

### Key Discoveries
- Current `formTracking.submitted()` signature at `src/lib/posthog.ts:380-387`
- Current `onSubmit()` handler at `src/components/sections/BookingForm.tsx:220-249`
- Form schema defines all needed fields at `src/components/sections/BookingForm.tsx:41-66`
- Design document at `thoughts/designs/2025-11-26-posthog-dashboards-funnels-alerts.md` specifies exact changes

## Desired End State

After implementation:
1. `booking_form_submitted` event includes all lead details (name, email, company, etc.)
2. `posthog.identify()` links the submission to a person record
3. PostHog Workflows can send formatted emails to `sales@rekurve.ai` with full lead info
4. Dashboard subscriptions and threshold alerts can be configured

### Verification
- Submit test form and verify all `lead_*` properties appear in PostHog Live Events
- Verify person record shows name, email, company in PostHog Persons view
- Verify PostHog Workflow receives all template variables

## What We're NOT Doing

- Creating the actual PostHog Workflow (manual configuration in PostHog UI)
- Creating dashboards (manual configuration in PostHog UI)
- Setting up threshold alerts (manual configuration in PostHog UI)
- Adding new form fields (all needed fields already exist)

---

## Phase 1: Update `formTracking.submitted()` Signature

### Overview
Expand the function signature to accept full lead details and capture them in the event.

### Changes Required

#### 1. Update `src/lib/posthog.ts`
**File**: `src/lib/posthog.ts`
**Lines**: 380-419

**Replace the current `submitted` function with:**

```typescript
  /**
   * Track successful form submission with full lead details
   */
  submitted: (formData: {
    // Contact info
    first_name: string
    last_name: string
    email: string
    phone?: string

    // Company info
    company: string
    company_size: string
    industry: string
    location: string

    // Qualification
    challenges: string[]
    goals: string
    timeline: string
    current_mrr?: string
    booking_method: string
  }) => {
    const leadScore = calculateLeadScore({
      company_size: formData.company_size,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
    })

    // Capture event with full lead details for workflow email template
    safeCapture('booking_form_submitted', {
      // Contact info (prefixed with lead_ for workflow template)
      lead_name: `${formData.first_name} ${formData.last_name}`,
      lead_email: formData.email,
      lead_phone: formData.phone,

      // Company info
      lead_company: formData.company,
      lead_company_size: formData.company_size,
      lead_industry: formData.industry,
      lead_location: formData.location,

      // Qualification
      lead_challenges: formData.challenges.join(', '),
      lead_goals: formData.goals,
      lead_timeline: formData.timeline,
      lead_mrr: formData.current_mrr,
      lead_score: leadScore,

      // Booking preference
      booking_method: formData.booking_method,

      // Legacy properties for existing dashboards
      company_size: formData.company_size,
      industry: formData.industry,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
    })

    // Identify the person for session recordings linkage
    posthog.identify(formData.email, {
      name: `${formData.first_name} ${formData.last_name}`,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      company_size: formData.company_size,
      industry: formData.industry,
      location: formData.location,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
      lead_score: leadScore,
    })

    // Set comprehensive person properties for lead scoring
    posthog.setPersonProperties({
      form_completed: true,
      form_completed_at: new Date().toISOString(),
      company_size: formData.company_size,
      industry: formData.industry,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
      lead_score: leadScore,
    })

    // Identify as a converted lead
    posthog.setPersonPropertiesForFlags({
      is_lead: true,
      conversion_date: new Date().toISOString(),
    })
  },
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes (lint + typecheck)

#### Manual Verification
- [ ] TypeScript compiles without errors on the new signature

---

## Phase 2: Update BookingForm to Pass Full Data

### Overview
Update the `onSubmit` handler to pass all form fields to the analytics function.

### Changes Required

#### 1. Update `src/components/sections/BookingForm.tsx`
**File**: `src/components/sections/BookingForm.tsx`
**Lines**: 220-229

**Replace the current `onSubmit` analytics call with:**

```typescript
  const onSubmit = (data: FormData) => {
    // Track form submission with full lead data
    analytics.form.submitted({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      company_size: data.companySize,
      industry: data.industry,
      location: data.location,
      challenges: data.challenges,
      goals: data.goals,
      timeline: data.timeline,
      current_mrr: data.currentMRR,
      booking_method: data.bookingMethod,
    })

    console.log('Form submitted:', data)
    setIsSubmitted(true)

    // ... rest of handler unchanged
```

### Success Criteria

#### Automated Verification
- [ ] `yarn check` passes
- [ ] `yarn build` succeeds

#### Manual Verification
- [ ] Submit form and verify `booking_form_submitted` event in PostHog Live Events
- [ ] Verify all `lead_*` properties are populated
- [ ] Verify person record shows correct name and email

---

## Phase 3: Manual PostHog Configuration

### Overview
Configure PostHog Workflows, dashboards, and alerts via the PostHog UI.

**Note**: This phase is documented for reference but performed manually in PostHog, not via code.

### 3.1 Create Lead Notification Workflow

**Location**: PostHog → Workflows → New Workflow

**Trigger**:
- Event: `booking_form_submitted`
- Frequency: Every time

**Email Action**:
- To: `sales@rekurve.ai`
- Subject: `New Lead: {{ trigger.properties.lead_name }} from {{ trigger.properties.lead_company }}`

**Body Template**:
```liquid
New Lead Submission

Contact
━━━━━━━━━━━━━━━━━━━━━━━━
Name: {{ trigger.properties.lead_name }}
Email: {{ trigger.properties.lead_email }}
Phone: {{ trigger.properties.lead_phone | default: "Not provided" }}

Company
━━━━━━━━━━━━━━━━━━━━━━━━
Company: {{ trigger.properties.lead_company }}
Size: {{ trigger.properties.lead_company_size }} employees
Industry: {{ trigger.properties.lead_industry }}
Location: {{ trigger.properties.lead_location }}

Qualification
━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: {{ trigger.properties.lead_timeline }}
MRR: {{ trigger.properties.lead_mrr | default: "Not disclosed" }}
Lead Score: {{ trigger.properties.lead_score }}/100

Challenges: {{ trigger.properties.lead_challenges }}

Goals: {{ trigger.properties.lead_goals }}

━━━━━━━━━━━━━━━━━━━━━━━━
View full activity & session recordings:
https://us.posthog.com/project/254485/person/{{ event.distinct_id }}
```

### 3.2 Create Threshold Alerts

| Alert Name | Metric | Condition | Recipient |
|------------|--------|-----------|-----------|
| Lead Volume Spike | `booking_form_submitted` count | > 5 per day | `sales@rekurve.ai` |
| Lead Drought | `booking_form_submitted` count | < 1 for 48 hours | `sales@rekurve.ai` |
| Conversion Drop | Form funnel conversion rate | Drops > 20% vs prior week | `sales@rekurve.ai` |
| Abandonment Spike | `booking_form_abandoned` count | Increases > 50% vs prior week | `sales@rekurve.ai` |

### 3.3 Create Lead Generation Dashboard

**Insights to add**:
1. Leads Today (Number with comparison)
2. Leads This Week (Trend line)
3. Form Conversion Funnel (started → step 1 → step 2 → step 3 → step 4 → submitted)
4. Average Lead Score (Trend)
5. Traffic Sources Breakdown (by `utm_source`)
6. Abandonment by Step (Bar chart)

**Subscription**: Daily at 8:00 AM to `sales@rekurve.ai`

### Success Criteria

#### Manual Verification
- [ ] Workflow created and activated
- [ ] Test form submission triggers email to `sales@rekurve.ai`
- [ ] Email contains all lead details correctly formatted
- [ ] Dashboard displays data correctly
- [ ] Alerts configured and verified

---

## Testing Strategy

### Unit Tests
- No unit tests required (analytics is fire-and-forget)

### Integration Tests
- No integration tests required

### Manual Testing Steps

1. **Start dev server**: `yarn dev`
2. **Open PostHog Live Events**: https://us.posthog.com/project/254485/events
3. **Complete form submission**:
   - Fill all form steps
   - Submit with test data
4. **Verify in PostHog**:
   - `booking_form_submitted` event appears
   - All `lead_*` properties populated
   - Person record created with email as distinct ID
   - Person properties include lead_score

---

## References

- Design document: `thoughts/designs/2025-11-26-posthog-dashboards-funnels-alerts.md`
- Manual testing guide: `thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md`
- Analytics library: `src/lib/posthog.ts`
- BookingForm component: `src/components/sections/BookingForm.tsx`
- PostHog Project: https://us.posthog.com/project/254485
