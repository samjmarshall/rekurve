# Deterministic Lead Scoring Engine — Refactor Plan

## Context

The AI-based scoring engine (Phases 1–3 of the original plan) has been implemented and is working. However, analysis revealed that the Claude Haiku API call is unnecessary — the scoring rubric is a set of explicit lookup tables mapping structured fields to fixed point values. The model is being used as a `switch` statement, not for any AI capability (no sentiment analysis, no intent classification, no unstructured interpretation).

**Problems with AI approach:**
- Non-deterministic: same lead data → slightly different scores across runs
- Unnecessary cost and latency (~$0.001–0.003 per call + network round trip)
- Fragile: scoring breaks if Anthropic API is down
- Over-engineered for `if/else` logic

**What changes:** Replace the Haiku API call with pure TypeScript scoring functions. Replace AI-generated `nextQuestion`/`reasoning` with static templates. Remove the Anthropic SDK dependency entirely.

**What stays the same:** The `QualifyAndScoreResult` interface, `ScoreMetadata` type, `scoreResultSchema` Zod schema, stage derivation, fire-and-forget integration in the leads router, HubSpot sync, DB storage.

## Current State Analysis

- **AI scoring is live** — `qualifyAndScore()` calls Haiku on every lead create/update (`src/server/ai/scoring/qualify-and-score.ts:26-37`)
- **Anthropic SDK installed** — `@anthropic-ai/sdk` in `package.json`, `ANTHROPIC_API_KEY` in `src/env.js:11,50`
- **Client singleton** — `src/server/ai/client.ts` creates a shared `Anthropic` instance
- **System prompt** — `src/server/ai/scoring/prompt.ts` contains the scoring rubric as prompt text and `formatLeadForScoring()`
- **Schema intact** — `src/server/ai/scoring/schema.ts` defines `scoreResultSchema`, `ScoreResult`, `ScoreMetadata` (these stay)
- **Router integration** — `src/server/api/routers/leads.ts:16-51` fires `scoreLeadAsync()` on create/update (stays, just import path changes)
- **Tests mock Claude** — `src/server/ai/scoring/__tests__/qualify-and-score.test.ts` mocks `anthropic.messages.parse()`

### Key field types for deterministic scoring:
- `hasLand`: boolean | null
- `landRegistered`: boolean | null
- `landAddress`, `landSizeSqm`, `landWidth`, `landDepth`: string | null
- `seenBroker`: boolean | null (only true/false — no pre-approval granularity)
- `constructionTimeline`: enum `"ready_now" | "3_6_months" | "12_months_plus"` | null
- `budget`: free-text string | null (placeholder: "e.g. $650,000")
- `propertyType`: enum `"single_storey" | "double_storey" | "investment" | "upsize" | "downsize" | "first_home_buyer"` | null
- `preferredEstates`: string[] | null
- `preferredSuburbs`: string[] | null

## Desired End State

After this plan is complete:

1. `qualifyAndScore()` is a pure, synchronous-capable TypeScript function — no network calls, no API keys
2. Identical inputs always produce identical scores (deterministic)
3. The Anthropic SDK and `ANTHROPIC_API_KEY` env var are removed
4. Scoring module lives at `src/server/scoring/` (not `src/server/ai/`)
5. All existing integration points (router, DB write, HubSpot sync) continue working unchanged
6. Tests are simpler — direct input/output assertions, no API mocking

### Verification:
- `make check` passes (types + lint)
- `make test` passes (all scoring + router tests green)
- Manual: create a lead, confirm score appears instantly (no API latency)

## What We're NOT Doing

- **Changing the scoring rubric** — point values and thresholds stay the same
- **Adding finance granularity** — `seenBroker` stays as a boolean; finance is capped at 15/25 (noted as future data model improvement)
- **Parsing budget ranges** — "500-700k" will match the first number; good enough for now
- **UI changes** — displaying scores is a separate ticket
- **Changing the `notes` field handling** — removing from `SCORING_FIELDS` since it can't contribute to deterministic scoring

## Implementation Approach

Two phases, each independently testable:

1. **Deterministic Scoring Engine** — Replace AI call with TypeScript scoring functions, move to `src/server/scoring/`
2. **Remove AI Dependencies** — Delete Anthropic SDK, env var, client, prompt file

---

## Phase 1: Deterministic Scoring Engine

### Overview
Replace the Claude API call in `qualifyAndScore()` with pure TypeScript scoring functions. Move the scoring module from `src/server/ai/scoring/` to `src/server/scoring/`. Keep the same output interface so the router integration is unaffected.

