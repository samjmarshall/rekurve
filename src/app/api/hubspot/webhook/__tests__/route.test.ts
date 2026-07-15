import { beforeEach, describe, expect, rs, test } from "@rstest/core";

import { makeWebhookRequest as makeRequest } from "~/server/hubspot/__tests__/fixtures";

let mockIsValid: ReturnType<typeof rs.fn>;
let mockGetContact: ReturnType<typeof rs.fn>;
let mockGetEmailEngagement: ReturnType<typeof rs.fn>;
let mockCaptureFromHubspot: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDbDelete: ReturnType<typeof rs.fn>;
let mockPublish: ReturnType<typeof rs.fn>;
let mockSendPostCommit: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockIsValid = rs.fn();
  mockGetEmailEngagement = rs.fn();
  mockCaptureFromHubspot = rs.fn().mockResolvedValue(undefined);
  mockPublish = rs.fn().mockResolvedValue(undefined);
  mockSendPostCommit = rs.fn().mockResolvedValue(undefined);

  // The route is a thin HTTP adapter over hubspotModule.service, so the REAL
  // module graph (hubspot.module composition + webhook service) runs under
  // the route. Mocks sit on the module's seams: the module-private adapter
  // files (the mock registry keys on the RESOLVED module, so the alias
  // specifiers below intercept the module's relative "./contacts"/"./emails"
  // imports), the cross-domain module surfaces, and the HubSpot SDK.
  // properties.ts is pure — the real fromContactProperties runs.
  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_CLIENT_SECRET: "test-secret",
    },
  }));

  rs.doMock("@hubspot/api-client", () => ({
    Signature: { isValid: mockIsValid },
    // client.ts constructs eagerly if the module graph pulls it in.
    Client: class {},
  }));

  mockGetContact = rs.fn();
  rs.doMock("~/server/hubspot/contacts", () => ({
    getContact: mockGetContact,
    findExistingContact: rs.fn(),
    createContact: rs.fn(),
    updateContact: rs.fn(),
  }));

  rs.doMock("~/server/hubspot/emails", () => ({
    getEmailEngagement: mockGetEmailEngagement,
    listEmailEngagementsForContact: rs.fn(),
  }));

  rs.doMock("~/server/leads/leads.module", () => ({
    leadsModule: {
      service: {
        captureLeadFromHubspot: mockCaptureFromHubspot,
        resolveOwnerUserId: rs.fn().mockResolvedValue("owner-1"),
      },
    },
  }));

  rs.doMock("~/server/outbox", () => ({
    // The engagement emission goes through the write-less publish (adr017
    // batch shape, adr019 clause 7) — the barrel's only export since #330.
    // The retired legacy pair stays mocked as a tripwire: a regression back
    // to the inline buildOutboxEvent + sendPostCommit form is caught by the
    // not-called assertions below rather than crashing on a missing export.
    publish: mockPublish,
    buildOutboxEvent: rs.fn(),
    sendPostCommit: mockSendPostCommit,
  }));

  // Defensive: nothing in the webhook graph may touch the real Inngest client.
  rs.doMock("~/server/inngest/client", () => ({
    inngest: { send: rs.fn().mockResolvedValue(undefined) },
  }));

  // db tripwire (ADR-013 — inbound HubSpot events must not write the db):
  // nothing in the thinned webhook graph imports ~/server/db today, but the
  // doMock registers before the dynamic route import, so a regression that
  // reintroduces a direct write IS intercepted — the update/delete spies are
  // pinned not-called by the inbound-event tests below.
  const updateWhere = rs.fn().mockResolvedValue(undefined);
  const updateSet = rs.fn().mockReturnValue({ where: updateWhere });
  mockUpdate = rs.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = rs.fn().mockResolvedValue(undefined);
  mockDbDelete = rs.fn().mockReturnValue({ where: deleteWhere });

  rs.doMock("~/server/db", () => ({
    db: {
      update: mockUpdate,
      delete: mockDbDelete,
    },
  }));
});

describe("POST /api/hubspot/webhook", () => {
  test("returns 401 when signature header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ signature: null }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Missing signature headers",
    });
  });

  test("returns 401 when timestamp header is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ timestamp: null }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Missing signature headers",
    });
  });

  test("returns 401 when timestamp is older than 5 minutes", async () => {
    const { POST } = await import("../route");
    const oldTimestamp = String(Date.now() - 6 * 60 * 1000);
    const response = await POST(makeRequest({ timestamp: oldTimestamp }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Timestamp expired" });
  });

  test("returns 401 when signature is invalid", async () => {
    mockIsValid.mockReturnValue(false);
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid signature" });
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
    // engagement object id as the activity id — one write-less publish batch
    // (name + exact payload key-set pinned by the strict registry).
    expect(mockPublish).toHaveBeenCalledWith([
      {
        name: "hubspot.email.engagement-created",
        data: { correlationId: CORRELATION_ID, hubspotActivityId: "999" },
      },
    ]);
    // publish owns the outbox write AND the post-commit send — no second
    // send path through the legacy inline form.
    expect(mockSendPostCommit).not.toHaveBeenCalled();
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
    expect(mockPublish).not.toHaveBeenCalled();
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
    expect(mockPublish).not.toHaveBeenCalled();
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
    expect(mockPublish).not.toHaveBeenCalled();
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
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
