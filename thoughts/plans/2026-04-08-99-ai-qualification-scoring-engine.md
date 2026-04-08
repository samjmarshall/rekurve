# AI Qualification & Scoring Engine Implementation Plan

## Overview

Implement `qualifyAndScore()` — a Claude API-powered function that scores leads 0-100 with weighted factors, detects qualification gaps, and suggests the next question to ask. Runs automatically on lead create and update, storing structured results on the lead record. Syncs score and stage to HubSpot.

## Current State Analysis

- **Schema ready** — `leads` table has `leadScore` (integer) and `leadStage` (enum: unqualified/nurture/warm/hot) columns (`src/server/db/schema/leads.ts:50-51`)
- **No score metadata** — breakdown, gaps, and nextQuestion have nowhere to live yet
- **AI router is a stub** — `src/server/api/routers/ai.ts` only has `healthCheck`
- **Leads router hardcodes initial values** — `create` sets `leadStage: "unqualified"` and `leadScore: 0` with no post-save scoring (`src/server/api/routers/leads.ts:20-21`)
- **No Anthropic SDK** — not in `package.json`
- **No `ANTHROPIC_API_KEY`** — not in `src/env.js`
- **HubSpot property map** — doesn't include `leadScore` or `leadStage` (`src/server/hubspot/properties.ts`)

### Key Discoveries:
- Existing test pattern uses rstest with `rs.doMock`/`rs.fn()` for unit tests (`src/server/api/__tests__/leads-router.test.ts`)
- tRPC procedures access DB via `ctx.db`, auth via `ctx.session` (`src/server/api/trpc.ts:55-66`)
- HubSpot sync uses a bidirectional property map pattern (`src/server/hubspot/properties.ts`)
- Anthropic SDK supports structured output via `zodOutputFormat` + `client.messages.parse()` — returns typed `parsed_output` with no manual JSON parsing

## Desired End State

After this plan is complete:

1. Every lead create and update triggers an async AI scoring call
2. The lead record is updated with `leadScore`, `leadStage`, a full `scoreBreakdown` (per-factor scores with reasoning), qualification `gaps`, and a `nextQuestion`
3. Score and stage are synced to HubSpot custom properties
4. If the Claude API fails, the lead saves successfully with `null` score — no user-facing error
5. A quick-capture lead (name + phone only) scores as unqualified with gaps for all missing fields

### Verification:
- `make check` passes (types + lint)
- `make test` passes (unit tests cover scoring logic, router integration, graceful degradation)
- Manual: create a lead via the form, confirm score/stage/breakdown appear within 5 seconds

## What We're NOT Doing

- **Score history tracking** — we store only the latest score result, not a log of past scores
- **UI changes** — displaying the score breakdown, gaps, or nextQuestion in the frontend is a separate ticket
- **Retry/queue for failed scoring** — the issue mentions "retry later" but we'll defer a background retry mechanism; a page refresh or lead update will re-trigger scoring
- **Engagement factor scoring** — the 5pt engagement factor ("Responsive, asks questions" vs "New lead, no interaction") requires conversation history that doesn't exist yet; we'll hardcode it as 0 for now and document the gap

## Implementation Approach

Four phases, each independently testable:

1. **Foundation** — SDK, env var, DB migration, HubSpot property map
2. **Scoring Engine** — `qualifyAndScore()` function with Claude structured output
3. **Integration** — Wire into leads router with async fire-and-forget
4. **Tests** — Unit tests for scoring, router tests for integration, mock Claude API

---

## Phase 1: Foundation

### Overview
Install dependencies, add environment configuration, add a jsonb column to the leads table for score metadata, and extend the HubSpot property map.

### Changes Required:

#### 1. Install Anthropic SDK
```bash
yarn add @anthropic-ai/sdk
```

#### 2. Add `ANTHROPIC_API_KEY` to environment schema
**File**: `src/env.js`
**Changes**: Add `ANTHROPIC_API_KEY` to `server` schema and `runtimeEnv`

```typescript
// In server:
ANTHROPIC_API_KEY: z.string().min(1),

// In runtimeEnv:
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
```

#### 3. Database migration — add `score_metadata` jsonb column
**File**: New migration via `drizzle-kit generate`
**Changes**: Add a `score_metadata` jsonb column to the `leads` table

**File**: `src/server/db/schema/leads.ts`
**Changes**: Add `scoreMetadata` column

