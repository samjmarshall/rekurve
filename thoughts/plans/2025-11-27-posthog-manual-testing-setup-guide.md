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

## Part 1: Manual Testing Checklist

### 1.1 Pre-Testing Setup

Before testing, ensure the environment is ready:

- [x] Open PostHog Live Events view: `https://us.posthog.com/project/254485/events`
- [x] Open browser DevTools Console to monitor for errors
- [x] Navigate to `http://localhost:3000` (development) or production URL
- [x] Clear any existing PostHog cookies/data for clean testing (optional)

### 1.2 Anonymous vs Identified User Verification (Cost Optimization)

**Purpose:** Verify `person_profiles: 'identified_only'` configuration is working correctly.

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-identity-profiles.md` (Phases 1-3)
>
> Use **@agent-ui-navigator** to execute the automated tests covering:
> - Anonymous browsing (no person profile created)
> - Form start without Step 1 completion (no profile)
> - Step 1 completion (person profile created with email as distinct_id)

### 1.3 CTA Click Tracking Verification

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-cta-tracking.md`
>
> Use **@agent-ui-navigator** to execute the automated tests covering all 10 CTA locations:
> - Header, Mobile Nav, Hero (primary/secondary)
> - Pricing tiers (Foundation, Growth, Enterprise)
> - Final CTA (primary, email), FAQ bottom link
>
> **Human verification required:** Login to PostHog dashboard to verify events in Live Events view.

### 1.4 Form Funnel Tracking Verification

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-form-funnel.md`
>
> Use **@agent-ui-navigator** to execute the automated tests covering:
> - Form start event and session recording trigger
> - Step 1-4 completion events with timing properties
> - Early identification (`lead_identified`) after Step 1
> - Validation error tracking
> - Full form submission with all `lead_*` properties
> - Form abandonment detection on page leave
>
> **Human verification required:** Login to PostHog dashboard to verify events, person profiles, and session recordings.

### 1.5 FAQ Tracking Verification

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-faq-tracking.md`
>
> Use **@agent-ui-navigator** to execute the automated tests covering:
> - FAQ expansion events with `question_id`, `question`, `category`
> - FAQ collapse events
> - FAQ search with debounce (`query`, `results_count`, `has_results`)
> - Multiple FAQ interactions in sequence
>
> **Human verification required:** Login to PostHog dashboard to verify events appear correctly.

### 1.6 Session Initialization & UTM Tracking

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-utm-session.md` (Phases 1-4, 6)
>
> Use **@agent-ui-navigator** to execute the automated tests covering:
> - Full UTM parameter capture (source, medium, campaign, term, content)
> - Partial UTM parameter handling
> - `page_viewed` event with viewport, referrer, landing page
> - Device type detection (desktop, mobile, tablet viewports)
>
> **Human verification required:** Login to PostHog dashboard to verify UTM events and person properties.

### 1.7 Error Handling & Graceful Degradation

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-utm-session.md` (Phase 5)
>
> Use **@agent-ui-navigator** to execute the automated tests covering:
> - Blocking PostHog network requests
> - Verifying NO console errors when PostHog is blocked
> - Confirming page navigation and form submission still work
>
> **Human verification required:** Observe browser console for errors during blocked test.

### 1.8 Email Change & Identity Reset Testing

