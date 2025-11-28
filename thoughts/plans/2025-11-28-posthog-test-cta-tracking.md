# PostHog CTA Click Tracking Test Plan

## Overview

Automated Playwright test to verify all 10 CTA locations fire the correct `cta_clicked` events with proper properties. Human assistance required for PostHog dashboard login to verify events appear correctly.

**Execution**: Use **@agent-ui-navigator** to execute all Playwright MCP browser automation tasks in this plan. The ui-navigator agent is specialized for web UI navigation, interaction, and validation using the Playwright MCP tools.

## Test Scope

From Section 1.3 of the manual testing guide:

| CTA | Action | Expected `location` Property |
|-----|--------|------------------------------|
| Header "Book a call" | Click desktop nav CTA | `header` |
| Mobile nav "Book a call" | Open mobile menu, click CTA | `mobile_nav` |
| Hero "How it Works" | Click secondary hero CTA | `hero_secondary` |
| Hero "Book a call" | Click primary hero CTA | `hero_primary` |
| Pricing Foundation | Click Foundation tier CTA | `pricing_foundation` |
| Pricing Growth | Click Growth tier CTA | `pricing_growth` |
| Pricing Enterprise | Click Enterprise tier CTA | `pricing_enterprise` |
| Final CTA "Book Your Call" | Click primary final CTA | `final_cta_primary` |
| Final CTA email link | Click email CTA | `final_cta_email` |
| FAQ bottom link | Click "Book a free 30-minute call" | `faq_bottom` |

## Prerequisites

- Development server running (`yarn dev` on port 3000)
- Playwright MCP connected
- Human available to login to PostHog dashboard

## What We're NOT Doing

- Verifying CTA functionality (navigation, mailto: links)
- Testing CTA styling or accessibility
- Mobile viewport tests (separate test if needed)

---

## Phase 1: Setup & PostHog Dashboard Login

### Overview
Human logs into PostHog dashboard and opens Live Events view.

### Steps

1. **Human Action**: Login to PostHog
   - Navigate to `https://us.posthog.com/project/254485/events`
   - Login with credentials
   - Confirm Live Events view is visible

2. **Playwright Action**: Navigate to site
   - Open browser to `http://localhost:3000`
   - Wait for page load

### Success Criteria

#### Manual Verification
- [ ] PostHog dashboard logged in and Live Events visible
- [ ] Development site loaded in Playwright browser

---

## Phase 2: Desktop CTA Tests

### Overview
Test all desktop-visible CTAs and verify events fire.

### Test 2.1: Header CTA

**Playwright Actions**:
1. Take snapshot of page
2. Find header "Book a call" button
3. Click the CTA
4. Wait 2 seconds for event to propagate

**Expected Event**:
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "header",
    "cta_text": "Book a call",
    "page_section": "hero"
  }
}
```

### Test 2.2: Hero Primary CTA

**Playwright Actions**:
1. Scroll to hero section (if needed)
2. Find primary hero "Book a call" button
3. Click the CTA
4. Wait 2 seconds

**Expected Event**:
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "hero_primary"
  }
}
```

### Test 2.3: Hero Secondary CTA

**Playwright Actions**:
1. Find "How it Works" button in hero
2. Click the CTA
3. Wait 2 seconds

**Expected Event**:
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "hero_secondary"
  }
}
```

### Test 2.4-2.6: Pricing Tier CTAs

**Playwright Actions**:
1. Scroll to pricing section
2. Click Foundation tier CTA → verify `pricing_foundation`
3. Click Growth tier CTA → verify `pricing_growth`
4. Click Enterprise tier CTA → verify `pricing_enterprise`

### Test 2.7: Final CTA Primary

**Playwright Actions**:
1. Scroll to final CTA section
2. Find "Book Your Call" button
3. Click the CTA

**Expected Event**:
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "final_cta_primary"
  }
}
```

### Test 2.8: Final CTA Email Link

**Playwright Actions**:
1. Find email link in final CTA section
2. Click the link

