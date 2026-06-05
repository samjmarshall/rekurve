import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockGraphClientForUser: ReturnType<typeof rs.fn>;
let mockApiPost: ReturnType<typeof rs.fn>;

const BCC_ADDRESS = "bcc-12345@bcc.hubspot.com";

function buildMockGraphClient() {
  mockApiPost = rs.fn().mockResolvedValue(undefined);
  const mockApi = rs.fn().mockReturnValue({ post: mockApiPost });
  return { api: mockApi };
}

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_BCC_ADDRESS: BCC_ADDRESS,
      MS_GRAPH_CLIENT_ID: "test-client-id",
      MS_GRAPH_CLIENT_SECRET: "test-secret",
      MS_GRAPH_REDIRECT_URI:
        "https://rekurve.localhost/api/auth/ms-graph/callback",
    },
  }));

  mockGraphClientForUser = rs.fn().mockResolvedValue(buildMockGraphClient());

  rs.doMock("../client", () => ({
    graphClientForUser: mockGraphClientForUser,
    MsGraphNotConnectedError: class MsGraphNotConnectedError extends Error {
      constructor() {
        super("Microsoft account not connected");
        this.name = "MsGraphNotConnectedError";
      }
    },
  }));
});

describe("sendEmail", () => {
  test("calls sendMail with correct to, subject, body, saveToSentItems", async () => {
    const { sendEmail } = await import("../emails");

    await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Following up on your enquiry",
      body: "Hi Jane, just checking in.",
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          subject: "Following up on your enquiry",
          body: expect.objectContaining({
            contentType: "Text",
            content: "Hi Jane, just checking in.",
          }),
          toRecipients: [{ emailAddress: { address: "lead@example.com" } }],
        }),
        saveToSentItems: true,
      }),
    );
  });

  test("always BCCs HUBSPOT_BCC_ADDRESS", async () => {
    const { sendEmail } = await import("../emails");

    await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Test",
      body: "Test body",
    });

    const payload = mockApiPost.mock.calls[0]![0] as {
      message: { bccRecipients: { emailAddress: { address: string } }[] };
    };
    const bccAddresses = payload.message.bccRecipients.map(
      (r) => r.emailAddress.address,
    );
    expect(bccAddresses).toContain(BCC_ADDRESS);
  });

  test("additional bcc addresses are included alongside HUBSPOT_BCC_ADDRESS", async () => {
    const { sendEmail } = await import("../emails");

    await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Test",
      body: "Test body",
      bcc: ["extra@example.com"],
    });

    const payload = mockApiPost.mock.calls[0]![0] as {
      message: { bccRecipients: { emailAddress: { address: string } }[] };
    };
    const bccAddresses = payload.message.bccRecipients.map(
      (r) => r.emailAddress.address,
    );
    expect(bccAddresses).toContain(BCC_ADDRESS);
    expect(bccAddresses).toContain("extra@example.com");
  });

  test("calls /me/sendMail endpoint", async () => {
    const mockClient = buildMockGraphClient();
    mockGraphClientForUser.mockResolvedValue(mockClient);

    const { sendEmail } = await import("../emails");
    await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Test",
      body: "Test body",
    });

    expect(mockClient.api).toHaveBeenCalledWith("/me/sendMail");
  });

  test("returns sentAt as a Date", async () => {
    const { sendEmail } = await import("../emails");
    const before = new Date();

    const result = await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Test",
      body: "Test body",
    });

    expect(result.sentAt).toBeInstanceOf(Date);
    expect(result.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  test("stamps the X-Rekurve-Correlation-Id header when correlationId is set", async () => {
    const { sendEmail } = await import("../emails");

    await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Test",
      body: "Test body",
      correlationId: "msg-123",
    });

    const payload = mockApiPost.mock.calls[0]![0] as {
      message: { internetMessageHeaders?: { name: string; value: string }[] };
    };
    expect(payload.message.internetMessageHeaders).toEqual([
      { name: "X-Rekurve-Correlation-Id", value: "msg-123" },
    ]);
  });

  test("omits internetMessageHeaders when no correlationId is given", async () => {
    const { sendEmail } = await import("../emails");

    await sendEmail({
      userId: "user-1",
      to: "lead@example.com",
      subject: "Test",
      body: "Test body",
    });

    const payload = mockApiPost.mock.calls[0]![0] as {
      message: { internetMessageHeaders?: unknown };
    };
    expect(payload.message.internetMessageHeaders).toBeUndefined();
  });

  test("propagates Graph SDK errors without swallowing", async () => {
    const mockClient = buildMockGraphClient();
    mockApiPost.mockRejectedValue(new Error("Graph API 503"));
    mockGraphClientForUser.mockResolvedValue(mockClient);

    const { sendEmail } = await import("../emails");

    await expect(
      sendEmail({
        userId: "user-1",
        to: "lead@example.com",
        subject: "Test",
        body: "Test body",
      }),
    ).rejects.toThrow("Graph API 503");
  });

  test("throws MsGraphNotConnectedError when user has no token row", async () => {
    const { MsGraphNotConnectedError } = await import("../client");
    mockGraphClientForUser.mockRejectedValue(new MsGraphNotConnectedError());

    const { sendEmail } = await import("../emails");

    await expect(
      sendEmail({
        userId: "user-1",
        to: "lead@example.com",
        subject: "Test",
        body: "Test body",
      }),
    ).rejects.toThrow("Microsoft account not connected");
  });
});
