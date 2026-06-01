import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_ID = "user-test-1";

describe("captureLead — unit", () => {
  let mockBatch: ReturnType<typeof rs.fn>;
  let mockFindFirst: ReturnType<typeof rs.fn>;
  let mockDb: Record<string, unknown>;

  beforeEach(() => {
    rs.resetModules();

    rs.doMock("~/env", () => ({
      env: {
        DATABASE_URL: "postgres://mock",
        HUBSPOT_ACCESS_TOKEN: "mock-token",
        HUBSPOT_CLIENT_SECRET: "mock-secret",
      },
    }));

    const mockLead = {
      id: LEAD_ID,
      firstName: "John",
      lastName: "Smith",
      hubspotContactId: null,
      leadScore: 50,
      leadStage: "nurture",
      scoreMetadata: {},
    };

    mockBatch = rs.fn().mockResolvedValue([[mockLead], []]);
    mockFindFirst = rs.fn().mockResolvedValue(undefined);

    mockDb = {
      batch: mockBatch,
      insert: rs.fn().mockReturnValue({
        values: rs.fn().mockReturnValue({ returning: rs.fn() }),
      }),
      update: rs.fn().mockReturnValue({
        set: rs.fn().mockReturnValue({
          where: rs.fn().mockReturnValue({ returning: rs.fn() }),
        }),
      }),
      query: { leads: { findFirst: mockFindFirst } },
    };

    rs.doMock("~/server/db", () => ({ db: mockDb }));

    rs.doMock("~/server/scoring", () => ({
      qualifyAndScore: rs.fn().mockReturnValue({
        score: 50,
        stage: "nurture",
        breakdown: {
          land: { score: 0, maxScore: 30, reasoning: "" },
          finance: { score: 0, maxScore: 25, reasoning: "" },
          timeline: { score: 0, maxScore: 20, reasoning: "" },
          budget: { score: 0, maxScore: 10, reasoning: "" },
          propertyType: { score: 0, maxScore: 10, reasoning: "" },
          engagement: { score: 0, maxScore: 5, reasoning: "" },
        },
        gaps: [],
        nextQuestion: "",
      }),
    }));

    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: {
        LEAD_CAPTURED: "lead.captured",
        LEAD_UPDATED: "lead.updated",
      },
      buildOutboxEvent: rs.fn().mockReturnValue({
        id: "outbox-1",
        eventName: "lead.captured",
        payload: {},
        query: {},
      }),
      sendPostCommit: rs.fn().mockResolvedValue(undefined),
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn(),
      createContact: rs.fn(),
      updateContact: rs.fn(),
      toContactProperties: rs.fn(),
    }));

    rs.doMock("~/server/nurture/scheduler", () => ({
      startOrUpdateSequence: rs.fn().mockResolvedValue(undefined),
    }));
  });

  test("makes no HubSpot calls", async () => {
    const { captureLead } = await import("~/server/leads/intake");
    const { findExistingContact, createContact, updateContact } = await import(
      "~/server/hubspot"
    );

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(findExistingContact).not.toHaveBeenCalled();
    expect(createContact).not.toHaveBeenCalled();
    expect(updateContact).not.toHaveBeenCalled();
  });

  test("returns a row with null hubspotContactId and scoring fields set", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    const lead = await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith", hasLand: true },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(lead.hubspotContactId).toBeNull();
    expect(lead.leadScore).toBe(50);
    expect(lead.leadStage).toBe("nurture");
  });

  test("calls db.batch with two statements (lead upsert + outbox insert)", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(mockBatch).toHaveBeenCalledOnce();
    const [batchArgs] = mockBatch.mock.calls[0] as [[unknown, unknown]];
    expect(Array.isArray(batchArgs)).toBe(true);
    expect(batchArgs).toHaveLength(2);
  });

  test("calls sendPostCommit after batch", async () => {
    const { captureLead } = await import("~/server/leads/intake");
    const { sendPostCommit } = await import("~/server/outbox");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(sendPostCommit).toHaveBeenCalledOnce();
  });

  test("uses db.update path when existing lead found by email", async () => {
    const existingId = "bbbbbbbb-0000-0000-0000-000000000002";
    mockFindFirst.mockResolvedValue({ id: existingId });

    const mockUpdate = rs.fn().mockReturnValue({
      set: rs.fn().mockReturnValue({
        where: rs.fn().mockReturnValue({ returning: rs.fn() }),
      }),
    });
    (mockDb as Record<string, unknown>).update = mockUpdate;

    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith", email: "john@test.com" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("captureLeadFromHubspot — unit", () => {
  let mockBatch: ReturnType<typeof rs.fn>;
  let mockFindFirst: ReturnType<typeof rs.fn>;
  let mockDb: Record<string, unknown>;

  const HS_ID = "hs-contact-abc123";

  beforeEach(() => {
    rs.resetModules();

    rs.doMock("~/env", () => ({
      env: {
        DATABASE_URL: "postgres://mock",
        HUBSPOT_ACCESS_TOKEN: "mock-token",
        HUBSPOT_CLIENT_SECRET: "mock-secret",
      },
    }));

    const mockLead = {
      id: LEAD_ID,
      firstName: "Jane",
      lastName: "Doe",
      hubspotContactId: HS_ID,
      leadScore: 50,
      leadStage: "nurture",
      scoreMetadata: {},
    };

    mockBatch = rs.fn().mockResolvedValue([[mockLead], []]);
    mockFindFirst = rs.fn().mockResolvedValue(undefined);

    mockDb = {
      batch: mockBatch,
      insert: rs.fn().mockReturnValue({
        values: rs.fn().mockReturnValue({
          onConflictDoUpdate: rs.fn().mockReturnValue({ returning: rs.fn() }),
        }),
      }),
      query: { leads: { findFirst: mockFindFirst } },
    };

    rs.doMock("~/server/db", () => ({ db: mockDb }));

    rs.doMock("~/server/scoring", () => ({
      qualifyAndScore: rs.fn().mockReturnValue({
        score: 50,
        stage: "nurture",
        breakdown: {
          land: { score: 0, maxScore: 30, reasoning: "" },
          finance: { score: 0, maxScore: 25, reasoning: "" },
          timeline: { score: 0, maxScore: 20, reasoning: "" },
          budget: { score: 0, maxScore: 10, reasoning: "" },
          propertyType: { score: 0, maxScore: 10, reasoning: "" },
          engagement: { score: 0, maxScore: 5, reasoning: "" },
        },
        gaps: [],
        nextQuestion: "",
      }),
    }));

    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: {
        LEAD_CAPTURED: "lead.captured",
        LEAD_UPDATED: "lead.updated",
      },
      buildOutboxEvent: rs.fn().mockReturnValue({
        id: "outbox-hs-1",
        eventName: "lead.captured",
        payload: { leadId: LEAD_ID, userId: USER_ID, hubspotSync: false },
        query: {},
      }),
      sendPostCommit: rs.fn().mockResolvedValue(undefined),
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn(),
      createContact: rs.fn(),
      updateContact: rs.fn(),
      toContactProperties: rs.fn(),
    }));

    rs.doMock("~/server/nurture/scheduler", () => ({
      startOrUpdateSequence: rs.fn().mockResolvedValue(undefined),
    }));
  });

  test("calls db.batch with two statements (lead upsert + outbox insert)", async () => {
    const { captureLeadFromHubspot } = await import("~/server/leads/intake");

    await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBatch).toHaveBeenCalledOnce();
    const [batchArgs] = mockBatch.mock.calls[0] as [[unknown, unknown]];
    expect(Array.isArray(batchArgs)).toBe(true);
    expect(batchArgs).toHaveLength(2);
  });

  test("calls buildOutboxEvent with hubspotSync: false", async () => {
    const { captureLeadFromHubspot } = await import("~/server/leads/intake");
    const { buildOutboxEvent } = await import("~/server/outbox");

    await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(buildOutboxEvent).toHaveBeenCalledWith(
      "lead.captured",
      expect.objectContaining({ hubspotSync: false }),
    );
  });

  test("passes hubspotContactId and scored fields in the upsert record", async () => {
    const { captureLeadFromHubspot } = await import("~/server/leads/intake");
    const { qualifyAndScore } = await import("~/server/scoring");

    const lead = await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(qualifyAndScore).toHaveBeenCalledOnce();
    expect(lead.hubspotContactId).toBe(HS_ID);
    expect(lead.leadScore).toBe(50);
    expect(lead.leadStage).toBe("nurture");
  });

  test("uses existing leadId when lead already exists by hubspotContactId", async () => {
    const existingId = "cccccccc-0000-0000-0000-000000000003";
    mockFindFirst.mockResolvedValue({ id: existingId });

    const mockLead = {
      id: existingId,
      firstName: "Jane",
      lastName: "Doe",
      hubspotContactId: HS_ID,
      leadScore: 50,
      leadStage: "nurture",
      scoreMetadata: {},
    };
    mockBatch.mockResolvedValue([[mockLead], []]);

    const { captureLeadFromHubspot } = await import("~/server/leads/intake");

    const lead = await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(lead.id).toBe(existingId);
  });
});

