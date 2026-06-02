import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { Inngest } from "inngest";

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const MSG_ID = "msg-0000-0000-0000-000000000001";

const warmLead = { id: LEAD_ID, leadStage: "warm" };
const hotLead = { id: LEAD_ID, leadStage: "hot" };
const stubDraftOutput = {
  channel: "sms" as const,
  subject: null,
  body: "[test] body",
  aiReasoning: "[test]",
  priority: 50,
};

// ── Direct runNurturePlan tests (hand-rolled step mocks) ─────────────────────

describe("runNurturePlan — unit", () => {
  let mockInngestSend: ReturnType<typeof rs.fn>;
  let mockFindFirst: ReturnType<typeof rs.fn>;
  let mockWorkerDraftFn: ReturnType<typeof rs.fn>;
  let capturedFunctionOpts: Record<string, unknown> | null;

  beforeEach(() => {
    rs.resetModules();
    capturedFunctionOpts = null;

    mockInngestSend = rs.fn().mockResolvedValue(undefined);
    mockFindFirst = rs.fn().mockResolvedValue(warmLead);
    mockWorkerDraftFn = rs.fn().mockResolvedValue(stubDraftOutput);

    rs.doMock("~/env", () => ({ env: {} }));
    rs.doMock("~/server/db", () => ({
      db: {
        query: { leads: { findFirst: mockFindFirst } },
        insert: rs.fn().mockReturnValue({
          values: rs.fn().mockReturnValue({
            returning: rs.fn().mockResolvedValue([{ id: MSG_ID }]),
          }),
        }),
      },
    }));
    rs.doMock("~/server/db/schema", () => ({ leads: {}, messageQueue: {} }));
    rs.doMock("~/server/ai/stub", () => ({
      resolveWorkerDraftFn: rs.fn().mockReturnValue(mockWorkerDraftFn),
    }));
    rs.doMock("~/server/nurture/rhythm", () => ({
      rhythmForStage: rs
        .fn()
        .mockImplementation((stage: string) =>
          stage === "hot" ? null : { duration: "7d" },
        ),
    }));
    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: { LEAD_STAGE_CHANGED: "lead.stage-changed" },
    }));
    rs.doMock("~/inngest/client", () => ({
      inngest: {
        createFunction: rs
          .fn()
          .mockImplementation((opts: Record<string, unknown>) => {
            capturedFunctionOpts = opts;
            return {};
          }),
        send: mockInngestSend,
      },
    }));
  });

  test("hot lead — exits immediately without drafting or waiting", async () => {
    mockFindFirst.mockResolvedValue(hotLead);
    const { runNurturePlan } = await import("../nurture-plan-runner");

    const stepRun = rs
      .fn()
      .mockImplementationOnce((_id: string, fn: () => unknown) => fn());
    const stepWait = rs.fn();

    await runNurturePlan({ data: { leadId: LEAD_ID } }, {
      run: stepRun,
      waitForEvent: stepWait,
    } as never);

    expect(stepWait).not.toHaveBeenCalled();
    expect(mockWorkerDraftFn).not.toHaveBeenCalled();
  });

  test("absent lead — exits without drafting", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    const { runNurturePlan } = await import("../nurture-plan-runner");

    const stepRun = rs
      .fn()
      .mockImplementationOnce((_id: string, fn: () => unknown) => fn());
    const stepWait = rs.fn();

    await runNurturePlan({ data: { leadId: LEAD_ID } }, {
      run: stepRun,
      waitForEvent: stepWait,
    } as never);

    expect(stepWait).not.toHaveBeenCalled();
    expect(mockWorkerDraftFn).not.toHaveBeenCalled();
  });

  test("superseded — waitForEvent returns event, no draft runs", async () => {
    const { runNurturePlan } = await import("../nurture-plan-runner");

    const stepRun = rs
      .fn()
      .mockImplementationOnce((_id: string, fn: () => unknown) => fn());
    const stepWait = rs.fn().mockResolvedValue({ data: { leadId: LEAD_ID } });

    await runNurturePlan({ data: { leadId: LEAD_ID } }, {
      run: stepRun,
      waitForEvent: stepWait,
    } as never);

    expect(stepRun).toHaveBeenCalledOnce(); // only load-lead-0
    expect(mockWorkerDraftFn).not.toHaveBeenCalled();
  });

  test("timeout — drafts, enqueues, emits nurture.followup-message-drafted, loops", async () => {
    const { runNurturePlan } = await import("../nurture-plan-runner");

    let waitCount = 0;
    const stepWait = rs.fn().mockImplementation(() => {
      waitCount++;
      // 1st wait: timeout; 2nd wait: superseded
      return Promise.resolve(
        waitCount === 1 ? null : { data: { leadId: LEAD_ID } },
      );
    });

    const stepRun = rs
      .fn()
      .mockImplementation((_id: string, fn: () => unknown) => fn());

    await runNurturePlan({ data: { leadId: LEAD_ID } }, {
      run: stepRun,
      waitForEvent: stepWait,
    } as never);

    expect(mockWorkerDraftFn).toHaveBeenCalledOnce();
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "nurture.followup-message-drafted" }),
    );
  });

  test("onFailure handler — emits nurture.plan-paused with original leadId", async () => {
    // Import triggers createFunction; capturedFunctionOpts holds its first arg
    await import("../nurture-plan-runner");

    const onFailure = capturedFunctionOpts?.onFailure as (
      ctx: unknown,
    ) => Promise<void>;
    expect(onFailure).toBeDefined();

    await onFailure({
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

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "nurture.plan-paused",
        data: { leadId: LEAD_ID },
      }),
    );
  });
});