```typescript
import { jsonb } from "drizzle-orm/pg-core";

// Inside the leads table definition, after leadStage:
scoreMetadata: jsonb("score_metadata").$type<ScoreMetadata | null>(),
```

The `ScoreMetadata` type will be defined in the scoring module and imported here. Shape:

```typescript
interface ScoreMetadata {
  breakdown: {
    land: { score: number; maxScore: 30; reasoning: string };
    finance: { score: number; maxScore: 25; reasoning: string };
    timeline: { score: number; maxScore: 20; reasoning: string };
    budget: { score: number; maxScore: 10; reasoning: string };
    propertyType: { score: number; maxScore: 10; reasoning: string };
    engagement: { score: number; maxScore: 5; reasoning: string };
  };
  gaps: Array<{
    field: string;
    impact: "high" | "medium" | "low";
    description: string;
  }>;
  nextQuestion: string;
  scoredAt: string; // ISO timestamp
}
```

#### 4. Extend HubSpot property map
**File**: `src/server/hubspot/properties.ts`
**Changes**: Add `leadScore` and `leadStage` to `PROPERTY_MAP`

```typescript
// Add to PROPERTY_MAP:
leadScore: "lead_score",
leadStage: "lead_stage",
```

> Note: These custom properties (`lead_score` as number, `lead_stage` as enumeration) must be created in the HubSpot account. This is a one-time manual setup — document in the PR description.

#### 5. Tests
**File**: `src/server/hubspot/__tests__/properties.test.ts`
**Tests**: Verify `leadScore` and `leadStage` round-trip through `toHubSpotProperties`/`fromHubSpotProperties`

```typescript
test("maps leadScore and leadStage to HubSpot properties", () => {
  const result = toHubSpotProperties({ leadScore: "85", leadStage: "hot" });
  expect(result).toEqual({ lead_score: "85", lead_stage: "hot" });
});

test("maps HubSpot lead_score and lead_stage back to app fields", () => {
  const result = fromHubSpotProperties({ lead_score: "85", lead_stage: "hot" });
  expect(result).toEqual({ leadScore: "85", leadStage: "hot" });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn add @anthropic-ai/sdk` completes without errors
- [x] `make check` passes with new env var and schema column
- [x] `make test` passes including new HubSpot property map tests
- [x] Migration generates and applies: `yarn drizzle-kit generate` + `yarn drizzle-kit push`

#### Manual Verification:
- [ ] `ANTHROPIC_API_KEY` is set in `.env.local`
- [ ] `score_metadata` column exists in the `leads` table (check via Neon console)
- [ ] `lead_score` and `lead_stage` custom properties created in HubSpot account

---

## Phase 2: Scoring Engine

### Overview
Build the core `qualifyAndScore()` function as a standalone module. Uses Claude Haiku 4.5 with structured output to produce scores, breakdowns, gaps, and next questions.

### Changes Required:

#### 1. Anthropic client singleton
**File**: `src/server/ai/client.ts` (new)
**Changes**: Create and export a singleton Anthropic client

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
```

#### 2. Score result Zod schema and types
**File**: `src/server/ai/scoring/schema.ts` (new)
**Changes**: Define the Zod schema for Claude's structured output and export types

```typescript
import { z } from "zod";

const factorBreakdownSchema = z.object({
  score: z.number().int().min(0),
  maxScore: z.number().int(),
  reasoning: z.string(),
});

export const scoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    land: factorBreakdownSchema,
    finance: factorBreakdownSchema,
    timeline: factorBreakdownSchema,
    budget: factorBreakdownSchema,
    propertyType: factorBreakdownSchema,
    engagement: factorBreakdownSchema,
  }),
  gaps: z.array(
    z.object({
      field: z.string(),
      impact: z.enum(["high", "medium", "low"]),
      description: z.string(),
    }),
  ),
  nextQuestion: z.string(),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

