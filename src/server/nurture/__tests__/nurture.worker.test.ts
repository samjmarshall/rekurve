import { InngestTestEngine } from "@inngest/test";
import { afterAll, beforeAll, describe, expect, rs, test } from "@rstest/core";

import { neutraliseWorkerImports } from "~/server/__tests__/import-neutraliser";
import { makeDraftOutput } from "~/server/ai/__tests__/fixtures";
import { makeWaitingStep } from "~/server/inngest/__tests__/step-fake";
import { makeLead } from "~/server/leads/__tests__/fixtures";
import type { NurturePlanRunnerDeps } from "../nurture.worker";

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const MSG_ID = "msg-0000-0000-0000-000000000001";

// Only id + leadStage are read by the run core; the rest of the shared
// fixture row rides along to the draft fn untouched (the deps fake
// doesn't care).
const warmLead = makeLead({ id: LEAD_ID, leadStage: "warm" });
const hotLead = makeLead({ id: LEAD_ID, leadStage: "hot" });
const stubDraftOutput = makeDraftOutput();

// Factory seam (adr020): behaviour is asserted through a fake deps object, not
// module mocks; neutraliseWorkerImports() handles the import-time env/db
// graph (rationale documented on the helper).
let makeRunNurturePlan: typeof import("../nurture.worker")["makeRunNurturePlan"];
let makeNurturePlanRunner: typeof import("../nurture.worker")["makeNurturePlanRunner"];

// rhythmForStage reads process.env.NURTURE_TEST_RHYTHM directly; pin it off
// so timeout-derivation assertions are deterministic regardless of the shell.
const savedTestRhythm = process.env.NURTURE_TEST_RHYTHM;

beforeAll(async () => {
  delete process.env.NURTURE_TEST_RHYTHM;
  neutraliseWorkerImports();
  const mod = await import("../nurture.worker");
  makeRunNurturePlan = mod.makeRunNurturePlan;
  makeNurturePlanRunner = mod.makeNurturePlanRunner;
});

afterAll(() => {
  if (savedTestRhythm === undefined) {
    delete process.env.NURTURE_TEST_RHYTHM;
  } else {
    process.env.NURTURE_TEST_RHYTHM = savedTestRhythm;
  }
});

