import "server-only";

import type { z } from "zod";

import type {
  LeadCreate,
  LeadUpdate,
  leadStageSchema,
} from "~/domain/leads/schemas";
import type { ScoreMetadata } from "~/domain/scoring";
import { qualifyAndScore } from "~/domain/scoring";
import type { OutboxEventDescriptor } from "~/server/inngest/events";
import type { LeadInsert, LeadRow } from "./leads.schema";

// Pure decision core for the leads write paths (adr020 hybrid write-path
// clause: lead capture/update earn a decide() seam). No db, no I/O, no
// nondeterminism — input + current state + injected ctx/now → a write
// descriptor + outbox event descriptors. server-only by policy: decide fns
// are not isomorphic-kernel residents.

type LeadStage = z.infer<typeof leadStageSchema>;

type ExistingLeadRef = { id: string; leadStage: LeadStage };

/** All nondeterminism is injected: actor + id generation here, clock as `now`. */
type LeadDecideCtx = { userId: string; newId: () => string };

/**
 * Write descriptors — the discriminated union the repository's single write
 * door, `commit(write, events)`, switches on to build the one Drizzle
 * statement per decision:
 * - insert: plain insert (manual capture of a new lead)
 * - upsert: insert … onConflictDoUpdate(hubspotContactId) (HubSpot-origin ingest)
 * - update: update-by-id (existing-email capture, lead edit)
 * - stamp: guarded hubspotContactId stamp (set only while still NULL — the
 *   lead-fanout idempotency fence)
 * - delete: delete-by-id (imperative CRUD; no outbox event today)
 */
export type LeadWrite =
  | { kind: "insert"; record: LeadInsert }
  | { kind: "upsert"; record: LeadInsert }
  | { kind: "update"; id: string; set: Partial<LeadInsert> }
  | { kind: "stamp"; id: string; hubspotContactId: string }
  | { kind: "delete"; id: string };

type LeadDecision<W extends LeadWrite> = {
  write: W;
  events: OutboxEventDescriptor[];
};

const SCORING_FIELDS = new Set([
  "hasLand",
  "landRegistered",
  "landAddress",
  "landSizeSqm",
  "landWidth",
  "landDepth",
  "seenBroker",
  "constructionTimeline",
  "budget",
  "propertyType",
  "preferredEstates",
  "preferredSuburbs",
]);

/** The one place a score run becomes row fields (leadScore/leadStage/scoreMetadata). */
function scoreStamp(input: Parameters<typeof qualifyAndScore>[0], now: Date) {
  const result = qualifyAndScore(input);
  const scoreMetadata: ScoreMetadata = {
    ...result,
    scoredAt: now.toISOString(),
  };
  return {
    stage: result.stage,
    fields: {
      leadScore: result.score,
      leadStage: result.stage,
      scoreMetadata,
    } satisfies Partial<LeadInsert>,
  };
}

function stageChangedEvent(
  leadId: string,
  userId: string,
  fromStage: LeadStage | null,
  toStage: LeadStage,
): OutboxEventDescriptor | null {
  if (fromStage === toStage) return null;
  return {
    name: "lead.stage-changed",
    data: { leadId, userId, fromStage, toStage },
  };
}

export function decideCaptureLead(
  input: LeadCreate,
  existing: ExistingLeadRef | undefined,
  ctx: LeadDecideCtx,
  now: Date,
): LeadDecision<Extract<LeadWrite, { kind: "insert" | "update" }>> {
  const leadId = existing?.id ?? ctx.newId();
  const score = scoreStamp(input, now);

  const write: Extract<LeadWrite, { kind: "insert" | "update" }> = existing
    ? {
        kind: "update",
        id: existing.id,
        set: { ...input, ...score.fields, updatedAt: now },
      }
    : { kind: "insert", record: { id: leadId, ...input, ...score.fields } };

  const events: OutboxEventDescriptor[] = [
    { name: "lead.captured", data: { leadId, userId: ctx.userId } },
  ];
  const stageEvt = stageChangedEvent(
    leadId,
    ctx.userId,
    existing?.leadStage ?? null,
    score.stage,
  );
  if (stageEvt) events.push(stageEvt);

  return { write, events };
}

export function decideCaptureFromHubspot(
  hubspotContactId: string,
  properties: Partial<LeadRow>,
  existing: ExistingLeadRef | undefined,
  ctx: LeadDecideCtx,
  now: Date,
): LeadDecision<Extract<LeadWrite, { kind: "upsert" }>> {
  const leadId = existing?.id ?? ctx.newId();

  const firstName = properties.firstName ?? "Unknown";
  const lastName = properties.lastName ?? "Unknown";
  const score = scoreStamp({ ...properties, firstName, lastName }, now);

  const record = {
    id: leadId,
    hubspotContactId,
    ...properties,
    firstName,
    lastName,
    ...score.fields,
    updatedAt: now,
  } as LeadInsert;

  const events: OutboxEventDescriptor[] = [
    // hubspotSync: false suppresses the echo sync back to HubSpot
    // (lead-fanout reads the flag as true when absent).
    {
      name: "lead.captured",
      data: { leadId, userId: ctx.userId, hubspotSync: false },
    },
  ];
  const stageEvt = stageChangedEvent(
    leadId,
    ctx.userId,
    existing?.leadStage ?? null,
    score.stage,
  );
  if (stageEvt) events.push(stageEvt);

  return { write: { kind: "upsert", record }, events };
}

export function decideUpdateLead(
  existing: LeadRow,
  patch: Omit<LeadUpdate, "id">,
  ctx: { userId: string },
  now: Date,
): LeadDecision<Extract<LeadWrite, { kind: "update" }>> {
  const hasQualificationChange = Object.keys(patch).some((k) =>
    SCORING_FIELDS.has(k),
  );

  let scoreFields: Partial<LeadInsert> = {};
  let newStage: LeadStage | undefined;
  if (hasQualificationChange) {
    const merged = { ...existing, ...patch };
    const score = scoreStamp(merged as typeof existing, now);
    newStage = score.stage;
    scoreFields = score.fields;
  }

  const events: OutboxEventDescriptor[] = [
    { name: "lead.updated", data: { leadId: existing.id, userId: ctx.userId } },
  ];
  const stageEvt =
    newStage !== undefined
      ? stageChangedEvent(existing.id, ctx.userId, existing.leadStage, newStage)
      : null;
  if (stageEvt) events.push(stageEvt);

  return {
    write: {
      kind: "update",
      id: existing.id,
      set: { ...patch, ...scoreFields, updatedAt: now },
    },
    events,
  };
}
