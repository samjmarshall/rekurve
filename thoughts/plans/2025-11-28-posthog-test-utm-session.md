# PostHog UTM & Session Tracking Test Plan

## Overview

Automated Playwright test to verify UTM parameter capture, session initialization, and graceful degradation when PostHog is blocked. Human assistance required for PostHog dashboard verification.

**Execution**: Use **@agent-ui-navigator** to execute all Playwright MCP browser automation tasks in this plan. The ui-navigator agent is specialized for web UI navigation, interaction, and validation using the Playwright MCP tools.

## Test Scope

From Sections 1.6 and 1.7 of the manual testing guide:

| Test | Event | Key Properties |
|------|-------|----------------|
| UTM Capture | `utm_captured` | All UTM params |
| Page View | `page_viewed` | referrer, landing_page, viewport, device_type |
| Error Handling | (no events) | No console errors when blocked |

## Prerequisites

- Development server running (`yarn dev` on port 3000)
- Playwright MCP connected
- Human available to login to PostHog dashboard

## What We're NOT Doing

- Testing actual referrer from external sites (can't simulate)
- Testing across multiple sessions/devices
- Testing PostHog feature flags

---

## Phase 1: UTM Parameter Capture

### Overview
Navigate to site with UTM parameters and verify they're captured.

### Playwright Actions

1. Navigate to URL with all UTM parameters:
   ```
   http://localhost:3000/?utm_source=test&utm_medium=cpc&utm_campaign=launch&utm_term=ai+agents&utm_content=hero
   ```
2. Wait 3 seconds for page load and event capture
3. Take snapshot

### Expected Events

**UTM Captured Event**:
```json
{
  "event": "utm_captured",
  "properties": {
    "utm_source": "test",
    "utm_medium": "cpc",
    "utm_campaign": "launch",
    "utm_term": "ai agents",
    "utm_content": "hero"
  }
}
```

**Page Viewed Event**:
```json
{
  "event": "page_viewed",
  "properties": {
    "referrer": "direct",
    "landing_page": "/",
    "landing_url": "http://localhost:3000/?utm_source=test&utm_medium=cpc&utm_campaign=launch&utm_term=ai+agents&utm_content=hero",
    "viewport_width": "<number>",
    "viewport_height": "<number>",
    "device_type": "desktop"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `utm_captured` event appears in PostHog Live Events
- [ ] All 5 UTM parameters are captured correctly
- [ ] `page_viewed` event appears
- [ ] `landing_url` includes UTM params
- [ ] `device_type` is "desktop"
- [ ] Person properties include UTM values (check Persons tab)

---

## Phase 2: Partial UTM Parameters

### Overview
Test with only some UTM parameters to verify partial capture works.

### Playwright Actions

1. Navigate to URL with partial UTM parameters:
   ```
   http://localhost:3000/?utm_source=google&utm_medium=organic
   ```
2. Wait 3 seconds

### Expected Event

```json
{
  "event": "utm_captured",
  "properties": {
    "utm_source": "google",
    "utm_medium": "organic"
  }
}
```

**Note**: `utm_campaign`, `utm_term`, `utm_content` should NOT be present (not null or empty).

### Success Criteria

#### Manual Verification
- [ ] `utm_captured` event only contains provided UTM params
- [ ] Missing params are not present (not null/undefined)

---

## Phase 3: Mobile Viewport Page View

### Overview
Verify device_type changes based on viewport size.

### Playwright Actions

1. Resize browser to mobile viewport (375x667)
2. Navigate to `http://localhost:3000/`
3. Wait 3 seconds

### Expected Event

```json
{
  "event": "page_viewed",
  "properties": {
    "viewport_width": 375,
    "viewport_height": 667,
    "device_type": "mobile"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `page_viewed` event has `device_type: "mobile"`
- [ ] `viewport_width` is 375
- [ ] `viewport_height` is 667

---

## Phase 4: Tablet Viewport Page View

### Playwright Actions

1. Resize browser to tablet viewport (768x1024)
2. Navigate to `http://localhost:3000/`
3. Wait 3 seconds

### Expected Event

```json
{
  "event": "page_viewed",
  "properties": {
    "viewport_width": 768,
    "viewport_height": 1024,
    "device_type": "tablet"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `page_viewed` event has `device_type: "tablet"`

---

## Phase 5: Graceful Degradation (PostHog Blocked)

### Overview
Verify site functions normally when PostHog is blocked.

### Playwright Actions

1. **Block PostHog network requests**:
   - Use Playwright to intercept and block requests to `*.posthog.com`
   - Or block via browser_evaluate to simulate ad blocker

2. Navigate to `http://localhost:3000/`
3. Check browser console for errors
4. Navigate around the site:
   - Scroll to different sections
   - Click a CTA
   - Focus on form field
5. Submit form with test data
6. Verify NO JavaScript errors in console

### Console Check

**Playwright Actions**:
1. Get console messages via `browser_console_messages`
2. Filter for errors
3. Verify no PostHog-related errors

### Expected Behavior
- Page loads normally
- Navigation works
- Form submission works (data may not be tracked, but no errors)
- Console shows NO errors related to PostHog being unavailable

### Success Criteria

#### Manual Verification
- [ ] No console errors appear
- [ ] Page functions normally with PostHog blocked
- [ ] Form can be submitted (functional behavior preserved)
- [ ] Navigation works correctly

---

## Phase 6: No UTM Parameters

### Overview
Verify page_viewed fires correctly without any UTM parameters.

### Playwright Actions

1. Navigate to clean URL: `http://localhost:3000/`
2. Wait 3 seconds

### Expected Event

```json
{
  "event": "page_viewed",
  "properties": {
    "referrer": "direct",
    "landing_page": "/"
  }
}
```

**Note**: `utm_captured` event should NOT fire.

### Success Criteria

#### Manual Verification
- [ ] `page_viewed` event fires
- [ ] NO `utm_captured` event fires (no UTM params to capture)
- [ ] `referrer` is "direct" (no referrer header)

---

## Phase 7: Summary Report

### Report Format

```
UTM & SESSION TRACKING TEST RESULTS
===================================

UTM Parameter Capture:
✓/✗ Full UTM params captured (source, medium, campaign, term, content)
✓/✗ Partial UTM params captured correctly
✓/✗ No false UTM params when absent

Page View Events:
✓/✗ page_viewed fires on navigation
✓/✗ referrer property correct
✓/✗ landing_page property correct
✓/✗ viewport dimensions captured

Device Type Detection:
✓/✗ Desktop viewport → device_type: "desktop"
✓/✗ Mobile viewport → device_type: "mobile"
✓/✗ Tablet viewport → device_type: "tablet"

Graceful Degradation:
✓/✗ No console errors with PostHog blocked
✓/✗ Page navigation works
✓/✗ Form submission works
✓/✗ No JavaScript exceptions

Person Properties:
✓/✗ UTM values saved to person properties
✓/✗ first_referrer set
✓/✗ first_landing_page set
```

### Success Criteria

#### Manual Verification
- [ ] All UTM capture scenarios work correctly
- [ ] Device type detection works for all viewports
- [ ] Graceful degradation confirmed
- [ ] Test report generated

---

## Execution Notes

### Agent Usage

**Use @agent-ui-navigator** for all browser automation tasks in this plan. Spawn the agent with a detailed prompt describing:
1. The specific phase/test to execute
2. URLs to navigate to (with UTM parameters)
3. Viewport sizes to test for device type detection
4. Console message checks and network blocking requirements
5. What to observe and report back

### Playwright MCP Commands Used (via @agent-ui-navigator)
- `browser_navigate` - Navigate with URL params
- `browser_resize` - Change viewport for device type tests
- `browser_console_messages` - Check for errors
- `browser_snapshot` - Verify page state
- `browser_evaluate` - Block network requests (if needed)

### Network Blocking Approaches

**Option 1: Route interception** (via Playwright code):
```javascript
await page.route('**/*.posthog.com/**', route => route.abort());
```

**Option 2: Browser evaluate**:
```javascript
// Override PostHog to no-op
window.posthog = { capture: () => {}, identify: () => {} };
```

### Human Checkpoints
1. **Before Phase 1**: Login to PostHog dashboard
2. **After Phase 2**: Verify UTM capture events
3. **After Phase 4**: Verify device type detection
4. **After Phase 5**: Confirm no console errors with PostHog blocked
5. **After Phase 7**: Confirm final report

### Estimated Duration
- Playwright automation: ~8 minutes
- Human verification: ~12 minutes
- Total: ~20 minutes

## References

- Manual testing guide: `thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md` (Sections 1.6, 1.7)
- Analytics implementation: `src/lib/posthog.ts` (sessionTracking, getUTMParams)
- PostHog Live Events: `https://us.posthog.com/project/254485/events`
