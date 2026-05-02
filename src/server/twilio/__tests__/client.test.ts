import { beforeEach, expect, rs, test } from "@rstest/core";

let mockTwilioConstructor: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockTwilioConstructor = rs.fn().mockReturnValue({
    messages: { create: rs.fn() },
  });

  rs.doMock("~/env", () => ({
    env: {
      TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_FROM_NUMBER: "+14155551234",
      TWILIO_CONSULTANT_NUMBER: "+61400000000",
    },
  }));

  rs.doMock("twilio", () => ({
    default: mockTwilioConstructor,
  }));
});

test("twilioClient is exported and instantiated with env credentials", async () => {
  const { twilioClient } = await import("../client");
  expect(twilioClient).toBeDefined();
  expect(mockTwilioConstructor).toHaveBeenCalledWith(
    "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "test-auth-token",
  );
});

test("env vars unset → twilioClient is null", async () => {
  rs.doMock("~/env", () => ({
    env: {
      TWILIO_ACCOUNT_SID: undefined,
      TWILIO_AUTH_TOKEN: undefined,
      TWILIO_FROM_NUMBER: undefined,
      TWILIO_CONSULTANT_NUMBER: undefined,
    },
  }));

  const { twilioClient } = await import("../client");
  expect(twilioClient).toBeNull();
  expect(mockTwilioConstructor).not.toHaveBeenCalled();
});
