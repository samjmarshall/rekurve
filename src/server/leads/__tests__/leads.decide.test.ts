import { describe, expect, test } from "@rstest/core";

import type { LeadWrite } from "~/server/leads/leads.decide";
import {
  decideCaptureFromHubspot,
  decideCaptureLead,
  decideUpdateLead,
} from "~/server/leads/leads.decide";
import { makeLead } from "./fixtures";

// Pure decision tests — no mocks, real qualifyAndScore, and all
// nondeterminism injected (newId + now), so every assertion is exact. Event
// payload KEY SETS are pinned here from the emitting side; the registry
// schemas are strict, so any drift throws at write time (see registry-golden
// emit-site cases).

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const NEW_ID = "bbbbbbbb-0000-0000-0000-000000000002";
const USER_ID = "user-test-1";
const CTX = { userId: USER_ID, newId: () => NEW_ID };
const NOW = new Date("2026-07-01T00:00:00.000Z");

const existingLeadRow = makeLead({ id: LEAD_ID });

function eventNames(events: { name: string }[]) {
  return events.map((e) => e.name);
}

/** Narrow a LeadWrite to one variant, failing loudly on a kind mismatch. */
function expectKind<K extends LeadWrite["kind"]>(
  write: LeadWrite,
  kind: K,
): Extract<LeadWrite, { kind: K }> {
  expect(write.kind).toBe(kind);
  return write as Extract<LeadWrite, { kind: K }>;
}

describe("decideCaptureLead", () => {
  test("new lead — insert write with scoring fields and the injected id", () => {
    const { write, events } = decideCaptureLead(
      { firstName: "John", lastName: "Smith" },
      undefined,
      CTX,
      NOW,
    );

    const { record } = expectKind(write, "insert");
    // ctx.newId is the only id source — the row and every event carry it.
    expect(record.id).toBe(NEW_ID);
    expect(record.leadScore).toEqual(expect.any(Number));
    expect(record.leadStage).toBeDefined();
    expect(record.scoreMetadata).toMatchObject({
      scoredAt: NOW.toISOString(),
    });
    expect(events[0]!.data).toMatchObject({ leadId: NEW_ID });
  });

  test("new lead — emits lead.captured + lead.stage-changed (fromStage null)", () => {
    const { write, events } = decideCaptureLead(
      { firstName: "John", lastName: "Smith" },
      undefined,
      CTX,
      NOW,
    );

    expect(eventNames(events)).toEqual(["lead.captured", "lead.stage-changed"]);
    expect(events[1]!.data).toMatchObject({
      fromStage: null,
      toStage: expectKind(write, "insert").record.leadStage,
    });
  });

  test("lead.captured payload keys are exactly {leadId, userId} (no hubspotSync)", () => {
    const { events } = decideCaptureLead(
      { firstName: "John", lastName: "Smith" },
      undefined,
      CTX,
      NOW,
    );

    expect(events[0]!.name).toBe("lead.captured");
    expect(Object.keys(events[0]!.data).sort()).toEqual(["leadId", "userId"]);
    expect(events[0]!.data).toMatchObject({ userId: USER_ID });
  });

  test("lead.stage-changed payload keys are exactly {leadId, userId, fromStage, toStage}", () => {
    const { events } = decideCaptureLead(
      { firstName: "John", lastName: "Smith" },
      undefined,
      CTX,
      NOW,
    );

    expect(Object.keys(events[1]!.data).sort()).toEqual([
      "fromStage",
      "leadId",
      "toStage",
      "userId",
    ]);
  });

  test("existing lead with same stage — update write, stage-changed NOT emitted", () => {
    // Compute the stage this input scores to, then present an existing lead
    // already at that stage.
    const input = { firstName: "John", lastName: "Smith", email: "j@t.com" };
    const first = decideCaptureLead(input, undefined, CTX, NOW);
    const scoredStage = expectKind(first.write, "insert").record.leadStage!;

    const { write, events } = decideCaptureLead(
      input,
      { id: LEAD_ID, leadStage: scoredStage },
      CTX,
      NOW,
    );

    const update = expectKind(write, "update");
    expect(update.id).toBe(LEAD_ID);
    expect(update.set.updatedAt).toEqual(NOW);
    expect(eventNames(events)).toEqual(["lead.captured"]);
    // The existing row's id wins over ctx.newId.
    expect(events[0]!.data).toMatchObject({ leadId: LEAD_ID });
  });

  test("existing lead with different stage — stage-changed emitted with correct fromStage", () => {
    const input = {
      firstName: "John",
      lastName: "Smith",
      email: "j@t.com",
      hasLand: true,
      landRegistered: true,
      landSizeSqm: "450",
      seenBroker: true,
      constructionTimeline: "ready_now" as const,
      budget: "$650000",
      propertyType: "first_home_buyer" as const,
    };
    const scoredStage = expectKind(
      decideCaptureLead(input, undefined, CTX, NOW).write,
      "insert",
    ).record.leadStage!;
    expect(scoredStage).not.toBe("unqualified");

    const { events } = decideCaptureLead(
      input,
      { id: LEAD_ID, leadStage: "unqualified" },
      CTX,
      NOW,
    );

    expect(eventNames(events)).toEqual(["lead.captured", "lead.stage-changed"]);
    expect(events[1]!.data).toMatchObject({
      fromStage: "unqualified",
      toStage: scoredStage,
    });
  });
});