function makeDeps(
  overrides: Partial<NurturePlanRunnerDeps> = {},
): NurturePlanRunnerDeps {
  return {
    getLead: rs.fn().mockResolvedValue(warmLead),
    enqueueDraft: rs.fn().mockResolvedValue({ id: MSG_ID }),
    draftFn: rs.fn().mockResolvedValue(stubDraftOutput),
    sendEvent: rs.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const event = { data: { leadId: LEAD_ID } };

/** Step whose waits time out first (null), then supersede — terminates the
 * infinite loop after one drafted follow-up. */
function makeTimeoutThenSupersedeStep() {
  const step = makeWaitingStep(null);
  step.waitForEvent
    .mockResolvedValueOnce(null) // 1st wait: timeout
    .mockResolvedValue({ data: { leadId: LEAD_ID } }); // 2nd wait: superseded
  return step;
}

describe("runNurturePlan — unit", () => {
  test("hot lead — exits immediately without drafting or waiting", async () => {
    const deps = makeDeps({ getLead: rs.fn().mockResolvedValue(hotLead) });
    const step = makeWaitingStep(null);

    await makeRunNurturePlan(deps)(event, step);

    expect(step.waitForEvent).not.toHaveBeenCalled();
    expect(deps.draftFn).not.toHaveBeenCalled();
  });

  test("absent lead — exits without drafting", async () => {
    const deps = makeDeps({ getLead: rs.fn().mockResolvedValue(undefined) });
    const step = makeWaitingStep(null);

    await makeRunNurturePlan(deps)(event, step);

    expect(step.waitForEvent).not.toHaveBeenCalled();
    expect(deps.draftFn).not.toHaveBeenCalled();
  });

  test("superseded — waitForEvent returns event, no draft runs", async () => {
    const deps = makeDeps();
    const step = makeWaitingStep({ data: { leadId: LEAD_ID } });

    await makeRunNurturePlan(deps)(event, step);

    expect(step.run).toHaveBeenCalledOnce(); // only load-lead-0
    expect(deps.draftFn).not.toHaveBeenCalled();
  });

  test("timeout — drafts, enqueues, emits nurture.followup-message-drafted, loops", async () => {
    const deps = makeDeps();
    const step = makeTimeoutThenSupersedeStep();

    await makeRunNurturePlan(deps)(event, step);

    expect(deps.draftFn).toHaveBeenCalledOnce();
    expect(deps.draftFn).toHaveBeenCalledWith({ lead: warmLead });
    // The enqueue port receives the pinned draft column set + leadId — the
    // write shape itself (status:"pending" etc.) is pinned in
    // messaging.service.test.ts, at the enqueueDraft seam.
    expect(deps.enqueueDraft).toHaveBeenCalledOnce();
    expect(deps.enqueueDraft).toHaveBeenCalledWith({
      leadId: LEAD_ID,
      channel: "sms",
      subject: null,
      body: "[test] body",
      aiReasoning: "[test]",
      priority: 50,
    });
    expect(deps.sendEvent).toHaveBeenCalledWith({
      name: "nurture.followup-message-drafted",
      data: { leadId: LEAD_ID, messageId: MSG_ID },
    });
  });

  test("step ids are byte-stable, loop-indexed (Inngest memoisation keys)", async () => {
    const deps = makeDeps();
    const step = makeTimeoutThenSupersedeStep();

    await makeRunNurturePlan(deps)(event, step);

    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "load-lead-0",
      "draft-followup-0",
      "enqueue-followup-0",
      "emit-drafted-0",
      "load-lead-1",
    ]);
    // Timeout derives from rhythmForStage (real impl): warm → 7d.
    expect(step.waitForEvent).toHaveBeenCalledWith("wait-stage-change-0", {
      event: "lead.stage-changed",
      match: "data.leadId",
      timeout: "7d",
    });
  });

  test("NURTURE_TEST_RHYTHM overrides the wait timeout outside production", async () => {
    process.env.NURTURE_TEST_RHYTHM = "30s";
    try {
      const deps = makeDeps();
      const step = makeWaitingStep({ data: { leadId: LEAD_ID } }); // superseded after one wait

      await makeRunNurturePlan(deps)(event, step);

      expect(step.waitForEvent).toHaveBeenCalledWith("wait-stage-change-0", {
        event: "lead.stage-changed",
        match: "data.leadId",
        timeout: "30s",
      });
    } finally {
      delete process.env.NURTURE_TEST_RHYTHM;
    }
  });

  test("onFailure handler — emits nurture.plan-paused with original leadId", async () => {
    const deps = makeDeps();
    const workerFn = makeNurturePlanRunner(deps);

    // Boundary cast: the test invokes the handler with a hand-built Inngest
    // failure ctx, not the SDK's full FailureEventArgs shape.
    const onFailure = workerFn.opts.onFailure as unknown as
      | ((ctx: unknown) => Promise<void>)
      | undefined;
    expect(onFailure).toBeDefined();

    await onFailure!({
      event: {
        name: "inngest/function.failed",
        data: {
          event: { data: { leadId: LEAD_ID } },
          error: {},
          function_id: "nurture-plan-runner",
          run_id: "run-1",
        },
      },
      step: {},
      runId: "run-1",
    });

    expect(deps.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "nurture.plan-paused",
        data: { leadId: LEAD_ID },
      }),
    );
  });

  test("function is registered with the stage-changed trigger, per-lead concurrency, retries 8", () => {
    const workerFn = makeNurturePlanRunner(makeDeps());
    expect(workerFn.id()).toBe("nurture-plan-runner");
    expect(workerFn.opts).toMatchObject({
      id: "nurture-plan-runner",
      triggers: [{ event: "lead.stage-changed" }],
      concurrency: [{ key: "event.data.leadId", limit: 1 }],
      retries: 8,
    });
  });
});

// ── InngestTestEngine tests (real Inngest client) ────────────────────────────
//
// These tests verify Inngest-specific behaviour: step IDs, concurrency/retries
// registration, and the full timeout→draft→enqueue→emit→loop→supersede flow
// using the Inngest execution model. Dep-call verification is handled by the
// unit tests above (InngestTestEngine StepMode.Async doesn't invoke the real
// fn for steps present in the mock steps array).

describe("nurturePlanRunner — InngestTestEngine", () => {
  test("drafts on timeout: timeout→draft→enqueue→emit→loop→supersede resolves cleanly", async () => {
    const nurturePlanRunner = makeNurturePlanRunner(makeDeps());
    const t = new InngestTestEngine({ function: nurturePlanRunner });

    const { result } = await t.execute({
      events: [
        {
          name: "lead.stage-changed",
          data: { leadId: LEAD_ID, fromStage: null, toStage: "warm" },
        },
      ],
      steps: [
        { id: "load-lead-0", handler: () => warmLead },
        { id: "wait-stage-change-0", handler: () => null }, // timeout
        { id: "draft-followup-0", handler: () => stubDraftOutput },
        { id: "enqueue-followup-0", handler: () => MSG_ID },
        { id: "emit-drafted-0", handler: () => undefined },
        { id: "load-lead-1", handler: () => warmLead },
        {
          id: "wait-stage-change-1",
          handler: () => ({ data: { leadId: LEAD_ID } }),
        },
      ],
    });

    // void functions round-trip through Inngest JSON as null; just verify no error
    expect(result == null).toBe(true);
  });

  test("hot lead — exits immediately, function resolves without drafting", async () => {
    const nurturePlanRunner = makeNurturePlanRunner(makeDeps());
    const t = new InngestTestEngine({ function: nurturePlanRunner });

    const { result } = await t.execute({
      events: [
        {
          name: "lead.stage-changed",
          data: { leadId: LEAD_ID, fromStage: null, toStage: "hot" },
        },
      ],
      steps: [{ id: "load-lead-0", handler: () => hotLead }],
    });

    expect(result == null).toBe(true);
  });
});
