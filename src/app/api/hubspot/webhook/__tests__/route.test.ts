import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockIsValid: ReturnType<typeof rs.fn>;
let mockGetContact: ReturnType<typeof rs.fn>;
let mockGetEmailEngagement: ReturnType<typeof rs.fn>;
let mockFindContactIdForEmail: ReturnType<typeof rs.fn>;
let mockInsert: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDbDelete: ReturnType<typeof rs.fn>;
let mockLeadsFindFirst: ReturnType<typeof rs.fn>;
let mockConversationsFindFirst: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockIsValid = rs.fn();
  mockGetEmailEngagement = rs.fn();
  mockFindContactIdForEmail = rs.fn();
  mockLeadsFindFirst = rs.fn();
  mockConversationsFindFirst = rs.fn();

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

  // Mock db with chainable methods
  const onConflictDoUpdate = rs.fn().mockResolvedValue(undefined);
  const insertValues = rs.fn().mockReturnValue({ onConflictDoUpdate });
  mockInsert = rs.fn().mockReturnValue({ values: insertValues });

  const updateWhere = rs.fn().mockResolvedValue(undefined);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = rs.fn().mockResolvedValue(undefined);
  mockDbDelete = rs.fn().mockReturnValue({ where: deleteWhere });

  rs.doMock("~/server/db", () => ({
    db: {
      insert: mockInsert,
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
  test("contact.creation fetches contact and upserts local lead", async () => {
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
    expect(mockInsert).toHaveBeenCalled();
  });

  test("contact.propertyChange updates mapped field on local lead", async () => {
    mockIsValid.mockReturnValue(true);

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
    expect(mockUpdate).toHaveBeenCalled();
  });

  test("contact.propertyChange ignores unmapped properties", async () => {
    mockIsValid.mockReturnValue(true);

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
  });

  test("contact.deletion deletes local lead", async () => {
    mockIsValid.mockReturnValue(true);

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
    expect(mockDbDelete).toHaveBeenCalled();
  });

  test("processing failure for one event does not block others", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetContact
      .mockRejectedValueOnce(new Error("HubSpot API down"))
      .mockResolvedValueOnce({
        id: "789",
        properties: { firstname: "Ok", lastname: "Lead" },
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

const OUTBOUND_ENGAGEMENT = {
  id: "999",
  subject: "Following up",
  direction: "EMAIL",
  timestamp: new Date("2026-04-25T10:00:00Z"),
  toEmail: "lead@example.com",
};

describe("object.creation (EMAIL) webhook events", () => {
  test("outbound email with matching conversation → sets hubspotActivityId", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue(OUTBOUND_ENGAGEMENT);
    mockFindContactIdForEmail.mockResolvedValue("hs-contact-123");
    mockLeadsFindFirst.mockResolvedValue({
      id: "lead-uuid-1",
      hubspotContactId: "hs-contact-123",
    });
    mockConversationsFindFirst.mockResolvedValue({
      id: "conv-uuid-1",
      hubspotActivityId: null,
    });

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGetEmailEngagement).toHaveBeenCalledWith("999");
    expect(mockFindContactIdForEmail).toHaveBeenCalledWith("999");
    expect(mockLeadsFindFirst).toHaveBeenCalled();
    expect(mockConversationsFindFirst).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  test("inbound email (INCOMING_EMAIL direction) → no DB writes", async () => {
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
    expect(mockLeadsFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("unknown hubspotContactId (no lead row) → no DB writes", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue(OUTBOUND_ENGAGEMENT);
    mockFindContactIdForEmail.mockResolvedValue("hs-contact-unknown");
    mockLeadsFindFirst.mockResolvedValue(null);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockConversationsFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("no matching conversations row → no DB write, returns 200", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue(OUTBOUND_ENGAGEMENT);
    mockFindContactIdForEmail.mockResolvedValue("hs-contact-123");
    mockLeadsFindFirst.mockResolvedValue({
      id: "lead-uuid-1",
      hubspotContactId: "hs-contact-123",
    });
    mockConversationsFindFirst.mockResolvedValue(null);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("conversation already has hubspotActivityId (idempotency) → findFirst returns null, no overwrite", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetEmailEngagement.mockResolvedValue(OUTBOUND_ENGAGEMENT);
    mockFindContactIdForEmail.mockResolvedValue("hs-contact-123");
    mockLeadsFindFirst.mockResolvedValue({
      id: "lead-uuid-1",
      hubspotContactId: "hs-contact-123",
    });
    // Filter includes isNull(hubspotActivityId), so already-reconciled rows
    // won't be returned by findFirst — simulate that here:
    mockConversationsFindFirst.mockResolvedValue(null);

    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        body: JSON.stringify([EMAIL_CREATION_EVENT]),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
