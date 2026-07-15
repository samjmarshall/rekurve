import { beforeAll, describe, expect, rs, test } from "@rstest/core";

import { makeStep } from "~/server/inngest/__tests__/step-fake";
import type { EventPayload } from "~/server/inngest/events";
import { publishLeadUpdated } from "~/server/leads/leads.channels";
import type { HubspotServiceDeps } from "../hubspot.service";
import type { LeadHubspotSyncWorkerDeps } from "../hubspot.worker";
import { makeHsContact } from "./fixtures";

const LEAD_ID = "lead-0000-0000-0000-000000000001";
const USER_ID = "user-0000-0000-0000-000000000001";

// Factory seam (adr020): behaviour is asserted through fake deps objects, not
// module mocks. The worker run fn is composed over the REAL service
// (makeHubspotService with fake HubSpot API fns) so the full frozen step
// sequence — load-lead, hs-dedup / hs-update / hs-create / stamp / hs-patch,
// publish — is exercised end to end. The worker import graph no longer reaches
// ~/env or ~/server/db, so no import-time mocks are needed.
let makeHubspotService: (deps: HubspotServiceDeps) => {
  syncLeadContact: LeadHubspotSyncWorkerDeps["syncLeadContact"];
};
let makeRunLeadHubspotSync: (
  deps: LeadHubspotSyncWorkerDeps,
) => (event: unknown, step: unknown) => Promise<void>;
let workerFn: { id: () => string; opts: Record<string, unknown> };

beforeAll(async () => {
  const serviceMod = await import("../hubspot.service");
  const workerMod = await import("../hubspot.worker");
  makeHubspotService = serviceMod.makeHubspotService as never;
  makeRunLeadHubspotSync = workerMod.makeRunLeadHubspotSync as never;
  workerFn = workerMod.makeLeadHubspotSyncWorker(
    makeDeps().deps as never,
  ) as never;
});

function makeDeps(
  lead: Record<string, unknown> | undefined = {
    id: LEAD_ID,
    email: "jane@example.com",
    phone: "0400000000",
    hubspotContactId: null,
    firstName: "Jane",
  },
  serviceOverrides: Record<string, unknown> = {},
) {
  const serviceFakes = {
    stampHubspotContactId: rs.fn().mockResolvedValue(undefined),
    findExistingContact: rs.fn().mockResolvedValue(null),
    createContact: rs.fn().mockResolvedValue(makeHsContact("hs-new-1")),
    updateContact: rs.fn().mockResolvedValue(makeHsContact("hs-existing-1")),
    ...serviceOverrides,
  };
  const service = makeHubspotService(serviceFakes as never);
  const deps = {
    getLead: rs.fn().mockResolvedValue(lead),
    syncLeadContact: service.syncLeadContact,
    publishLeadUpdated: rs.fn().mockResolvedValue(undefined),
  };
  return { deps, serviceFakes };
}

// Typed against the EVENT_REGISTRY payload — a key drift fails typecheck.
const event = (
  data: Partial<EventPayload<"lead.captured">> = {},
): { data: EventPayload<"lead.captured"> } => ({
  data: { leadId: LEAD_ID, userId: USER_ID, ...data },
});

function makeSyncStep() {
  return { ...makeStep(), realtime: { publish: rs.fn() } };
}

