import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  rs,
  test,
} from "@rstest/core";

import type { HubspotWebhookDeps } from "../hubspot.webhook";
import { makeWebhookRequest as makeRequest } from "./fixtures";

// Service-level pins for the webhook fns (adr004): signature/timestamp checks
// are the ONLY hard rejections, and routeWebhookEvents swallows per-event
// errors so a poison event never blocks its batch neighbours (the route's
// always-200 depends on this fn never throwing). Ported from the route test,
// which thins to the HTTP-adapter assertions.
//
// Factory seam (adr020): routing behaviour is asserted through a fake deps
// object. The two rs.doMock blocks are import neutralisers only — ~/env
// validates at import (HUBSPOT_CLIENT_SECRET is read inside the verify fn)
// and @hubspot/api-client's Signature is the SDK's static verifier, faked so
// tests drive both verdicts without computing real v3 HMACs.
let mockIsValid: ReturnType<typeof rs.fn>;
let makeHubspotWebhook: (deps: HubspotWebhookDeps) => {
  verifyWebhookSignature: (
    request: Request,
  ) => Promise<
    { valid: true; events: unknown[] } | { valid: false; error: string }
  >;
  routeWebhookEvents: (events: unknown[]) => Promise<void>;
};

beforeAll(async () => {
  mockIsValid = rs.fn();
  rs.doMock("~/env", () => ({ env: { HUBSPOT_CLIENT_SECRET: "test-secret" } }));
  rs.doMock("@hubspot/api-client", () => ({
    Signature: { isValid: mockIsValid },
  }));
  const mod = await import("../hubspot.webhook");
  makeHubspotWebhook = mod.makeHubspotWebhook as never;
});

beforeEach(() => {
  mockIsValid.mockReset();
});

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getContact: rs.fn().mockResolvedValue({
      id: "456",
      properties: { firstname: "Jane", lastname: "Doe" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    getEmailEngagement: rs.fn().mockResolvedValue(null),
    captureLeadFromHubspot: rs.fn().mockResolvedValue(undefined),
    resolveOwnerUserId: rs.fn().mockResolvedValue("owner-1"),
    publish: rs.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("verifyWebhookSignature", () => {
  test("invalid when signature header is missing", async () => {
    const { verifyWebhookSignature } = makeHubspotWebhook(makeDeps() as never);
    const result = await verifyWebhookSignature(
      makeRequest({ signature: null }),
    );
    expect(result).toEqual({
      valid: false,
      error: "Missing signature headers",
    });
  });

  test("invalid when timestamp header is missing", async () => {
    const { verifyWebhookSignature } = makeHubspotWebhook(makeDeps() as never);
    const result = await verifyWebhookSignature(
      makeRequest({ timestamp: null }),
    );
    expect(result).toEqual({
      valid: false,
      error: "Missing signature headers",
    });
  });

  test("invalid when timestamp is older than 5 minutes", async () => {
    const { verifyWebhookSignature } = makeHubspotWebhook(makeDeps() as never);
    const oldTimestamp = String(Date.now() - 6 * 60 * 1000);
    const result = await verifyWebhookSignature(
      makeRequest({ timestamp: oldTimestamp }),
    );
    expect(result).toEqual({ valid: false, error: "Timestamp expired" });
  });

  test("invalid when the v3 signature check fails", async () => {
    mockIsValid.mockReturnValue(false);
    const { verifyWebhookSignature } = makeHubspotWebhook(makeDeps() as never);
    const result = await verifyWebhookSignature(makeRequest({}));
    expect(result).toEqual({ valid: false, error: "Invalid signature" });
  });

  test("valid signature → parsed events, secret + url fed to the verifier", async () => {
    mockIsValid.mockReturnValue(true);
    const { verifyWebhookSignature } = makeHubspotWebhook(makeDeps() as never);
    const result = await verifyWebhookSignature(makeRequest({}));
    expect(result).toEqual({
      valid: true,
      events: [{ subscriptionType: "contact.creation", objectId: 1 }],
    });
    expect(mockIsValid).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureVersion: "v3",
        clientSecret: "test-secret",
        url: "https://example.com/api/hubspot/webhook",
      }),
    );
  });
});

