import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockIsValid: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockIsValid = rs.fn();

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_CLIENT_SECRET: "test-secret",
    },
  }));

  rs.doMock("@hubspot/api-client", () => ({
    Signature: { isValid: mockIsValid },
  }));
});

function makeRequest(opts: {
  body?: string;
  signature?: string | null;
  timestamp?: string | null;
}): Request {
  const headers = new Headers();
  if (opts.signature !== null) {
    headers.set("x-hubspot-signature-v3", opts.signature ?? "sig");
  }
  if (opts.timestamp !== null) {
    headers.set(
      "x-hubspot-request-timestamp",
      opts.timestamp ?? String(Date.now()),
    );
  }
  return new Request("https://example.com/api/hubspot/webhook", {
    method: "POST",
    headers,
    body: opts.body ?? '[{"subscriptionType":"contact.creation","objectId":1}]',
  });
}

describe("POST /api/hubspot/webhook", () => {
  test("returns 401 when signature header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ signature: null }));
    expect(response.status).toBe(401);
  });

  test("returns 401 when timestamp header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ timestamp: null }));
    expect(response.status).toBe(401);
  });

  test("returns 401 when timestamp is older than 5 minutes", async () => {
    const { POST } = await import("../route");
    const oldTimestamp = String(Date.now() - 6 * 60 * 1000);
    const response = await POST(makeRequest({ timestamp: oldTimestamp }));
    expect(response.status).toBe(401);
  });

  test("returns 401 when signature is invalid", async () => {
    mockIsValid.mockReturnValue(false);
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
  });

  test("returns 200 when signature is valid", async () => {
    mockIsValid.mockReturnValue(true);
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
  });
});
