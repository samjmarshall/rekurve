# PostHog Form Funnel Tracking Test Plan

## Overview

Automated Playwright test to verify the complete booking form funnel tracking, including form start, step completion, validation errors, submission, and abandonment events. Human assistance required for PostHog dashboard verification.

**Execution**: Use **@agent-ui-navigator** to execute all Playwright MCP browser automation tasks in this plan. The ui-navigator agent is specialized for web UI navigation, interaction, and validation using the Playwright MCP tools.

## Test Scope

From Section 1.4 of the manual testing guide:

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `booking_form_started` | Focus first form field | `entry_point` |
| `form_step_completed` | Click "Next" after valid step | `step`, `step_name`, `time_spent_ms` |
| `form_field_interaction` | Validation error | `action: "error"`, `error_message` |
| `lead_identified` | Complete Step 1 | `identification_point` |
| `booking_form_submitted` | Submit final step | All `lead_*` properties |
| `booking_form_abandoned` | Leave page mid-form | `last_step`, `reason` |

## Prerequisites

- Development server running (`yarn dev` on port 3000)
- Playwright MCP connected
- Human available to login to PostHog dashboard

## What We're NOT Doing

- Testing actual Calendly/HubSpot redirects
- Verifying email delivery
- Testing form accessibility
- Cross-browser testing

---

## Phase 1: Setup & Form Start Event

### Overview
Navigate to site, trigger form start event by focusing first field.

### Playwright Actions

1. Navigate to `http://localhost:3000`
2. Scroll to booking form section (`#booking-form`)
3. Take snapshot
4. Click/focus on "First Name" input field
5. Wait 2 seconds for event

### Expected Event