export type ScoreMetadata = ScoreResult & { scoredAt: string };
```

#### 3. Scoring prompt
**File**: `src/server/ai/scoring/prompt.ts` (new)
**Changes**: Build the system prompt with the full scoring rubric and a function to format lead data into the user message

```typescript
export const SCORING_SYSTEM_PROMPT = `You are a lead qualification scoring engine for a new home sales consultant at Creation Homes QLD.

Score the lead from 0-100 using these exact weights:

## Scoring Weights (total: 100 points)

### Land Status (30 points)
- Registered land with dimensions known → 30
- Land under contract / settling soon → 22
- Actively searching specific estates → 15
- "Looking at land eventually" → 5
- No land, no preferences → 0
- Field not provided → 0

### Finance Status (25 points)
- Pre-approved with broker/lender → 25
- Seen a broker but not yet approved → 15
- Planning to see a broker → 8
- Haven't thought about it → 0
- Field not provided → 0

### Timeline (20 points)
- Ready Now → 20
- 3-6 months → 12
- 12+ months → 4
- Field not provided → 0

### Budget Clarity (10 points)
- Specific figure that aligns with Creation Homes range ($400K-$900K build) → 10
- Specific figure outside range → 5
- Vague / "not sure" → 2
- Field not provided → 0

### Property Type (10 points)
- First Home Buyer (FHOG eligible) or clear specific intent → 10
- General intent (e.g. "investment") → 6
- Vague / "just looking" → 2
- Field not provided → 0

### Engagement (5 points)
- This factor is based on interaction history. If no engagement data is provided, score as 0.

## Rules
- The total score MUST equal the sum of all six factor scores
- Each factor score must not exceed its maxScore
- For every qualification field that is missing or null, add it to the gaps list
- Rank gaps by impact: "high" if the factor weight ≥ 20, "medium" if ≥ 10, "low" otherwise
- The nextQuestion should be a natural, conversational question targeting the highest-impact gap
- Keep reasoning concise (1 sentence per factor)`;

export function formatLeadForScoring(lead: {
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
}): string {
  return JSON.stringify({
    name: `${lead.firstName} ${lead.lastName}`,
    land: {
      hasLand: lead.hasLand,
      registered: lead.landRegistered,
      address: lead.landAddress,
      sizeSqm: lead.landSizeSqm,
      width: lead.landWidth,
      depth: lead.landDepth,
    },
    finance: {
      seenBroker: lead.seenBroker,
    },
    timeline: lead.constructionTimeline,
    budget: lead.budget,
    propertyType: lead.propertyType,
    preferences: {
      estates: lead.preferredEstates,
      suburbs: lead.preferredSuburbs,
    },
    notes: lead.notes,
  });
}
```

#### 4. `qualifyAndScore()` function
**File**: `src/server/ai/scoring/qualify-and-score.ts` (new)
**Changes**: Core scoring function

```typescript
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../client";
import { formatLeadForScoring, SCORING_SYSTEM_PROMPT } from "./prompt";
import { scoreResultSchema, type ScoreResult } from "./schema";

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

