import { beforeAll, describe, expect, rs, test } from "@rstest/core";

import { makeStep } from "~/server/inngest/__tests__/step-fake";
import type { EventPayload } from "~/server/inngest/events";
import type { DispatchImessageWorkerDeps } from "../dispatch-imessage.worker";

const MSG_ID = "msg-0000-0000-0000-000000000003";
const LEAD_ID = "lead-0000-0000-0000-000000000003";

// What the loadDispatchable port returns for a still-dispatchable row (the
// status/sentAt guards live inside the service; the worker only sees row|null).
const approvedImessage = { body: "Hi Jane, your lot is ready." };

// Factory seam (adr020): behaviour is asserted through a fake deps object, not
// module mocks. The two rs.doMock blocks below are import neutralisers only —
// the worker file's event-name import (~/server/outbox) pulls in
// ~/server/db (module-scope neon() needs DATABASE_URL) and ~/env (validates
// at import).
let makeRunDispatchImessage: (
  deps: DispatchImessageWorkerDeps,
) => (event: unknown, step: unknown) => Promise<void>;
let workerFn: { id: () => string; opts: Record<string, unknown> };

beforeAll(async () => {
  rs.doMock("~/env", () => ({ env: {} }));
  rs.doMock("~/server/db", () => ({ db: {} }));
  const mod = await import("../dispatch-imessage.worker");
  makeRunDispatchImessage = mod.makeRunDispatchImessage as never;
  workerFn = mod.makeDispatchImessageWorker({
    loadDispatchable: rs.fn().mockResolvedValue(approvedImessage),
  } as never) as never;
});

// Typed against the EVENT_REGISTRY payload — a key drift fails typecheck.
const event: { data: EventPayload<"message.approval-requested"> } = {
  data: {
    messageId: MSG_ID,
    correlationId: MSG_ID,
    channel: "imessage",
    leadId: LEAD_ID,
  },
};

describe("runDispatchImessage — unit", () => {
  test("cancellation: dismissed row → loadDispatchable null → resolves cleanly, send step never runs", async () => {
    // The dismissed-status guard lives in messagingService.loadDispatchable
    // (see messaging.service tests); the worker maps null to an early return.
    const deps = { loadDispatchable: rs.fn().mockResolvedValue(null) };
    const step = makeStep();

    // Should resolve without throwing (no send attempted).
    await expect(
      makeRunDispatchImessage(deps as never)(event, step as never),
    ).resolves.toBeUndefined();
    // verify ran once; send step was never reached.
    expect(step.run).toHaveBeenCalledTimes(1);
    expect(step.run.mock.calls[0]![0]).toBe("verify-still-approved");
  });

  test("not implemented: approved row → send step throws device-bridge error", async () => {
    const deps = {
      loadDispatchable: rs.fn().mockResolvedValue(approvedImessage),
    };
    const step = makeStep();

    await expect(
      makeRunDispatchImessage(deps as never)(event, step as never),
    ).rejects.toThrow(/device-bridge not implemented/);
    // Step ids are byte-stable (Inngest memoisation keys).
    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "verify-still-approved",
      "send-via-device-bridge",
    ]);
  });

  test("function is registered with the imessage-only trigger, retries:0", () => {
    expect(workerFn.id()).toBe("dispatch-imessage");
    expect(workerFn.opts).toMatchObject({
      id: "dispatch-imessage",
      triggers: [
        {
          event: "message.approval-requested",
          if: "event.data.channel == 'imessage'",
        },
      ],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 0,
    });
  });
});
