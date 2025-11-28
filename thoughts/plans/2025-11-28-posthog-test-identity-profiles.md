# PostHog Identity & Person Profile Test Plan

## Overview

Automated Playwright test to verify the `person_profiles: 'identified_only'` configuration, early identification after Step 1, email change/identity reset, and proper `$set` vs `$set_once` property handling. Human assistance required for PostHog dashboard verification.

**Execution**: Use **@agent-ui-navigator** to execute all Playwright MCP browser automation tasks in this plan. The ui-navigator agent is specialized for web UI navigation, interaction, and validation using the Playwright MCP tools.

## Test Scope

From Sections 1.2, 1.8, and 1.9 of the manual testing guide:

| Test | Purpose | Key Verification |
|------|---------|------------------|
| Anonymous Browsing | No person profile created | Events exist, no person in Persons tab |
| Form Start Only | No profile until Step 1 complete | `booking_form_started` but no person |
| Step 1 Completion | Person profile created | `lead_identified`, person with email as ID |
| Email Change | Identity reset and new profile | Two separate persons in PostHog |
| Property Handling | `$set` vs `$set_once` correct | First-touch vs updatable properties |

## Prerequisites

- Development server running (`yarn dev` on port 3000)
- Playwright MCP connected
- Human available to login to PostHog dashboard
- **Fresh browser context for each test** (no existing PostHog cookies)

## What We're NOT Doing

- Testing cross-device identification
- Testing server-side identification
- Testing feature flags based on identity

---

## Phase 1: Anonymous Browsing (No Person Profile)

### Overview
Verify anonymous browsing does NOT create a person profile when `person_profiles: 'identified_only'` is configured.

### Playwright Actions

1. Open new browser context (incognito/clean)
2. Navigate to `http://localhost:3000`
3. Scroll through the page (view multiple sections)
4. Click some CTAs:
   - Hero secondary ("How it Works")
   - A pricing tier CTA
5. Expand an FAQ
6. Wait 5 seconds
7. **DO NOT** interact with the form

### Expected Behavior
- Events fire (visible in Live Events)
- Events have anonymous `distinct_id` (random UUID)
- **NO person profile created** in Persons tab

### Success Criteria

#### Manual Verification
- [ ] Events appear in PostHog Live Events
- [ ] `distinct_id` is a random UUID (not an email)
- [ ] Check Persons tab - **NO new person profile exists**
- [ ] Events are recorded but unlinked to a person

---

## Phase 2: Form Start Without Step 1 Completion

### Overview
Verify that starting the form (focusing a field) does NOT create a person profile.

### Playwright Actions

1. Continue in same browser context
2. Scroll to booking form
3. Focus on "First Name" field (triggers `booking_form_started`)
4. Type "Test" in First Name
5. **DO NOT click Next** - leave Step 1 incomplete
6. Wait 5 seconds

### Expected Events
- `booking_form_started` fires
- `form_field_interaction` events fire

### Expected Behavior
- Events visible in Live Events
- **Still NO person profile** in Persons tab

### Success Criteria

#### Manual Verification
- [ ] `booking_form_started` event appears
- [ ] Events still have anonymous `distinct_id`
- [ ] Check Persons tab - **NO person profile created yet**

---

## Phase 3: Step 1 Completion (Person Profile Created)

### Overview
Complete Step 1 and verify person profile is created with early identification.

### Playwright Actions

1. Continue in same browser context
2. Complete remaining Step 1 fields:
   - First Name: "Identity"
   - Last Name: "Test"
   - Email: "identity-test-1@example.com"
3. Click "Next" button
4. Wait 5 seconds

### Expected Events