export async function qualifyAndScore(
  lead: Parameters<typeof formatLeadForScoring>[0],
): Promise<QualifyAndScoreResult> {
  const response = await anthropic.messages.parse({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SCORING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Score this lead:\n${formatLeadForScoring(lead)}`,
      },
    ],
    output_config: { format: zodOutputFormat(scoreResultSchema) },
  });

  const result = response.parsed_output;

  return {
    score: result.score,
    stage: deriveStage(result.score),
    breakdown: result.breakdown,
    gaps: result.gaps,
    nextQuestion: result.nextQuestion,
  };
}
```

#### 5. Barrel export
**File**: `src/server/ai/scoring/index.ts` (new)

```typescript
export { qualifyAndScore, type QualifyAndScoreResult } from "./qualify-and-score";
export { type ScoreMetadata, type ScoreResult } from "./schema";
```

**File**: `src/server/ai/index.ts` (new)

```typescript
export { qualifyAndScore } from "./scoring";
```

#### 6. Tests — scoring schema validation
**File**: `src/server/ai/scoring/__tests__/schema.test.ts` (new)
**Tests**: Validate the Zod schema accepts valid results and rejects invalid ones

```typescript
import { describe, expect, test } from "@rstest/core";
import { scoreResultSchema } from "../schema";

const validResult = {
  score: 62,
  breakdown: {
    land: { score: 22, maxScore: 30, reasoning: "Land under contract" },
    finance: { score: 15, maxScore: 25, reasoning: "Seen broker, not approved" },
    timeline: { score: 12, maxScore: 20, reasoning: "3-6 months" },
    budget: { score: 5, maxScore: 10, reasoning: "Vague budget" },
    propertyType: { score: 8, maxScore: 10, reasoning: "First home buyer" },
    engagement: { score: 0, maxScore: 5, reasoning: "New lead" },
  },
  gaps: [
    { field: "finance", impact: "high" as const, description: "Not yet pre-approved" },
  ],
  nextQuestion: "Have you had a chance to get pre-approval from your broker yet?",
};

describe("scoreResultSchema", () => {
  test("accepts a valid score result", () => {
    const result = scoreResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  test("rejects score above 100", () => {
    const result = scoreResultSchema.safeParse({ ...validResult, score: 101 });
    expect(result.success).toBe(false);
  });

  test("rejects score below 0", () => {
    const result = scoreResultSchema.safeParse({ ...validResult, score: -1 });
    expect(result.success).toBe(false);
  });

  test("rejects invalid gap impact", () => {
    const result = scoreResultSchema.safeParse({
      ...validResult,
      gaps: [{ field: "land", impact: "critical", description: "No land" }],
    });
    expect(result.success).toBe(false);
  });
});
```

#### 7. Tests — deriveStage and formatLeadForScoring
**File**: `src/server/ai/scoring/__tests__/qualify-and-score.test.ts` (new)
**Tests**: Unit test the pure functions (deriveStage, formatLeadForScoring) and mock the Claude API call

```typescript
import { beforeEach, describe, expect, rs, test } from "@rstest/core";

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: { ANTHROPIC_API_KEY: "test-key" },
  }));
});

describe("deriveStage", () => {
  test.each([
    [0, "unqualified"],
    [25, "unqualified"],
    [26, "nurture"],
    [50, "nurture"],
    [51, "warm"],
    [75, "warm"],
    [76, "hot"],
    [100, "hot"],
  ])("score %d → stage %s", async (score, expectedStage) => {
    // deriveStage is not exported, so we test it indirectly through qualifyAndScore
    // by mocking the Claude API to return the given score
    const mockResult = {
      score,
      breakdown: {
        land: { score: 0, maxScore: 30, reasoning: "test" },
        finance: { score: 0, maxScore: 25, reasoning: "test" },
        timeline: { score: 0, maxScore: 20, reasoning: "test" },
        budget: { score: 0, maxScore: 10, reasoning: "test" },
        propertyType: { score: 0, maxScore: 10, reasoning: "test" },
        engagement: { score: 0, maxScore: 5, reasoning: "test" },
      },
      gaps: [],
      nextQuestion: "test question",
    };

    rs.doMock("../client", () => ({
      anthropic: {
        messages: {
          parse: rs.fn().mockResolvedValue({ parsed_output: mockResult }),
        },
      },
    }));

    const { qualifyAndScore } = await import("../qualify-and-score");
    const result = await qualifyAndScore({ firstName: "Test", lastName: "User" });

    expect(result.stage).toBe(expectedStage);
  });
});

describe("qualifyAndScore", () => {
  test("returns structured result from Claude API", async () => {
    const mockResult = {
      score: 45,
      breakdown: {
        land: { score: 15, maxScore: 30, reasoning: "Searching estates" },
        finance: { score: 15, maxScore: 25, reasoning: "Seen broker" },
        timeline: { score: 12, maxScore: 20, reasoning: "3-6 months" },
        budget: { score: 0, maxScore: 10, reasoning: "No budget given" },
        propertyType: { score: 3, maxScore: 10, reasoning: "Vague intent" },
        engagement: { score: 0, maxScore: 5, reasoning: "New lead" },
      },
      gaps: [
        { field: "budget", impact: "medium" as const, description: "No budget provided" },
      ],
      nextQuestion: "Do you have a rough budget in mind for the build?",
    };

    rs.doMock("../client", () => ({
      anthropic: {
        messages: {
          parse: rs.fn().mockResolvedValue({ parsed_output: mockResult }),
        },
      },
    }));

    const { qualifyAndScore } = await import("../qualify-and-score");
    const result = await qualifyAndScore({
      firstName: "Jane",
      lastName: "Doe",
      hasLand: false,
      seenBroker: true,
      constructionTimeline: "3_6_months",
    });

    expect(result.score).toBe(45);
    expect(result.stage).toBe("nurture");
    expect(result.breakdown.land.score).toBe(15);
    expect(result.gaps).toHaveLength(1);
    expect(result.nextQuestion).toContain("budget");
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes with all new files
- [x] `make test` passes — schema validation and scoring function tests green

#### Manual Verification:
- [ ] (Deferred to Phase 3 — scoring not wired into the app yet)

---

## Phase 3: Integration

### Overview
Wire `qualifyAndScore()` into the leads router so it fires asynchronously on create and update. Graceful degradation if the Claude API fails.

### Changes Required:

#### 1. Async scoring helper
**File**: `src/server/api/routers/leads.ts`
**Changes**: Add a helper that calls `qualifyAndScore()`, updates the lead record, and syncs to HubSpot. Catches all errors so it never blocks the mutation.

```typescript
import { qualifyAndScore } from "~/server/ai/scoring";
import type { ScoreMetadata } from "~/server/ai/scoring";
import { updateContact } from "~/server/hubspot/contacts";

/** Fire-and-forget scoring — errors are logged, never thrown. */
async function scoreLeadAsync(
  db: typeof import("~/server/db").db,
  leadId: string,
  lead: Parameters<typeof qualifyAndScore>[0],
  hubspotContactId: string | null,
): Promise<void> {
  try {
    const result = await qualifyAndScore(lead);

    const metadata: ScoreMetadata = {
      ...result,
      scoredAt: new Date().toISOString(),
    };

    await db
      .update(leads)
      .set({
        leadScore: result.score,
        leadStage: result.stage,
        scoreMetadata: metadata,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    // Sync to HubSpot if contact is linked
    if (hubspotContactId) {
      await updateContact(hubspotContactId, {
        leadScore: String(result.score),
        leadStage: result.stage,
      }).catch((err) => {
        console.error(`[scoring] HubSpot sync failed for lead ${leadId}:`, err);
      });
    }
  } catch (err) {
    console.error(`[scoring] Failed to score lead ${leadId}:`, err);
  }
}
```

#### 2. Wire into `create` mutation
**File**: `src/server/api/routers/leads.ts`
**Changes**: After the lead is inserted and returned, fire scoring asynchronously (don't await in the response path)

```typescript
create: protectedProcedure
  .input(leadCreateSchema)
  .mutation(async ({ ctx, input }) => {
    const [lead] = await ctx.db
      .insert(leads)
      .values({
        ...input,
        leadStage: "unqualified",
        leadScore: 0,
      })
      .returning();

    // Fire-and-forget — don't block the response
    void scoreLeadAsync(ctx.db, lead!.id, lead!, lead!.hubspotContactId);

    return lead!;
  }),
```

#### 3. Wire into `update` mutation
**File**: `src/server/api/routers/leads.ts`
**Changes**: After a successful update, re-score if any qualification field changed

```typescript
// Qualification fields that trigger re-scoring
const SCORING_FIELDS = new Set([
  "hasLand", "landRegistered", "landAddress", "landSizeSqm",
  "landWidth", "landDepth", "seenBroker", "constructionTimeline",
  "budget", "propertyType", "preferredEstates", "preferredSuburbs", "notes",
]);

update: protectedProcedure
  .input(leadUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const [updated] = await ctx.db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    }

    // Re-score if qualification fields changed
    const hasQualificationChange = Object.keys(data).some((k) =>
      SCORING_FIELDS.has(k),
    );
    if (hasQualificationChange) {
      void scoreLeadAsync(ctx.db, updated.id, updated, updated.hubspotContactId);
    }

    return updated;
  }),
```

#### 4. Tests — router integration with scoring
**File**: `src/server/api/__tests__/leads-router.test.ts`
**Tests**: Add tests verifying scoring is triggered on create/update and that mutations succeed even when scoring fails

```typescript
// Add to existing beforeEach — mock the scoring module
rs.doMock("~/server/ai/scoring", () => ({
  qualifyAndScore: rs.fn().mockResolvedValue({
    score: 45,
    stage: "nurture",
    breakdown: { /* ... */ },
    gaps: [],
    nextQuestion: "test",
  }),
}));

rs.doMock("~/server/hubspot/contacts", () => ({
  updateContact: rs.fn().mockResolvedValue({}),
}));

// New test:
describe("leads.create — scoring integration", () => {
  test("returns lead immediately without waiting for scoring", async () => {
    // Set up a scoring mock that takes a long time
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10_000)),
    );

    const returning = rs.fn().mockResolvedValue([mockLead]);
    const values = rs.fn().mockReturnValue({ returning });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
    });

    // Should return immediately, not wait for scoring
    expect(result.firstName).toBe("John");
  });

  test("create succeeds even when scoring throws", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    (qualifyAndScore as ReturnType<typeof rs.fn>).mockRejectedValue(
      new Error("API down"),
    );

    const returning = rs.fn().mockResolvedValue([mockLead]);
    const values = rs.fn().mockReturnValue({ returning });
    (mockDb.insert as ReturnType<typeof rs.fn>).mockReturnValue({ values });

    const caller = await getCaller();
    const result = await caller.leads.create({
      firstName: "John",
      lastName: "Smith",
    });

    expect(result.firstName).toBe("John");
    expect(result.leadScore).toBe(0);
  });
});