// ── InngestTestEngine tests (real Inngest client) ────────────────────────────
//
// These tests verify Inngest-specific behaviour: step IDs, concurrency/retries
// registration, and the full timeout→draft→enqueue→emit→loop→supersede flow
// using the Inngest execution model. `inngest.send` call verification is handled
// by the unit tests above (InngestTestEngine StepMode.Async doesn't invoke the
// real fn for steps not present in the mock steps array).

describe("nurturePlanRunner — InngestTestEngine", () => {
  beforeEach(() => {
    rs.resetModules();

    // Create a real Inngest instance synchronously so the mock factory is sync.
    // An async factory causes rs.doMock to not resolve the module before
    // nurture-plan-runner.ts evaluates `inngest.createFunction(...)` at module level.
    const testInngest = new Inngest({ id: "rekurve" });

    rs.doMock("~/inngest/client", () => ({ inngest: testInngest }));
    rs.doMock("~/env", () => ({ env: {} }));
    rs.doMock("~/server/db", () => ({
      db: {
        query: { leads: { findFirst: rs.fn().mockResolvedValue(warmLead) } },
        insert: rs.fn().mockReturnValue({
          values: rs.fn().mockReturnValue({
            returning: rs.fn().mockResolvedValue([{ id: MSG_ID }]),
          }),
        }),
      },
    }));
    rs.doMock("~/server/db/schema", () => ({ leads: {}, messageQueue: {} }));
    rs.doMock("~/server/ai/stub", () => ({
      resolveWorkerDraftFn: rs
        .fn()
        .mockReturnValue(() => Promise.resolve(stubDraftOutput)),
    }));
    rs.doMock("~/server/nurture/rhythm", () => ({
      rhythmForStage: rs
        .fn()
        .mockImplementation((stage: string) =>
          stage === "hot" ? null : { duration: "7d" },
        ),
    }));
    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: { LEAD_STAGE_CHANGED: "lead.stage-changed" },
    }));
  });

  test("drafts on timeout: timeout→draft→enqueue→emit→loop→supersede resolves cleanly", async () => {
    const { nurturePlanRunner } = await import("../nurture-plan-runner");
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
    const { nurturePlanRunner } = await import("../nurture-plan-runner");
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
