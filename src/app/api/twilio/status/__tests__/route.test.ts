import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockValidateRequest: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockValidateRequest = rs.fn().mockReturnValue(true);

  rs.doMock("~/env", () => ({
    env: {
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      TWILIO_FROM_NUMBER: "+14155551234",
      TWILIO_CONSULTANT_NUMBER: "+61400000000",
    },
  }));

  rs.doMock("twilio", () => ({
    default: rs.fn(),
    validateRequest: mockValidateRequest,
  }));

  const updateWhere = rs.fn().mockResolvedValue([]);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  rs.doMock("~/server/db", () => ({
    db: { update: mockUpdate },
  }));

  rs.doMock("~/server/db/schema", () => ({
    conversations: {
      twilioMessageSid: "twilio_message_sid",
      deliveryStatus: "delivery_status",
    },
  }));
});

function makeRequest(opts: {
  signature?: string | null;
  body?: string;
}): Request {
  const headers = new Headers();
  headers.set("content-type", "application/x-www-form-urlencoded");
  if (opts.signature !== null) {
    headers.set(
      "x-twilio-signature",
      opts.signature ?? "valid-twilio-signature",
    );
  }
  return new Request("https://example.com/api/twilio/status", {
    method: "POST",
    headers,
    body: opts.body ?? "MessageSid=SMxxx&MessageStatus=delivered",
  });
}

describe("POST /api/twilio/status", () => {
  test("returns 403 when X-Twilio-Signature header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ signature: null }));
    expect(response.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("returns 403 when validateRequest returns false", async () => {
    mockValidateRequest.mockReturnValue(false);
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("valid signature with MessageStatus=delivered → updates conversations row and returns 200", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({ body: "MessageSid=SMxxx&MessageStatus=delivered" }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
    expect(mockUpdate).toHaveBeenCalled();
    const setCall = mockUpdate.mock.results[0]!.value.set.mock.calls[0]![0];
    expect(setCall).toMatchObject({ deliveryStatus: "delivered" });
  });

  test("valid signature with MessageStatus=failed → updates row to failed", async () => {
    const { POST } = await import("../route");
    await POST(
      makeRequest({ body: "MessageSid=SMfailed&MessageStatus=failed" }),
    );
    const setCall = mockUpdate.mock.results[0]!.value.set.mock.calls[0]![0];
    expect(setCall).toMatchObject({ deliveryStatus: "failed" });
  });

  test("valid signature with unknown SID → 200 returned; update still called", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({ body: "MessageSid=SMunknown&MessageStatus=delivered" }),
    );
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  test("internal DB exception → 200 returned (no retry storm)", async () => {
    const updateWhere = rs
      .fn()
      .mockRejectedValue(new Error("DB connection lost"));
    const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
    mockUpdate.mockReturnValue({ set: updateSet });

    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(200);
  });
});
