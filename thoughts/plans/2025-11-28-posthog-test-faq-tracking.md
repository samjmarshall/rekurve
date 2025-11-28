# PostHog FAQ Tracking Test Plan

## Overview

Automated Playwright test to verify FAQ expansion and search tracking. Human assistance required for PostHog dashboard verification.

**Execution**: Use **@agent-ui-navigator** to execute all Playwright MCP browser automation tasks in this plan. The ui-navigator agent is specialized for web UI navigation, interaction, and validation using the Playwright MCP tools.

## Test Scope

From Section 1.5 of the manual testing guide:

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `faq_expanded` | Click to expand FAQ item | `question_id`, `question`, `category` |
| `faq_collapsed` | Click to collapse FAQ item | `question_id` |
| `faq_searched` | Type in FAQ search (after 500ms debounce) | `query`, `results_count`, `has_results` |

## Prerequisites

- Development server running (`yarn dev` on port 3000)
- Playwright MCP connected
- Human available to login to PostHog dashboard

## What We're NOT Doing

- Testing FAQ content accuracy
- Testing FAQ accessibility
- Testing FAQ animation performance

---

## Phase 1: Setup & Navigate to FAQ Section

### Overview
Navigate to site and scroll to FAQ section.

### Playwright Actions

1. Navigate to `http://localhost:3000`
2. Scroll to FAQ section
3. Take snapshot to identify FAQ structure
4. Wait for FAQ section to be fully visible

### Success Criteria

#### Automated Verification
- [ ] Page loads successfully
- [ ] FAQ section is visible in snapshot

---

## Phase 2: FAQ Expansion Tracking

### Overview
Expand multiple FAQ items and verify events fire with correct properties.

### Test 2.1: Expand First FAQ Item

**Playwright Actions**:
1. Take snapshot of FAQ section
2. Click on first FAQ question to expand it
3. Wait 2 seconds for event

**Expected Event**:
```json
{
  "event": "faq_expanded",
  "properties": {
    "question_id": "<string>",
    "question": "<full question text>",
    "category": "<category name>"
  }
}
```

### Test 2.2: Expand FAQ from Different Category

**Playwright Actions**:
1. Scroll to find FAQ in different category (e.g., "Pricing" or "Technical")
2. Click to expand
3. Wait 2 seconds

**Expected Event**:
```json
{
  "event": "faq_expanded",
  "properties": {
    "category": "<different category>"
  }
}
```

### Test 2.3: Collapse FAQ Item

**Playwright Actions**:
1. Click the already-expanded FAQ to collapse it
2. Wait 2 seconds

**Expected Event**:
```json
{
  "event": "faq_collapsed",
  "properties": {
    "question_id": "<string>"
  }
}
```

### Success Criteria

#### Manual Verification
- [ ] `faq_expanded` event appears for first FAQ
- [ ] `question_id` is a unique identifier
- [ ] `question` contains the actual question text
- [ ] `category` matches the FAQ category (e.g., "ROI & Results", "Pricing")
- [ ] `faq_expanded` appears for second FAQ with different category
- [ ] `faq_collapsed` event appears when collapsing

---

## Phase 3: FAQ Search Tracking

### Overview
Test the FAQ search functionality and verify search events fire.

### Test 3.1: Search with Results

**Playwright Actions**:
1. Find FAQ search input field
2. Type search query: "pricing"
3. Wait 1 second (500ms debounce + buffer)
4. Observe filtered results

**Expected Event**:
```json
{
  "event": "faq_searched",
  "properties": {
    "query": "pricing",
    "results_count": "<number > 0>",
    "has_results": true
  }
}
```

### Test 3.2: Search with No Results

**Playwright Actions**:
1. Clear search field
2. Type query with no matches: "xyznonexistent123"
3. Wait 1 second

**Expected Event**:
```json
{
  "event": "faq_searched",
  "properties": {
    "query": "xyznonexistent123",
    "results_count": 0,
    "has_results": false
  }
}
```

### Test 3.3: Clear Search

**Playwright Actions**:
1. Clear the search field
2. Wait 1 second
3. Verify all FAQs are visible again

**Note**: May or may not fire an event depending on implementation.

### Success Criteria

#### Manual Verification
- [ ] `faq_searched` event fires after typing "pricing"
- [ ] `query` property contains "pricing"
- [ ] `results_count` is a positive number
- [ ] `has_results` is true
- [ ] `faq_searched` fires for no-results query
- [ ] `results_count` is 0 for no-results
- [ ] `has_results` is false for no-results

---

## Phase 4: Multiple FAQ Interactions

### Overview
Simulate realistic user behavior with multiple FAQ interactions.

### Playwright Actions

1. Expand 3 different FAQ items in sequence
2. Search for "guarantee"
3. Expand an FAQ from search results
4. Collapse it

### Expected Events (in order)
1. `faq_expanded` (item 1)
2. `faq_expanded` (item 2)
3. `faq_expanded` (item 3)
4. `faq_searched` (query: "guarantee")
5. `faq_expanded` (from search results)
6. `faq_collapsed`

### Success Criteria

#### Manual Verification
- [ ] All 3 expansion events appear in sequence
- [ ] Search event fires with correct query
- [ ] Expansion from search results tracked
- [ ] Person properties updated (if applicable):
  - `faq_interactions` count
  - Category-specific flags

---

## Phase 5: Summary Report

### Report Format

```
FAQ TRACKING TEST RESULTS
=========================

FAQ Expansion:
✓/✗ faq_expanded fires on click
✓/✗ question_id property present
✓/✗ question (full text) property present
✓/✗ category property present
✓/✗ Different categories tracked correctly

FAQ Collapse:
✓/✗ faq_collapsed fires on collapse
✓/✗ question_id matches expanded item

FAQ Search:
✓/✗ faq_searched fires after debounce
✓/✗ query property contains search text
✓/✗ results_count property is number
✓/✗ has_results true when results exist
✓/✗ has_results false when no results

Person Properties (if applicable):
✓/✗ faq_interactions count updated
✓/✗ Category flags set
```

### Success Criteria

#### Manual Verification
- [ ] All expansion events tracked correctly
- [ ] Search events tracked with proper debounce
- [ ] Both success and no-results searches tracked
- [ ] Test report generated

---

## FAQ Categories Reference

Expected categories in the FAQ section:
- ROI & Results
- Pricing
- Technical
- Security & Compliance
- Support & Training

---

## Execution Notes

### Agent Usage

**Use @agent-ui-navigator** for all browser automation tasks in this plan. Spawn the agent with a detailed prompt describing:
1. The specific phase/test to execute
2. FAQ items to interact with (expand, collapse, search)
3. Search queries to use and expected behaviors
4. What to observe and report back

### Playwright MCP Commands Used (via @agent-ui-navigator)
- `browser_navigate` - Load page
- `browser_snapshot` - Get FAQ structure
- `browser_click` - Expand/collapse FAQs
- `browser_type` - Enter search queries
- `browser_wait_for` - Wait for debounce/animations

### Human Checkpoints
1. **Before Phase 1**: Login to PostHog dashboard
2. **After Phase 2**: Verify expansion events and categories
3. **After Phase 3**: Verify search events with different queries
4. **After Phase 5**: Confirm final report

### Estimated Duration
- Playwright automation: ~5 minutes
- Human verification: ~10 minutes
- Total: ~15 minutes

## References

- Manual testing guide: `thoughts/plans/2025-11-27-posthog-manual-testing-setup-guide.md` (Section 1.5)
- Analytics implementation: `src/lib/posthog.ts` (faqTracking object)
- PostHog Live Events: `https://us.posthog.com/project/254485/events`
