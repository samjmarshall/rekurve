import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const MSG_ID = "msg-0000-0000-0000-000000000001";
const LEAD_ID = "lead-0000-0000-0000-000000000001";
const CORRELATION_ID = MSG_ID;

describe("runReconcileMissedEngagement — unit", () => {
  let mockListEngagements: ReturnType<typeof rs.fn>;
  let mockLeadFindFirst: ReturnType<typeof rs.fn>;
  let mockSelectLimit: ReturnType<typeof rs.fn>;
  let mockUpdateSet: ReturnType<typeof rs.fn>;
  let consoleErrorSpy: ReturnType<typeof rs.spyOn>;

  beforeEach(() => {
    rs.resetModules();

    mockListEngagements = rs.fn().mockResolvedValue([]);
    mockLeadFindFirst = rs
      .fn()
      .mockResolvedValue({ hubspotContactId: "hs-contact-1" });

    mockSelectLimit = rs.fn().mockResolvedValue([
      {
        leadId: LEAD_ID,
        hubspotActivityId: null,
        createdAt: new Date("2026-04-25T10:00:00Z"),
      },
    ]);
    const mockSelectWhere = rs.fn().mockReturnValue({ limit: mockSelectLimit });
    const mockSelectFrom = rs.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = rs.fn().mockReturnValue({ from: mockSelectFrom });

    const mockUpdateWhere = rs.fn().mockResolvedValue(undefined);
    mockUpdateSet = rs.fn().mockReturnValue({ where: mockUpdateWhere });
    const mockUpdate = rs.fn().mockReturnValue({ set: mockUpdateSet });

    rs.doMock("~/env", () => ({ env: {} }));
    rs.doMock("~/server/db", () => ({
      db: {
        select: mockSelect,
        update: mockUpdate,
        query: { leads: { findFirst: mockLeadFindFirst } },
      },
    }));
    rs.doMock("~/server/db/schema", () => ({
      conversations: {},
      leads: {},
    }));
    rs.doMock("~/server/hubspot", () => ({
      listEmailEngagementsForContact: mockListEngagements,
    }));
    rs.doMock("~/server/outbox", () => ({
      HUBSPOT_EMAIL_EVENTS: {
        ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
        ENGAGEMENT_MISSED: "hubspot.engagement-missed",
      },
    }));
    rs.doMock("~/inngest/client", () => ({
      inngest: { createFunction: rs.fn().mockReturnValue({}) },
    }));

    consoleErrorSpy = rs.spyOn(console, "error").mockImplementation(() => {});
  });

  // Build a fresh step per test — a describe-level mock would be cleared by the
  // suite's clearMocks between tests, leaving step.run returning undefined.
  function makeStep() {
    return {
      run: rs.fn().mockImplementation((_id: string, fn: () => unknown) => fn()),
    };
  }

  const event = {
    data: { messageId: MSG_ID, leadId: LEAD_ID, correlationId: CORRELATION_ID },
  };

  test("matched engagement → stamps hubspotActivityId", async () => {
    mockListEngagements.mockResolvedValue([
      {
        id: "hs-eng-match",
        headers: `X-Rekurve-Correlation-Id: ${CORRELATION_ID}`,
        timestamp: new Date("2026-04-25T10:01:00Z"),
      },
      {
        id: "hs-eng-other",
        headers: "X-Rekurve-Correlation-Id: someone-else",
        timestamp: new Date("2026-04-25T10:02:00Z"),
      },
    ]);

    const { runReconcileMissedEngagement } = await import(
      "../reconcile-missed-engagement"
    );
    await runReconcileMissedEngagement(event, makeStep() as never);

    expect(mockUpdateSet).toHaveBeenCalledWith({
      hubspotActivityId: "hs-eng-match",
    });
  });

  test("no match → logs to console.error, no stamp", async () => {
    mockListEngagements.mockResolvedValue([
      {
        id: "hs-eng-other",
        headers: "X-Rekurve-Correlation-Id: someone-else",
        timestamp: new Date("2026-04-25T10:02:00Z"),
      },
    ]);

    const { runReconcileMissedEngagement } = await import(
      "../reconcile-missed-engagement"
    );
    await runReconcileMissedEngagement(event, makeStep() as never);

    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[reconcile-missed-engagement] no engagement matched",
      expect.objectContaining({ messageId: MSG_ID, leadId: LEAD_ID }),
    );
  });

  test("already-stamped conversation → exits without querying HubSpot", async () => {
    mockSelectLimit.mockResolvedValue([
      {
        leadId: LEAD_ID,
        hubspotActivityId: "already-set",
        createdAt: new Date(),
      },
    ]);

    const { runReconcileMissedEngagement } = await import(
      "../reconcile-missed-engagement"
    );
    await runReconcileMissedEngagement(event, makeStep() as never);

    expect(mockListEngagements).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  test("missing conversation → exits without querying HubSpot", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { runReconcileMissedEngagement } = await import(
      "../reconcile-missed-engagement"
    );
    await runReconcileMissedEngagement(event, makeStep() as never);

    expect(mockListEngagements).not.toHaveBeenCalled();
  });

  test("lead missing hubspotContactId → logs and skips HubSpot query", async () => {
    mockLeadFindFirst.mockResolvedValue({ hubspotContactId: null });

    const { runReconcileMissedEngagement } = await import(
      "../reconcile-missed-engagement"
    );
    await runReconcileMissedEngagement(event, makeStep() as never);

    expect(mockListEngagements).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[reconcile-missed-engagement] lead has no hubspotContactId",
      expect.objectContaining({ messageId: MSG_ID, leadId: LEAD_ID }),
    );
  });
});
