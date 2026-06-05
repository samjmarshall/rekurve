import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockIsValid: ReturnType<typeof rs.fn>;
let mockGetContact: ReturnType<typeof rs.fn>;
let mockGetEmailEngagement: ReturnType<typeof rs.fn>;
let mockFindContactIdForEmail: ReturnType<typeof rs.fn>;
let mockCaptureFromHubspot: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDbDelete: ReturnType<typeof rs.fn>;
let mockLeadsFindFirst: ReturnType<typeof rs.fn>;
let mockConversationsFindFirst: ReturnType<typeof rs.fn>;
let mockBuildOutboxEvent: ReturnType<typeof rs.fn>;
let mockSendPostCommit: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockIsValid = rs.fn();
  mockGetEmailEngagement = rs.fn();
  mockFindContactIdForEmail = rs.fn();
  mockLeadsFindFirst = rs.fn();
  mockConversationsFindFirst = rs.fn();
  mockCaptureFromHubspot = rs.fn().mockResolvedValue(undefined);
  mockBuildOutboxEvent = rs.fn((eventName: string, payload: unknown) => ({
    id: "outbox-evt-1",
    eventName,
    payload,
    query: Promise.resolve(undefined),
  }));
  mockSendPostCommit = rs.fn().mockResolvedValue(undefined);

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_CLIENT_SECRET: "test-secret",
    },
  }));

  rs.doMock("@hubspot/api-client", () => ({
    Signature: { isValid: mockIsValid },
  }));

  mockGetContact = rs.fn();
  rs.doMock("~/server/hubspot", () => ({
    getContact: mockGetContact,
    getEmailEngagement: mockGetEmailEngagement,
    findContactIdForEmail: mockFindContactIdForEmail,
    fromContactProperties: rs.fn((props: Record<string, unknown>) => {
      const map: Record<string, string> = {
        firstname: "firstName",
        lastname: "lastName",
        email: "email",
        phone: "phone",
        lead_score: "leadScore",
      };
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        const appKey = map[k];
        if (appKey && v != null) {
          result[appKey] = appKey === "leadScore" ? parseInt(String(v), 10) : v;
        }
      }
      return result;
    }),
  }));

  rs.doMock("~/server/leads/intake", () => ({
    captureLeadFromHubspot: mockCaptureFromHubspot,
  }));

  rs.doMock("~/server/leads/owner", () => ({
    resolveLeadOwnerUserId: rs.fn().mockResolvedValue("owner-1"),
  }));

  rs.doMock("~/server/outbox", () => ({
    HUBSPOT_EMAIL_EVENTS: {
      ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
      ENGAGEMENT_MISSED: "hubspot.engagement-missed",
    },
    buildOutboxEvent: mockBuildOutboxEvent,
    sendPostCommit: mockSendPostCommit,
  }));

  // Mock db — only update/delete/query needed (insert no longer used for contact.creation)
  const updateWhere = rs.fn().mockResolvedValue(undefined);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = rs.fn().mockResolvedValue(undefined);
  mockDbDelete = rs.fn().mockReturnValue({ where: deleteWhere });

  rs.doMock("~/server/db", () => ({
    db: {
      update: mockUpdate,
      delete: mockDbDelete,
      query: {
        leads: { findFirst: mockLeadsFindFirst },
        conversations: { findFirst: mockConversationsFindFirst },
      },
    },
  }));

  rs.doMock("~/server/db/schema", () => ({
    leads: { hubspotContactId: "hubspot_contact_id" },
    conversations: {
      leadId: "lead_id",
      deliveryMethod: "delivery_method",
      direction: "direction",
      hubspotActivityId: "hubspot_activity_id",
      createdAt: "created_at",
      subject: "subject",
    },
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
    mockGetContact.mockResolvedValue({
      id: "1",
      properties: { firstname: "Test", lastname: "User" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
  });
});

describe("Webhook event processing", () => {
  test("contact.creation fetches contact and calls captureLeadFromHubspot", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetContact.mockResolvedValue({
      id: "456",
      properties: {
        firstname: "Jane",
        lastname: "Doe",
        email: "jane@example.com",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.creation",
            objectId: 456,
            eventId: 1,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGetContact).toHaveBeenCalledWith("456");
    expect(mockCaptureFromHubspot).toHaveBeenCalledWith(
      expect.anything(),
      "456",
      expect.any(Object),
      expect.objectContaining({ userId: "owner-1" }),
    );
  });

  test("contact.propertyChange returns 200 with no DB writes and a console.warn", async () => {
    mockIsValid.mockReturnValue(true);
    const warnSpy = rs.spyOn(console, "warn").mockImplementation(() => {});

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.propertyChange",
            objectId: 456,
            propertyName: "email",
            propertyValue: "new@example.com",
            eventId: 2,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCaptureFromHubspot).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("contact.propertyChange");
    expect(warnSpy.mock.calls[0]?.[0]).toContain("ADR-013");
  });

  test("contact.propertyChange ignores unmapped properties (still no DB write)", async () => {
    mockIsValid.mockReturnValue(true);
    const warnSpy = rs.spyOn(console, "warn").mockImplementation(() => {});

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.propertyChange",
            objectId: 456,
            propertyName: "hs_analytics_source",
            propertyValue: "ORGANIC_SEARCH",
            eventId: 3,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  test("contact.deletion returns 200 with no DB writes and a console.warn", async () => {
    mockIsValid.mockReturnValue(true);
    const warnSpy = rs.spyOn(console, "warn").mockImplementation(() => {});

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.deletion",
            objectId: 456,
            eventId: 4,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockDbDelete).not.toHaveBeenCalled();
    expect(mockCaptureFromHubspot).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("contact.deletion");
    expect(warnSpy.mock.calls[0]?.[0]).toContain("ADR-013");
  });

  test("processing failure for one event does not block others (always-200)", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetContact.mockResolvedValue({
      id: "789",
      properties: { firstname: "Ok", lastname: "Lead" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    mockCaptureFromHubspot
      .mockRejectedValueOnce(new Error("capture failed"))
      .mockResolvedValueOnce(undefined);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([
          {
            subscriptionType: "contact.creation",
            objectId: 456,
            eventId: 5,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
          {
            subscriptionType: "contact.creation",
            objectId: 789,
            eventId: 6,
            occurredAt: Date.now(),
            attemptNumber: 0,
          },
        ]),
      }),
    );

    // Should return 200 even though first event failed
    expect(response.status).toBe(200);
    expect(mockGetContact).toHaveBeenCalledTimes(2);
    expect(mockCaptureFromHubspot).toHaveBeenCalledTimes(2);
  });
});

const EMAIL_CREATION_EVENT = {
  subscriptionType: "object.creation",
  objectTypeId: "0-49",
  objectId: 999,
  eventId: 10,
  occurredAt: Date.now(),
  attemptNumber: 0,
};

const CORRELATION_ID = "msg-uuid-789";

const OUTBOUND_ENGAGEMENT = {
  id: "999",
  subject: "Following up",
  direction: "EMAIL",
  timestamp: new Date("2026-04-25T10:00:00Z"),
  toEmail: "lead@example.com",
  headers: `X-Rekurve-Correlation-Id: ${CORRELATION_ID}`,
};

describe("object.creation (EMAIL) webhook events", () => {
  test("outbound email with our correlation header → emits engagement-created via outbox", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue(OUTBOUND_ENGAGEMENT);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGetEmailEngagement).toHaveBeenCalledWith("999");
    // Emits the correlation event keyed by the extracted id, carrying the
    // engagement object id as the activity id.
    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "hubspot.email.engagement-created",
      { correlationId: CORRELATION_ID, hubspotActivityId: "999" },
    );
    expect(mockSendPostCommit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "hubspot.email.engagement-created" }),
    ]);
    // No direct conversation stamp anymore — the worker owns that.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("outbound email without our correlation header → no emit", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue({
      ...OUTBOUND_ENGAGEMENT,
      headers: "Subject: Following up\nFrom: someone@else.com",
    });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockBuildOutboxEvent).not.toHaveBeenCalled();
    expect(mockSendPostCommit).not.toHaveBeenCalled();
  });

  test("outbound email with null headers → no emit", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue({
      ...OUTBOUND_ENGAGEMENT,
      headers: null,
    });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockBuildOutboxEvent).not.toHaveBeenCalled();
  });

  test("inbound email (INCOMING_EMAIL direction) → no emit", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue({
      ...OUTBOUND_ENGAGEMENT,
      direction: "INCOMING_EMAIL",
    });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockBuildOutboxEvent).not.toHaveBeenCalled();
    expect(mockSendPostCommit).not.toHaveBeenCalled();
  });

  test("missing engagement (404 → null) → no emit, returns 200", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue(null);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockBuildOutboxEvent).not.toHaveBeenCalled();
  });
});