describe("updateLead — unit", () => {
  let mockBatch: ReturnType<typeof rs.fn>;
  let mockFindFirst: ReturnType<typeof rs.fn>;
  let mockDb: Record<string, unknown>;

  const existingLead = {
    id: LEAD_ID,
    firstName: "Jane",
    lastName: "Doe",
    hubspotContactId: null,
    leadScore: 0,
    leadStage: "unqualified",
    scoreMetadata: null,
  };

  beforeEach(() => {
    rs.resetModules();

    rs.doMock("~/env", () => ({
      env: {
        DATABASE_URL: "postgres://mock",
        HUBSPOT_ACCESS_TOKEN: "mock-token",
        HUBSPOT_CLIENT_SECRET: "mock-secret",
      },
    }));

    const updatedLead = { ...existingLead, notes: "updated" };
    mockBatch = rs.fn().mockResolvedValue([[updatedLead], []]);
    mockFindFirst = rs.fn().mockResolvedValue(existingLead);

    mockDb = {
      batch: mockBatch,
      update: rs.fn().mockReturnValue({
        set: rs.fn().mockReturnValue({
          where: rs.fn().mockReturnValue({ returning: rs.fn() }),
        }),
      }),
      insert: rs.fn().mockReturnValue({
        values: rs.fn(),
      }),
      query: { leads: { findFirst: mockFindFirst } },
    };

    rs.doMock("~/server/db", () => ({ db: mockDb }));

    rs.doMock("~/server/scoring", () => ({
      qualifyAndScore: rs.fn().mockReturnValue({
        score: 10,
        stage: "nurture",
        breakdown: {
          land: { score: 0, maxScore: 30, reasoning: "" },
          finance: { score: 0, maxScore: 25, reasoning: "" },
          timeline: { score: 0, maxScore: 20, reasoning: "" },
          budget: { score: 0, maxScore: 10, reasoning: "" },
          propertyType: { score: 0, maxScore: 10, reasoning: "" },
          engagement: { score: 0, maxScore: 5, reasoning: "" },
        },
        gaps: [],
        nextQuestion: "",
      }),
    }));

    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: {
        LEAD_CAPTURED: "lead.captured",
        LEAD_UPDATED: "lead.updated",
      },
      buildOutboxEvent: rs.fn().mockReturnValue({
        id: "outbox-2",
        eventName: "lead.updated",
        payload: {},
        query: {},
      }),
      sendPostCommit: rs.fn().mockResolvedValue(undefined),
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn(),
      createContact: rs.fn(),
      updateContact: rs.fn(),
      toContactProperties: rs.fn(),
    }));

    rs.doMock("~/server/nurture/scheduler", () => ({
      startOrUpdateSequence: rs.fn().mockResolvedValue(undefined),
    }));
  });

  test("throws NOT_FOUND when lead does not exist", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    const { updateLead } = await import("~/server/leads/intake");

    await expect(
      updateLead(
        mockDb as never,
        crypto.randomUUID(),
        { notes: "ghost" },
        {
          db: mockDb as never,
          userId: USER_ID,
        },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("publishes lead.updated even on non-qualifying edit", async () => {
    const { updateLead } = await import("~/server/leads/intake");
    const { buildOutboxEvent } = await import("~/server/outbox");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { notes: "non-qual" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(buildOutboxEvent).toHaveBeenCalledWith(
      "lead.updated",
      expect.anything(),
    );
  });

  test("re-scores on qualifying edit", async () => {
    const { updateLead } = await import("~/server/leads/intake");
    const { qualifyAndScore } = await import("~/server/scoring");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { hasLand: true },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(qualifyAndScore).toHaveBeenCalledOnce();
  });

  test("does not re-score on non-qualifying edit", async () => {
    const { updateLead } = await import("~/server/leads/intake");
    const { qualifyAndScore } = await import("~/server/scoring");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { notes: "memo" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(qualifyAndScore).not.toHaveBeenCalled();
  });

  test("makes no synchronous HubSpot calls", async () => {
    const { updateLead } = await import("~/server/leads/intake");
    const { updateContact } = await import("~/server/hubspot");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { notes: "note" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(updateContact).not.toHaveBeenCalled();
  });

  test("throws NOT_FOUND when batch returns empty row", async () => {
    mockBatch.mockResolvedValue([[], []]);
    const { updateLead } = await import("~/server/leads/intake");

    await expect(
      updateLead(
        mockDb as never,
        LEAD_ID,
        { notes: "missing" },
        {
          db: mockDb as never,
          userId: USER_ID,
        },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
