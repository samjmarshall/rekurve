# PostHog Manual Testing & Post-Implementation Setup Guide

## Overview

This guide covers the **manual tasks** required after the technical PostHog analytics implementation to:
1. Verify all tracking works correctly in the live environment
2. Configure PostHog dashboards, funnels, and cohorts
3. Set up email alerts and notifications
4. Create the workflow for real-time lead notifications

**Prerequisites:**
- PostHog analytics library implemented (`src/lib/posthog.ts`)
- All components integrated with analytics tracking
- Development server running (`yarn dev`)
- Access to PostHog dashboard (Project ID: 254485)

---

## Part 1: Manual Testing Checklist ✅ COMPLETED

**Tested:** 2025-12-05

### Results Summary

| Event | Status | Notes |
|-------|--------|-------|
| `cta_clicked` | ✅ | All locations verified |
| `email_link_clicked` | ✅ | Final CTA email link (different event name) |
| `booking_form_started` | ✅ | Fires on form focus |
| `form_step_completed` (1-3) | ✅ | Steps 1, 2, 3 verified |
| `form_step_completed` (4) | ❌ | **Bug: #37** - Not firing |
| `lead_identified` | ✅ | Fires after Step 1 |
| `booking_form_submitted` | ❌ | **Bug: #38** - Not firing |
| `faq_expanded` | ✅ | With question_id, question, category |
| `faq_collapsed` | ❌ | **Post-PMF: #39** |
| `faq_searched` | ✅ | With query, results_count |
| `utm_captured` | ✅ | All UTM params captured |
| `page_viewed` | ✅ | With device_type, viewport_width |
| Anonymous browsing | ✅ | No person profile created |
| Early identification | ✅ | Profile created after Step 1 |
| `identity_reset` | ❌ | **Post-PMF: #40** |

### Bugs to Fix Before Pilot Goes Live

