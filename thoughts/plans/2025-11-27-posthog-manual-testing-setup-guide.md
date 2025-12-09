# PostHog Manual Testing & Post-Implementation Setup Guide

## Overview

This guide covers the **remaining manual tasks** for PostHog setup. Most configuration has been automated via `yarn posthog:setup`.

**PostHog Project:** [254485](https://us.posthog.com/project/254485)

---

## Completed ✅

| Part | Description | Date | Notes |
|------|-------------|------|-------|
| Part 1 | Manual Testing | 2025-12-05 | All events verified (2 bugs found) |
| Part 2 | Dashboards (3) | 2025-12-05 | Via `yarn posthog:setup` |
| Part 3 | Cohorts (6) | 2025-12-05 | Via `yarn posthog:setup` |
| Part 4 | Threshold Alerts | 2025-12-08 | 2 of 3 (conversion drop deferred to paid plan) |
| Part 6 | Code Updates | 2025-12-05 | Full lead details in events |

**To update dashboards/cohorts:** Modify `scripts/posthog-setup.ts` and run `yarn posthog:setup`.

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

---

## Remaining Manual Tasks

### Part 5: Create Lead Notification Workflow

**Location:** PostHog → Workflows → New Workflow

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

### Part 7: Subscribe to Dashboard Digests (Paid Plan)

**Location:** Dashboard → More (⋯) → Subscribe

#### Daily Digest
- **Dashboard:** Lead Generation Overview
- **Recipients:** `sales@rekurve.ai`
- **Frequency:** Daily at 8:00 AM

#### Weekly Summary (Optional)
- **Dashboard:** Lead Generation Overview
- **Recipients:** `sales@rekurve.ai`
- **Frequency:** Weekly on Monday at 9:00 AM

### Part 8: Session Recordings Configuration

**Location:** PostHog → Session Recordings → Settings

#### Recommended Settings
- [ ] Enable session recording (should already be enabled)
- [ ] Set minimum session duration: 10 seconds
- [ ] Enable: "Start recording when high-intent event occurs"
- [ ] High-intent events: `booking_form_started`

#### Verify Recording Works
1. Start a form interaction
2. Wait 30 seconds
3. Go to PostHog → Session Recordings
4. Find your session
5. Verify the form interaction is captured

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