```json
{
  "event": "form_step_completed",
  "properties": {
    "step": 1,
    "step_name": "basic_info"
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

### Expected Person Profile

In PostHog Persons tab, search for "identity-test-1@example.com":

**`$set` Properties** (can be overwritten):
- `email`: "identity-test-1@example.com"
- `name`: "Identity Test"
- `first_name`: "Identity"
- `last_name`: "Test"

**`$set_once` Properties** (immutable first-touch):
- `first_seen`: ISO timestamp
- `initial_referrer`: "direct"
- `initial_landing_page`: "/"
- `initial_utm_source`: null (unless UTM params in URL)
- `initial_utm_medium`: null
- `initial_utm_campaign`: null

### Success Criteria

#### Manual Verification
- [ ] `lead_identified` event fires
- [ ] Person profile now exists in Persons tab
- [ ] Email is used as `distinct_id`
- [ ] All previous anonymous events are now linked to this person
- [ ] `$set` properties are populated
- [ ] `$set_once` properties are populated with first-touch data

---

## Phase 4: Email Change & Identity Reset

### Overview
Change email mid-form and verify identity reset creates a new person profile.

### Playwright Actions

1. After Step 1 completion (from Phase 3), user is on Step 2
2. Click "Back" button to return to Step 1
3. Change email to: "identity-test-2@example.com"
4. Click "Next" button
5. Wait 5 seconds

### Expected Events (in order)

```json
{
  "event": "identity_reset",
  "properties": {
    "reason": "email_changed"
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

### Expected Person Profiles

**Two separate persons should exist in PostHog**:

1. **identity-test-1@example.com**
   - Has initial events (page views, CTA clicks, form start)
   - Events up to first Step 1 completion

2. **identity-test-2@example.com**
   - Has subsequent events after email change
   - Events from second Step 1 completion onwards

### Success Criteria

#### Manual Verification
- [ ] `identity_reset` event fires with `reason: "email_changed"`
- [ ] `lead_identified` event fires again for new email
- [ ] Check Persons tab - **TWO separate person profiles exist**:
  - "identity-test-1@example.com"
  - "identity-test-2@example.com"
- [ ] Events are properly attributed to correct persons
- [ ] First person has early events, second person has later events

---

## Phase 5: Full Submission Property Verification

### Overview
Complete the form and verify all `$set` and `$set_once` properties are set correctly.

### Playwright Actions

1. Continue from Phase 4 (as identity-test-2@example.com)
2. Complete Step 2 (Company Details):
   - Company: "Test Corp"
   - Size: "21-50"
   - Industry: "Professional Services"
   - Location: "Sydney, Australia"
3. Click "Next"
4. Complete Step 3 (Challenges):
   - Select first two challenges
5. Click "Next"
6. Complete Step 4 (Goals):
   - Goals: "Automate lead qualification and follow-up"
   - Timeline: "immediate"
   - MRR: "200k-500k"
7. Click "Submit"
8. Wait 5 seconds

### Expected Person Properties (Full List)

Check person profile for "identity-test-2@example.com":

**`$set` Properties (updated on submission)**:
- [ ] `email`: "identity-test-2@example.com"
- [ ] `name`: "Identity Test"
- [ ] `first_name`: "Identity"
- [ ] `last_name`: "Test"
- [ ] `phone`: (if provided)
- [ ] `company`: "Test Corp"
- [ ] `company_size`: "21-50"
- [ ] `industry`: "Professional Services"
- [ ] `location`: "Sydney, Australia"
- [ ] `timeline`: "immediate"
- [ ] `current_mrr`: "200k-500k"
- [ ] `challenges_count`: 2
- [ ] `lead_score`: (0-100, should be high given immediate timeline + high MRR)
- [ ] `last_form_submission`: ISO timestamp

**`$set_once` Properties (immutable)**:
- [ ] `first_seen`: ISO timestamp (from early identification)
- [ ] `initial_referrer`: "direct"
- [ ] `initial_landing_page`: "/"
- [ ] `first_form_submission`: ISO timestamp
- [ ] `first_challenges`: (comma-separated list)
- [ ] `first_goals`: "Automate lead qualification and follow-up"
- [ ] `first_timeline`: "immediate"
- [ ] `first_company_size`: "21-50"
- [ ] `first_lead_score`: (0-100)
- [ ] `conversion_source`: "direct"

**From `setPersonProperties()` call**:
- [ ] `form_started`: true
- [ ] `form_completed`: true
- [ ] `form_completed_at`: ISO timestamp

**From `setPersonPropertiesForFlags()` call**:
- [ ] `is_lead`: true
- [ ] `conversion_date`: ISO timestamp

### Success Criteria

#### Manual Verification
- [ ] All `$set` properties are present and correct
- [ ] All `$set_once` properties are present
- [ ] `$set_once` values are from FIRST identification (not submission)
- [ ] `lead_score` is calculated and reasonable (should be 70+)
- [ ] Timestamps are in ISO format

---

## Phase 6: Verify $set_once Immutability

### Overview
Confirm that `$set_once` properties cannot be overwritten by re-identification.

### Verification Approach

After Phase 5 submission, the person "identity-test-2@example.com" should have:
- `first_timeline`: "immediate"
- `first_company_size`: "21-50"

If the same user were to submit again with different values (theoretical):
- `timeline` ($set) would update
- `first_timeline` ($set_once) would NOT change

### Success Criteria

#### Manual Verification
- [ ] `$set_once` properties match values from FIRST identification
- [ ] Properties like `first_seen` are NOT the same as `last_form_submission`
- [ ] Understanding confirmed: $set_once prevents overwrites

---

## Phase 7: Summary Report

### Report Format

```
IDENTITY & PERSON PROFILE TEST RESULTS
======================================

Anonymous Browsing (person_profiles: 'identified_only'):
✓/✗ Events fire with anonymous distinct_id
✓/✗ NO person profile created from anonymous browsing
✓/✗ NO person profile created from form start alone

Early Identification:
✓/✗ lead_identified fires after Step 1 completion
✓/✗ Person profile created with email as distinct_id
✓/✗ Previous anonymous events linked to person

Email Change & Identity Reset:
✓/✗ identity_reset event fires when email changes
✓/✗ lead_identified fires again for new email
✓/✗ TWO separate person profiles created
✓/✗ Events properly attributed to correct persons

$set Properties (updatable):
✓/✗ email, name, first_name, last_name
✓/✗ company, company_size, industry, location
✓/✗ timeline, current_mrr, challenges_count
✓/✗ lead_score, last_form_submission

$set_once Properties (immutable):
✓/✗ first_seen, initial_referrer, initial_landing_page
✓/✗ initial_utm_* parameters
✓/✗ first_form_submission, first_challenges, first_goals
✓/✗ first_timeline, first_company_size, first_lead_score
✓/✗ conversion_source

Other Person Properties:
✓/✗ form_started, form_completed, form_completed_at
✓/✗ is_lead, conversion_date
```

### Success Criteria

#### Manual Verification
- [ ] `person_profiles: 'identified_only'` working (no anon profiles)
- [ ] Early identification working correctly
- [ ] Email change creates separate persons
- [ ] Property handling follows `$set`/`$set_once` rules
- [ ] Test report generated

---

## Test Data Summary

| Test Person | Email | Purpose |
|-------------|-------|---------|
| Anonymous | (UUID) | Verify no profile created |
| Person 1 | identity-test-1@example.com | First identification |
| Person 2 | identity-test-2@example.com | Email change, full submission |

---

## Execution Notes

### Agent Usage

**Use @agent-ui-navigator** for all browser automation tasks in this plan. Spawn the agent with a detailed prompt describing:
1. The specific phase/test to execute
2. Form fields to fill (including test email addresses)
3. Expected identity/profile behavior to verify
4. Fresh browser context requirements for anonymous → identified flow
5. What to observe and report back

### Playwright MCP Commands Used (via @agent-ui-navigator)
- `browser_navigate` - Load pages
- `browser_snapshot` - Get page structure
- `browser_type` - Fill form fields
- `browser_click` - Click buttons
- `browser_select_option` - Select dropdowns
- `browser_wait_for` - Wait for events

### Critical: Fresh Browser Context
Each test run should use a fresh browser context to ensure:
- No existing PostHog cookies
- No pre-existing distinct_id
- Clean anonymous → identified flow

### Human Checkpoints
1. **Before Phase 1**: Login to PostHog dashboard, clear test data if needed
2. **After Phase 2**: Confirm NO person profile exists yet
3. **After Phase 3**: Confirm person profile created, check properties
4. **After Phase 4**: Confirm TWO separate persons exist
5. **After Phase 5**: Verify all `$set` and `$set_once` properties
6. **After Phase 7**: Confirm final report

### Estimated Duration
- Playwright automation: ~12 minutes
- Human verification: ~20 minutes
- Total: ~32 minutes

## References

- Manual testing guide: `thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md` (Sections 1.2, 1.8, 1.9)
- User identification plan: `thoughts/plans/2025-11-27-posthog-user-identification.md`
- Analytics implementation: `src/lib/posthog.ts` (identifyLead, resetIdentity, submitted)
- PostHog Persons: `https://us.posthog.com/project/254485/persons`
