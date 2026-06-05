import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const MSG_ID = "msg-0000-0000-0000-000000000001";
const LEAD_ID = "lead-0000-0000-0000-000000000001";

const approvedEmail = {
  id: MSG_ID,
  leadId: LEAD_ID,
  channel: "email" as const,
  status: "approved" as const,
  subject: "Following up",
  body: "Hi Jane",
  sentAt: null,
};

describe("runDispatchEmail — unit", () => {
  let mockSendEmail: ReturnType<typeof rs.fn>;
  let mockInngestSend: ReturnType<typeof rs.fn>;
  let mockResolveOwner: ReturnType<typeof rs.fn>;
  let mockMsgFindFirst: ReturnType<typeof rs.fn>;
  let mockLeadFindFirst: ReturnType<typeof rs.fn>;
  let mockUpdateSet: ReturnType<typeof rs.fn>;
  let mockInsertValues: ReturnType<typeof rs.fn>;
  let mockSelectLimit: ReturnType<typeof rs.fn>;
  let capturedFunctionOpts: Record<string, unknown> | null;

  beforeEach(() => {
    rs.resetModules();
    capturedFunctionOpts = null;

    mockSendEmail = rs.fn().mockResolvedValue({ sentAt: new Date() });
    mockInngestSend = rs.fn().mockResolvedValue(undefined);
    mockResolveOwner = rs.fn().mockResolvedValue("owner-user-id");
    mockMsgFindFirst = rs.fn().mockResolvedValue(approvedEmail);
    mockLeadFindFirst = rs
      .fn()
      .mockResolvedValue({ email: "jane@example.com" });

    const mockUpdateWhere = rs.fn().mockResolvedValue(undefined);
    mockUpdateSet = rs.fn().mockReturnValue({ where: mockUpdateWhere });
    const mockUpdate = rs.fn().mockReturnValue({ set: mockUpdateSet });

    mockInsertValues = rs.fn().mockResolvedValue(undefined);
    const mockInsert = rs.fn().mockReturnValue({ values: mockInsertValues });

    mockSelectLimit = rs.fn().mockResolvedValue([]); // no existing conversation
    const mockSelectWhere = rs.fn().mockReturnValue({ limit: mockSelectLimit });
    const mockSelectFrom = rs.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = rs.fn().mockReturnValue({ from: mockSelectFrom });

    rs.doMock("~/env", () => ({ env: {} }));
    rs.doMock("~/server/db", () => ({
      db: {
        query: {
          messageQueue: { findFirst: mockMsgFindFirst },
          leads: { findFirst: mockLeadFindFirst },
        },
        update: mockUpdate,
        insert: mockInsert,
        select: mockSelect,
      },
    }));
    rs.doMock("~/server/db/schema", () => ({
      conversations: {},
      leads: {},
      messageQueue: {},
    }));
    rs.doMock("~/server/leads/owner", () => ({
      resolveLeadOwnerUserId: mockResolveOwner,
    }));
    rs.doMock("~/server/ms-graph", () => ({ sendEmail: mockSendEmail }));
    rs.doMock("~/server/outbox", () => ({
      MESSAGE_EVENTS: { APPROVAL_REQUESTED: "message.approval-requested" },
      HUBSPOT_EMAIL_EVENTS: {
        ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
        ENGAGEMENT_MISSED: "hubspot.engagement-missed",
      },
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

  function fakeStep(engagement: unknown) {
    return {
      run: rs.fn().mockImplementation((_id: string, fn: () => unknown) => fn()),
      waitForEvent: rs.fn().mockResolvedValue(engagement),
    };
  }

  const event = {
    data: {
      messageId: MSG_ID,
      correlationId: MSG_ID,
      channel: "email",
      leadId: LEAD_ID,
      body: "Hi Jane",
    },
  };

  test("happy path: sends with the correlation header, writes conversation, stamps sentAt + activity id", async () => {
    const { runDispatchEmail } = await import("../dispatch-email");
    const step = fakeStep({
      data: { correlationId: MSG_ID, hubspotActivityId: "hs-eng-1" },
    });

    await runDispatchEmail(event, step as never);

    // Sent via Graph with correlationId === messageId (header present).
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner-user-id",
        to: "jane@example.com",
        subject: "Following up",
        body: "Hi Jane",
        correlationId: MSG_ID,
      }),
    );
    // Conversation inserted (none existed).
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: LEAD_ID,
        messageQueueId: MSG_ID,
        channel: "email",
        direction: "outbound",
        deliveryMethod: "email",
        hubspotActivityId: null,
      }),
    );
    // dispatching_at fence + sentAt + activity-id stamp all written.
    const setPayloads = mockUpdateSet.mock.calls.map((c) => c[0]);
    expect(setPayloads).toContainEqual(
      expect.objectContaining({ dispatchingAt: expect.any(Date) }),
    );
    expect(setPayloads).toContainEqual(
      expect.objectContaining({ sentAt: expect.any(Date) }),
    );
    expect(setPayloads).toContainEqual({ hubspotActivityId: "hs-eng-1" });
    // No timeout path.
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  test("timeout: emits hubspot.engagement-missed and does not stamp an activity id", async () => {
    const { runDispatchEmail } = await import("../dispatch-email");
    const step = fakeStep(null); // waitForEvent times out

    await runDispatchEmail(event, step as never);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockInngestSend).toHaveBeenCalledWith({
      name: "hubspot.engagement-missed",
      data: { messageId: MSG_ID, leadId: LEAD_ID, correlationId: MSG_ID },
    });
    const setPayloads = mockUpdateSet.mock.calls.map((c) => c[0]);
    expect(setPayloads).not.toContainEqual(
      expect.objectContaining({ hubspotActivityId: expect.anything() }),
    );
  });

  test("cancellation race: dismissed row → no send, exits cleanly", async () => {
    mockMsgFindFirst.mockResolvedValue({
      ...approvedEmail,
      status: "dismissed",
    });
    const { runDispatchEmail } = await import("../dispatch-email");
    const step = fakeStep(null);

    await runDispatchEmail(event, step as never);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(step.waitForEvent).not.toHaveBeenCalled();
  });

  test("idempotent re-entry: sentAt already set → no send", async () => {
    mockMsgFindFirst.mockResolvedValue({
      ...approvedEmail,
      sentAt: new Date(),
    });
    const { runDispatchEmail } = await import("../dispatch-email");
    const step = fakeStep(null);

    await runDispatchEmail(event, step as never);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(step.waitForEvent).not.toHaveBeenCalled();
  });

  test("edited_and_approved is also dispatchable", async () => {
    mockMsgFindFirst.mockResolvedValue({
      ...approvedEmail,
      status: "edited_and_approved",
    });
    const { runDispatchEmail } = await import("../dispatch-email");
    const step = fakeStep({
      data: { correlationId: MSG_ID, hubspotActivityId: "hs-eng-2" },
    });

    await runDispatchEmail(event, step as never);

    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  test("skips the insert when a conversation already exists (idempotent write)", async () => {
    mockSelectLimit.mockResolvedValue([{ id: "existing-conv" }]);
    const { runDispatchEmail } = await import("../dispatch-email");
    const step = fakeStep({
      data: { correlationId: MSG_ID, hubspotActivityId: "hs-eng-3" },
    });

    await runDispatchEmail(event, step as never);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("function is registered with the email-only trigger and per-message concurrency", async () => {
    await import("../dispatch-email");

    expect(capturedFunctionOpts).toMatchObject({
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
