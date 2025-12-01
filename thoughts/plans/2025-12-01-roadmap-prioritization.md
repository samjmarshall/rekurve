# Roadmap Prioritization Implementation Plan

## Overview

Restructure the GitHub Project (samjmarshall/projects/2) to focus 100% on pilot validation. This involves moving scaling-related issues to a backlog milestone, deprioritizing non-essential M0 issues, and updating the schedule for active pilot issues.

## Current State Analysis

### Project Configuration
- **Project ID**: `PVT_kwHOAHz9qs4AjXIr`
- **Total Items**: 30 issues
- **Active Milestones**: M0 (Pilot Validation), M1 (Business Foundation), M4 (Sales Infrastructure), Post-PMF: Scaling

### Key Field IDs
| Field | ID |
|-------|-----|
| Priority | `PVTSSF_lAHOAHz9qs4AjXIrzgbvEfw` |
| Iteration | `PVTIF_lAHOAHz9qs4AjXIrzgbvEf8` |
| Start date | `PVTF_lAHOAHz9qs4AjXIrzgbvEgA` |
| End date | `PVTF_lAHOAHz9qs4AjXIrzgbvEgE` |

### Priority Options
| Priority | Option ID |
|----------|-----------|
| P1 | `0a877460` |
| P2 | `da944a9c` |

### Iteration IDs
| Iteration | ID | Dates |
|-----------|-----|-------|
| Week 1: Foundation | `867d40b2` | Dec 1-7 |
| Week 2: Services | `91962de0` | Dec 8-14 |
| Week 3: Quick Wins | `43952aec` | Dec 15-21 |
| Week 6: Validation | `319ce7d6` | Jan 5-11 |
| Week 7: Lead Gen | `f0d88356` | Jan 12-18 |
| Week 8: Technical | `f2a82a76` | Jan 19-25 |

## Desired End State

After implementation:
1. All scaling/paid-offer issues moved to "Post-PMF: Scaling" milestone with cleared scheduling
2. Low-priority M0 issues remain in M0 but without scheduling pressure
3. Active pilot issues have clear, focused schedule aligned to 5-10 hrs/week capacity
4. All week naming matches the design document's schedule

## What We're NOT Doing

- Not deleting any issues
- Not changing issue titles or descriptions
- Not modifying closed/done issues
- Not creating new milestones (Post-PMF: Scaling already exists)

**Note**: Issues #21, #22, #23 are in the repository with "Post-PMF: Scaling" milestone but are NOT in the GitHub Project (only 30 items in project). No project field updates needed for these.

---

## Phase 0: Rename Iterations

### Overview
Rename project iterations to match the design document's week-based naming convention.

### Current vs Desired Names