| Issue | Priority | Description |
|-------|----------|-------------|
| [#38](https://github.com/samjmarshall/www/issues/38) | P1 | `booking_form_submitted` not firing |
| [#37](https://github.com/samjmarshall/www/issues/37) | P2 | `form_step_completed` step 4 not firing |

### Deferred to Post-PMF

| Issue | Description |
|-------|-------------|
| [#39](https://github.com/samjmarshall/www/issues/39) | `faq_collapsed` not firing |
| [#40](https://github.com/samjmarshall/www/issues/40) | `identity_reset` not firing |
| [#41](https://github.com/samjmarshall/www/issues/41) | Remove `booking_form_abandoned` (unreliable) |
| [#42](https://github.com/samjmarshall/www/issues/42) | Add `latest_utm_*` properties |

### Design Decision: Form Abandonment

**Removed:** `booking_form_abandoned` event tracking.

**Rationale:** Browser `beforeunload` and `visibilitychange` events are unreliable. Form abandonment is better derived from funnel analysis:
- `booking_form_started` without `booking_form_submitted` = abandoned
- `form_step_completed` with `step: N` but no higher steps = abandoned at step N

---

## Part 2: PostHog Dashboard Configuration ✅ COMPLETED

**Completed:** 2025-12-05 via `yarn posthog:setup`

**Dashboards Created:**
- [Lead Generation Overview](https://us.posthog.com/project/254485/dashboard/818371) - 5 insights
- [CTA Performance](https://us.posthog.com/project/254485/dashboard/818372) - 3 insights
- [FAQ Engagement](https://us.posthog.com/project/254485/dashboard/818373) - 3 insights

To update dashboard configuration, modify `scripts/posthog-setup.ts` and re-run `yarn posthog:setup`.

---

## Part 3: Create Cohorts ✅ COMPLETED

**Completed:** 2025-12-05 via `yarn posthog:setup`

**Cohorts Created:**
- Form Starters (ID: 203552)
- Form Completers (ID: 203553)
- Form Abandoners (ID: 203554)
- High-Intent Leads (ID: 203555)
- Pricing Researchers (ID: 203556)
- FAQ Researchers (ID: 203557)

To update cohort definitions, modify `scripts/posthog-setup.ts` and re-run `yarn posthog:setup`.

---

## Part 4: Configure Threshold Alerts

**Location:** On each Trend insight → Alerts → New Alert

### Alert 1: Lead Volume Spike
- **Create on:** "Leads Today" trend
- **Condition:** Greater than 5 per day
- **Recipient:** `sales@rekurve.ai`
- **Purpose:** Know when to prioritize inbox

### Alert 2: Lead Drought
- **Create on:** "Leads Today" trend
- **Condition:** Less than 1 for 48 hours
- **Recipient:** `sales@rekurve.ai`
- **Purpose:** Something may be broken

### Alert 3: Conversion Drop
- **Create on:** Form Conversion Funnel
- **Condition:** Conversion rate drops > 20% vs prior week
- **Recipient:** `sales@rekurve.ai`
- **Purpose:** Identify funnel issues

---

## Part 5: Create Lead Notification Workflow

**Location:** PostHog → Workflows → New Workflow

### Workflow: "New Lead Notification"

#### Step 1: Configure Trigger
- **Trigger type:** Event
- **Event name:** `booking_form_submitted`
- **Frequency:** Every time (not one-time per person)

#### Step 2: Add Email Action
- **Action type:** Send email
- **To:** `sales@rekurve.ai`
- **Subject:**
  ```
  New Lead: {{ trigger.properties.lead_name }} from {{ trigger.properties.lead_company }}
  ```

**Note:** Before the workflow will work, the `formTracking.submitted()` function needs to be updated to include the full lead details. See "Part 6: Required Code Update" below.

#### Step 3: Email Body Template

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

#### Step 4: Save and Activate
- Save the workflow
- Toggle to "Active"
- Test with a form submission

---

## Part 6: Code Update Status ✅

**Status:** COMPLETED

The following code changes have been implemented:

### Original Form Submission Implementation
**File:** `src/lib/posthog.ts` (lines 436-526)
- ✅ `formTracking.submitted()` expanded to accept full lead details
- ✅ Event now includes all `lead_*` properties for workflow email templates
- ✅ Lead score calculated and included in event properties

**File:** `src/components/sections/BookingForm.tsx` (lines 220-236)
- ✅ `onSubmit` handler passes all 13 form fields to analytics

### User Identification Enhancement (NEW)
**File:** `src/instrumentation-client.ts` (line 6)
- ✅ Added `person_profiles: 'identified_only'` config for cost optimization
- Anonymous visitors no longer create person profiles

**File:** `src/lib/posthog.ts` (lines 354-407)
- ✅ Added `identifyLead()` function for early identification after Step 1
- ✅ Added `resetIdentity()` function to handle email changes
- ✅ `posthog.identify()` now uses proper `$set` vs `$set_once` property handling
- First-touch attribution data preserved in `$set_once` properties

**File:** `src/components/sections/BookingForm.tsx` (lines 93, 164-174, 208-216)
- ✅ Added `lastIdentifiedEmailRef` to track identified email
- ✅ Calls `identifyLead()` after Step 1 completion
- ✅ useEffect detects email changes and calls `resetIdentity()`

**Implementation Plans:**
- `thoughts/plans/2025-11-27-posthog-dashboards-funnels-alerts.md`
- `thoughts/plans/2025-11-27-posthog-user-identification.md` (NEW)

---

## Part 7: Subscribe to Dashboard Digests

**Location:** Dashboard → More (⋯) → Subscribe

### Daily Digest
- **Dashboard:** Lead Generation Overview
- **Recipients:** `sales@rekurve.ai`
- **Frequency:** Daily at 8:00 AM

### Weekly Summary (Optional)
- **Dashboard:** Lead Generation Overview
- **Recipients:** `sales@rekurve.ai`
- **Frequency:** Weekly on Monday at 9:00 AM

---

## Part 8: Session Recordings Configuration

**Location:** PostHog → Session Recordings → Settings

### Recommended Settings
- [ ] Enable session recording (should already be enabled)
- [ ] Set minimum session duration: 10 seconds
- [ ] Enable: "Start recording when high-intent event occurs"
- [ ] High-intent events: `booking_form_started`

### Verify Recording Works
1. Start a form interaction
2. Wait 30 seconds
3. Go to PostHog → Session Recordings
4. Find your session
5. Verify the form interaction is captured

---

## Summary: Post-Implementation Checklist

### Completed ✅

| Part | Description | Date |
|------|-------------|------|
| Part 1 | Manual Testing | 2025-12-05 |
| Part 2 | Dashboards (3) | 2025-12-05 |
| Part 3 | Cohorts (6) | 2025-12-05 |
| Part 6 | Code Updates | 2025-12-05 |

**Bugs to fix before pilot goes live:**
- [ ] [#38](https://github.com/samjmarshall/www/issues/38): `booking_form_submitted` not firing (P1)
- [ ] [#37](https://github.com/samjmarshall/www/issues/37): `form_step_completed` step 4 not firing (P2)

### Remaining Manual Configuration

| Part | Task | Location |
|------|------|----------|
| Part 4 | 3 threshold alerts | Insight → Alerts → New Alert |
| Part 5 | Lead notification workflow | Data Pipeline → Destinations |
| Part 7 | Daily dashboard digest | Dashboard → More → Subscribe |
| Part 8 | Session recording settings | Session Recordings → Settings |

---

## Troubleshooting

### Events not appearing in PostHog
1. Check browser console for errors
2. Verify PostHog is loaded: `posthog.__loaded` should be `true`
3. Check network tab for requests to `us.posthog.com`
4. Verify API key in `src/instrumentation-client.ts`

### Person properties not updating
1. Properties may take a few minutes to sync
2. Refresh the person page in PostHog
3. Check if `posthog.identify()` is being called

### Session recordings not starting
1. Verify `posthog.startSessionRecording()` is called
2. Check session recording settings in PostHog
3. Ensure recording isn't blocked by ad blockers

### Workflow emails not sending
1. Verify email sender channel is configured in PostHog
2. Check workflow is set to "Active"
3. Verify event properties match template variables exactly
4. Check PostHog workflow execution logs

---

## References

### Design Documents
- Design document: `thoughts/designs/2025-11-25-posthog-analytics-implementation.md`
- Dashboard & alerts design: `thoughts/designs/2025-11-26-posthog-dashboards-funnels-alerts.md`

### Implementation Plans
- Integration plan: `thoughts/plans/2025-11-25-posthog-analytics-integration.md`
- Dashboard/funnel/alerts implementation: `thoughts/plans/2025-11-27-posthog-dashboards-funnels-alerts.md`
- **User identification implementation**: `thoughts/plans/2025-11-27-posthog-user-identification.md`

### Playwright E2E Tests (UI Behavior Verification)
- CTA tracking: `e2e/features/cta-tracking.spec.ts`
- Booking form: `e2e/features/booking-form.spec.ts`
- FAQ interactions: `e2e/features/faq-interactions.spec.ts`
- Form abandonment: `e2e/journeys/form-abandonment.spec.ts`
- Lead conversion: `e2e/journeys/lead-conversion.spec.ts`

### Automation Scripts
- PostHog setup script: `scripts/posthog-setup.ts`
  - Creates 3 dashboards with 11 insights total
  - Creates 6 cohorts
  - Run with: `POSTHOG_PERSONAL_API_KEY=phx_xxx yarn posthog:setup`

### Source Code
- PostHog initialization: `src/instrumentation-client.ts` (person_profiles config)
- Analytics library: `src/lib/posthog.ts`
  - Form submission: lines 439-545
  - Early identification (`identifyLead`): lines 354-393
  - Identity reset (`resetIdentity`): lines 399-407
- BookingForm component: `src/components/sections/BookingForm.tsx`
  - Form submission: lines 246-262
  - Early identification call: lines 208-216
  - Email change detection: lines 164-174

### External Resources
- PostHog Project: https://us.posthog.com/project/254485
- PostHog Identify docs: https://posthog.com/docs/product-analytics/identify
- PostHog Person Properties docs: https://posthog.com/docs/product-analytics/person-properties
