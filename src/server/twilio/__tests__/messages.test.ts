import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockCreate: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockCreate = rs.fn().mockResolvedValue({
    sid: "SM1234567890abcdef1234567890abcdef",
    status: "queued",
  });

  rs.doMock("~/env", () => ({
    env: {
      TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_FROM_NUMBER: "+14155551234",
      TWILIO_CONSULTANT_NUMBER: "+61400000000",
    },
  }));

  rs.doMock("../client", () => ({
    twilioClient: {
      messages: {
        create: mockCreate,
      },
    },
  }));
});

describe("sendSmsToConsultant", () => {
  test("calls messages.create with consultant number, from number, and body", async () => {
    const { sendSmsToConsultant } = await import("../messages");

    await sendSmsToConsultant("hi");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+61400000000",
        from: "+14155551234",
        body: "hi",
      }),
    );
  });

  test("never receives a lead phone number — to is always the consultant number", async () => {
    const { sendSmsToConsultant } = await import("../messages");

    await sendSmsToConsultant("hi");

    const call = mockCreate.mock.calls[0]![0] as Record<string, string>;
    // The only phone numbers in the call should be consultant + from, never a lead's
    expect(call.to).toBe("+61400000000");
  });

  test("forwards optional statusCallback URL when provided", async () => {
    const { sendSmsToConsultant } = await import("../messages");

    await sendSmsToConsultant("hi", {
      statusCallback: "https://example.com/api/twilio/status",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCallback: "https://example.com/api/twilio/status",
      }),
    );
  });

  test("omits statusCallback when not provided", async () => {
    const { sendSmsToConsultant } = await import("../messages");

    await sendSmsToConsultant("hi");

    const call = mockCreate.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.statusCallback).toBeUndefined();
  });

  test("returns sid, status, and sentAt Date", async () => {
    const { sendSmsToConsultant } = await import("../messages");

    const result = await sendSmsToConsultant("hi");

    expect(result.sid).toBe("SM1234567890abcdef1234567890abcdef");
    expect(result.status).toBe("queued");
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  test("propagates Twilio errors without swallowing", async () => {
    mockCreate.mockRejectedValue(
      new Error("Twilio API error: 401 Unauthorized"),
    );
    const { sendSmsToConsultant } = await import("../messages");

    await expect(sendSmsToConsultant("hi")).rejects.toThrow(
      "Twilio API error: 401 Unauthorized",
    );
  });
});