### Changes Required:

#### 1. Create deterministic scoring functions
**File**: `src/server/scoring/score-factors.ts` (new)
**Purpose**: Individual scoring functions for each factor, plus budget parsing and gap/question generation

```typescript
import type { ScoreResult } from "./schema";

type FactorBreakdown = ScoreResult["breakdown"][keyof ScoreResult["breakdown"]];
type Gap = ScoreResult["gaps"][number];

// --- Land Status (30 pts) ---

export function scoreLand(lead: {
  hasLand?: boolean | null;
  landRegistered?: boolean | null;
  landSizeSqm?: string | null;
  landWidth?: string | null;
  landDepth?: string | null;
  preferredEstates?: string[] | null;
  preferredSuburbs?: string[] | null;
}): FactorBreakdown {
  const hasDimensions = !!(lead.landSizeSqm || (lead.landWidth && lead.landDepth));

  if (lead.hasLand && lead.landRegistered && hasDimensions) {
    return { score: 30, maxScore: 30, reasoning: "Registered land with known dimensions" };
  }
  if (lead.hasLand && lead.landRegistered) {
    return { score: 22, maxScore: 30, reasoning: "Has registered land" };
  }
  if (lead.hasLand) {
    return { score: 15, maxScore: 30, reasoning: "Has land, not yet registered" };
  }
  if (lead.preferredEstates?.length) {
    return { score: 15, maxScore: 30, reasoning: "Actively searching specific estates" };
  }
  if (lead.preferredSuburbs?.length) {
    return { score: 5, maxScore: 30, reasoning: "Exploring suburbs, no specific land yet" };
  }
  return { score: 0, maxScore: 30, reasoning: "No land information provided" };
}

// --- Finance Status (25 pts) ---
// Note: seenBroker is a boolean — can't distinguish pre-approved (25) from
// seen-but-not-approved (15). Capped at 15 until field becomes an enum.

export function scoreFinance(lead: {
  seenBroker?: boolean | null;
}): FactorBreakdown {
  if (lead.seenBroker === true) {
    return { score: 15, maxScore: 25, reasoning: "Has spoken with a broker" };
  }
  if (lead.seenBroker === false) {
    return { score: 0, maxScore: 25, reasoning: "Has not seen a broker" };
  }
  return { score: 0, maxScore: 25, reasoning: "Finance status unknown" };
}

// --- Timeline (20 pts) ---

export function scoreTimeline(lead: {
  constructionTimeline?: string | null;
}): FactorBreakdown {
  switch (lead.constructionTimeline) {
    case "ready_now":
      return { score: 20, maxScore: 20, reasoning: "Ready to build now" };
    case "3_6_months":
      return { score: 12, maxScore: 20, reasoning: "Planning to build in 3-6 months" };
    case "12_months_plus":
      return { score: 4, maxScore: 20, reasoning: "Timeline is 12+ months out" };
    default:
      return { score: 0, maxScore: 20, reasoning: "No timeline provided" };
  }
}

// --- Budget Clarity (10 pts) ---

const BUDGET_RANGE = { min: 400_000, max: 900_000 } as const;

/** Extract a dollar amount from free-text budget string */
export function parseBudgetAmount(budget: string): number | null {
  const match = budget.match(/\$?\s*([\d,.]+)\s*([kKmM])?/);
  if (!match) return null;

  let amount = parseFloat(match[1]!.replace(/,/g, ""));
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") amount *= 1_000;
  if (suffix === "m") amount *= 1_000_000;

  return Number.isFinite(amount) ? amount : null;
}

export function scoreBudget(lead: {
  budget?: string | null;
}): FactorBreakdown {
  if (!lead.budget) {
    return { score: 0, maxScore: 10, reasoning: "No budget provided" };
  }

  const amount = parseBudgetAmount(lead.budget);
  if (amount === null) {
    return { score: 2, maxScore: 10, reasoning: "Budget mentioned but unclear" };
  }
  if (amount >= BUDGET_RANGE.min && amount <= BUDGET_RANGE.max) {
    return { score: 10, maxScore: 10, reasoning: `Budget of ${lead.budget} aligns with Creation Homes range` };
  }
  return { score: 5, maxScore: 10, reasoning: `Budget of ${lead.budget} is outside Creation Homes range` };
}

// --- Property Type (10 pts) ---

const CLEAR_INTENT_TYPES = new Set(["first_home_buyer", "single_storey", "double_storey"]);
const GENERAL_INTENT_TYPES = new Set(["investment", "upsize", "downsize"]);

export function scorePropertyType(lead: {
  propertyType?: string | null;
}): FactorBreakdown {
  if (!lead.propertyType) {
    return { score: 0, maxScore: 10, reasoning: "No property type specified" };
  }
  if (CLEAR_INTENT_TYPES.has(lead.propertyType)) {
    return { score: 10, maxScore: 10, reasoning: `Clear intent: ${lead.propertyType.replace(/_/g, " ")}` };
  }
  if (GENERAL_INTENT_TYPES.has(lead.propertyType)) {
    return { score: 6, maxScore: 10, reasoning: `General intent: ${lead.propertyType}` };
  }
  return { score: 2, maxScore: 10, reasoning: "Unrecognised property type" };
}

// --- Engagement (5 pts) — hardcoded 0 until engagement data exists ---

export function scoreEngagement(): FactorBreakdown {
  return { score: 0, maxScore: 5, reasoning: "No engagement data available" };
}

// --- Gaps ---

const GAP_FIELDS: Array<{ field: string; key: string; weight: number; description: string }> = [
  { field: "land", key: "hasLand", weight: 30, description: "No land status provided" },
  { field: "finance", key: "seenBroker", weight: 25, description: "Finance status unknown" },
  { field: "timeline", key: "constructionTimeline", weight: 20, description: "No construction timeline" },
  { field: "budget", key: "budget", weight: 10, description: "No budget provided" },
  { field: "propertyType", key: "propertyType", weight: 10, description: "No property type specified" },
];

export function detectGaps(lead: Record<string, unknown>): Gap[] {
  return GAP_FIELDS.filter(({ key }) => lead[key] == null).map(({ field, weight, description }) => ({
    field,
    impact: weight >= 20 ? "high" : weight >= 10 ? "medium" : "low",
    description,
  }));
}

// --- Next Question ---

const NEXT_QUESTIONS: Record<string, string> = {
  land: "Do you have land picked out, or are you still exploring options?",
  finance: "Have you had a chance to chat with a broker or lender about finance?",
  timeline: "When are you ideally looking to start building?",
  budget: "Do you have a rough budget in mind for the build?",
  propertyType: "What type of home are you looking to build?",
};

const FALLBACK_QUESTION = "Is there anything else you'd like to know about the build process?";

export function pickNextQuestion(gaps: Gap[]): string {
  const highestGap = gaps[0]; // already sorted by weight (high → low)
  if (!highestGap) return FALLBACK_QUESTION;
  return NEXT_QUESTIONS[highestGap.field] ?? FALLBACK_QUESTION;
}
```

