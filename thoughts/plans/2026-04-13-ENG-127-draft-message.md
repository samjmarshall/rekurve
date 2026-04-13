# AI Message Drafting Function (`draftMessage`) Implementation Plan

## Overview

Build `draftMessage(lead)` — a Claude-powered server-side helper at `src/server/ai/draft-message.ts` that generates contextual SMS/email follow-up drafts for a lead. Returns rows ready to insert into `message_queue`. Callers: nurture scheduler (#132) and lead create/update flows. Not exposed as a public tRPC procedure.

## Current State Analysis

- Scoring module (`src/server/scoring/`) is the template — `index.ts` re-exports, `schema.ts` holds types, single entry-point file, pure-helper files, `__tests__/` uses `@rstest/core`.
- `aiRouter` at `src/server/api/routers/ai.ts:3-7` is a stub with `healthCheck` only. **Will stay a stub** for this ticket — no tRPC exposure.
- `messagesRouter` is fully fleshed out after #126/#143 — `loadActionable()`, `listPending`, `approve`, `editAndApprove`, `snooze`, `dismiss` (`src/server/api/routers/messages.ts:37-105`).
- `ScoreMetadata = ScoreResult & { scoredAt: string }` (`src/server/scoring/schema.ts:31`) with `score`, six-factor `breakdown`, `gaps[]` (field/impact/description), `nextQuestion`.
- Lead schema (`src/server/db/schema/leads.ts:24-83`) — `leadStage` enum (unqualified/nurture/warm/hot), `scoreMetadata` (nullable jsonb), `lastContactedAt` (nullable), `firstName`, `lastName`, `email` (nullable), `phone` (nullable), `preferredEstates[]`, `preferredSuburbs[]`, `notes`.
- `message_queue` (`src/server/db/schema/message-queue.ts:13-37`) — `channel` ("sms"/"email"), `subject` (nullable), `body` (notNull), `aiReasoning` (nullable), `priority` (int).
- **No Anthropic SDK installed**, **no `ANTHROPIC_API_KEY`** in `src/env.js` — must add both.
- Test pattern for server modules: `rs.doMock("~/env", ...)`, dynamic import of module under test (`src/server/api/__tests__/messages-router.test.ts:28-64`).

## Desired End State

After this plan lands:
- `src/server/ai/` directory mirrors `src/server/scoring/` — `index.ts`, `schema.ts`, `draft-message.ts`, pure helper files, `__tests__/`.
- `draftMessage(input)` returns `{ channel, subject, body, aiReasoning, priority }` typed object; signature exactly as specified in the ticket.
- Priority bases match the ticket (hot 80 / warm 50 / nurture 25 / unqualified 10) with +10 overdue bump.
- Channel selection: email for hot stage *if* `email` non-null; otherwise SMS (requires `phone`); throws when neither contact method is available.
- Claude is called via the modern SDK `messages.parse()` + `zodOutputFormat()` helper (Zod-typed forced tool use — satisfies the ticket's tool-use intent with stronger typing).
- System prompt is cached via `cache_control: { type: "ephemeral" }` to amortize token cost across nurture-scheduler bulk invocations.
- Claude API failures propagate as thrown errors. Missing `scoreMetadata` still calls Claude but with a stripped-down user prompt.
- Unit tests cover channel selection, priority math, overdue detection, and the draft-message orchestration flow with Anthropic client mocked.
- Manual smoke test script lets the operator run `draftMessage` against a seeded dev DB lead and inspect output.

### Key Discoveries

- **Scoring module layout** to mirror: `src/server/scoring/index.ts:1-5`, `src/server/scoring/qualify-and-score.ts:48-69`.
- **Anthropic modern helpers**: `messages.parse()` with `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod` is the recommended structured-output API. Internally equivalent to forced tool use; returns `message.parsed_output` typed against the Zod schema.
- **Prompt caching**: pass `system` as an array of content blocks with `cache_control: { type: "ephemeral" }` on the block you want cached.
- **Test pattern**: `rs.resetModules()` + `rs.doMock("~/env", ...)` + `rs.doMock("@anthropic-ai/sdk", ...)` followed by dynamic `await import("../draft-message")`.

## What We're NOT Doing

- **Not** exposing `draftMessage` as a tRPC procedure. Callers import directly from `~/server/ai`.
- **Not** inserting into `message_queue` here. The caller (nurture scheduler #132 or lead flows) is responsible for the DB write.
- **Not** sending SMS/email — that's #129/#130.
- **Not** implementing the nurture cadence scheduler — that's #132. We only need the overdue-check helper, not a scheduled job.
- **Not** multi-tenant prompt templating — Creation Homes QLD specifics are hardcoded for MVP (confirmed with user; tone-of-voice tuning is a later ticket).
- **Not** logging prompt/response telemetry to PostHog in this ticket — comes with #132 observability work.
- **Not** adding retry/backoff on Anthropic errors — throw and let the caller decide (nurture scheduler will handle failure semantics).

## Implementation Approach

Build the module inside-out: pure helpers first (zero external dependencies, 100% testable), then the Anthropic client wrapper, then the `draftMessage` orchestrator. This matches how `src/server/scoring/` was built: `score-factors.ts` before `qualify-and-score.ts`.

The entry-point signature from the ticket is load-bearing — lock it in during Phase 4 and don't drift.

---

## Phase 1: Dependencies & Environment

### Overview

Add the Anthropic SDK and API-key env var so subsequent phases have something to build against.

### Changes Required

#### 1. Install Anthropic SDK

**File**: `package.json`
**Command**: `yarn add @anthropic-ai/sdk` (yarn per CLAUDE.md — never `npm`/`npx`)

Verify that `zod` is already a dependency (it is, used extensively in schemas). The SDK's `/helpers/zod` subpath requires it.

#### 2. Add env var

**File**: `src/env.js`
**Changes**: Add `ANTHROPIC_API_KEY: z.string().min(1)` to the `server:` block (after `HUBSPOT_CLIENT_SECRET`) and to `runtimeEnv:` (mirroring the existing pattern).

```js
// server block (line 29 area)
HUBSPOT_CLIENT_SECRET: z.string().min(1),
ANTHROPIC_API_KEY: z.string().min(1),
ROBOTS_TXT: z.string().default("Disallow"),
```

```js
// runtimeEnv block
HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
ROBOTS_TXT: process.env.ROBOTS_TXT,
```

#### 3. Update local env file instructions

**File**: `.env.example` (if present; otherwise skip — per CLAUDE.md avoid creating files unless necessary).

Document the key placeholder so operators know to set it locally and in Vercel.

### Success Criteria

#### Automated Verification:
- [x] `make check` passes (typecheck sees new env key)
- [x] `yarn.lock` updated; `@anthropic-ai/sdk` resolvable

#### Manual Verification:
- [ ] `ANTHROPIC_API_KEY` added to Vercel project env (preview + production) before merge
- [ ] Local `.env` has the key for running the smoke test

---

## Phase 2: Pure Helpers (channel, priority, overdue)

### Overview

Three pure functions, zero Anthropic dependency. Test-driven: write tests, then implementations.

### Changes Required

#### 1. Shared lead input type

**File**: `src/server/ai/schema.ts`
**Changes**: Zod schema + types for `DraftMessageInput` and `DraftMessageOutput`, matching the ticket exactly.

```ts
import { z } from "zod";
import type { leads } from "~/server/db/schema";

export type LeadRow = typeof leads.$inferSelect;

export const draftMessageOutputSchema = z.object({
  channel: z.enum(["sms", "email"]),
  subject: z.string().nullable(),
  body: z.string().min(1).max(1600),
  aiReasoning: z.string(),
  priority: z.number().int().min(0).max(100),
});

export type DraftMessageOutput = z.infer<typeof draftMessageOutputSchema>;

export type DraftMessageInput = { lead: LeadRow };

// Claude-authored fields only (priority + channel computed deterministically)
export const claudeDraftSchema = z.object({
  subject: z.string().max(78).nullable(),
  body: z.string().min(1).max(1600),
  reasoning: z.string(),
});

export type ClaudeDraft = z.infer<typeof claudeDraftSchema>;
```

#### 2. Channel selection

**File**: `src/server/ai/channel-selection.ts`
**Changes**: Single `selectChannel(lead)` function.

```ts
import type { LeadRow } from "./schema";

export type Channel = "sms" | "email";

/**
 * Channel selection rules (per #127):
 * - hot + email on file → email (richer detail appropriate at this stage)
 * - otherwise → SMS (requires phone)
 * - throws if neither contact method available
 */
export function selectChannel(lead: LeadRow): Channel {
  if (lead.leadStage === "hot" && lead.email) return "email";
  if (lead.phone) return "sms";
  if (lead.email) return "email"; // last resort for non-hot stages without phone
  throw new Error(`Lead ${lead.id} has no phone or email — cannot draft message`);
}
```

#### 3. Priority calculation

**File**: `src/server/ai/priority.ts`
**Changes**: `computePriority(lead, now)` returns 0-100 integer.

```ts
import type { LeadRow } from "./schema";

const BASE_BY_STAGE = {
  hot: 80,
  warm: 50,
  nurture: 25,
  unqualified: 10,
} as const;

// Overdue thresholds (days since lastContactedAt) — null lastContactedAt means not overdue
const OVERDUE_DAYS = {
  hot: 2,
  warm: 7,
  nurture: 20,
  unqualified: 5,
} as const;

export function isOverdue(lead: LeadRow, now: Date = new Date()): boolean {
  if (!lead.lastContactedAt) return false;
  const daysSince = (now.getTime() - lead.lastContactedAt.getTime()) / 86_400_000;
  return daysSince > OVERDUE_DAYS[lead.leadStage];
}

export function computePriority(lead: LeadRow, now: Date = new Date()): number {
  const base = BASE_BY_STAGE[lead.leadStage];
  const bump = isOverdue(lead, now) ? 10 : 0;
  return Math.min(100, base + bump);
}
```

#### 4. Tests for helpers

**File**: `src/server/ai/__tests__/channel-selection.test.ts`
**Tests**:
- hot + email + phone → "email"
- hot + phone only → "sms"
- warm + email + phone → "sms" (SMS preference)
- nurture + phone only → "sms"
- nurture + email only → "email" (SMS fallback when no phone)
- no phone + no email → throws

**File**: `src/server/ai/__tests__/priority.test.ts`
**Tests**:
- Each stage → correct base (hot 80, warm 50, nurture 25, unqualified 10)
- `lastContactedAt` null → not overdue, base only
- hot + 3 days ago → overdue, priority 90
- warm + 8 days ago → overdue, priority 60
- nurture + 15 days ago → not overdue (threshold is 20)
- unqualified + 10 days ago → overdue, priority 20
- Priority capped at 100 (cannot exceed — hot base 80 + 10 = 90, but guard anyway)

Follow the `@rstest/core` `describe/test/expect` pattern from `src/server/scoring/__tests__/qualify-and-score.test.ts:1-5`.

### Success Criteria

#### Automated Verification:
- [x] `make check` — lint + typecheck pass
- [x] `make test` — all new unit tests pass; `src/server/ai/__tests__/channel-selection.test.ts` and `priority.test.ts` run green
- [x] No coverage gaps for the pure helpers (every branch exercised)

#### Manual Verification:
- [x] Quick `rg` check: these helpers have no imports from `@anthropic-ai/sdk` (proves they're pure and testable in isolation)

---

## Phase 3: Claude Client & Prompt Builders

### Overview

Thin wrapper around the Anthropic SDK — singleton client, system prompt string with Creation Homes QLD persona, user-prompt builder that renders a lead's context for the model. Prompt caching applied to the system prompt.

### Changes Required

#### 1. Anthropic client singleton

**File**: `src/server/ai/anthropic-client.ts`
**Changes**:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  _client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export const DRAFT_MODEL = "claude-sonnet-4-6" as const;
export const DRAFT_MAX_TOKENS = 1024;
export const DRAFT_TEMPERATURE = 0.3;
```

Matches the `env` import rule (see user memory: use `env` from `~/env`, never raw `process.env`).

#### 2. System prompt

**File**: `src/server/ai/prompts.ts`
**Changes**: Export the hardcoded system prompt and a `buildUserPrompt(lead)` function.

```ts
import type { LeadRow } from "./schema";
import type { Channel } from "./channel-selection";

// Hardcoded for MVP pilot (Creation Homes QLD). Tone-of-voice tuning is a later ticket.
export const DRAFT_SYSTEM_PROMPT = `You are a new-home sales consultant at Creation Homes QLD — a residential builder serving South-East Queensland. You write short, friendly, conversational follow-up messages to prospective home buyers.

Voice: warm, direct, confident. Speak like a human consultant who knows the local estates. Use Australian English. Never sound corporate or scripted. Never make promises about price, land availability, or finance approvals you can't back up. Always invite the next conversation rather than push for commitment.

Context about the business:
- Creation Homes builds house-and-land and knockdown-rebuild packages across QLD estates (Springfield Rise, Ripley Valley, Flagstone, Logan Reserve, Yarrabilba).
- Typical buyer: first-home buyers, investors, and upgraders. Most are 6-12 months from settlement.
- We partner with Resolve Finance for broker introductions when helpful.

Your job on each call: generate ONE follow-up message for ONE lead that references their qualification gap and invites a natural next step. Keep SMS under 320 characters (two segments), keep email body under 800 characters, and keep email subjects under 78 characters. Never start a message with the recipient's full name — first name only, or skip the greeting entirely for SMS.`;

export interface UserPromptContext {
  lead: LeadRow;
  channel: Channel;
  daysSinceLastContact: number | null;
}

export function buildUserPrompt({ lead, channel, daysSinceLastContact }: UserPromptContext): string {
  const meta = lead.scoreMetadata;
  const lines = [
    `Lead: ${lead.firstName} ${lead.lastName}`,
    `Stage: ${lead.leadStage}`,
    `Channel: ${channel.toUpperCase()}`,
    `Days since last contact: ${daysSinceLastContact ?? "never contacted"}`,
  ];

  if (meta) {
    lines.push(`Score: ${meta.score}/100`);
    lines.push(
      `Factor breakdown: ${Object.entries(meta.breakdown)
        .map(([k, v]) => `${k} ${v.score}/${v.maxScore}`)
        .join(", ")}`,
    );
    if (meta.gaps.length > 0) {
      const top = meta.gaps[0]!;
      lines.push(`Top qualification gap: ${top.field} (${top.impact}) — ${top.description}`);
    }
    if (meta.nextQuestion) lines.push(`Recommended next question: ${meta.nextQuestion}`);
  } else {
    lines.push(`(No score metadata — generate a generic stage-appropriate check-in.)`);
  }

  if (lead.preferredEstates?.length) lines.push(`Preferred estates: ${lead.preferredEstates.join(", ")}`);
  if (lead.notes) lines.push(`Notes: ${lead.notes}`);

  lines.push(
    "",
    `Write ONE ${channel} message to ${lead.firstName}. ${
      channel === "email"
        ? "Include a subject line."
        : "No subject. Keep it under 320 characters."
    } Explain in the reasoning field why this message fits the lead's stage and gap.`,
  );

  return lines.join("\n");
}
```

#### 3. Tests for prompt builder

**File**: `src/server/ai/__tests__/prompts.test.ts`
**Tests**:
- `buildUserPrompt` includes lead name, stage, channel, and days since last contact
- Includes top gap when `scoreMetadata` present
- Emits fallback line when `scoreMetadata` is null
- Email channel instruction mentions subject line; SMS mentions char limit
- Notes and preferredEstates included when present

### Success Criteria

#### Automated Verification:
- [x] `make check` passes
- [x] `make test` — prompt builder tests pass

#### Manual Verification:
- [x] System prompt reads naturally in the consultant voice (eyeball the string during code review)

---

## Phase 4: `draftMessage()` Entry Point

### Overview

Wire the pieces together: compute channel + priority deterministically, build the user prompt, call Claude with `messages.parse()` + `zodOutputFormat()`, return the typed output.

### Changes Required

#### 1. Entry point

**File**: `src/server/ai/draft-message.ts`
**Changes**:

```ts
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  DRAFT_MAX_TOKENS,
  DRAFT_MODEL,
  DRAFT_TEMPERATURE,
  getAnthropicClient,
} from "./anthropic-client";
import { selectChannel } from "./channel-selection";
import { computePriority } from "./priority";
import { DRAFT_SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import {
  type DraftMessageInput,
  type DraftMessageOutput,
  claudeDraftSchema,
} from "./schema";

export async function draftMessage(
  input: DraftMessageInput,
): Promise<DraftMessageOutput> {
  const { lead } = input;
  const channel = selectChannel(lead);
  const priority = computePriority(lead);

  const daysSinceLastContact = lead.lastContactedAt
    ? Math.floor((Date.now() - lead.lastContactedAt.getTime()) / 86_400_000)
    : null;

  const userPrompt = buildUserPrompt({ lead, channel, daysSinceLastContact });

  const client = getAnthropicClient();

  const response = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: DRAFT_MAX_TOKENS,
    temperature: DRAFT_TEMPERATURE,
    // System as array with cache_control so repeated calls amortize system-prompt tokens.
    system: [
      {
        type: "text",
        text: DRAFT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(claudeDraftSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("draftMessage: Claude returned no structured output");
  }

  // For SMS, force subject to null regardless of what Claude emitted.
  const subject = channel === "email" ? parsed.subject : null;

  return {
    channel,
    subject,
    body: parsed.body,
    aiReasoning: parsed.reasoning,
    priority,
  };
}
```

#### 2. Public exports

**File**: `src/server/ai/index.ts`
**Changes**:

```ts
export { draftMessage } from "./draft-message";
export type { DraftMessageInput, DraftMessageOutput } from "./schema";
```

Deliberately does **not** re-export the Claude client or helpers — callers get a single surface.

#### 3. Tests for orchestration

**File**: `src/server/ai/__tests__/draft-message.test.ts`
**Tests**:
- Mocks `@anthropic-ai/sdk` so `client.messages.parse()` returns a canned `{ parsed_output: { subject, body, reasoning } }`.
- Mocks `~/env` so the client constructor accepts a fake key.
- Hot lead with email → output `channel === "email"`, `subject` non-null (pulled from Claude), `priority >= 80`.
- Warm lead with phone only → `channel === "sms"`, `subject === null` even if Claude hallucinated one.
- Unqualified lead with phone → `priority <= 25` (10 base, +10 if overdue = 20).
- `scoreMetadata === null` → still calls Claude (verifies the prompt builder's fallback branch); no throw.
- Claude returns `parsed_output: null` → throws.
- Claude throws (simulated API error) → error propagates (no retry, no swallow).
- Lead with neither phone nor email → throws before even calling Claude.
- `aiReasoning` non-empty.
- Output passes `draftMessageOutputSchema.parse()` (self-validation).

Follow the `rs.doMock` + dynamic-import pattern from `src/server/api/__tests__/messages-router.test.ts:28-64`. Keep a shared `baseLead` fixture with sensible defaults.

Mock shape for `@anthropic-ai/sdk`:

```ts
const parseFn = rs.fn();
rs.doMock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = { parse: parseFn };
  }
  return { default: Anthropic };
});
rs.doMock("@anthropic-ai/sdk/helpers/zod", () => ({
  zodOutputFormat: (schema: unknown) => ({ __zod: schema }),
}));
```

### Success Criteria

#### Automated Verification:
- [x] `make check` passes
- [x] `make test` — all `src/server/ai/__tests__/*.test.ts` pass
- [x] Tests mock Anthropic — no real API calls in CI
- [x] `grep -r "draftMessage" src/server/api/routers` returns no hits (not exposed as tRPC proc)

#### Manual Verification:
- [x] Test file uses `@rstest/core` conventions consistent with other router tests
- [x] Module can be imported from `~/server/ai` in a TS scratch file without cycle warnings

---

## Phase 5: Manual Smoke Test

### Overview

Run `draftMessage` against a real seeded lead with a real Anthropic key, inspect the output quality, and confirm the acceptance-criteria assertions (hot ≥80, unqualified ≤25, gap referenced in body, email has subject, SMS subject null).

### Changes Required

#### 1. Smoke-test script

**File**: `scripts/smoke-draft-message.ts`
**Changes**: A small Node script (`yarn tsx scripts/smoke-draft-message.ts <leadId>`) that loads a lead by id from the dev DB and prints the `draftMessage` output. Use `tsx` (already available via dev deps) if possible; otherwise a temp tRPC-free invocation.

```ts
import { db } from "~/server/db";
import { leads } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { draftMessage } from "~/server/ai";

const leadId = process.argv[2];
if (!leadId) {
  console.error("usage: tsx scripts/smoke-draft-message.ts <leadId>");
  process.exit(1);
}

const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
if (!lead) throw new Error(`no lead ${leadId}`);

const result = await draftMessage({ lead });
console.dir(result, { depth: null });
```

**Note:** This is a scratch script — mark it in a `scripts/README.md` note as "dev-only, not imported by the app." Alternative: invoke via a temporary tRPC procedure you add-and-remove locally; prefer the script since it keeps `aiRouter` clean.

### Success Criteria

#### Automated Verification:
- [x] Running `yarn tsc --noEmit` on the script passes (script typechecks; note: may need tsconfig include adjustment if `scripts/` not already covered)

#### Manual Verification:
- [ ] Seeded hot lead → output `priority >= 80`, `channel === "email"` if email present, `subject` non-null, `body` references the top gap or next-question topic
- [ ] Seeded unqualified lead (no email) → output `channel === "sms"`, `subject === null`, `priority <= 25`, body is short and stage-appropriate
- [ ] Body reads naturally — passes the "would a consultant send this?" sniff test
- [ ] `aiReasoning` explains the stage + gap choice in 1-3 sentences
- [ ] Running 3-5 iterations on the same lead produces stable output (temperature 0.3 + cache confirms determinism)

---

## Performance Considerations

- **Prompt caching** on the system block saves ~500-700 input tokens per call after first warmup. Matters once nurture scheduler (#132) fires dozens of drafts per run.
- **No streaming** — `messages.parse()` is a single round-trip. Fine: callers are server-side, not user-facing.
- **No retries/backoff here** — failures throw to the caller. Nurture scheduler will get a per-lead try/catch so one bad draft doesn't abort the batch.
- **max_tokens 1024** is ample for SMS+subject+reasoning; no cost concern at pilot volume.

## Migration Notes

None — this is a net-new module. No DB migration, no data backfill. Callers (#132, future lead flows) wire up after this ticket lands.

## References

- GitHub issue: [samjmarshall/rekurve-www#127](https://github.com/samjmarshall/rekurve-www/issues/127)
- Parent epic: [samjmarshall/rekurve-www#87](https://github.com/samjmarshall/rekurve-www/issues/87)
- Blocker (merged): [samjmarshall/rekurve-www#126](https://github.com/samjmarshall/rekurve-www/issues/126)
- Scoring module template: `src/server/scoring/index.ts:1-5`, `src/server/scoring/qualify-and-score.ts:48-69`
- Messages router pattern: `src/server/api/routers/messages.ts:1-106`
- Router test pattern: `src/server/api/__tests__/messages-router.test.ts:28-64`
- Lead schema: `src/server/db/schema/leads.ts:24-83`
- Message queue schema: `src/server/db/schema/message-queue.ts:13-37`
- Score metadata type: `src/server/scoring/schema.ts:29-31`
- Enums (stage, channel, status): `src/server/db/schema/enums.ts:25-30`, `:71-77`
- Anthropic SDK structured output: `@anthropic-ai/sdk/helpers/zod` → `zodOutputFormat`, `client.messages.parse()`