describe("runLeadHubspotSync — unit", () => {
  test("capture flow: dedup miss → create → stamp → publish, step ids byte-stable", async () => {
    const { deps, serviceFakes } = makeDeps();
    const step = makeSyncStep();

    await makeRunLeadHubspotSync(deps as never)(event(), step);

    expect(serviceFakes.findExistingContact).toHaveBeenCalledWith(
      "jane@example.com",
      "0400000000",
    );
    expect(serviceFakes.createContact).toHaveBeenCalledOnce();
    expect(serviceFakes.updateContact).not.toHaveBeenCalled();
    // Contact id stamped through the leads port…
    expect(serviceFakes.stampHubspotContactId).toHaveBeenCalledWith(
      LEAD_ID,
      "hs-new-1",
    );
    // …and the publish carries the freshly-stamped id.
    expect(deps.publishLeadUpdated).toHaveBeenCalledWith(step, USER_ID, {
      leadId: LEAD_ID,
      hubspotContactId: "hs-new-1",
    });
    // Frozen Inngest memoisation keys (in-flight runs replay against them).
    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "load-lead",
      "hs-dedup",
      "hs-create",
      "stamp",
    ]);
  });

  test('realtime publish runs under the frozen "publish-lead-updated" step id', async () => {
    const { deps } = makeDeps();
    const step = makeSyncStep();

    // Composed over the REAL leads.channels adapter (not the faked dep): this
    // pins the frozen realtime memoisation key at its single source —
    // leads.channels.ts — so renaming that id literal fails HERE, not in
    // production replays of in-flight runs.
    await makeRunLeadHubspotSync({ ...deps, publishLeadUpdated } as never)(
      event(),
      step,
    );

    expect(step.realtime.publish).toHaveBeenCalledOnce();
    expect(step.realtime.publish.mock.calls[0]?.[0]).toBe(
      "publish-lead-updated",
    );
  });

  test("stamp lands BEFORE the realtime publish (ordering guarantee)", async () => {
    const calls: string[] = [];
    const { deps } = makeDeps(undefined, {
      stampHubspotContactId: rs.fn().mockImplementation(async () => {
        calls.push("stamp");
      }),
    });
    (deps.publishLeadUpdated as ReturnType<typeof rs.fn>).mockImplementation(
      async () => {
        calls.push("publish");
      },
    );

    await makeRunLeadHubspotSync(deps as never)(event(), makeSyncStep());

    expect(calls).toEqual(["stamp", "publish"]);
  });

  test("dedup flow: existing contact found → update, no create; stamps the match", async () => {
    const { deps, serviceFakes } = makeDeps(undefined, {
      findExistingContact: rs
        .fn()
        .mockResolvedValue(makeHsContact("hs-match-1")),
      updateContact: rs.fn().mockResolvedValue(makeHsContact("hs-match-1")),
    });
    const step = makeSyncStep();

    await makeRunLeadHubspotSync(deps as never)(event(), step);

    expect(serviceFakes.createContact).not.toHaveBeenCalled();
    expect(serviceFakes.updateContact).toHaveBeenCalledWith(
      "hs-match-1",
      expect.anything(),
    );
    expect(serviceFakes.stampHubspotContactId).toHaveBeenCalledWith(
      LEAD_ID,
      "hs-match-1",
    );
    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "load-lead",
      "hs-dedup",
      "hs-update",
      "stamp",
    ]);
  });

  test("linked lead: patches the known contact only — no dedup, no stamp", async () => {
    const { deps, serviceFakes } = makeDeps({
      id: LEAD_ID,
      email: "jane@example.com",
      phone: null,
      hubspotContactId: "hs-linked-1",
    });
    const step = makeSyncStep();

    await makeRunLeadHubspotSync(deps as never)(event(), step);

    expect(serviceFakes.findExistingContact).not.toHaveBeenCalled();
    expect(serviceFakes.createContact).not.toHaveBeenCalled();
    expect(serviceFakes.updateContact).toHaveBeenCalledWith(
      "hs-linked-1",
      expect.anything(),
    );
    expect(serviceFakes.stampHubspotContactId).not.toHaveBeenCalled();
    expect(deps.publishLeadUpdated).toHaveBeenCalledWith(step, USER_ID, {
      leadId: LEAD_ID,
      hubspotContactId: "hs-linked-1",
    });
    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "load-lead",
      "hs-patch",
    ]);
  });

  test("hubspotSync:false gate — no HubSpot calls, publish still fires with the lead's id", async () => {
    const { deps, serviceFakes } = makeDeps();
    const step = makeSyncStep();

    await makeRunLeadHubspotSync(deps as never)(
      event({ hubspotSync: false }),
      step,
    );

    expect(serviceFakes.findExistingContact).not.toHaveBeenCalled();
    expect(serviceFakes.createContact).not.toHaveBeenCalled();
    expect(serviceFakes.updateContact).not.toHaveBeenCalled();
    expect(serviceFakes.stampHubspotContactId).not.toHaveBeenCalled();
    expect(deps.publishLeadUpdated).toHaveBeenCalledWith(step, USER_ID, {
      leadId: LEAD_ID,
      hubspotContactId: null,
    });
  });

  test("missing lead: no-op — no sync, no publish", async () => {
    const { deps, serviceFakes } = makeDeps(undefined);
    // getLead resolves undefined (lead deleted between commit and fan-out).
    (deps.getLead as ReturnType<typeof rs.fn>).mockResolvedValue(undefined);

    await makeRunLeadHubspotSync(deps as never)(event(), makeSyncStep());

    expect(serviceFakes.findExistingContact).not.toHaveBeenCalled();
    expect(deps.publishLeadUpdated).not.toHaveBeenCalled();
  });
});

describe("makeLeadHubspotSyncWorker — adapter config", () => {
  // Byte-stable external identifiers; the registry golden pins these too —
  // this is the co-located tripwire for the ONE-function rule (#329).
  test('id stays "lead-hubspot-sync" with both lead triggers', () => {
    expect(workerFn.id()).toBe("lead-hubspot-sync");
    expect(
      (workerFn.opts as { triggers: { event: string }[] }).triggers.map(
        (t) => t.event,
      ),
    ).toEqual(["lead.captured", "lead.updated"]);
  });
});