#### 2. Rewrite `qualifyAndScore()` as deterministic
**File**: `src/server/scoring/qualify-and-score.ts` (moved from `src/server/ai/scoring/`)
**Changes**: Replace Claude API call with calls to scoring functions

```typescript
import {
  detectGaps,
  pickNextQuestion,
  scoreBudget,
  scoreEngagement,
  scoreFinance,
  scoreLand,
  scorePropertyType,
  scoreTimeline,
} from "./score-factors";
import type { ScoreResult } from "./schema";

type LeadStage = "unqualified" | "nurture" | "warm" | "hot";

function deriveStage(score: number): LeadStage {
  if (score >= 76) return "hot";
  if (score >= 51) return "warm";
  if (score >= 26) return "nurture";
  return "unqualified";
}

export interface QualifyAndScoreResult {
  score: number;
  stage: LeadStage;
  breakdown: ScoreResult["breakdown"];
  gaps: ScoreResult["gaps"];
  nextQuestion: string;
}

interface LeadInput {
  firstName: string;
  lastName: string;
  hasLand?: boolean | null;
  landRegistered?: boolean | null;
  landAddress?: string | null;
  landSizeSqm?: string | null;
  landWidth?: string | null;
  landDepth?: string | null;
  seenBroker?: boolean | null;
  constructionTimeline?: string | null;
  budget?: string | null;
  propertyType?: string | null;
  preferredEstates?: string[] | null;
  preferredSuburbs?: string[] | null;
  notes?: string | null;
}

export function qualifyAndScore(lead: LeadInput): QualifyAndScoreResult {
  const breakdown = {
    land: scoreLand(lead),
    finance: scoreFinance(lead),
    timeline: scoreTimeline(lead),
    budget: scoreBudget(lead),
    propertyType: scorePropertyType(lead),
    engagement: scoreEngagement(),
  };

  const score = Object.values(breakdown).reduce((sum, f) => sum + f.score, 0);
  const gaps = detectGaps(lead);
  const nextQuestion = pickNextQuestion(gaps);

  return {
    score,
    stage: deriveStage(score),
    breakdown,
    gaps,
    nextQuestion,
  };
}
```

