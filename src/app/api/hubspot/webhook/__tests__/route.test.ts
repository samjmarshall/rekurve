import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockIsValid: ReturnType<typeof rs.fn>;
let mockGetContact: ReturnType<typeof rs.fn>;
let mockInsert: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDbDelete: ReturnType<typeof rs.fn>;

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

  mockGetContact = rs.fn();
  rs.doMock("~/server/hubspot", () => ({
    getContact: mockGetContact,
    toAppField: rs.fn((prop: string) => {
      const map: Record<string, string> = {
        firstname: "firstName",
        lastname: "lastName",
        email: "email",
        phone: "phone",
        lead_score: "leadScore",
      };
      return map[prop];
    }),
    coerceFromHubSpot: rs.fn((field: string, value: string) => {
      if (field === "leadScore") return parseInt(value, 10);
      return value;
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
    },
  }));

  rs.doMock("~/server/db/schema", () => ({
    leads: { hubspotContactId: "hubspot_contact_id" },
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
      properties: { firstName: "Test", lastName: "User" },
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
        firstName: "Jane",
        lastName: "Doe",
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
        properties: { firstName: "Ok", lastName: "Lead" },
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
