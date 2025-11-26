# PostHog Analytics: Dashboards, Funnels & Lead Alerts

**Date:** 2025-11-26
**Status:** Ready for implementation

---

## Overview

Configure PostHog Analytics with dashboards, funnels, and email notifications to `sales@rekurve.ai` for lead tracking and sales enablement.

### Goals

1. **Real-time lead notifications** — Instant email when BookingForm is submitted
2. **Threshold alerts** — Notifications when metrics cross critical thresholds
3. **Scheduled digests** — Daily/weekly dashboard summaries

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PostHog Analytics Hub                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. REAL-TIME LEAD NOTIFICATIONS                                │
│     ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│     │ booking_form │───▶│ PostHog      │───▶│ Email to        │ │
│     │ _submitted   │    │ Workflow     │    │ sales@rekurve   │ │
│     │ event        │    │              │    │ (configured ✓)  │ │
│     └──────────────┘    └──────────────┘    └─────────────────┘ │
│                                                                  │
│  2. THRESHOLD ALERTS (Native PostHog)                           │
│     • Conversion rate, lead volume, abandonment spikes          │
│                                                                  │
│  3. SCHEDULED DIGESTS (PostHog Subscriptions)                   │
│     • Daily/weekly dashboard emails                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key decisions:**
- PostHog Workflows replaces Zapier (no external dependencies)
- PostHog Actions not required — Workflows trigger directly on events
- Email sender channel already configured in PostHog

---

## Code Changes

### 1. Update `src/lib/posthog.ts`

Expand `formTracking.submitted()` to include full lead details for the workflow email.

**Current signature:**
```typescript
submitted: (formData: {
  company_size: string
  industry: string
  timeline: string
  current_mrr?: string
  challenges: string[]
  booking_method: string
}) => { ... }
```

**New signature:**
```typescript
submitted: (formData: {
  // Contact info (NEW)
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

  safeCapture('booking_form_submitted', {
    // Full lead details for workflow email
    lead_name: `${formData.first_name} ${formData.last_name}`,
    lead_email: formData.email,
    lead_phone: formData.phone,
    lead_company: formData.company,
    lead_company_size: formData.company_size,
    lead_industry: formData.industry,
    lead_location: formData.location,
    lead_challenges: formData.challenges.join(', '),
    lead_goals: formData.goals,
    lead_timeline: formData.timeline,
    lead_mrr: formData.current_mrr,
    lead_score: leadScore,
    booking_method: formData.booking_method,
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

  // Set conversion flags
  posthog.setPersonPropertiesForFlags({
    is_lead: true,
    conversion_date: new Date().toISOString(),
  })
}
```

### 2. Update `src/components/sections/BookingForm.tsx`

Pass full form data to `analytics.form.submitted()`:

```typescript
const onSubmit = (data: FormData) => {
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

  // ... rest of submit handler
}
```

---

## PostHog Workflow Configuration

### Workflow: "New Lead Notification"

**Trigger:**
- Event: `booking_form_submitted`
- Frequency: Every time (not one-time)

**Email Dispatch:**
- **To:** `sales@rekurve.ai`
- **Subject:** `New Lead: {{ trigger.lead_name }} from {{ trigger.lead_company }}`

**Email Body Template:**

```liquid
New Lead Submission

Contact
━━━━━━━━━━━━━━━━━━━━━━━━
Name: {{ trigger.lead_name }}
Email: {{ trigger.lead_email }}
Phone: {{ trigger.lead_phone | default: "Not provided" }}

Company
━━━━━━━━━━━━━━━━━━━━━━━━
Company: {{ trigger.lead_company }}
Size: {{ trigger.lead_company_size }} employees
Industry: {{ trigger.lead_industry }}
Location: {{ trigger.lead_location }}

Qualification
━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: {{ trigger.lead_timeline }}
MRR: {{ trigger.lead_mrr | default: "Not disclosed" }}
Lead Score: {{ trigger.lead_score }}/100

Challenges: {{ trigger.lead_challenges }}

Goals: {{ trigger.lead_goals }}

━━━━━━━━━━━━━━━━━━━━━━━━
View full activity & session recordings:
https://us.posthog.com/project/254485/person/{{ event.distinct_id }}
```

---

## Threshold Alerts Configuration

Create these alerts on trend insights, all sending to `sales@rekurve.ai`:

| Alert Name | Metric | Condition | Purpose |
|------------|--------|-----------|---------|
| Lead Volume Spike | `booking_form_submitted` count | > 5 per day | Know when to prioritize inbox |
| Lead Drought | `booking_form_submitted` count | < 1 for 48 hours | Something may be broken |
| Conversion Drop | Form started → submitted rate | Drops > 20% vs prior week | Identify funnel issues |
| Abandonment Spike | `booking_form_abandoned` count | Increases > 50% vs prior week | UX problem signal |

**Setup steps for each:**
1. Create Trend insight with the metric
2. Click **Alerts** → **New Alert**
3. Set threshold condition
4. Add `sales@rekurve.ai` as recipient

---

## Dashboard: "Lead Generation Overview"

| Insight | Type | Description |
|---------|------|-------------|
| Leads Today | Number | Count of `booking_form_submitted` (compare to previous period) |
| Leads This Week | Trend | Daily `booking_form_submitted` over 7 days |
| Conversion Rate | Funnel | `booking_form_started` → `booking_form_submitted` |
| Lead Quality | Trend | Average `lead_score` over time |
| Top Traffic Sources | Breakdown | Leads by `utm_source` |
| Abandonment by Step | Bar | `booking_form_abandoned` grouped by `last_step` |

**Subscription:**
- **Recipient:** `sales@rekurve.ai`
- **Frequency:** Daily at 8:00 AM
- **Optional:** Weekly summary every Monday

---

## Implementation Checklist

### Code Changes
- [ ] Update `formTracking.submitted()` signature in `src/lib/posthog.ts`
- [ ] Update `onSubmit()` in `src/components/sections/BookingForm.tsx`
- [ ] Test form submission captures all properties

### PostHog Platform
- [ ] Create "New Lead Notification" workflow
- [ ] Test workflow with sample form submission
- [ ] Create Lead Volume Spike alert
- [ ] Create Lead Drought alert
- [ ] Create Conversion Drop alert
- [ ] Create Abandonment Spike alert
- [ ] Create "Lead Generation Overview" dashboard
- [ ] Subscribe dashboard to `sales@rekurve.ai`

---

## Dependencies

| Dependency | Status |
|------------|--------|
| PostHog integration | Configured ✓ |
| Email sender channel | Configured ✓ |
| Form events tracking | Implemented ✓ (needs property expansion) |
| Project ID | 254485 |