| Current Name | New Name | Rationale |
|--------------|----------|-----------|
| Week 1: Foundation | Week 2: Positioning | Finish AI Agent Positioning (#3) |
| Week 2: Services | Week 3: Metrics | Define pilot success metrics (#32) |
| Week 3: Quick Wins | Week 4: Discovery | Discovery conversation (#29, #31) |
| Week 4: Add-ons | (unused - can skip) | |
| Week 5: Digital | (unused - can skip) | |
| Week 6: Validation | Week 6: Build | Build AI agent (#30) |
| Week 7: Lead Gen | Week 7: Launch | Continue build + identify #2 (#33) |
| Week 8: Technical | (unused - can skip) | |

### Commands

Iteration field updates require GraphQL mutations. Unfortunately, GitHub's GraphQL API does not support renaming iteration options directly - iterations must be managed through the project settings UI.

**Manual Steps:**
1. Go to https://github.com/users/samjmarshall/projects/2/settings
2. Click on "Iteration" field
3. Rename each iteration:
   - "Week 1: Foundation" → "Week 2: Positioning"
   - "Week 2: Services" → "Week 3: Metrics"
   - "Week 3: Quick Wins" → "Week 4: Discovery"
   - "Week 6: Validation" → "Week 6: Build"
   - "Week 7: Lead Gen" → "Week 7: Launch"

### Success Criteria

#### Manual Verification:
- [ ] Iterations renamed in project settings
- [ ] Week names reflect actual pilot focus (Positioning → Metrics → Discovery → Build → Launch)

---

## Phase 1: Move Issues to Post-PMF: Scaling

### Overview
Move 7 issues to "Post-PMF: Scaling" milestone and clear their scheduling metadata. Note: #6, #7, #8, #9, #10, #21, #22, #23 are already in Post-PMF: Scaling, but some still have scheduling that needs clearing.

### Issues to Update

| # | Item ID | Current Milestone | Action |
|---|---------|-------------------|--------|
| 2 | `PVTI_lAHOAHz9qs4AjXIrzghuZoE` | M7 | Change milestone + clear scheduling |
| 4 | `PVTI_lAHOAHz9qs4AjXIrzghuZos` | M7 | Change milestone + clear scheduling |
| 6 | `PVTI_lAHOAHz9qs4AjXIrzghuZpY` | Post-PMF (correct) | Clear scheduling only |
| 7 | `PVTI_lAHOAHz9qs4AjXIrzghuZqw` | Post-PMF (correct) | Clear scheduling only |
| 8 | `PVTI_lAHOAHz9qs4AjXIrzghuZq8` | Post-PMF (correct) | Clear scheduling only |
| 9 | `PVTI_lAHOAHz9qs4AjXIrzghuZrM` | Post-PMF (correct) | Clear scheduling only |
| 10 | `PVTI_lAHOAHz9qs4AjXIrzghuZr0` | Post-PMF (correct) | Clear scheduling only |
| 11 | `PVTI_lAHOAHz9qs4AjXIrzghuZr8` | M6 | Change milestone + clear scheduling |
| 12 | `PVTI_lAHOAHz9qs4AjXIrzghuZsM` | M6 | Change milestone + clear scheduling |
| 16 | `PVTI_lAHOAHz9qs4AjXIrzghuZtM` | M3 | Change milestone + clear scheduling |

### Commands

#### Step 1a: Change Milestones via GitHub Issues API

```bash
# Issues needing milestone change to Post-PMF: Scaling (milestone #8)
for issue in 2 4 11 12 16; do
  gh issue edit $issue --repo samjmarshall/www --milestone "Post-PMF: Scaling"
done
```

#### Step 1b: Clear Scheduling Fields via GraphQL

For each issue that needs scheduling cleared, we need to clear Priority, Iteration, Start date, and End date.

```bash
# Clear scheduling for issues 2, 4, 6, 7, 8, 9, 10, 11, 12, 16
PROJECT_ID="PVT_kwHOAHz9qs4AjXIr"
PRIORITY_FIELD="PVTSSF_lAHOAHz9qs4AjXIrzgbvEfw"
ITERATION_FIELD="PVTIF_lAHOAHz9qs4AjXIrzgbvEf8"
START_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgA"
END_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgE"

# Item IDs for issues to clear
declare -A ITEMS=(
  [2]="PVTI_lAHOAHz9qs4AjXIrzghuZoE"
  [4]="PVTI_lAHOAHz9qs4AjXIrzghuZos"
  [6]="PVTI_lAHOAHz9qs4AjXIrzghuZpY"
  [7]="PVTI_lAHOAHz9qs4AjXIrzghuZqw"
  [8]="PVTI_lAHOAHz9qs4AjXIrzghuZq8"
  [9]="PVTI_lAHOAHz9qs4AjXIrzghuZrM"
  [10]="PVTI_lAHOAHz9qs4AjXIrzghuZr0"
  [11]="PVTI_lAHOAHz9qs4AjXIrzghuZr8"
  [12]="PVTI_lAHOAHz9qs4AjXIrzghuZsM"
  [16]="PVTI_lAHOAHz9qs4AjXIrzghuZtM"
)

for issue in 2 4 6 7 8 9 10 11 12 16; do
  ITEM_ID="${ITEMS[$issue]}"
  echo "Clearing scheduling for issue #$issue (item $ITEM_ID)"

  # Clear Priority (single select - use clearProjectV2ItemFieldValue)
  gh api graphql -f query='
    mutation {
      clearProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$PRIORITY_FIELD"'"
      }) { projectV2Item { id } }
    }'

  # Clear Iteration
  gh api graphql -f query='
    mutation {
      clearProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$ITERATION_FIELD"'"
      }) { projectV2Item { id } }
    }'

  # Clear Start date
  gh api graphql -f query='
    mutation {
      clearProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$START_DATE_FIELD"'"
      }) { projectV2Item { id } }
    }'

  # Clear End date
  gh api graphql -f query='
    mutation {
      clearProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$END_DATE_FIELD"'"
      }) { projectV2Item { id } }
    }'
done
```

### Success Criteria

#### Automated Verification:
```bash
# Verify milestones changed
gh issue list --repo samjmarshall/www --milestone "Post-PMF: Scaling" --json number | jq '.[].number' | sort -n
# Should include: 2, 4, 6, 7, 8, 9, 10, 11, 12, 16, 21, 22, 23

# Verify scheduling cleared
gh project item-list 2 --owner samjmarshall --format json | jq '.items[] | select(.content.number == 2 or .content.number == 4 or .content.number == 11 or .content.number == 12 or .content.number == 16) | {number: .content.number, priority, iteration: .iteration, start: .["start date"], end: .["end date"]}'
# All should show null for priority, iteration, start, end
```

#### Manual Verification:
- [ ] View project board at https://github.com/users/samjmarshall/projects/2 and confirm issues appear in Post-PMF: Scaling

---

## Phase 2: Deprioritize M0 Issues

### Overview
Remove scheduling from 3 M0 issues while keeping them in M0: Pilot Validation milestone.

### Issues to Update

| # | Item ID | Action |
|---|---------|--------|
| 13 | `PVTI_lAHOAHz9qs4AjXIrzghuZsQ` | Clear Priority, Iteration, Start/End dates |
| 34 | `PVTI_lAHOAHz9qs4AjXIrzgh4kuQ` | Clear Priority, Iteration, Start/End dates |
| 35 | `PVTI_lAHOAHz9qs4AjXIrzgh4kuc` | Clear Priority, Iteration, Start/End dates |

### Commands

```bash
PROJECT_ID="PVT_kwHOAHz9qs4AjXIr"
PRIORITY_FIELD="PVTSSF_lAHOAHz9qs4AjXIrzgbvEfw"
ITERATION_FIELD="PVTIF_lAHOAHz9qs4AjXIrzgbvEf8"
START_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgA"
END_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgE"

declare -A ITEMS=(
  [13]="PVTI_lAHOAHz9qs4AjXIrzghuZsQ"
  [34]="PVTI_lAHOAHz9qs4AjXIrzgh4kuQ"
  [35]="PVTI_lAHOAHz9qs4AjXIrzgh4kuc"
)

for issue in 13 34 35; do
  ITEM_ID="${ITEMS[$issue]}"
  echo "Deprioritizing issue #$issue (item $ITEM_ID)"

  for FIELD in "$PRIORITY_FIELD" "$ITERATION_FIELD" "$START_DATE_FIELD" "$END_DATE_FIELD"; do
    gh api graphql -f query='
      mutation {
        clearProjectV2ItemFieldValue(input: {
          projectId: "'"$PROJECT_ID"'"
          itemId: "'"$ITEM_ID"'"
          fieldId: "'"$FIELD"'"
        }) { projectV2Item { id } }
      }'
  done
done
```

### Success Criteria

#### Automated Verification:
```bash
# Verify still in M0
gh issue list --repo samjmarshall/www --milestone "M0: Pilot Validation" --json number | jq '.[].number' | grep -E "^(13|34|35)$"
# Should show 13, 34, 35

# Verify scheduling cleared
gh project item-list 2 --owner samjmarshall --format json | jq '.items[] | select(.content.number == 13 or .content.number == 34 or .content.number == 35) | {number: .content.number, priority, iteration: .iteration}'
# All should show null
```

#### Manual Verification:
- [ ] Issues #13, #34, #35 appear in M0: Pilot Validation without scheduling

---

## Phase 3: Update Active Issue Schedule

### Overview
Set correct Priority, Iteration, and dates for the active pilot issues.

### Schedule Mapping

| # | Item ID | Priority | Iteration | Start | End |
|---|---------|----------|-----------|-------|-----|
| 3 | `PVTI_lAHOAHz9qs4AjXIrzghuZog` | P1 | Week 2: Positioning | 2025-12-01 | 2025-12-07 |
| 15 | `PVTI_lAHOAHz9qs4AjXIrzghuZtE` | P2 | (clear) | (clear) | (clear) |
| 32 | `PVTI_lAHOAHz9qs4AjXIrzgh4kuA` | P1 | Week 3: Metrics | 2025-12-08 | 2025-12-14 |
| 29 | `PVTI_lAHOAHz9qs4AjXIrzgh4izQ` | P1 | Week 4: Discovery | 2025-12-15 | 2025-12-19 |
| 31 | `PVTI_lAHOAHz9qs4AjXIrzgh4ktw` | P1 | Week 4: Discovery | 2025-12-15 | 2025-12-19 |
| 30 | `PVTI_lAHOAHz9qs4AjXIrzgh4ktg` | P1 | Week 6: Build | 2026-01-05 | 2026-01-25 |
| 33 | `PVTI_lAHOAHz9qs4AjXIrzgh4kuM` | P2 | Week 7: Launch | 2026-01-12 | 2026-01-18 |
| 14 | `PVTI_lAHOAHz9qs4AjXIrzghuZso` | P1 | (clear - ongoing) | (clear) | (clear) |

**Note**: Iteration IDs remain the same - only the display names change after Phase 0.

**Discovery Contingency**: If discovery (#29, #31) reveals the locksmith pilot isn't viable, reprioritize #33 (Identify second pilot candidate) to P1 and reschedule to Week 5 (Dec 20 - Jan 4 time off period can be used for async research).

### Commands

```bash
PROJECT_ID="PVT_kwHOAHz9qs4AjXIr"
PRIORITY_FIELD="PVTSSF_lAHOAHz9qs4AjXIrzgbvEfw"
ITERATION_FIELD="PVTIF_lAHOAHz9qs4AjXIrzgbvEf8"
START_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgA"
END_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgE"

P1_ID="0a877460"
P2_ID="da944a9c"

# Iteration IDs (after Phase 0 rename)
WEEK2="867d40b2"  # Week 2: Positioning (Dec 1-7)
WEEK3="91962de0"  # Week 3: Metrics (Dec 8-14)
WEEK4="43952aec"  # Week 4: Discovery (Dec 15-19)
WEEK6="319ce7d6"  # Week 6: Build (Jan 5-11)
WEEK7="f0d88356"  # Week 7: Launch (Jan 12-18)

# Helper function to set priority
set_priority() {
  local ITEM_ID=$1
  local PRIORITY_OPTION_ID=$2
  gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$PRIORITY_FIELD"'"
        value: { singleSelectOptionId: "'"$PRIORITY_OPTION_ID"'" }
      }) { projectV2Item { id } }
    }'
}

# Helper function to set iteration
set_iteration() {
  local ITEM_ID=$1
  local ITERATION_ID=$2
  gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$ITERATION_FIELD"'"
        value: { iterationId: "'"$ITERATION_ID"'" }
      }) { projectV2Item { id } }
    }'
}

# Helper function to set date
set_date() {
  local ITEM_ID=$1
  local FIELD_ID=$2
  local DATE=$3
  gh api graphql -f query='
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$FIELD_ID"'"
        value: { date: "'"$DATE"'" }
      }) { projectV2Item { id } }
    }'
}

# Helper function to clear field
clear_field() {
  local ITEM_ID=$1
  local FIELD_ID=$2
  gh api graphql -f query='
    mutation {
      clearProjectV2ItemFieldValue(input: {
        projectId: "'"$PROJECT_ID"'"
        itemId: "'"$ITEM_ID"'"
        fieldId: "'"$FIELD_ID"'"
      }) { projectV2Item { id } }
    }'
}

echo "=== Issue #3: AI Agent Positioning (P1, Week 2: Positioning, Dec 1-7) ==="
ITEM_3="PVTI_lAHOAHz9qs4AjXIrzghuZog"
set_priority "$ITEM_3" "$P1_ID"
set_iteration "$ITEM_3" "$WEEK2"
set_date "$ITEM_3" "$START_DATE_FIELD" "2025-12-01"
set_date "$ITEM_3" "$END_DATE_FIELD" "2025-12-07"

echo "=== Issue #15: Business Tools (P2, ongoing/minimal - clear schedule) ==="
ITEM_15="PVTI_lAHOAHz9qs4AjXIrzghuZtE"
set_priority "$ITEM_15" "$P2_ID"
clear_field "$ITEM_15" "$ITERATION_FIELD"
clear_field "$ITEM_15" "$START_DATE_FIELD"
clear_field "$ITEM_15" "$END_DATE_FIELD"

echo "=== Issue #32: Define pilot success metrics (P1, Week 3: Metrics, Dec 8-14) ==="
ITEM_32="PVTI_lAHOAHz9qs4AjXIrzgh4kuA"
set_priority "$ITEM_32" "$P1_ID"
set_iteration "$ITEM_32" "$WEEK3"
set_date "$ITEM_32" "$START_DATE_FIELD" "2025-12-08"
set_date "$ITEM_32" "$END_DATE_FIELD" "2025-12-14"

echo "=== Issue #29: Discovery conversation (P1, Week 4: Discovery, Dec 15-19) ==="
ITEM_29="PVTI_lAHOAHz9qs4AjXIrzgh4izQ"
set_priority "$ITEM_29" "$P1_ID"
set_iteration "$ITEM_29" "$WEEK4"
set_date "$ITEM_29" "$START_DATE_FIELD" "2025-12-15"
set_date "$ITEM_29" "$END_DATE_FIELD" "2025-12-19"

echo "=== Issue #31: Document findings (P1, Week 4: Discovery, Dec 15-19) ==="
ITEM_31="PVTI_lAHOAHz9qs4AjXIrzgh4ktw"
set_priority "$ITEM_31" "$P1_ID"
set_iteration "$ITEM_31" "$WEEK4"
set_date "$ITEM_31" "$START_DATE_FIELD" "2025-12-15"
set_date "$ITEM_31" "$END_DATE_FIELD" "2025-12-19"

echo "=== Issue #30: Build AI agent (P1, Week 6: Build, Jan 5-25) ==="
ITEM_30="PVTI_lAHOAHz9qs4AjXIrzgh4ktg"
set_priority "$ITEM_30" "$P1_ID"
set_iteration "$ITEM_30" "$WEEK6"
set_date "$ITEM_30" "$START_DATE_FIELD" "2026-01-05"
set_date "$ITEM_30" "$END_DATE_FIELD" "2026-01-25"

echo "=== Issue #33: Second pilot candidate (P2, Week 7: Launch, Jan 12-18) ==="
ITEM_33="PVTI_lAHOAHz9qs4AjXIrzgh4kuM"
set_priority "$ITEM_33" "$P2_ID"
set_iteration "$ITEM_33" "$WEEK7"
set_date "$ITEM_33" "$START_DATE_FIELD" "2026-01-12"
set_date "$ITEM_33" "$END_DATE_FIELD" "2026-01-18"

echo "=== Issue #14: Validate use cases (P1, ongoing - clear iteration/dates) ==="
ITEM_14="PVTI_lAHOAHz9qs4AjXIrzghuZso"
set_priority "$ITEM_14" "$P1_ID"
clear_field "$ITEM_14" "$ITERATION_FIELD"
clear_field "$ITEM_14" "$START_DATE_FIELD"
clear_field "$ITEM_14" "$END_DATE_FIELD"
```

### Success Criteria

#### Automated Verification:
```bash
# Verify active issues have correct scheduling
gh project item-list 2 --owner samjmarshall --format json | jq '.items[] | select(.content.number == 3 or .content.number == 32 or .content.number == 29 or .content.number == 31 or .content.number == 30 or .content.number == 33 or .content.number == 14 or .content.number == 15) | {number: .content.number, priority, iteration: .iteration.title, start: .["start date"], end: .["end date"]}'
```

Expected output (after Phase 0 iteration rename):
```json
{"number":3,"priority":"P1","iteration":"Week 2: Positioning","start":"2025-12-01","end":"2025-12-07"}
{"number":15,"priority":"P2","iteration":null,"start":null,"end":null}
{"number":32,"priority":"P1","iteration":"Week 3: Metrics","start":"2025-12-08","end":"2025-12-14"}
{"number":29,"priority":"P1","iteration":"Week 4: Discovery","start":"2025-12-15","end":"2025-12-19"}
{"number":31,"priority":"P1","iteration":"Week 4: Discovery","start":"2025-12-15","end":"2025-12-19"}
{"number":30,"priority":"P1","iteration":"Week 6: Build","start":"2026-01-05","end":"2026-01-25"}
{"number":33,"priority":"P2","iteration":"Week 7: Launch","start":"2026-01-12","end":"2026-01-18"}
{"number":14,"priority":"P1","iteration":null,"start":null,"end":null}
```

#### Manual Verification:
- [ ] Project board shows correct weekly focus at https://github.com/users/samjmarshall/projects/2
- [ ] Issues appear in correct iterations when viewed by iteration

---

## Combined Execution Script

For convenience, here's the complete script that executes all phases:

```bash
#!/bin/bash
set -e

PROJECT_ID="PVT_kwHOAHz9qs4AjXIr"
PRIORITY_FIELD="PVTSSF_lAHOAHz9qs4AjXIrzgbvEfw"
ITERATION_FIELD="PVTIF_lAHOAHz9qs4AjXIrzgbvEf8"
START_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgA"
END_DATE_FIELD="PVTF_lAHOAHz9qs4AjXIrzgbvEgE"

P1_ID="0a877460"
P2_ID="da944a9c"

# Iteration IDs (after Phase 0 rename)
WEEK2="867d40b2"  # Week 2: Positioning
WEEK3="91962de0"  # Week 3: Metrics
WEEK4="43952aec"  # Week 4: Discovery
WEEK6="319ce7d6"  # Week 6: Build
WEEK7="f0d88356"  # Week 7: Launch

set_priority() {
  gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: "'"$PROJECT_ID"'", itemId: "'"$1"'", fieldId: "'"$PRIORITY_FIELD"'", value: { singleSelectOptionId: "'"$2"'" } }) { projectV2Item { id } } }'
}

set_iteration() {
  gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: "'"$PROJECT_ID"'", itemId: "'"$1"'", fieldId: "'"$ITERATION_FIELD"'", value: { iterationId: "'"$2"'" } }) { projectV2Item { id } } }'
}

set_date() {
  gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: "'"$PROJECT_ID"'", itemId: "'"$1"'", fieldId: "'"$2"'", value: { date: "'"$3"'" } }) { projectV2Item { id } } }'
}

clear_field() {
  gh api graphql -f query='mutation { clearProjectV2ItemFieldValue(input: { projectId: "'"$PROJECT_ID"'", itemId: "'"$1"'", fieldId: "'"$2"'" }) { projectV2Item { id } } }'
}

echo "=== PHASE 1: Move issues to Post-PMF: Scaling ==="
for issue in 2 4 11 12 16; do
  echo "Moving issue #$issue to Post-PMF: Scaling"
  gh issue edit $issue --repo samjmarshall/www --milestone "Post-PMF: Scaling"
done

echo ""
echo "=== PHASE 1b: Clear scheduling for Post-PMF issues ==="
declare -A PHASE1_ITEMS=(
  [2]="PVTI_lAHOAHz9qs4AjXIrzghuZoE"
  [4]="PVTI_lAHOAHz9qs4AjXIrzghuZos"
  [6]="PVTI_lAHOAHz9qs4AjXIrzghuZpY"
  [7]="PVTI_lAHOAHz9qs4AjXIrzghuZqw"
  [8]="PVTI_lAHOAHz9qs4AjXIrzghuZq8"
  [9]="PVTI_lAHOAHz9qs4AjXIrzghuZrM"
  [10]="PVTI_lAHOAHz9qs4AjXIrzghuZr0"
  [11]="PVTI_lAHOAHz9qs4AjXIrzghuZr8"
  [12]="PVTI_lAHOAHz9qs4AjXIrzghuZsM"
  [16]="PVTI_lAHOAHz9qs4AjXIrzghuZtM"
)

for issue in 2 4 6 7 8 9 10 11 12 16; do
  ITEM_ID="${PHASE1_ITEMS[$issue]}"
  echo "Clearing scheduling for issue #$issue"
  clear_field "$ITEM_ID" "$PRIORITY_FIELD"
  clear_field "$ITEM_ID" "$ITERATION_FIELD"
  clear_field "$ITEM_ID" "$START_DATE_FIELD"
  clear_field "$ITEM_ID" "$END_DATE_FIELD"
done

echo ""
echo "=== PHASE 2: Deprioritize M0 issues ==="
declare -A PHASE2_ITEMS=(
  [13]="PVTI_lAHOAHz9qs4AjXIrzghuZsQ"
  [34]="PVTI_lAHOAHz9qs4AjXIrzgh4kuQ"
  [35]="PVTI_lAHOAHz9qs4AjXIrzgh4kuc"
)

for issue in 13 34 35; do
  ITEM_ID="${PHASE2_ITEMS[$issue]}"
  echo "Deprioritizing issue #$issue"
  clear_field "$ITEM_ID" "$PRIORITY_FIELD"
  clear_field "$ITEM_ID" "$ITERATION_FIELD"
  clear_field "$ITEM_ID" "$START_DATE_FIELD"
  clear_field "$ITEM_ID" "$END_DATE_FIELD"
done

echo ""
echo "=== PHASE 3: Update active issue schedule ==="

echo "Issue #3: P1, Week 2: Positioning, Dec 1-7"
ITEM_3="PVTI_lAHOAHz9qs4AjXIrzghuZog"
set_priority "$ITEM_3" "$P1_ID"
set_iteration "$ITEM_3" "$WEEK2"
set_date "$ITEM_3" "$START_DATE_FIELD" "2025-12-01"
set_date "$ITEM_3" "$END_DATE_FIELD" "2025-12-07"

echo "Issue #15: P2, ongoing"
ITEM_15="PVTI_lAHOAHz9qs4AjXIrzghuZtE"
set_priority "$ITEM_15" "$P2_ID"
clear_field "$ITEM_15" "$ITERATION_FIELD"
clear_field "$ITEM_15" "$START_DATE_FIELD"
clear_field "$ITEM_15" "$END_DATE_FIELD"

echo "Issue #32: P1, Week 3: Metrics, Dec 8-14"
ITEM_32="PVTI_lAHOAHz9qs4AjXIrzgh4kuA"
set_priority "$ITEM_32" "$P1_ID"
set_iteration "$ITEM_32" "$WEEK3"
set_date "$ITEM_32" "$START_DATE_FIELD" "2025-12-08"
set_date "$ITEM_32" "$END_DATE_FIELD" "2025-12-14"

echo "Issue #29: P1, Week 4: Discovery, Dec 15-19"
ITEM_29="PVTI_lAHOAHz9qs4AjXIrzgh4izQ"
set_priority "$ITEM_29" "$P1_ID"
set_iteration "$ITEM_29" "$WEEK4"
set_date "$ITEM_29" "$START_DATE_FIELD" "2025-12-15"
set_date "$ITEM_29" "$END_DATE_FIELD" "2025-12-19"

echo "Issue #31: P1, Week 4: Discovery, Dec 15-19"
ITEM_31="PVTI_lAHOAHz9qs4AjXIrzgh4ktw"
set_priority "$ITEM_31" "$P1_ID"
set_iteration "$ITEM_31" "$WEEK4"
set_date "$ITEM_31" "$START_DATE_FIELD" "2025-12-15"
set_date "$ITEM_31" "$END_DATE_FIELD" "2025-12-19"

echo "Issue #30: P1, Week 6: Build, Jan 5-25"
ITEM_30="PVTI_lAHOAHz9qs4AjXIrzgh4ktg"
set_priority "$ITEM_30" "$P1_ID"
set_iteration "$ITEM_30" "$WEEK6"
set_date "$ITEM_30" "$START_DATE_FIELD" "2026-01-05"
set_date "$ITEM_30" "$END_DATE_FIELD" "2026-01-25"

echo "Issue #33: P2, Week 7: Launch, Jan 12-18"
ITEM_33="PVTI_lAHOAHz9qs4AjXIrzgh4kuM"
set_priority "$ITEM_33" "$P2_ID"
set_iteration "$ITEM_33" "$WEEK7"
set_date "$ITEM_33" "$START_DATE_FIELD" "2026-01-12"
set_date "$ITEM_33" "$END_DATE_FIELD" "2026-01-18"

echo "Issue #14: P1, ongoing"
ITEM_14="PVTI_lAHOAHz9qs4AjXIrzghuZso"
set_priority "$ITEM_14" "$P1_ID"
clear_field "$ITEM_14" "$ITERATION_FIELD"
clear_field "$ITEM_14" "$START_DATE_FIELD"
clear_field "$ITEM_14" "$END_DATE_FIELD"

echo ""
echo "=== COMPLETE ==="
echo "Run verification commands to confirm changes."
```

---

## References

- Original design: `thoughts/designs/2025-12-01-roadmap-prioritization-for-pmf.md`
- GitHub Project: https://github.com/users/samjmarshall/projects/2
- Pilot Program: `docs/sales/pilot-program.md`