describe("leads.update — scoring integration", () => {
  test("triggers re-scoring when qualification fields change", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    const updatedLead = { ...mockLead, budget: "$700K" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, budget: "$700K" });

    // qualifyAndScore should have been called (async)
    // Give the microtask queue a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(qualifyAndScore).toHaveBeenCalled();
  });

  test("does not re-score when only non-qualification fields change", async () => {
    const { qualifyAndScore } = await import("~/server/ai/scoring");
    const updatedLead = { ...mockLead, referrerName: "Bob" };
    const returning = rs.fn().mockResolvedValue([updatedLead]);
    const where = rs.fn().mockReturnValue({ returning });
    const set = rs.fn().mockReturnValue({ where });
    (mockDb.update as ReturnType<typeof rs.fn>).mockReturnValue({ set });

    const caller = await getCaller();
    await caller.leads.update({ id: mockLead.id, referrerName: "Bob" });

    await new Promise((r) => setTimeout(r, 0));
    expect(qualifyAndScore).not.toHaveBeenCalled();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `make test` passes — all existing tests still green, new integration tests pass

#### Manual Verification:
- [ ] Create a lead via the full enquiry form — within 5 seconds, refreshing the pipeline page shows the lead with a non-zero score and correct stage
- [ ] Create a quick-capture lead (name + phone only) — scores as unqualified (0-25)
- [ ] Update a lead's land status from "no land" to "has land, registered" — score increases on refresh
- [ ] Stop the dev server's internet connection, create a lead — lead saves successfully with score 0

---

## Phase 4: `scoreMetadata` in update schema + cleanup

### Overview
Expose `scoreMetadata` in the lead update schema (so it can be set by the scoring function), add the column to the lead type exports, and ensure everything is wired end-to-end.

### Changes Required:

#### 1. Update lead validation schema
**File**: `src/server/api/schemas/leads.ts`
**Changes**: Add `scoreMetadata` to `leadUpdateSchema` so the scoring function can write it

```typescript
import { type ScoreMetadata } from "~/server/ai/scoring";

// Add to leadUpdateSchema:
scoreMetadata: z.custom<ScoreMetadata>().nullish(),
```

> Note: We use `z.custom` here because the scoring function writes the full object — it doesn't need input validation since it's only written server-side, never from user input. The `scoreMetadata` field should NOT be added to `leadCreateSchema` or exposed in any client-facing input.

#### 2. Barrel export for scoring types
**File**: `src/server/db/schema/leads.ts`
**Changes**: Import `ScoreMetadata` type from the scoring module for the `$type` generic on the jsonb column (done in Phase 1, but verifying the import chain works)

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `make test` passes

#### Manual Verification:
- [ ] After scoring completes, `scoreMetadata` is populated in the database (verify via Neon console: `SELECT id, lead_score, lead_stage, score_metadata FROM leads LIMIT 5`)

---

## Performance Considerations

- **Claude Haiku 4.5** is used for speed and cost — ~200ms-1s response time, ~$0.001 per scoring call
- **Fire-and-forget** pattern means the form submission is never blocked by AI latency
- **No retry loop** — a failed score stays as `null`/`0` until the next create or update trigger
- **Single API call per scoring** — no chaining or multi-turn conversation needed

## Migration Notes

- The `score_metadata` jsonb column is nullable with no default — existing leads retain `null` until they are next updated or manually re-scored
- No data migration needed — existing `leadScore: 0` and `leadStage: "unqualified"` values are correct for unscored leads
- HubSpot custom properties (`lead_score`, `lead_stage`) must be created manually in the HubSpot account before sync works

## References

- Original ticket: GitHub issue #99
- Parent epic: GitHub issue #86 (Lead Management + AI Qualification Scoring)
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md` (AI Qualification & Scoring section)
- Leads router: `src/server/api/routers/leads.ts`
- Leads schema: `src/server/db/schema/leads.ts`
- HubSpot property map: `src/server/hubspot/properties.ts`
- Anthropic SDK structured output: `zodOutputFormat` + `client.messages.parse()`
