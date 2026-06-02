import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_ID = "user-test-1";

// Returns a distinct mock outbox event for each eventName.
function makeBuildOutboxEventMock() {
  return rs.fn().mockImplementation((eventName: string, payload: unknown) => ({
    id: `outbox-${eventName}`,
    eventName,
    payload,
    query: { _eventName: eventName },
  }));
}

describe("captureLead — unit", () => {
  let mockBatch: ReturnType<typeof rs.fn>;
  let mockFindFirst: ReturnType<typeof rs.fn>;
  let mockDb: Record<string, unknown>;
  let mockBuildOutboxEvent: ReturnType<typeof rs.fn>;
  let mockSendPostCommit: ReturnType<typeof rs.fn>;

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

    mockBatch = rs.fn().mockResolvedValue([[mockLead], [], []]);
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

    mockBuildOutboxEvent = makeBuildOutboxEventMock();
    mockSendPostCommit = rs.fn().mockResolvedValue(undefined);

    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: {
        LEAD_CAPTURED: "lead.captured",
        LEAD_UPDATED: "lead.updated",
        LEAD_STAGE_CHANGED: "lead.stage-changed",
      },
      buildOutboxEvent: mockBuildOutboxEvent,
      sendPostCommit: mockSendPostCommit,
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn(),
      createContact: rs.fn(),
      updateContact: rs.fn(),
      toContactProperties: rs.fn(),
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

  test("new lead — batches lead.captured + lead.stage-changed (3 items)", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBatch).toHaveBeenCalledOnce();
    const [batchArgs] = mockBatch.mock.calls[0] as [
      [unknown, unknown, unknown],
    ];
    expect(Array.isArray(batchArgs)).toBe(true);
    // stmt + lead.captured query + lead.stage-changed query
    expect(batchArgs).toHaveLength(3);
  });

  test("new lead — sendPostCommit includes lead.captured and lead.stage-changed", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockSendPostCommit).toHaveBeenCalledOnce();
    const [events] = mockSendPostCommit.mock.calls[0] as [{ name: string }[]];
    const names = events.map((e) => e.name);
    expect(names).toContain("lead.captured");
    expect(names).toContain("lead.stage-changed");
  });

  test("new lead — stage-changed event has fromStage:null and toStage", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.stage-changed",
      expect.objectContaining({ fromStage: null, toStage: "nurture" }),
    );
  });

  test("upsert with same stage — stage-changed NOT emitted (batch has 2 items)", async () => {
    // Existing lead with same stage as score result ("nurture")
    mockFindFirst.mockResolvedValue({ id: LEAD_ID, leadStage: "nurture" });
    mockBatch.mockResolvedValue([[{ id: LEAD_ID, leadStage: "nurture" }], []]);

    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      {
        firstName: "John",
        lastName: "Smith",
        email: "john@test.com",
      },
      { db: mockDb as never, userId: USER_ID },
    );

    const [batchArgs] = mockBatch.mock.calls[0] as [[unknown, unknown]];
    expect(batchArgs).toHaveLength(2);

    const [events] = mockSendPostCommit.mock.calls[0] as [{ name: string }[]];
    const names = events.map((e) => e.name);
    expect(names).not.toContain("lead.stage-changed");
  });

  test("upsert with different stage — stage-changed emitted with correct fromStage", async () => {
    // Existing lead is "unqualified", score returns "nurture"
    mockFindFirst.mockResolvedValue({ id: LEAD_ID, leadStage: "unqualified" });
    mockBatch.mockResolvedValue([
      [{ id: LEAD_ID, leadStage: "nurture" }],
      [],
      [],
    ]);

    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith", email: "john@test.com" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.stage-changed",
      expect.objectContaining({ fromStage: "unqualified", toStage: "nurture" }),
    );

    const [events] = mockSendPostCommit.mock.calls[0] as [{ name: string }[]];
    expect(events.map((e) => e.name)).toContain("lead.stage-changed");
  });

  test("lead.captured always emitted", async () => {
    const { captureLead } = await import("~/server/leads/intake");

    await captureLead(
      mockDb as never,
      { firstName: "John", lastName: "Smith" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.captured",
      expect.anything(),
    );
  });

  test("uses db.update path when existing lead found by email", async () => {
    const existingId = "bbbbbbbb-0000-0000-0000-000000000002";
    mockFindFirst.mockResolvedValue({ id: existingId, leadStage: "nurture" });

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
  let mockBuildOutboxEvent: ReturnType<typeof rs.fn>;
  let mockSendPostCommit: ReturnType<typeof rs.fn>;

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

    mockBatch = rs.fn().mockResolvedValue([[mockLead], [], []]);
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

    mockBuildOutboxEvent = makeBuildOutboxEventMock();
    mockSendPostCommit = rs.fn().mockResolvedValue(undefined);

    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: {
        LEAD_CAPTURED: "lead.captured",
        LEAD_UPDATED: "lead.updated",
        LEAD_STAGE_CHANGED: "lead.stage-changed",
      },
      buildOutboxEvent: mockBuildOutboxEvent,
      sendPostCommit: mockSendPostCommit,
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn(),
      createContact: rs.fn(),
      updateContact: rs.fn(),
      toContactProperties: rs.fn(),
    }));
  });

  test("new contact — batches lead.captured + lead.stage-changed (3 items)", async () => {
    const { captureLeadFromHubspot } = await import("~/server/leads/intake");

    await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBatch).toHaveBeenCalledOnce();
    const [batchArgs] = mockBatch.mock.calls[0] as [
      [unknown, unknown, unknown],
    ];
    expect(Array.isArray(batchArgs)).toBe(true);
    expect(batchArgs).toHaveLength(3);
  });

  test("calls buildOutboxEvent with hubspotSync: false", async () => {
    const { captureLeadFromHubspot } = await import("~/server/leads/intake");

    await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.captured",
      expect.objectContaining({ hubspotSync: false }),
    );
  });

  test("new contact — stage-changed fromStage is null", async () => {
    const { captureLeadFromHubspot } = await import("~/server/leads/intake");

    await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.stage-changed",
      expect.objectContaining({ fromStage: null, toStage: "nurture" }),
    );
  });

  test("existing contact with same stage — stage-changed NOT emitted", async () => {
    mockFindFirst.mockResolvedValue({ id: LEAD_ID, leadStage: "nurture" });
    mockBatch.mockResolvedValue([[{ id: LEAD_ID, leadStage: "nurture" }], []]);

    const { captureLeadFromHubspot } = await import("~/server/leads/intake");

    await captureLeadFromHubspot(
      mockDb as never,
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      { db: mockDb as never, userId: USER_ID },
    );

    const [batchArgs] = mockBatch.mock.calls[0] as [[unknown, unknown]];
    expect(batchArgs).toHaveLength(2);

    const [events] = mockSendPostCommit.mock.calls[0] as [{ name: string }[]];
    expect(events.map((e) => e.name)).not.toContain("lead.stage-changed");
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
    mockFindFirst.mockResolvedValue({ id: existingId, leadStage: "nurture" });

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
  let mockBuildOutboxEvent: ReturnType<typeof rs.fn>;
  let mockSendPostCommit: ReturnType<typeof rs.fn>;

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
    mockBatch = rs.fn().mockResolvedValue([[updatedLead], [], []]);
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

    mockBuildOutboxEvent = makeBuildOutboxEventMock();
    mockSendPostCommit = rs.fn().mockResolvedValue(undefined);

    rs.doMock("~/server/outbox", () => ({
      OUTBOX_EVENTS: {
        LEAD_CAPTURED: "lead.captured",
        LEAD_UPDATED: "lead.updated",
        LEAD_STAGE_CHANGED: "lead.stage-changed",
      },
      buildOutboxEvent: mockBuildOutboxEvent,
      sendPostCommit: mockSendPostCommit,
    }));

    rs.doMock("~/server/hubspot", () => ({
      findExistingContact: rs.fn(),
      createContact: rs.fn(),
      updateContact: rs.fn(),
      toContactProperties: rs.fn(),
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
    mockBatch.mockResolvedValue([[{ ...existingLead, notes: "non-qual" }], []]);
    const { updateLead } = await import("~/server/leads/intake");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { notes: "non-qual" },
      {
        db: mockDb as never,
        userId: USER_ID,
      },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
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
    mockBatch.mockResolvedValue([[{ ...existingLead }], []]);
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

  test("qualifying edit that changes stage — lead.stage-changed emitted", async () => {
    // existingLead.leadStage = "unqualified", score returns "nurture" → stage changes
    const { updateLead } = await import("~/server/leads/intake");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { hasLand: true },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.stage-changed",
      expect.objectContaining({ fromStage: "unqualified", toStage: "nurture" }),
    );

    const [events] = mockSendPostCommit.mock.calls[0] as [{ name: string }[]];
    expect(events.map((e) => e.name)).toContain("lead.stage-changed");
  });

  test("qualifying edit with same stage — lead.stage-changed NOT emitted", async () => {
    // Existing lead already at "nurture", score also returns "nurture"
    mockFindFirst.mockResolvedValue({ ...existingLead, leadStage: "nurture" });
    mockBatch.mockResolvedValue([
      [{ ...existingLead, leadStage: "nurture" }],
      [],
    ]);

    const { updateLead } = await import("~/server/leads/intake");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { hasLand: true },
      { db: mockDb as never, userId: USER_ID },
    );

    const stageChangedCalls = (
      mockBuildOutboxEvent.mock.calls as [string, unknown][]
    ).filter(([name]) => name === "lead.stage-changed");
    expect(stageChangedCalls).toHaveLength(0);

    const [events] = mockSendPostCommit.mock.calls[0] as [{ name: string }[]];
    expect(events.map((e) => e.name)).not.toContain("lead.stage-changed");
  });

  test("non-qualifying edit — lead.stage-changed NOT emitted", async () => {
    mockBatch.mockResolvedValue([[{ ...existingLead }], []]);
    const { updateLead } = await import("~/server/leads/intake");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { notes: "just a note" },
      { db: mockDb as never, userId: USER_ID },
    );

    const stageChangedCalls = (
      mockBuildOutboxEvent.mock.calls as [string, unknown][]
    ).filter(([name]) => name === "lead.stage-changed");
    expect(stageChangedCalls).toHaveLength(0);
  });

  test("lead.updated always emitted", async () => {
    const { updateLead } = await import("~/server/leads/intake");

    await updateLead(
      mockDb as never,
      LEAD_ID,
      { notes: "note" },
      { db: mockDb as never, userId: USER_ID },
    );

    expect(mockBuildOutboxEvent).toHaveBeenCalledWith(
      "lead.updated",
      expect.anything(),
    );
  });
});