> Note: `qualifyAndScore` is now **synchronous**. The leads router calls it inside an `async` function (`scoreLeadAsync`) which is fine — a sync function can be called from async context.

#### 3. Move schema file (unchanged content)
**File**: `src/server/scoring/schema.ts` (moved from `src/server/ai/scoring/schema.ts`)
**Changes**: None — same Zod schema, same exports. Just new path.

#### 4. Update barrel export
**File**: `src/server/scoring/index.ts` (moved from `src/server/ai/scoring/index.ts`)

```typescript
export { qualifyAndScore, type QualifyAndScoreResult } from "./qualify-and-score";
export { type ScoreMetadata, type ScoreResult } from "./schema";
```

#### 5. Update import paths (3 files)
**File**: `src/server/api/routers/leads.ts`
**Changes**: Lines 4-5 — `~/server/ai/scoring` → `~/server/scoring`

**File**: `src/server/api/schemas/leads.ts`
**Changes**: Line 2 — `~/server/ai/scoring` → `~/server/scoring`

**File**: `src/server/db/schema/leads.ts`
**Changes**: Line 15 — `~/server/ai/scoring` → `~/server/scoring`

#### 6. Remove `notes` from SCORING_FIELDS
**File**: `src/server/api/routers/leads.ts`
**Changes**: Remove `"notes"` from the `SCORING_FIELDS` Set (line 67) — notes can't contribute to deterministic scoring

#### 7. Tests — deterministic scoring functions
**File**: `src/server/scoring/__tests__/score-factors.test.ts` (new)
**Purpose**: Direct input/output tests for each scoring function — no mocking needed

```typescript
import { describe, expect, test } from "@rstest/core";
import {
  detectGaps,
  parseBudgetAmount,
  pickNextQuestion,
  scoreBudget,
  scoreFinance,
  scoreLand,
  scorePropertyType,
  scoreTimeline,
} from "../score-factors";

describe("scoreLand", () => {
  test("registered land with dimensions → 30", () => {
    expect(scoreLand({ hasLand: true, landRegistered: true, landSizeSqm: "450" }).score).toBe(30);
  });
  test("registered land with width+depth → 30", () => {
    expect(scoreLand({ hasLand: true, landRegistered: true, landWidth: "15", landDepth: "30" }).score).toBe(30);
  });
  test("registered land without dimensions → 22", () => {
    expect(scoreLand({ hasLand: true, landRegistered: true }).score).toBe(22);
  });
  test("has land not registered → 15", () => {
    expect(scoreLand({ hasLand: true }).score).toBe(15);
  });
  test("searching specific estates → 15", () => {
    expect(scoreLand({ preferredEstates: ["Springfield Rise"] }).score).toBe(15);
  });
  test("exploring suburbs → 5", () => {
    expect(scoreLand({ preferredSuburbs: ["Springfield"] }).score).toBe(5);
  });
  test("no land info → 0", () => {
    expect(scoreLand({}).score).toBe(0);
  });
});

describe("scoreFinance", () => {
  test("seen broker → 15", () => {
    expect(scoreFinance({ seenBroker: true }).score).toBe(15);
  });
  test("not seen broker → 0", () => {
    expect(scoreFinance({ seenBroker: false }).score).toBe(0);
  });
  test("null → 0", () => {
    expect(scoreFinance({ seenBroker: null }).score).toBe(0);
  });
});

describe("scoreTimeline", () => {
  test("ready_now → 20", () => {
    expect(scoreTimeline({ constructionTimeline: "ready_now" }).score).toBe(20);
  });
  test("3_6_months → 12", () => {
    expect(scoreTimeline({ constructionTimeline: "3_6_months" }).score).toBe(12);
  });
  test("12_months_plus → 4", () => {
    expect(scoreTimeline({ constructionTimeline: "12_months_plus" }).score).toBe(4);
  });
  test("null → 0", () => {
    expect(scoreTimeline({}).score).toBe(0);
  });
});

describe("parseBudgetAmount", () => {
  test("$650,000 → 650000", () => {
    expect(parseBudgetAmount("$650,000")).toBe(650_000);
  });
  test("650k → 650000", () => {
    expect(parseBudgetAmount("650k")).toBe(650_000);
  });
  test("$700K → 700000", () => {
    expect(parseBudgetAmount("$700K")).toBe(700_000);
  });
  test("1.2M → 1200000", () => {
    expect(parseBudgetAmount("1.2M")).toBe(1_200_000);
  });
  test("not sure → null", () => {
    expect(parseBudgetAmount("not sure")).toBeNull();
  });
});

describe("scoreBudget", () => {
  test("$650K in range → 10", () => {
    expect(scoreBudget({ budget: "$650K" }).score).toBe(10);
  });
  test("$1.2M outside range → 5", () => {
    expect(scoreBudget({ budget: "$1.2M" }).score).toBe(5);
  });
  test("not sure → 2", () => {
    expect(scoreBudget({ budget: "not sure" }).score).toBe(2);
  });
  test("null → 0", () => {
    expect(scoreBudget({}).score).toBe(0);
  });
});

describe("scorePropertyType", () => {
  test("first_home_buyer → 10", () => {
    expect(scorePropertyType({ propertyType: "first_home_buyer" }).score).toBe(10);
  });
  test("single_storey → 10", () => {
    expect(scorePropertyType({ propertyType: "single_storey" }).score).toBe(10);
  });
  test("investment → 6", () => {
    expect(scorePropertyType({ propertyType: "investment" }).score).toBe(6);
  });
  test("null → 0", () => {
    expect(scorePropertyType({}).score).toBe(0);
  });
});

describe("detectGaps", () => {
  test("all fields null → 5 gaps", () => {
    expect(detectGaps({})).toHaveLength(5);
  });
  test("all fields present → 0 gaps", () => {
    const lead = { hasLand: true, seenBroker: true, constructionTimeline: "ready_now", budget: "$600K", propertyType: "first_home_buyer" };
    expect(detectGaps(lead)).toHaveLength(0);
  });
  test("gaps sorted by weight (high first)", () => {
    const gaps = detectGaps({});
    expect(gaps[0]!.impact).toBe("high");
    expect(gaps[0]!.field).toBe("land");
  });
});

describe("pickNextQuestion", () => {
  test("returns land question for highest-impact gap", () => {
    const gaps = detectGaps({});
    expect(pickNextQuestion(gaps)).toContain("land");
  });
  test("returns fallback when no gaps", () => {
    expect(pickNextQuestion([])).toContain("anything else");
  });
});
```