**Expected Events** (two events):
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "final_cta_email"
  }
}
```
```json
{
  "event": "email_link_clicked"
}
```

### Test 2.9: FAQ Bottom Link

**Playwright Actions**:
1. Scroll to FAQ section
2. Find "Book a free 30-minute call" link
3. Click the CTA

**Expected Event**:
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "faq_bottom"
  }
}
```

### Success Criteria

#### Manual Verification (Check PostHog Live Events)
- [ ] `cta_clicked` with `location: "header"` appears
- [ ] `cta_clicked` with `location: "hero_primary"` appears
- [ ] `cta_clicked` with `location: "hero_secondary"` appears
- [ ] `cta_clicked` with `location: "pricing_foundation"` appears
- [ ] `cta_clicked` with `location: "pricing_growth"` appears
- [ ] `cta_clicked` with `location: "pricing_enterprise"` appears
- [ ] `cta_clicked` with `location: "final_cta_primary"` appears
- [ ] `cta_clicked` with `location: "final_cta_email"` appears
- [ ] `email_link_clicked` event appears
- [ ] `cta_clicked` with `location: "faq_bottom"` appears
- [ ] All events have `cta_text` property populated
- [ ] All events have `page_section` property populated

---

## Phase 3: Mobile CTA Test

### Overview
Test mobile-specific CTA (mobile nav).

### Steps

**Playwright Actions**:
1. Resize browser to mobile viewport (375x667)
2. Take snapshot
3. Open mobile navigation menu (hamburger icon)
4. Click "Book a call" in mobile nav
5. Wait 2 seconds

**Expected Event**:
```json
{
  "event": "cta_clicked",
  "properties": {
    "location": "mobile_nav"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `cta_clicked` with `location: "mobile_nav"` appears in PostHog
- [ ] Mobile nav closes after clicking CTA

---

## Phase 4: Summary Report

### Overview
Generate summary of all CTA tracking tests.

### Report Format

```
CTA TRACKING TEST RESULTS
=========================

Desktop CTAs:
✓/✗ Header CTA - location: header
✓/✗ Hero Primary - location: hero_primary
✓/✗ Hero Secondary - location: hero_secondary
✓/✗ Pricing Foundation - location: pricing_foundation
✓/✗ Pricing Growth - location: pricing_growth
✓/✗ Pricing Enterprise - location: pricing_enterprise
✓/✗ Final CTA Primary - location: final_cta_primary
✓/✗ Final CTA Email - location: final_cta_email + email_link_clicked
✓/✗ FAQ Bottom - location: faq_bottom

Mobile CTAs:
✓/✗ Mobile Nav - location: mobile_nav

Properties Verified:
✓/✗ cta_text present on all events
✓/✗ page_section present on all events
```

### Success Criteria

#### Manual Verification
- [ ] All 10 CTAs fire correct events
- [ ] All events have required properties
- [ ] Test report generated

---

## Execution Notes

### Agent Usage

**Use @agent-ui-navigator** for all browser automation tasks in this plan. Spawn the agent with a detailed prompt describing:
1. The specific phase/test to execute
2. Expected interactions (clicks, scrolls, waits)
3. What to observe and report back

### Playwright MCP Commands Used (via @agent-ui-navigator)
- `browser_navigate` - Load the page
- `browser_snapshot` - Get page accessibility tree
- `browser_click` - Click CTAs
- `browser_resize` - Set mobile viewport
- `browser_wait_for` - Wait for elements

### Human Checkpoints
1. **Before Phase 1**: Login to PostHog dashboard
2. **After Phase 2**: Verify all desktop CTA events in PostHog
3. **After Phase 3**: Verify mobile CTA event in PostHog
4. **After Phase 4**: Confirm final report accuracy

### Estimated Duration
- Playwright automation: ~5 minutes
- Human verification: ~10 minutes
- Total: ~15 minutes

## References

- Manual testing guide: `thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md` (Section 1.3)
- Analytics implementation: `src/lib/posthog.ts` (ctaTracking object)
- PostHog Live Events: `https://us.posthog.com/project/254485/events`
