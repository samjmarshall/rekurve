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

#### Test 1: Anonymous Browsing (No Person Profile)
- [ ] Open site in incognito/private browsing mode
- [ ] Navigate around the page (scroll, view sections)
- [ ] Click some CTAs (but do NOT start the form)
- [ ] Check PostHog Live Events - events should appear with anonymous distinct_id
- [ ] Check PostHog Persons tab - **NO new person profile should be created**
- [ ] Verify events are recorded but not linked to a person profile

#### Test 2: Form Start Without Step 1 Completion (No Person Profile)
- [ ] Open site in incognito/private browsing mode
- [ ] Focus on the first form field (triggers `booking_form_started`)
- [ ] Do NOT complete Step 1 (don't click Next)
- [ ] Check PostHog Persons tab - **NO person profile should be created yet**

#### Test 3: Step 1 Completion (Person Profile Created)
- [ ] Complete Step 1 fields and click "Next"
- [ ] Check PostHog Persons tab - **Person profile NOW exists** with email as distinct_id
- [ ] Verify all previous anonymous events are linked to this person

### 1.3 CTA Click Tracking Verification

Test each CTA location and verify the event appears in PostHog Live Events:

| CTA | Action | Expected Event | Expected `location` Property |
|-----|--------|----------------|------------------------------|
| Header "Book a call" | Click desktop nav CTA | `cta_clicked` | `header` |
| Mobile nav "Book a call" | Open mobile menu, click CTA | `cta_clicked` | `mobile_nav` |
| Hero "How it Works" | Click secondary hero CTA | `cta_clicked` | `hero_secondary` |
| Hero "Book a call" | Click primary hero CTA | `cta_clicked` | `hero_primary` |
| Pricing Foundation | Click Foundation tier CTA | `cta_clicked` | `pricing_foundation` |
| Pricing Growth | Click Growth tier CTA | `cta_clicked` | `pricing_growth` |
| Pricing Enterprise | Click Enterprise tier CTA | `cta_clicked` | `pricing_enterprise` |
| Final CTA "Book Your Call" | Click primary final CTA | `cta_clicked` | `final_cta_primary` |
| Final CTA email link | Click email CTA | `cta_clicked` + `email_link_clicked` | `final_cta_email` |
| FAQ bottom link | Click "Book a free 30-minute call" | `cta_clicked` | `faq_bottom` |

**Verification steps for each:**
1. Click the CTA
2. Check PostHog Live Events for `cta_clicked` event
3. Verify `location` property matches expected value
4. Verify `cta_text` property is populated
5. Verify `page_section` property is populated

**Mobile-specific tests:**
- [x] Mobile nav closes after clicking CTA (functional behavior preserved)
- [x] Events fire correctly on mobile viewport

### 1.4 Form Funnel Tracking Verification

Complete the form while monitoring PostHog:

#### Step 1: Form Start
- [x] Focus the "First Name" field
- [x] Verify `booking_form_started` event fires
- [x] Verify session recording starts (check PostHog Recordings tab)
- [x] Verify person property `form_started: true` is set

#### Step 2: Complete Step 1 (Basic Info) - Early Identification
- [ ] Fill First Name, Last Name, Email
- [ ] Click "Next"
- [ ] Verify `form_step_completed` event with:
  - `step: 1`
  - `step_name: "basic_info"`
  - `time_spent_ms` is populated
- [ ] Verify `lead_identified` event fires with:
  - `identification_point: "step_1_complete"`
- [ ] Verify **person profile is created** in PostHog Persons tab (email as distinct ID)
- [ ] Verify person has `$set` properties:
  - `email`, `name`, `first_name`, `last_name`, `phone`
- [ ] Verify person has `$set_once` properties:
  - `first_seen` (ISO timestamp)
  - `initial_referrer`, `initial_landing_page`
  - `initial_utm_source`, `initial_utm_medium`, `initial_utm_campaign` (if present in URL)

#### Step 3: Trigger Validation Error
- [ ] Leave a required field empty and click "Next"
- [ ] Verify `form_field_interaction` event with:
  - `action: "error"`
  - `has_error: true`
  - `error_message` is populated

#### Step 4: Complete Remaining Steps
For each step (2, 3, 4):
- [ ] Complete all fields
- [ ] Click "Next"
- [ ] Verify `form_step_completed` event fires with correct step number

#### Step 5: Form Submission
- [ ] Submit the form on final step
- [ ] Verify `booking_form_submitted` event with properties:
  - `lead_name` (full name)
  - `lead_email`
  - `lead_phone` (if provided)
  - `lead_company`
  - `lead_company_size`
  - `lead_industry`
  - `lead_location`
  - `lead_challenges` (comma-separated)
  - `lead_goals`
  - `lead_timeline`
  - `lead_mrr` (if provided)
  - `lead_score` (0-100)
  - `booking_method`
  - Legacy: `company_size`, `industry`, `timeline`, `current_mrr`, `challenges_count`
- [ ] Verify person properties are set:
  - `form_completed: true`
  - `form_completed_at` (ISO timestamp)
  - `lead_score` (0-100 range)
  - `company_size`
  - `timeline`

#### Step 6: Form Abandonment
- [ ] Start a new form (focus first field)
- [ ] Complete step 1
- [ ] Navigate away from page (or close tab)
- [ ] Verify `booking_form_abandoned` event with:
  - `last_step` (the step you were on)
  - `reason: "page_leave"` or `"component_unmount"`

### 1.5 FAQ Tracking Verification

- [ ] Expand an FAQ item
- [ ] Verify `faq_expanded` event with:
  - `question_id`
  - `question` (the actual question text)
  - `category` (e.g., "ROI & Results")

- [ ] Type in FAQ search box (wait 500ms after typing)
- [ ] Verify `faq_searched` event with:
  - `query` (your search text)
  - `results_count`
  - `has_results`

### 1.6 Session Initialization & UTM Tracking

- [ ] Visit page with UTM parameters:
  ```
  http://localhost:3000/?utm_source=test&utm_medium=cpc&utm_campaign=launch
  ```
- [ ] Verify `utm_captured` event fires with all UTM params
- [ ] Verify `page_viewed` event includes:
  - `referrer`
  - `landing_page`
  - `viewport_width`, `viewport_height`
  - `device_type`
- [ ] Verify person properties include UTM values

### 1.7 Error Handling & Graceful Degradation

- [ ] Block PostHog in browser (uBlock/AdBlock or DevTools Network blocking)
- [ ] Navigate the site
- [ ] Verify NO console errors appear
- [ ] Verify page functions normally
- [ ] Verify form submission still works (just without tracking)

### 1.8 Email Change & Identity Reset Testing

**Purpose:** Verify identity reset works correctly when user changes email mid-form.

#### Test: Email Change Scenario
- [ ] Open site in incognito mode
- [ ] Complete Step 1 with email "email1@test.com"
- [ ] Click "Next" - verify `lead_identified` event fires
- [ ] Check PostHog Persons - person profile created for "email1@test.com"
- [ ] Click "Back" to return to Step 1
- [ ] Change email to "email2@test.com"
- [ ] Click "Next" again
- [ ] Verify `identity_reset` event fires with:
  - `reason: "email_changed"`
- [ ] Verify `lead_identified` event fires again for new email
- [ ] Check PostHog Persons - **TWO separate person profiles** should exist:
  - "email1@test.com" with initial events
  - "email2@test.com" with subsequent events
- [ ] Verify events are properly attributed to correct persons

### 1.9 Person Properties Verification

After completing a full form submission, verify person profile in PostHog:

1. Go to PostHog → Persons
2. Find your test person (by email - now used as distinct ID)
3. Verify these properties exist:

**From Early Identification (`identifyLead()` after Step 1):**

`$set` properties (can be overwritten):
   - [ ] `email`
   - [ ] `name` (full name)
   - [ ] `first_name`
   - [ ] `last_name`
   - [ ] `phone` (if provided)

`$set_once` properties (first-touch attribution, immutable):
   - [ ] `first_seen` (ISO timestamp)
   - [ ] `initial_referrer` ("direct" or referrer URL)
   - [ ] `initial_landing_page` (pathname)
   - [ ] `initial_utm_source` (if UTM params present)
   - [ ] `initial_utm_medium` (if UTM params present)
   - [ ] `initial_utm_campaign` (if UTM params present)

**From Form Submission (`submitted()` call):**

`$set` properties (updated on each submission):
   - [ ] `company`
   - [ ] `company_size`
   - [ ] `industry`
   - [ ] `location`
   - [ ] `timeline`
   - [ ] `current_mrr` (if provided)
   - [ ] `challenges_count`
   - [ ] `lead_score` (calculated 0-100)
   - [ ] `last_form_submission` (ISO timestamp - updates each time)

`$set_once` properties (first conversion data, immutable):
   - [ ] `first_form_submission` (ISO timestamp)
   - [ ] `first_challenges` (comma-separated list)
   - [ ] `first_goals`
   - [ ] `first_timeline`
   - [ ] `first_company_size`
   - [ ] `first_lead_score`
   - [ ] `conversion_source` (referrer at time of conversion)

**From `setPersonProperties()` call:**
   - [ ] `form_started: true`
   - [ ] `form_completed: true`
   - [ ] `form_completed_at` (ISO timestamp)

**From `setPersonPropertiesForFlags()` call:**
   - [ ] `is_lead: true`
   - [ ] `conversion_date` (ISO timestamp)

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

**File:** `src/lib/posthog.ts` (lines 350-407)
- ✅ Added `identifyLead()` function for early identification after Step 1
- ✅ Added `resetIdentity()` function to handle email changes
- ✅ `posthog.identify()` now uses proper `$set` vs `$set_once` property handling
- First-touch attribution data preserved in `$set_once` properties

**File:** `src/components/sections/BookingForm.tsx` (lines 93, 163-174, 194-204)
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

### Manual Testing (Part 1)
- [ ] Anonymous browsing does NOT create person profiles (1.2)
- [ ] All 10 CTA locations tracked correctly (1.3)
- [ ] Form funnel events fire for all 4 steps (1.4)
- [ ] Early identification (`lead_identified`) fires after Step 1 (1.4)
- [ ] Form submission captures all properties (1.4)
- [ ] Form abandonment tracked on page leave (1.4)
- [ ] FAQ expansion and search tracked (1.5)
- [ ] UTM parameters captured (1.6)
- [ ] No console errors with PostHog blocked (1.7)
- [ ] Email change triggers `identity_reset` event (1.8)
- [ ] Person properties use correct `$set` vs `$set_once` structure (1.9)

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

### Source Code
- PostHog initialization: `src/instrumentation-client.ts` (person_profiles config)
- Analytics library: `src/lib/posthog.ts`
  - Form submission: lines 436-538
  - Early identification (`identifyLead`): lines 350-393
  - Identity reset (`resetIdentity`): lines 395-407
- BookingForm component: `src/components/sections/BookingForm.tsx`
  - Form submission: lines 220-256
  - Early identification call: lines 194-204
  - Email change detection: lines 163-174

### External Resources
- PostHog Project: https://us.posthog.com/project/254485
- PostHog Identify docs: https://posthog.com/docs/product-analytics/identify
- PostHog Person Properties docs: https://posthog.com/docs/product-analytics/person-properties