describe("decideCaptureFromHubspot", () => {
  const HS_ID = "hs-contact-abc123";

  test("new contact — upsert write with defaults, scoring, and the injected id", () => {
    const { write } = decideCaptureFromHubspot(HS_ID, {}, undefined, CTX, NOW);

    const { record } = expectKind(write, "upsert");
    expect(record.id).toBe(NEW_ID);
    expect(record.hubspotContactId).toBe(HS_ID);
    // Missing names default to "Unknown" (HubSpot contacts can be name-less).
    expect(record.firstName).toBe("Unknown");
    expect(record.lastName).toBe("Unknown");
    expect(record.leadScore).toEqual(expect.any(Number));
    expect(record.updatedAt).toEqual(NOW);
  });

  test("lead.captured payload keys are exactly {leadId, userId, hubspotSync} with hubspotSync false", () => {
    const { events } = decideCaptureFromHubspot(
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      undefined,
      CTX,
      NOW,
    );

    expect(events[0]!.name).toBe("lead.captured");
    expect(Object.keys(events[0]!.data).sort()).toEqual([
      "hubspotSync",
      "leadId",
      "userId",
    ]);
    expect(events[0]!.data).toMatchObject({
      leadId: NEW_ID,
      hubspotSync: false,
    });
  });

  test("new contact — stage-changed emitted with fromStage null", () => {
    const { write, events } = decideCaptureFromHubspot(
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      undefined,
      CTX,
      NOW,
    );

    expect(eventNames(events)).toEqual(["lead.captured", "lead.stage-changed"]);
    expect(events[1]!.data).toMatchObject({
      fromStage: null,
      toStage: expectKind(write, "upsert").record.leadStage,
    });
  });

  test("existing contact with same stage — stage-changed NOT emitted, id reused", () => {
    const props = { firstName: "Jane", lastName: "Doe" };
    const scoredStage = expectKind(
      decideCaptureFromHubspot(HS_ID, props, undefined, CTX, NOW).write,
      "upsert",
    ).record.leadStage!;

    const { write, events } = decideCaptureFromHubspot(
      HS_ID,
      props,
      { id: LEAD_ID, leadStage: scoredStage },
      CTX,
      NOW,
    );

    expect(eventNames(events)).toEqual(["lead.captured"]);
    expect(expectKind(write, "upsert").record.id).toBe(LEAD_ID);
    expect(events[0]!.data).toMatchObject({ leadId: LEAD_ID });
  });
});

describe("decideUpdateLead", () => {
  test("non-qualifying edit — no rescore fields in the update set", () => {
    const { write } = decideUpdateLead(
      existingLeadRow,
      { notes: "memo" },
      CTX,
      NOW,
    );

    const update = expectKind(write, "update");
    expect(update.id).toBe(LEAD_ID);
    expect(update.set).not.toHaveProperty("leadScore");
    expect(update.set).not.toHaveProperty("leadStage");
    expect(update.set).not.toHaveProperty("scoreMetadata");
    expect(update.set.updatedAt).toEqual(NOW);
  });

  test("qualifying edit — rescored fields present in the update set", () => {
    const { write } = decideUpdateLead(
      existingLeadRow,
      { hasLand: true, landRegistered: true, landSizeSqm: "800" },
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "update");
    expect(set.leadScore).toEqual(expect.any(Number));
    expect(set.leadStage).toBeDefined();
    expect(set.scoreMetadata).toMatchObject({
      scoredAt: NOW.toISOString(),
    });
  });

  test("lead.updated always emitted; payload keys exactly {leadId, userId}", () => {
    const { events } = decideUpdateLead(
      existingLeadRow,
      { notes: "note" },
      CTX,
      NOW,
    );

    expect(events[0]!.name).toBe("lead.updated");
    expect(Object.keys(events[0]!.data).sort()).toEqual(["leadId", "userId"]);
    expect(events[0]!.data).toMatchObject({ leadId: LEAD_ID, userId: USER_ID });
  });

  test("qualifying edit that changes stage — stage-changed emitted with correct fromStage", () => {
    const patch = { hasLand: true, landRegistered: true, landSizeSqm: "800" };
    const { write, events } = decideUpdateLead(
      existingLeadRow,
      patch,
      CTX,
      NOW,
    );

    // This patch scores past "unqualified"; guard the premise.
    const { set } = expectKind(write, "update");
    expect(set.leadStage).not.toBe("unqualified");
    expect(eventNames(events)).toEqual(["lead.updated", "lead.stage-changed"]);
    expect(events[1]!.data).toMatchObject({
      fromStage: "unqualified",
      toStage: set.leadStage,
    });
  });

  test("qualifying edit with same resulting stage — stage-changed NOT emitted", () => {
    const patch = { hasLand: true, landRegistered: true, landSizeSqm: "800" };
    const scoredStage = expectKind(
      decideUpdateLead(existingLeadRow, patch, CTX, NOW).write,
      "update",
    ).set.leadStage!;

    const { events } = decideUpdateLead(
      { ...existingLeadRow, leadStage: scoredStage },
      patch,
      CTX,
      NOW,
    );

    expect(eventNames(events)).toEqual(["lead.updated"]);
  });

  test("non-qualifying edit — stage-changed NOT emitted", () => {
    const { events } = decideUpdateLead(
      existingLeadRow,
      { notes: "just a note" },
      CTX,
      NOW,
    );

    expect(eventNames(events)).toEqual(["lead.updated"]);
  });
});
