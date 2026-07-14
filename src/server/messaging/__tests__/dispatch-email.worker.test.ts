import { beforeAll, describe, expect, rs, test } from "@rstest/core";

import { neutraliseWorkerImports } from "~/server/__tests__/import-neutraliser";
import { makeWaitingStep } from "~/server/inngest/__tests__/step-fake";
import type { EventPayload } from "~/server/inngest/events";
import type { DispatchEmailWorkerDeps } from "../dispatch-email.worker";

const MSG_ID = "msg-0000-0000-0000-000000000001";
const LEAD_ID = "lead-0000-0000-0000-000000000001";

// What the loadDispatchable port returns for a still-dispatchable row (the
// status/sentAt guards live inside the service; the worker only sees row|null).
const approvedEmail = { subject: "Following up", body: "Hi Jane" };

// Factory seam (adr020): behaviour is asserted through a fake deps object, not
// module mocks; neutraliseWorkerImports() handles the import-time env/db
// graph (rationale documented on the helper).
let makeRunDispatchEmail: (
  deps: DispatchEmailWorkerDeps,
) => (event: unknown, step: unknown) => Promise<void>;
let workerFn: { id: () => string; opts: Record<string, unknown> };

beforeAll(async () => {
  neutraliseWorkerImports();
  const mod = await import("../dispatch-email.worker");
  makeRunDispatchEmail = mod.makeRunDispatchEmail as never;
  workerFn = mod.makeDispatchEmailWorker(makeDeps() as never) as never;
});

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    loadDispatchable: rs.fn().mockResolvedValue(approvedEmail),
    markDispatching: rs.fn().mockResolvedValue(undefined),
    recordEmailSend: rs.fn().mockResolvedValue(undefined),
    stampSent: rs.fn().mockResolvedValue(undefined),
    stampEngagement: rs.fn().mockResolvedValue(undefined),
    resolveOwnerUserId: rs.fn().mockResolvedValue("owner-user-id"),
    getLeadContact: rs
      .fn()
      .mockResolvedValue({ email: "jane@example.com", phone: null }),
    sendEmail: rs.fn().mockResolvedValue({ sentAt: new Date() }),
    sendEvent: rs.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Typed against the EVENT_REGISTRY payload — a key drift fails typecheck.
const event: { data: EventPayload<"message.approval-requested"> } = {
  data: {
    messageId: MSG_ID,
    correlationId: MSG_ID,
    channel: "email",
    leadId: LEAD_ID,
    body: "Hi Jane",
  },
};

