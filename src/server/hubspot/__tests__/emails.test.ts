import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockGetById: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockGetById = rs.fn();

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_ACCESS_TOKEN: "test-token",
    },
  }));

  rs.doMock("../client", () => ({
    hubspot: {
      crm: {
        objects: {
          emails: {
            basicApi: {
              getById: mockGetById,
            },
          },
        },
      },
    },
  }));
});

const MOCK_EMAIL_RESPONSE = {
  id: "eng-123",
  properties: {
    hs_email_subject: "Following up",
    hs_email_direction: "EMAIL",
    hs_timestamp: "1745568000000",
    hs_email_to_email: "lead@example.com",
    hs_email_headers: "X-Rekurve-Correlation-Id: msg-789",
  },
};

describe("getEmailEngagement", () => {
  test("returns mapped engagement with correct fields", async () => {
    mockGetById.mockResolvedValue(MOCK_EMAIL_RESPONSE);

    const { getEmailEngagement } = await import("../emails");
    const result = await getEmailEngagement("eng-123");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("eng-123");
    expect(result!.subject).toBe("Following up");
    expect(result!.direction).toBe("EMAIL");
    expect(result!.toEmail).toBe("lead@example.com");
    expect(result!.timestamp).toBeInstanceOf(Date);
    expect(result!.timestamp!.getTime()).toBe(1745568000000);
    expect(result!.headers).toBe("X-Rekurve-Correlation-Id: msg-789");
  });

  test("calls getById with email properties including headers", async () => {
    mockGetById.mockResolvedValue(MOCK_EMAIL_RESPONSE);

    const { getEmailEngagement } = await import("../emails");
    await getEmailEngagement("eng-123");

    expect(mockGetById).toHaveBeenCalledWith(
      "eng-123",
      expect.arrayContaining([
        "hs_email_subject",
        "hs_email_direction",
        "hs_timestamp",
        "hs_email_headers",
      ]),
    );
  });

  test("returns null for a 404 error", async () => {
    const notFound = new Error("Not Found") as Error & { code: number };
    notFound.code = 404;
    mockGetById.mockRejectedValue(notFound);

    const { getEmailEngagement } = await import("../emails");
    const result = await getEmailEngagement("missing");

    expect(result).toBeNull();
  });

  test("propagates non-404 errors", async () => {
    mockGetById.mockRejectedValue(new Error("503 Service Unavailable"));

    const { getEmailEngagement } = await import("../emails");
    await expect(getEmailEngagement("eng-123")).rejects.toThrow(
      "503 Service Unavailable",
    );
  });

  test("handles null properties gracefully", async () => {
    mockGetById.mockResolvedValue({
      id: "eng-456",
      properties: {},
    });

    const { getEmailEngagement } = await import("../emails");
    const result = await getEmailEngagement("eng-456");

    expect(result!.subject).toBeNull();
    expect(result!.direction).toBeNull();
    expect(result!.timestamp).toBeNull();
    expect(result!.toEmail).toBeNull();
    expect(result!.headers).toBeNull();
  });
});