```json
{
  "event": "booking_form_started",
  "properties": {
    "entry_point": "form_section"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `booking_form_started` event appears in PostHog Live Events
- [ ] `entry_point` property is "form_section"
- [ ] Session recording started (check PostHog Recordings tab)

---

## Phase 2: Step 1 Completion & Early Identification

### Overview
Complete Step 1 (Basic Info) and verify early identification fires.

### Playwright Actions

1. Fill form fields:
   - First Name: "Test"
   - Last Name: "User"
   - Email: "playwright-test@example.com"
   - Phone: "+61 400 000 000" (optional)
2. Click "Next" button
3. Wait 3 seconds for events

### Expected Events (in order)

```json
{
  "event": "form_step_completed",
  "properties": {
    "step": 1,
    "step_name": "basic_info",
    "fields_completed": ["firstName", "lastName", "email"],
    "time_spent_ms": "<number>"
  }
}
```

```json
{
  "event": "lead_identified",
  "properties": {
    "identification_point": "step_1_complete"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `form_step_completed` with `step: 1` appears
- [ ] `step_name` is "basic_info"
- [ ] `time_spent_ms` is populated (> 0)
- [ ] `lead_identified` event fires
- [ ] Person profile created in PostHog Persons tab with email as distinct_id

---

## Phase 3: Validation Error Tracking

### Overview
Trigger a validation error and verify it's tracked.

### Playwright Actions

1. On Step 2 (Company Details), leave "Company" field empty
2. Fill other fields:
   - Company Size: Select "11-20"
   - Industry: "Technology"
   - Location: "Brisbane"
3. Click "Next" button
4. Wait 2 seconds
5. Observe validation error appears
6. Fill in Company field: "Test Company"
7. Click "Next" again

### Expected Event (on validation failure)

```json
{
  "event": "form_field_interaction",
  "properties": {
    "field": "company",
    "step": 2,
    "action": "error",
    "has_error": true,
    "error_message": "Company name is required"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `form_field_interaction` with `action: "error"` appears
- [ ] `has_error` is true
- [ ] `error_message` is populated
- [ ] After fixing error, `form_step_completed` with `step: 2` appears

---

## Phase 4: Complete Remaining Steps

### Overview
Complete Steps 3 and 4 to reach submission.

### Test 4.1: Step 3 - Challenges

**Playwright Actions**:
1. Select at least one challenge checkbox (e.g., first option)
2. Click "Next"
3. Wait 2 seconds

**Expected Event**:
```json
{
  "event": "form_step_completed",
  "properties": {
    "step": 3,
    "step_name": "challenges"
  }
}
```

### Test 4.2: Step 4 - Goals & Timeline

**Playwright Actions**:
1. Fill Goals textarea: "Testing PostHog analytics integration"
2. Select Timeline: "1-3-months"
3. Select Current MRR: "50k-200k" (optional)
4. Click "Submit" button
5. Wait 3 seconds

**Expected Events**:

Step completion:
```json
{
  "event": "form_step_completed",
  "properties": {
    "step": 4,
    "step_name": "goals"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `form_step_completed` with `step: 3` appears
- [ ] `form_step_completed` with `step: 4` appears

---

## Phase 5: Form Submission

### Overview
Submit the form and verify all submission properties.

### Expected Event

```json
{
  "event": "booking_form_submitted",
  "properties": {
    "lead_name": "Test User",
    "lead_email": "playwright-test@example.com",
    "lead_phone": "+61 400 000 000",
    "lead_company": "Test Company",
    "lead_company_size": "11-20",
    "lead_industry": "Technology",
    "lead_location": "Brisbane",
    "lead_challenges": "<comma-separated list>",
    "lead_goals": "Testing PostHog analytics integration",
    "lead_timeline": "1-3-months",
    "lead_mrr": "50k-200k",
    "lead_score": "<0-100>",
    "booking_method": "<calendly|hubspot>",
    "company_size": "11-20",
    "industry": "Technology",
    "timeline": "1-3-months",
    "challenges_count": "<number>"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `booking_form_submitted` event appears
- [ ] All `lead_*` properties are populated
- [ ] `lead_score` is a number between 0-100
- [ ] Legacy properties (`company_size`, `industry`, etc.) are present
- [ ] Person properties updated:
  - `form_completed: true`
  - `form_completed_at` (ISO timestamp)
  - `lead_score` value

---

## Phase 6: Form Abandonment Test

### Overview
Start a new form, complete Step 1, then navigate away to trigger abandonment.

### Playwright Actions

1. Navigate to `http://localhost:3000` (fresh page)
2. Scroll to form
3. Focus first field (triggers `booking_form_started`)
4. Fill Step 1 fields with different email: "abandon-test@example.com"
5. Click "Next" (completes Step 1)
6. Navigate to a different URL (e.g., `http://localhost:3000/privacy`)
7. Wait 2 seconds

### Expected Event

```json
{
  "event": "booking_form_abandoned",
  "properties": {
    "last_step": 2,
    "reason": "page_leave",
    "time_spent_on_step_ms": "<number>",
    "total_steps_completed": 1
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `booking_form_abandoned` event appears
- [ ] `last_step` is 2 (the step they were on)
- [ ] `reason` is "page_leave"
- [ ] Person properties include `form_abandoned: true`

---

## Phase 7: Summary Report

### Report Format

```
FORM FUNNEL TRACKING TEST RESULTS
=================================

Form Lifecycle:
✓/✗ Form Start - booking_form_started fires on focus
✓/✗ Session recording triggered

Step Completion:
✓/✗ Step 1 (basic_info) - form_step_completed with correct properties
✓/✗ Step 2 (company_details) - form_step_completed
✓/✗ Step 3 (challenges) - form_step_completed
✓/✗ Step 4 (goals) - form_step_completed

Early Identification:
✓/✗ lead_identified fires after Step 1
✓/✗ Person profile created with email as distinct_id

Validation Tracking:
✓/✗ form_field_interaction fires on validation error
✓/✗ error_message property populated

Form Submission:
✓/✗ booking_form_submitted with all lead_* properties
✓/✗ lead_score calculated (0-100)
✓/✗ Legacy properties present
✓/✗ Person properties updated (form_completed, lead_score)

Abandonment:
✓/✗ booking_form_abandoned fires on page leave
✓/✗ last_step and reason properties correct
```

### Success Criteria

#### Manual Verification
- [ ] All form lifecycle events tracked correctly
- [ ] All step completions tracked with timing
- [ ] Submission captures all 15+ properties
- [ ] Abandonment properly detected

---

## Test Data

### Test User 1 (Full Submission)
- First Name: Test
- Last Name: User
- Email: playwright-test@example.com
- Phone: +61 400 000 000
- Company: Test Company
- Size: 11-20
- Industry: Technology
- Location: Brisbane
- Challenges: [First option]
- Goals: Testing PostHog analytics integration
- Timeline: 1-3-months
- MRR: 50k-200k

### Test User 2 (Abandonment)
- Email: abandon-test@example.com
- (Only Step 1 completed)

---

## Execution Notes

### Agent Usage

**Use @agent-ui-navigator** for all browser automation tasks in this plan. Spawn the agent with a detailed prompt describing:
1. The specific phase/test to execute
2. Form fields to fill and values to use
3. Expected interactions (focus, type, click, select)
4. What to observe and report back

### Playwright MCP Commands Used (via @agent-ui-navigator)
- `browser_navigate` - Load pages
- `browser_snapshot` - Get form structure
- `browser_type` - Fill text fields
- `browser_click` - Click buttons, checkboxes
- `browser_select_option` - Select dropdowns
- `browser_wait_for` - Wait for elements/time

### Human Checkpoints
1. **Before Phase 1**: Login to PostHog dashboard
2. **After Phase 2**: Verify early identification and person profile
3. **After Phase 5**: Verify full submission event and properties
4. **After Phase 6**: Verify abandonment tracking
5. **After Phase 7**: Confirm final report

### Estimated Duration
- Playwright automation: ~10 minutes
- Human verification: ~15 minutes
- Total: ~25 minutes

## References

- Manual testing guide: `thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md` (Section 1.4)
- Analytics implementation: `src/lib/posthog.ts` (formTracking object)
- Form component: `src/components/sections/BookingForm.tsx`
- PostHog Live Events: `https://us.posthog.com/project/254485/events`