**Purpose:** Verify identity reset works correctly when user changes email mid-form.

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-identity-profiles.md` (Phase 4)
>
> Use **@agent-ui-navigator** to execute the automated tests covering:
> - Email change mid-form triggers `identity_reset` event
> - New `lead_identified` event fires for changed email
> - Two separate person profiles created in PostHog
> - Events properly attributed to correct persons
>
> **Human verification required:** Check PostHog Persons tab for two separate profiles with correct event attribution.

### 1.9 Person Properties Verification

> **📋 Automated Test Plan:** See `thoughts/plans/2025-11-28-posthog-test-identity-profiles.md` (Phases 5-6)
>
> Use **@agent-ui-navigator** to execute the form submission, then manually verify person properties in PostHog:
> - `$set` properties (updatable): email, name, company, lead_score, etc.
> - `$set_once` properties (immutable first-touch): first_seen, initial_referrer, first_form_submission, etc.
>
> **Human verification required:** Navigate to PostHog → Persons → find test person → verify all properties listed in the automated test plan's Phase 5 success criteria.

---

## Part 2: PostHog Dashboard Configuration

### 2.1 Create "Lead Generation Overview" Dashboard

**Location:** PostHog → Dashboards → New Dashboard

**Dashboard Name:** Lead Generation Overview

**Add these insights:**

#### Insight 1: Leads Today (Number)
- **Type:** Trend
- **Event:** `booking_form_submitted`
- **Date range:** Today
- **Display:** Number
- **Compare:** Previous period

#### Insight 2: Leads This Week (Trend)
- **Type:** Trend
- **Event:** `booking_form_submitted`
- **Date range:** Last 7 days
- **Display:** Line chart
- **Breakdown:** By day

#### Insight 3: Form Conversion Funnel
- **Type:** Funnel
- **Steps:**
  1. `booking_form_started`
  2. `form_step_completed` (filter: `step = 1`)
  3. `form_step_completed` (filter: `step = 2`)
  4. `form_step_completed` (filter: `step = 3`)
  5. `form_step_completed` (filter: `step = 4`)
  6. `booking_form_submitted`
- **Date range:** Last 30 days

#### Insight 4: Lead Quality (Average Lead Score)
- **Type:** Trend
- **Event:** `booking_form_submitted`
- **Math:** Average of `lead_score` property
- **Date range:** Last 30 days

#### Insight 5: Traffic Sources Breakdown
- **Type:** Trend or Table
- **Event:** `booking_form_submitted`
- **Breakdown:** `utm_source`
- **Date range:** Last 30 days

#### Insight 6: Abandonment by Step (Bar Chart)
- **Type:** Trend (Bar)
- **Event:** `booking_form_abandoned`
- **Breakdown:** `last_step`
- **Date range:** Last 30 days

### 2.2 Create "CTA Performance" Dashboard

**Dashboard Name:** CTA Performance

**Add these insights:**

#### Insight 1: CTA Clicks by Location
- **Type:** Trend (Bar or Table)
- **Event:** `cta_clicked`
- **Breakdown:** `location`
- **Date range:** Last 30 days

#### Insight 2: CTA to Form Conversion
- **Type:** Funnel
- **Steps:**
  1. `cta_clicked`
  2. `booking_form_started`
  3. `booking_form_submitted`
- **Breakdown:** `location` (first step)

#### Insight 3: Mobile vs Desktop CTAs
- **Type:** Trend
- **Event:** `cta_clicked`
- **Breakdown:** `device_type` (from page_viewed or infer from location)

### 2.3 Create "FAQ Engagement" Dashboard

**Dashboard Name:** FAQ Engagement

**Add these insights:**

#### Insight 1: FAQ Expansions by Category
- **Type:** Trend (Bar)
- **Event:** `faq_expanded`
- **Breakdown:** `category`

#### Insight 2: FAQ Search Terms
- **Type:** Table
- **Event:** `faq_searched`
- **Properties to show:** `query`, `results_count`

#### Insight 3: Most Viewed Questions
- **Type:** Table
- **Event:** `faq_expanded`
- **Breakdown:** `question`
- **Sort:** Count descending

---

## Part 3: Create Cohorts

**Location:** PostHog → Cohorts → New Cohort

### Cohort 1: Form Starters
- **Name:** Form Starters
- **Definition:** Persons where `form_started = true`

### Cohort 2: Form Completers
- **Name:** Form Completers
- **Definition:** Persons where `form_completed = true`

### Cohort 3: Form Abandoners
- **Name:** Form Abandoners
- **Definition:** Persons where `form_started = true` AND `form_completed != true`

### Cohort 4: High-Intent Leads
- **Name:** High-Intent Leads
- **Definition:** Persons where `lead_score >= 70`

### Cohort 5: Pricing Researchers
- **Name:** Pricing Researchers
- **Definition:** Persons who performed `pricing_tier_viewed` event

### Cohort 6: FAQ Researchers
- **Name:** FAQ Researchers
- **Definition:** Persons who performed `faq_expanded` event 3+ times

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

### Alert 4: Abandonment Spike
- **Create on:** "Abandonment by Step" trend
- **Condition:** Increases > 50% vs prior week
- **Recipient:** `sales@rekurve.ai`
- **Purpose:** UX problem signal

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

### Automated Testing (Part 1) - Use @agent-ui-navigator

Execute the following test plans using **@agent-ui-navigator** with Playwright MCP:

| Test Plan | Sections Covered |
|-----------|------------------|
| `2025-11-28-posthog-test-identity-profiles.md` | 1.2, 1.8, 1.9 |
| `2025-11-28-posthog-test-cta-tracking.md` | 1.3 |
| `2025-11-28-posthog-test-form-funnel.md` | 1.4 |
| `2025-11-28-posthog-test-faq-tracking.md` | 1.5 |
| `2025-11-28-posthog-test-utm-session.md` | 1.6, 1.7 |

**After automated tests, manually verify in PostHog dashboard:**
- [ ] All events appear correctly in Live Events
- [ ] Person profiles created with correct properties
- [ ] Session recordings triggered on form start

### PostHog Configuration (Parts 2-7)
- [ ] "Lead Generation Overview" dashboard created
- [ ] "CTA Performance" dashboard created
- [ ] "FAQ Engagement" dashboard created
- [ ] 6 cohorts created
- [ ] 4 threshold alerts configured
- [ ] "New Lead Notification" workflow created and activated
- [ ] Daily dashboard digest subscribed

### Code Updates (Part 6) ✅
- [x] `formTracking.submitted()` updated with full lead details
- [x] `BookingForm.tsx` passes complete form data
- [x] `person_profiles: 'identified_only'` configured for cost optimization
- [x] `identifyLead()` and `resetIdentity()` functions added
- [x] Early identification after Step 1 implemented
- [x] `$set` vs `$set_once` property handling implemented
- [ ] Workflow tested with real form submission

### Session Recordings (Part 8)
- [ ] Recording settings configured
- [ ] High-intent trigger working
- [ ] Test recording captured successfully

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

### Automated Test Plans (Use @agent-ui-navigator)
- CTA tracking: `thoughts/plans/2025-11-28-posthog-test-cta-tracking.md`
- Form funnel: `thoughts/plans/2025-11-28-posthog-test-form-funnel.md`
- FAQ tracking: `thoughts/plans/2025-11-28-posthog-test-faq-tracking.md`
- UTM/session: `thoughts/plans/2025-11-28-posthog-test-utm-session.md`
- Identity/profiles: `thoughts/plans/2025-11-28-posthog-test-identity-profiles.md`

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