#### 8. Tests — rewrite qualify-and-score tests (no API mocking)
**File**: `src/server/scoring/__tests__/qualify-and-score.test.ts` (moved + rewritten)

```typescript
import { describe, expect, test } from "@rstest/core";
import { qualifyAndScore } from "../qualify-and-score";

describe("qualifyAndScore", () => {
  test("empty lead scores 0 / unqualified", () => {
    const result = qualifyAndScore({ firstName: "Test", lastName: "User" });
    expect(result.score).toBe(0);
    expect(result.stage).toBe("unqualified");
    expect(result.gaps).toHaveLength(5);
  });

  test("fully qualified lead scores high", () => {
    const result = qualifyAndScore({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: true,
      landRegistered: true,
      landSizeSqm: "450",
      seenBroker: true,
      constructionTimeline: "ready_now",
      budget: "$650,000",
      propertyType: "first_home_buyer",
    });
    // 30 + 15 + 20 + 10 + 10 + 0 = 85
    expect(result.score).toBe(85);
    expect(result.stage).toBe("hot");
    expect(result.gaps).toHaveLength(0);
  });

  test("partial lead scores as nurture", () => {
    const result = qualifyAndScore({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: false,
      preferredEstates: ["Springfield Rise"],
      seenBroker: true,
      constructionTimeline: "3_6_months",
    });
    // 15 + 15 + 12 + 0 + 0 + 0 = 42
    expect(result.score).toBe(42);
    expect(result.stage).toBe("nurture");
  });

  test("score equals sum of breakdown factors", () => {
    const result = qualifyAndScore({
      firstName: "Test",
      lastName: "User",
      hasLand: true,
      budget: "$500K",
    });
    const sum = Object.values(result.breakdown).reduce((s, f) => s + f.score, 0);
    expect(result.score).toBe(sum);
  });
});

describe("deriveStage (via qualifyAndScore)", () => {
  // Stage thresholds: 0-25 unqualified, 26-50 nurture, 51-75 warm, 76-100 hot
  test("score 0 → unqualified", () => {
    const { stage } = qualifyAndScore({ firstName: "T", lastName: "U" });
    expect(stage).toBe("unqualified");
  });
});
```

