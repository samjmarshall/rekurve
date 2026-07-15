import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  rs,
  test,
} from "@rstest/core";

import { makeStep } from "~/server/inngest/__tests__/step-fake";
import type { EventPayload } from "~/server/inngest/events";
import type { ReconcileEngagementWorkerDeps } from "../reconcile-engagement.worker";

const MSG_ID = "msg-0000-0000-0000-000000000001";
const LEAD_ID = "lead-0000-0000-0000-000000000001";
const CORRELATION_ID = MSG_ID;

// Factory seam (adr020): behaviour is asserted through a fake deps object, not
// module mocks. The worker import graph no longer reaches ~/env or
// ~/server/db, so no import-time mocks are needed.
let makeRunReconcileMissedEngagement: (
  deps: ReconcileEngagementWorkerDeps,
) => (event: unknown, step: unknown) => Promise<void>;
let workerFn: { id: () => string; opts: Record<string, unknown> };

beforeAll(async () => {
  const mod = await import("../reconcile-engagement.worker");
  makeRunReconcileMissedEngagement =
    mod.makeRunReconcileMissedEngagement as never;
  workerFn = mod.makeReconcileMissedEngagementWorker(
    makeDeps() as never,
  ) as never;
});

let consoleErrorSpy: ReturnType<typeof rs.spyOn>;

beforeEach(() => {
  consoleErrorSpy = rs.spyOn(console, "error").mockImplementation(() => {});
});

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    loadReconciliationTarget: rs.fn().mockResolvedValue({
      done: false,
      leadId: LEAD_ID,
      hubspotContactId: "hs-contact-1",
      createdAt: new Date("2026-04-25T10:00:00Z").toISOString(),
    }),
    listEmailEngagementsForContact: rs.fn().mockResolvedValue([]),
    stampEngagement: rs.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Typed against the EVENT_REGISTRY payload — a key drift fails typecheck.
const event: { data: EventPayload<"hubspot.engagement-missed"> } = {
  data: { messageId: MSG_ID, leadId: LEAD_ID, correlationId: CORRELATION_ID },
};

describe("runReconcileMissedEngagement — unit", () => {
  test("matched engagement → stamps hubspotActivityId", async () => {
    const deps = makeDeps({
      listEmailEngagementsForContact: rs.fn().mockResolvedValue([
        {
          id: "hs-eng-match",
          headers: `X-Rekurve-Correlation-Id: ${CORRELATION_ID}`,
          timestamp: new Date("2026-04-25T10:01:00Z"),
        },
        {
          id: "hs-eng-other",
          headers: "X-Rekurve-Correlation-Id: someone-else",
          timestamp: new Date("2026-04-25T10:02:00Z"),
        },
      ]),
    });
    const step = makeStep();

    await makeRunReconcileMissedEngagement(deps as never)(event, step as never);

    expect(deps.stampEngagement).toHaveBeenCalledWith({
      messageId: MSG_ID,
      hubspotActivityId: "hs-eng-match",
    });
    // Since-filter derived from the memoised createdAt (JSON string on replay).
    expect(deps.listEmailEngagementsForContact).toHaveBeenCalledWith(
      "hs-contact-1",
      new Date("2026-04-25T10:00:00Z"),
    );
    // Step ids are byte-stable (Inngest memoisation keys).
    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "load-conversation",
      "query-hubspot",
      "stamp-or-alert",
    ]);
  });

  test("no match → logs to console.error, no stamp", async () => {
    const deps = makeDeps({
      listEmailEngagementsForContact: rs.fn().mockResolvedValue([
        {
          id: "hs-eng-other",
          headers: "X-Rekurve-Correlation-Id: someone-else",
          timestamp: new Date("2026-04-25T10:02:00Z"),
        },
      ]),
    });

    await makeRunReconcileMissedEngagement(deps as never)(
      event,
      makeStep() as never,
    );

    expect(deps.stampEngagement).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[reconcile-missed-engagement] no engagement matched",
      expect.objectContaining({ messageId: MSG_ID, leadId: LEAD_ID }),
    );
  });

  test("already-stamped conversation → exits without querying HubSpot", async () => {
    // The already-reconciled guard lives in the loadReconciliationTarget port
    // (see messaging.service tests) — it collapses to { done: true }.
    const deps = makeDeps({
      loadReconciliationTarget: rs.fn().mockResolvedValue({ done: true }),
    });

    await makeRunReconcileMissedEngagement(deps as never)(
      event,
      makeStep() as never,
    );

    expect(deps.listEmailEngagementsForContact).not.toHaveBeenCalled();
    expect(deps.stampEngagement).not.toHaveBeenCalled();
  });

  test("missing conversation → exits without querying HubSpot", async () => {
    // Missing conversation also collapses to { done: true } inside the port.
    const deps = makeDeps({
      loadReconciliationTarget: rs.fn().mockResolvedValue({ done: true }),
    });

    await makeRunReconcileMissedEngagement(deps as never)(
      event,
      makeStep() as never,
    );

    expect(deps.listEmailEngagementsForContact).not.toHaveBeenCalled();
  });

  test("lead missing hubspotContactId → logs and skips HubSpot query", async () => {
    const deps = makeDeps({
      loadReconciliationTarget: rs.fn().mockResolvedValue({
        done: false,
        leadId: LEAD_ID,
        hubspotContactId: null,
        createdAt: new Date().toISOString(),
      }),
    });

    await makeRunReconcileMissedEngagement(deps as never)(
      event,
      makeStep() as never,
    );

    expect(deps.listEmailEngagementsForContact).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[reconcile-missed-engagement] lead has no hubspotContactId",
      expect.objectContaining({ messageId: MSG_ID, leadId: LEAD_ID }),
    );
  });

  test("function is registered on engagement-missed with per-message concurrency, retries:3", () => {
    expect(workerFn.id()).toBe("reconcile-missed-engagement");
    expect(workerFn.opts).toMatchObject({
      id: "reconcile-missed-engagement",
      triggers: [{ event: "hubspot.engagement-missed" }],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 3,
    });
  });
});
