import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";

const LEAD_ID = "660e8400-e29b-41d4-a716-446655440001";
const MSG_ID = "550e8400-e29b-41d4-a716-446655440000";

const mockMessage = {
  id: MSG_ID,
  leadId: LEAD_ID,
  channel: "sms" as const,
  subject: null,
  body: "Hi Jane, your lot is ready.",
  sentAt: null,
};

let mockSendSmsToConsultant: ReturnType<typeof rs.fn>;
let mockInsert: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDb: Record<string, unknown>;

beforeEach(() => {
  rs.resetModules();

  mockSendSmsToConsultant = rs.fn().mockResolvedValue({
    sid: "SMabc123",
    status: "queued",
    sentAt: new Date("2026-04-29T10:00:00Z"),
  });

  const insertReturning = rs
    .fn()
    .mockResolvedValue([{ id: "conv-456", leadId: LEAD_ID }]);
  const insertValues = rs.fn().mockReturnValue({ returning: insertReturning });
  mockInsert = rs.fn().mockReturnValue({ values: insertValues });

  const updateWhere = rs.fn().mockResolvedValue([]);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  mockDb = { insert: mockInsert, update: mockUpdate };

  rs.doMock("~/env", () => ({
    env: {
      BETTER_AUTH_URL: "https://www.localhost",
      TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_FROM_NUMBER: "+14155551234",
      TWILIO_CONSULTANT_NUMBER: "+61400000000",
    },
  }));

  rs.doMock("~/server/twilio", () => ({
    sendSmsToConsultant: mockSendSmsToConsultant,
  }));
});

describe("dispatchSms", () => {
  test("calls sendSmsToConsultant with the message body and status callback URL", async () => {
    const { dispatchSms } = await import("../sms-dispatch");

    await dispatchSms({ db: mockDb as never, message: mockMessage as never });

    expect(mockSendSmsToConsultant).toHaveBeenCalledWith(
      "Hi Jane, your lot is ready.",
      { statusCallback: "https://www.localhost/api/twilio/status" },
    );
  });

  test("inserts outbound conversations row with correct fields on success", async () => {
    const { dispatchSms } = await import("../sms-dispatch");

    await dispatchSms({ db: mockDb as never, message: mockMessage as never });

    expect(mockInsert).toHaveBeenCalled();
    const insertValues =
      mockInsert.mock.results[0]!.value.values.mock.calls[0]![0];
    expect(insertValues).toMatchObject({
      leadId: LEAD_ID,
      messageQueueId: MSG_ID,
      channel: "sms",
      direction: "outbound",
      deliveryMethod: "sms",
      body: "Hi Jane, your lot is ready.",
      twilioMessageSid: "SMabc123",
      deliveryStatus: "queued",
      subject: null,
      hubspotActivityId: null,
    });
  });

  test("stamps messageQueue.sentAt on success", async () => {
    const { dispatchSms } = await import("../sms-dispatch");

    await dispatchSms({ db: mockDb as never, message: mockMessage as never });

    expect(mockUpdate).toHaveBeenCalled();
  });

  test("returns conversationId from insert", async () => {
    const { dispatchSms } = await import("../sms-dispatch");

    const result = await dispatchSms({
      db: mockDb as never,
      message: mockMessage as never,
    });

    expect(result.conversationId).toBe("conv-456");
  });

  test("Twilio error → TRPCError INTERNAL_SERVER_ERROR; insert and update not called", async () => {
    mockSendSmsToConsultant.mockRejectedValue(
      new Error("Twilio API error: 401"),
    );
    const { dispatchSms } = await import("../sms-dispatch");

    try {
      await dispatchSms({ db: mockDb as never, message: mockMessage as never });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect((e as TRPCError).message).toBe(
        "Failed to send SMS. Please try again.",
      );
    }

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