describe("routeWebhookEvents — contact events", () => {
  test("contact.creation fetches the contact and captures via the leads port", async () => {
    const deps = makeDeps();
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([
      { subscriptionType: "contact.creation", objectId: 456 },
    ]);

    expect(deps.getContact).toHaveBeenCalledWith("456");
    expect(deps.captureLeadFromHubspot).toHaveBeenCalledWith(
      "456",
      expect.objectContaining({ firstName: "Jane", lastName: "Doe" }),
      { userId: "owner-1" },
    );
  });

  test("contact.propertyChange is dropped with a console.warn (ADR-013)", async () => {
    const deps = makeDeps();
    const warnSpy = rs.spyOn(console, "warn").mockImplementation(() => {});
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([
      {
        subscriptionType: "contact.propertyChange",
        objectId: 456,
        propertyName: "email",
        propertyValue: "new@example.com",
      },
    ]);

    expect(deps.captureLeadFromHubspot).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("contact.propertyChange");
    expect(warnSpy.mock.calls[0]?.[0]).toContain("ADR-013");
    warnSpy.mockRestore();
  });

  test("contact.deletion is dropped with a console.warn (ADR-013)", async () => {
    const deps = makeDeps();
    const warnSpy = rs.spyOn(console, "warn").mockImplementation(() => {});
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([
      { subscriptionType: "contact.deletion", objectId: 456 },
    ]);

    expect(deps.captureLeadFromHubspot).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("contact.deletion");
    expect(warnSpy.mock.calls[0]?.[0]).toContain("ADR-013");
    warnSpy.mockRestore();
  });

  test("per-event swallow: a failing event never blocks its batch neighbours or throws", async () => {
    const deps = makeDeps({
      captureLeadFromHubspot: rs
        .fn()
        .mockRejectedValueOnce(new Error("capture failed"))
        .mockResolvedValueOnce(undefined),
    });
    const errorSpy = rs.spyOn(console, "error").mockImplementation(() => {});
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await expect(
      routeWebhookEvents([
        { subscriptionType: "contact.creation", objectId: 456 },
        { subscriptionType: "contact.creation", objectId: 789 },
      ]),
    ).resolves.toBeUndefined();

    expect(deps.getContact).toHaveBeenCalledTimes(2);
    expect(deps.captureLeadFromHubspot).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]?.[0]).toContain(
      "[HubSpot Webhook] Failed to process contact.creation for objectId 456",
    );
    errorSpy.mockRestore();
  });
});

const EMAIL_CREATION_EVENT = {
  subscriptionType: "object.creation",
  objectTypeId: "0-49",
  objectId: 999,
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

describe("routeWebhookEvents — object.creation (EMAIL)", () => {
  test("outbound email with our correlation header → engagement-created via outbox publish", async () => {
    const deps = makeDeps({
      getEmailEngagement: rs.fn().mockResolvedValue(OUTBOUND_ENGAGEMENT),
    });
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([EMAIL_CREATION_EVENT]);

    expect(deps.getEmailEngagement).toHaveBeenCalledWith("999");
    // Emits the correlation event keyed by the extracted id, carrying the
    // engagement object id as the activity id — batch-shaped publish.
    expect(deps.publish).toHaveBeenCalledWith([
      {
        name: "hubspot.email.engagement-created",
        data: { correlationId: CORRELATION_ID, hubspotActivityId: "999" },
      },
    ]);
  });

  test("outbound email without our correlation header → no emit", async () => {
    const deps = makeDeps({
      getEmailEngagement: rs.fn().mockResolvedValue({
        ...OUTBOUND_ENGAGEMENT,
        headers: "Subject: Following up\nFrom: someone@else.com",
      }),
    });
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([EMAIL_CREATION_EVENT]);

    expect(deps.publish).not.toHaveBeenCalled();
  });

  test("outbound email with null headers → no emit", async () => {
    const deps = makeDeps({
      getEmailEngagement: rs
        .fn()
        .mockResolvedValue({ ...OUTBOUND_ENGAGEMENT, headers: null }),
    });
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([EMAIL_CREATION_EVENT]);

    expect(deps.publish).not.toHaveBeenCalled();
  });

  test("inbound email (INCOMING_EMAIL direction) → no emit", async () => {
    const deps = makeDeps({
      getEmailEngagement: rs.fn().mockResolvedValue({
        ...OUTBOUND_ENGAGEMENT,
        direction: "INCOMING_EMAIL",
      }),
    });
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([EMAIL_CREATION_EVENT]);

    expect(deps.publish).not.toHaveBeenCalled();
  });

  test("missing engagement (404 → null) → no emit", async () => {
    const deps = makeDeps({
      getEmailEngagement: rs.fn().mockResolvedValue(null),
    });
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([EMAIL_CREATION_EVENT]);

    expect(deps.publish).not.toHaveBeenCalled();
  });

  test("object.creation for a non-email objectTypeId is ignored", async () => {
    const deps = makeDeps();
    const { routeWebhookEvents } = makeHubspotWebhook(deps as never);

    await routeWebhookEvents([
      { subscriptionType: "object.creation", objectTypeId: "0-1", objectId: 7 },
    ]);

    expect(deps.getEmailEngagement).not.toHaveBeenCalled();
    expect(deps.publish).not.toHaveBeenCalled();
  });
});
