import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const MSG_ID = "msg-0000-0000-0000-000000000002";
const LEAD_ID = "lead-0000-0000-0000-000000000002";

const approvedSms = {
  id: MSG_ID,
  leadId: LEAD_ID,
  channel: "sms" as const,
  status: "approved" as const,
  body: "Hi Jane, your lot is ready.",
  subject: null,
  sentAt: null,
};

describe("runDispatchSms — unit", () => {
  let mockSendSmsToConsultant: ReturnType<typeof rs.fn>;
  let mockMsgFindFirst: ReturnType<typeof rs.fn>;
  let mockUpdateSet: ReturnType<typeof rs.fn>;
  let mockInsertValues: ReturnType<typeof rs.fn>;
  let mockSelectLimit: ReturnType<typeof rs.fn>;
  let capturedFunctionOpts: Record<string, unknown> | null;

  beforeEach(() => {
    rs.resetModules();
    capturedFunctionOpts = null;

    mockSendSmsToConsultant = rs.fn().mockResolvedValue({
      sid: "SMabc",
      status: "queued",
      sentAt: new Date(),
    });
    mockMsgFindFirst = rs.fn().mockResolvedValue(approvedSms);

    const mockUpdateWhere = rs.fn().mockResolvedValue(undefined);
    mockUpdateSet = rs.fn().mockReturnValue({ where: mockUpdateWhere });
    const mockUpdate = rs.fn().mockReturnValue({ set: mockUpdateSet });

    mockInsertValues = rs.fn().mockResolvedValue(undefined);
    const mockInsert = rs.fn().mockReturnValue({ values: mockInsertValues });

    mockSelectLimit = rs.fn().mockResolvedValue([]); // no existing conversation
    const mockSelectWhere = rs.fn().mockReturnValue({ limit: mockSelectLimit });
    const mockSelectFrom = rs.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = rs.fn().mockReturnValue({ from: mockSelectFrom });

    rs.doMock("~/env", () => ({
      env: { BETTER_AUTH_URL: "https://rekurve.localhost" },
    }));
    rs.doMock("~/server/db", () => ({
      db: {
        query: { messageQueue: { findFirst: mockMsgFindFirst } },
        update: mockUpdate,
        insert: mockInsert,
        select: mockSelect,
      },
    }));
    rs.doMock("~/server/db/schema", () => ({
      conversations: {},
      messageQueue: {},
    }));
    rs.doMock("~/server/twilio", () => ({
      sendSmsToConsultant: mockSendSmsToConsultant,
    }));
    rs.doMock("~/server/outbox", () => ({
      MESSAGE_EVENTS: { APPROVAL_REQUESTED: "message.approval-requested" },
    }));
    rs.doMock("~/inngest/client", () => ({
      inngest: {
        createFunction: rs
          .fn()
          .mockImplementation((opts: Record<string, unknown>) => {
            capturedFunctionOpts = opts;
            return {};
          }),
      },
    }));
  });

  function fakeStep() {
    return {
      run: rs.fn().mockImplementation((_id: string, fn: () => unknown) => fn()),
    };
  }

  const event = {
    data: {
      messageId: MSG_ID,
      correlationId: MSG_ID,
      channel: "sms",
      leadId: LEAD_ID,
      body: "Hi Jane, your lot is ready.",
    },
  };

  test("happy path: sends via Twilio with statusCallback, writes conversation, stamps dispatchingAt + sentAt", async () => {
    const { runDispatchSms } = await import("../dispatch-sms");
    const step = fakeStep();

    await runDispatchSms(event, step as never);

    expect(mockSendSmsToConsultant).toHaveBeenCalledWith(
      "Hi Jane, your lot is ready.",
      { statusCallback: "https://rekurve.localhost/api/twilio/status" },
    );
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: LEAD_ID,
        messageQueueId: MSG_ID,
        channel: "sms",
        direction: "outbound",
        deliveryMethod: "sms",
        twilioMessageSid: "SMabc",
        deliveryStatus: "queued",
        subject: null,
        hubspotActivityId: null,
      }),
    );
    const setPayloads = mockUpdateSet.mock.calls.map((c) => c[0]);
    expect(setPayloads).toContainEqual(
      expect.objectContaining({ dispatchingAt: expect.any(Date) }),
    );
    expect(setPayloads).toContainEqual(
      expect.objectContaining({ sentAt: expect.any(Date) }),
    );
  });

  test("missing row → silent no-op, no Twilio call, no insert", async () => {
    mockMsgFindFirst.mockResolvedValue(undefined);
    const { runDispatchSms } = await import("../dispatch-sms");
    const step = fakeStep();

    await expect(runDispatchSms(event, step as never)).resolves.toBeUndefined();
    expect(mockSendSmsToConsultant).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("cancellation race: dismissed row → no Twilio call, no insert", async () => {
    mockMsgFindFirst.mockResolvedValue({ ...approvedSms, status: "dismissed" });
    const { runDispatchSms } = await import("../dispatch-sms");
    const step = fakeStep();

    await runDispatchSms(event, step as never);

    expect(mockSendSmsToConsultant).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("idempotent re-entry: sentAt already set → no Twilio call", async () => {
    mockMsgFindFirst.mockResolvedValue({ ...approvedSms, sentAt: new Date() });
    const { runDispatchSms } = await import("../dispatch-sms");
    const step = fakeStep();

    await runDispatchSms(event, step as never);

    expect(mockSendSmsToConsultant).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("skips the insert when a conversation already exists (Twilio still called)", async () => {
    mockSelectLimit.mockResolvedValue([{ id: "existing-conv" }]);
    const { runDispatchSms } = await import("../dispatch-sms");
    const step = fakeStep();

    await runDispatchSms(event, step as never);

    expect(mockSendSmsToConsultant).toHaveBeenCalledOnce();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("function is registered with the sms-only trigger and per-message concurrency", async () => {
    await import("../dispatch-sms");

    expect(capturedFunctionOpts).toMatchObject({
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
