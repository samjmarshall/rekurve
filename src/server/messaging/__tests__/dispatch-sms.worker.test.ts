import { beforeAll, describe, expect, rs, test } from "@rstest/core";

import { makeStep } from "~/server/inngest/__tests__/step-fake";
import type { EventPayload } from "~/server/inngest/events";
import type { DispatchSmsWorkerDeps } from "../dispatch-sms.worker";

const MSG_ID = "msg-0000-0000-0000-000000000002";
const LEAD_ID = "lead-0000-0000-0000-000000000002";
const STATUS_CALLBACK_URL = "https://rekurve.localhost/api/twilio/status";

// What the loadDispatchable port returns for a still-dispatchable row (the
// status/sentAt guards live inside the service; the worker only sees row|null).
const approvedSms = {
  leadId: LEAD_ID,
  body: "Hi Jane, your lot is ready.",
  subject: null,
};

// Factory seam (adr020): behaviour is asserted through a fake deps object, not
// module mocks. The two rs.doMock blocks below are import neutralisers only —
// the worker file's event-name import (~/server/outbox) pulls in
// ~/server/db (module-scope neon() needs DATABASE_URL) and ~/env (validates
// at import).
let makeRunDispatchSms: (
  deps: DispatchSmsWorkerDeps,
) => (event: unknown, step: unknown) => Promise<void>;
let workerFn: { id: () => string; opts: Record<string, unknown> };

beforeAll(async () => {
  rs.doMock("~/env", () => ({ env: {} }));
  rs.doMock("~/server/db", () => ({ db: {} }));
  const mod = await import("../dispatch-sms.worker");
  makeRunDispatchSms = mod.makeRunDispatchSms as never;
  workerFn = mod.makeDispatchSmsWorker(makeDeps() as never) as never;
});

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    loadDispatchable: rs.fn().mockResolvedValue(approvedSms),
    markDispatching: rs.fn().mockResolvedValue(undefined),
    recordSmsSend: rs.fn().mockResolvedValue(undefined),
    stampSent: rs.fn().mockResolvedValue(undefined),
    sendSmsToConsultant: rs.fn().mockResolvedValue({
      sid: "SMabc",
      status: "queued",
      sentAt: new Date(),
    }),
    statusCallbackUrl: STATUS_CALLBACK_URL,
    ...overrides,
  };
}

// Typed against the EVENT_REGISTRY payload — a key drift fails typecheck.
const event: { data: EventPayload<"message.approval-requested"> } = {
  data: {
    messageId: MSG_ID,
    correlationId: MSG_ID,
    channel: "sms",
    leadId: LEAD_ID,
    body: "Hi Jane, your lot is ready.",
  },
};

describe("runDispatchSms — unit", () => {
  test("happy path: sends via Twilio with statusCallback, writes conversation, stamps dispatchingAt + sentAt", async () => {
    const deps = makeDeps();
    const step = makeStep();

    await makeRunDispatchSms(deps as never)(event, step as never);

    // dispatching_at fence stamped before the Twilio call.
    expect(deps.markDispatching).toHaveBeenCalledWith(MSG_ID);
    expect(deps.sendSmsToConsultant).toHaveBeenCalledWith(
      "Hi Jane, your lot is ready.",
      { statusCallback: STATUS_CALLBACK_URL },
    );
    // Conversation write + sentAt stamp: "write-conversation" performs the
    // idempotent insert + stamp (recordSmsSend); the frozen second step id
    // "update-message-status" is the stamp-only port (stampSent) — replay
    // compatibility for in-flight runs that memoised the old insert-only step.
    expect(deps.recordSmsSend).toHaveBeenCalledTimes(1);
    expect(deps.recordSmsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: MSG_ID,
        leadId: LEAD_ID,
        subject: null,
        body: "Hi Jane, your lot is ready.",
        sid: "SMabc",
        status: "queued",
        sentAt: expect.any(Date),
      }),
    );
    expect(deps.stampSent).toHaveBeenCalledTimes(1);
    expect(deps.stampSent).toHaveBeenCalledWith({
      messageId: MSG_ID,
      sentAt: expect.any(Date),
    });
  });

  test("step ids are byte-stable (Inngest memoisation keys)", async () => {
    const deps = makeDeps();
    const step = makeStep();

    await makeRunDispatchSms(deps as never)(event, step as never);

    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "verify-still-approved",
      "send-sms",
      "write-conversation",
      "update-message-status",
    ]);
  });

  test("missing row → loadDispatchable null → silent no-op, no Twilio call, no insert", async () => {
    const deps = makeDeps({
      loadDispatchable: rs.fn().mockResolvedValue(null),
    });
    const step = makeStep();

    await expect(
      makeRunDispatchSms(deps as never)(event, step as never),
    ).resolves.toBeUndefined();
    expect(deps.sendSmsToConsultant).not.toHaveBeenCalled();
    expect(deps.recordSmsSend).not.toHaveBeenCalled();
  });

  test("cancellation race: dismissed row → loadDispatchable null → no Twilio call, no insert", async () => {
    // The dismissed-status guard lives in messagingService.loadDispatchable
    // (see messaging.service tests); the worker maps null to an early return.
    const deps = makeDeps({
      loadDispatchable: rs.fn().mockResolvedValue(null),
    });
    const step = makeStep();

    await makeRunDispatchSms(deps as never)(event, step as never);

    expect(deps.sendSmsToConsultant).not.toHaveBeenCalled();
    expect(deps.recordSmsSend).not.toHaveBeenCalled();
  });

  test("idempotent re-entry: sentAt already set → loadDispatchable null → no Twilio call", async () => {
    // The sentAt≠null guard also lives in the service port — same null path.
    const deps = makeDeps({
      loadDispatchable: rs.fn().mockResolvedValue(null),
    });
    const step = makeStep();

    await makeRunDispatchSms(deps as never)(event, step as never);

    expect(deps.sendSmsToConsultant).not.toHaveBeenCalled();
    expect(deps.recordSmsSend).not.toHaveBeenCalled();
  });

  // NOTE: "skips the insert when a conversation already exists" moved to the
  // messagingService.recordSmsSend seam (idempotency is a service concern
  // now); the integration test still proves it end-to-end — the recordSmsSend
  // + stampSent pair above inserts exactly one conversation row on real Neon.

  test("function is registered with the sms-only trigger and per-message concurrency", () => {
    expect(workerFn.id()).toBe("dispatch-sms");
    expect(workerFn.opts).toMatchObject({
      id: "dispatch-sms",
      triggers: [
        {
          event: "message.approval-requested",
          if: "event.data.channel == 'sms'",
        },
      ],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 4,
    });
  });
});
