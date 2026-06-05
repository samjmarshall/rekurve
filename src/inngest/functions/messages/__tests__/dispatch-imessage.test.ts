import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const MSG_ID = "msg-0000-0000-0000-000000000003";
const LEAD_ID = "lead-0000-0000-0000-000000000003";

const approvedImessage = {
  id: MSG_ID,
  leadId: LEAD_ID,
  channel: "imessage" as const,
  status: "approved" as const,
  body: "Hi Jane, your lot is ready.",
  subject: null,
  sentAt: null,
};

describe("runDispatchImessage — unit", () => {
  let mockMsgFindFirst: ReturnType<typeof rs.fn>;
  let capturedFunctionOpts: Record<string, unknown> | null;

  beforeEach(() => {
    rs.resetModules();
    capturedFunctionOpts = null;

    mockMsgFindFirst = rs.fn().mockResolvedValue(approvedImessage);

    rs.doMock("~/env", () => ({ env: {} }));
    rs.doMock("~/server/db", () => ({
      db: {
        query: { messageQueue: { findFirst: mockMsgFindFirst } },
      },
    }));
    rs.doMock("~/server/db/schema", () => ({ messageQueue: {} }));
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
      channel: "imessage",
      leadId: LEAD_ID,
    },
  };

  test("cancellation: dismissed row → resolves cleanly, send step never runs", async () => {
    mockMsgFindFirst.mockResolvedValue({
      ...approvedImessage,
      status: "dismissed",
    });
    const { runDispatchImessage } = await import("../dispatch-imessage");
    const step = fakeStep();

    // Should resolve without throwing (no send attempted).
    await expect(
      runDispatchImessage(event, step as never),
    ).resolves.toBeUndefined();
    // verify ran once; send step was never reached.
    expect(step.run).toHaveBeenCalledTimes(1);
  });

  test("not implemented: approved row → send step throws device-bridge error", async () => {
    const { runDispatchImessage } = await import("../dispatch-imessage");
    const step = fakeStep();

    await expect(runDispatchImessage(event, step as never)).rejects.toThrow(
      /device-bridge not implemented/,
    );
  });

  test("function is registered with the imessage-only trigger, retries:0", async () => {
    await import("../dispatch-imessage");

    expect(capturedFunctionOpts).toMatchObject({
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