describe("runDispatchEmail — unit", () => {
  test("happy path: sends with the correlation header, writes conversation, stamps sentAt + activity id", async () => {
    const deps = makeDeps();
    const step = makeWaitingStep({
      data: { correlationId: MSG_ID, hubspotActivityId: "hs-eng-1" },
    });

    await makeRunDispatchEmail(deps as never)(event, step as never);

    // dispatching_at fence stamped before the send.
    expect(deps.markDispatching).toHaveBeenCalledWith(MSG_ID);
    // Sent via Graph with correlationId === messageId (header present).
    expect(deps.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner-user-id",
        to: "jane@example.com",
        subject: "Following up",
        body: "Hi Jane",
        correlationId: MSG_ID,
      }),
    );
    // Conversation write + sentAt stamp: "write-conversation" performs the
    // idempotent insert + stamp (recordEmailSend); the frozen second step id
    // "update-message-status" is the stamp-only port (stampSent) — replay
    // compatibility for in-flight runs that memoised the old insert-only step.
    expect(deps.recordEmailSend).toHaveBeenCalledTimes(1);
    expect(deps.recordEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: MSG_ID,
        leadId: LEAD_ID,
        subject: "Following up",
        body: "Hi Jane",
        sentAt: expect.any(Date),
      }),
    );
    expect(deps.stampSent).toHaveBeenCalledTimes(1);
    expect(deps.stampSent).toHaveBeenCalledWith({
      messageId: MSG_ID,
      sentAt: expect.any(Date),
    });
    // Engagement matched: activity id stamped, no timeout hand-off.
    expect(deps.stampEngagement).toHaveBeenCalledWith({
      messageId: MSG_ID,
      hubspotActivityId: "hs-eng-1",
    });
    expect(deps.sendEvent).not.toHaveBeenCalled();
  });

  test("step ids are byte-stable (Inngest memoisation keys)", async () => {
    const deps = makeDeps();
    const step = makeWaitingStep({
      data: { correlationId: MSG_ID, hubspotActivityId: "hs-eng-1" },
    });

    await makeRunDispatchEmail(deps as never)(event, step as never);

    expect(step.run.mock.calls.map((c) => c[0])).toEqual([
      "verify-still-approved",
      "send-via-graph",
      "write-conversation",
      "update-message-status",
      "stamp-activity-id",
    ]);
    expect(step.waitForEvent).toHaveBeenCalledWith("wait-engagement-created", {
      event: "hubspot.email.engagement-created",
      match: "data.correlationId",
      timeout: "1h",
    });
  });

  test("timeout: emits hubspot.engagement-missed and does not stamp an activity id", async () => {
    const deps = makeDeps();
    const step = makeWaitingStep(null); // waitForEvent times out

    await makeRunDispatchEmail(deps as never)(event, step as never);

    expect(deps.sendEmail).toHaveBeenCalledOnce();
    expect(step.run.mock.calls.map((c) => c[0])).toContain(
      "emit-engagement-missed",
    );
    expect(deps.sendEvent).toHaveBeenCalledWith({
      name: "hubspot.engagement-missed",
      data: { messageId: MSG_ID, leadId: LEAD_ID, correlationId: MSG_ID },
    });
    expect(deps.stampEngagement).not.toHaveBeenCalled();
  });

  test("cancellation race: dismissed row → loadDispatchable null → no send, exits cleanly", async () => {
    // The dismissed-status guard lives in messagingService.loadDispatchable
    // (see messaging.service tests); the worker maps null to an early return.
    const deps = makeDeps({
      loadDispatchable: rs.fn().mockResolvedValue(null),
    });
    const step = makeWaitingStep(null);

    await makeRunDispatchEmail(deps as never)(event, step as never);

    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.recordEmailSend).not.toHaveBeenCalled();
    expect(step.waitForEvent).not.toHaveBeenCalled();
  });

  test("idempotent re-entry: sentAt already set → loadDispatchable null → no send", async () => {
    // The sentAt≠null guard also lives in the service port — same null path.
    const deps = makeDeps({
      loadDispatchable: rs.fn().mockResolvedValue(null),
    });
    const step = makeWaitingStep(null);

    await makeRunDispatchEmail(deps as never)(event, step as never);

    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(step.waitForEvent).not.toHaveBeenCalled();
  });

  test("edited_and_approved is also dispatchable (port returns the row)", async () => {
    const deps = makeDeps({
      loadDispatchable: rs
        .fn()
        .mockResolvedValue({ ...approvedEmail, status: "edited_and_approved" }),
    });
    const step = makeWaitingStep({
      data: { correlationId: MSG_ID, hubspotActivityId: "hs-eng-2" },
    });

    await makeRunDispatchEmail(deps as never)(event, step as never);

    expect(deps.sendEmail).toHaveBeenCalledOnce();
  });

  test("lead without an email → send step throws (retryable), nothing recorded", async () => {
    const deps = makeDeps({
      getLeadContact: rs.fn().mockResolvedValue({ email: null }),
    });
    const step = makeWaitingStep(null);

    await expect(
      makeRunDispatchEmail(deps as never)(event, step as never),
    ).rejects.toThrow(/has no email/);
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.recordEmailSend).not.toHaveBeenCalled();
  });

  // NOTE: "skips the insert when a conversation already exists" moved to the
  // messagingService.recordEmailSend seam (idempotency is a service concern
  // now); the integration test still proves it end-to-end — the
  // recordEmailSend + stampSent pair above inserts exactly one conversation
  // row on real Neon.

  test("function is registered with the email-only trigger and per-message concurrency", () => {
    expect(workerFn.id()).toBe("dispatch-email");
    expect(workerFn.opts).toMatchObject({
      id: "dispatch-email",
      triggers: [
        {
          event: "message.approval-requested",
          if: "event.data.channel == 'email'",
        },
      ],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 4,
    });
  });
});