#### 9. Tests — keep schema.test.ts (move path only)
**File**: `src/server/scoring/__tests__/schema.test.ts` (moved from `src/server/ai/scoring/__tests__/`)
**Changes**: Update import path from `../schema` (still works since it's relative)

#### 10. Update router test mock path
**File**: `src/server/api/__tests__/leads-router.test.ts`
**Changes**: Line 75 — mock path `~/server/ai/scoring` → `~/server/scoring`. Line 353 — import path same change.

Also remove `ANTHROPIC_API_KEY` from the env mock at line 44 (no longer needed).

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (types + lint)
- [x] `make test` passes (all scoring + router tests green)

#### Manual Verification:
- [ ] Create a lead with name + phone only → scores 0, stage "unqualified", 5 gaps
- [ ] Create a fully qualified lead → scores 85 (30+15+20+10+10+0), stage "hot", 0 gaps
- [ ] Scoring is instant (no network latency — deterministic function)

> **E2E coverage:** Add Playwright tests for these when the score display UI lands (no UI to assert against yet — pipeline page is a stub, no lead detail page).

---

## Phase 2: Remove AI Dependencies

### Overview
Delete all Anthropic-specific code and dependencies. After this phase, `@anthropic-ai/sdk` and `ANTHROPIC_API_KEY` are gone from the project.

### Changes Required:

#### 1. Delete AI-specific files
- Delete `src/server/ai/client.ts` (Anthropic SDK client)
- Delete `src/server/ai/scoring/prompt.ts` (system prompt + formatLeadForScoring)
- Delete `src/server/ai/scoring/qualify-and-score.ts` (old AI-based implementation)
- Delete `src/server/ai/scoring/schema.ts` (moved to new location in Phase 1)
- Delete `src/server/ai/scoring/index.ts` (moved to new location in Phase 1)
- Delete `src/server/ai/scoring/__tests__/` (moved to new location in Phase 1)
- Delete `src/server/ai/index.ts` (barrel export)
- Delete `src/server/ai/` directory entirely

#### 2. Remove `ANTHROPIC_API_KEY` from environment
**File**: `src/env.js`
**Changes**: Remove line 11 (`ANTHROPIC_API_KEY: z.string().min(1)`) and line 50 (`ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY`)

#### 3. Remove Anthropic SDK
```bash
yarn remove @anthropic-ai/sdk
```

#### 4. Clean up `.env` / `.env.local`
Remove `ANTHROPIC_API_KEY=...` line from local env files.

#### 5. Clean up Vercel environment variables
Remove `ANTHROPIC_API_KEY` from Vercel project settings (production, preview, development).

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes — no import errors, no missing env vars
- [x] `make test` passes — no references to deleted modules
- [x] `grep -r "anthropic\|ANTHROPIC" src/` returns zero results (only marketing copy/logo refs remain)
- [x] `@anthropic-ai/sdk` not in `package.json`

#### Manual Verification:
- [ ] `ANTHROPIC_API_KEY` removed from Vercel project settings
- [x] Local `.env` file has no `ANTHROPIC_API_KEY`
- [ ] App starts with `make start` — no env validation errors

---

## Known Limitation: Finance Score Capped at 15/25

The scoring rubric defines 4 finance tiers:
| Tier | Points |
|------|--------|
| Pre-approved with broker/lender | 25 |
| Seen a broker but not yet approved | 15 |
| Planning to see a broker | 8 |
| Haven't thought about it | 0 |

But `seenBroker` is a simple boolean — we can only distinguish "yes" (→ 15) from "no/null" (→ 0). A fully qualified lead maxes out at 85/100 instead of 95/100 (before engagement).

**Future fix:** Change `seenBroker` from boolean to an enum (`pre_approved`, `seen_not_approved`, `planning`, `not_started`). This is a separate ticket — requires a DB migration, form update, and scoring update.

---

## References

- Original ticket: GitHub issue #99
- Decision comment: GitHub issue #99 comment (2026-04-09)
- Parent epic: GitHub issue #86
- Leads router: `src/server/api/routers/leads.ts`
- Leads schema: `src/server/db/schema/leads.ts`
- Lead validation schemas: `src/server/api/schemas/leads.ts`
- Enum definitions: `src/server/db/schema/enums.ts`
- HubSpot property map: `src/server/hubspot/properties.ts`
