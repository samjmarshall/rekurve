import { describe, expect, rs, test } from "@rstest/core";
import {
  CADENCE_DAYS,
  computeNextStepAt,
  runSchedulerTick,
  SEQUENCE_TYPE_BY_STAGE,
  startOrUpdateSequence,
} from "../scheduler";

const SEQ_ID = "550e8400-e29b-41d4-a716-446655440000";
const LEAD_ID = "660e8400-e29b-41d4-a716-446655440001";

const baseLead = {
  id: LEAD_ID,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: null,
  hubspotContactId: null,
  preferredContactTime: null,
  hasLand: null,
  landRegistered: null,
  landAddress: null,
  landSizeSqm: null,
  landWidth: null,
  landDepth: null,
  propertyType: null,
  budget: null,
  seenBroker: null,
  constructionTimeline: null,
  leadScore: 0,
  leadStage: "nurture" as const,
  scoreMetadata: null,
  preferredEstates: null,
  preferredSuburbs: null,
  leadSource: null,
  referrerName: null,
  notes: null,
  resolveFinanceOptedIn: false,
  createdAt: new Date("2026-04-01"),
  updatedAt: new Date("2026-04-01"),
  lastContactedAt: null,
};

const baseSeq = {
  id: SEQ_ID,
  leadId: LEAD_ID,
  sequenceType: "nurture" as const,
  status: "active" as const,
  nextStepAt: new Date(Date.now() - 60_000),
  createdAt: new Date("2026-04-01"),
  updatedAt: new Date("2026-04-01"),
};

// --- computeNextStepAt ---

describe("computeNextStepAt", () => {
  test("discovery returns +3 days", () => {
    const from = new Date("2026-04-21T00:00:00Z");
    const result = computeNextStepAt("discovery", from);
    expect(result.getTime()).toBe(from.getTime() + 3 * 86_400_000);
  });

  test("nurture returns +14 days", () => {
    const from = new Date("2026-04-21T00:00:00Z");
    const result = computeNextStepAt("nurture", from);
    expect(result.getTime()).toBe(from.getTime() + 14 * 86_400_000);
  });

  test("warm_progression returns +7 days", () => {
    const from = new Date("2026-04-21T00:00:00Z");
    const result = computeNextStepAt("warm_progression", from);
    expect(result.getTime()).toBe(from.getTime() + 7 * 86_400_000);
  });

  test("CADENCE_DAYS entries match computeNextStepAt output", () => {
    const from = new Date("2026-04-21T00:00:00Z");
    for (const [type, days] of Object.entries(CADENCE_DAYS)) {
      const result = computeNextStepAt(type as keyof typeof CADENCE_DAYS, from);
      expect(result.getTime()).toBe(from.getTime() + days * 86_400_000);
    }
  });
});

// --- SEQUENCE_TYPE_BY_STAGE ---

describe("SEQUENCE_TYPE_BY_STAGE", () => {
  test("hot maps to null", () => {
    expect(SEQUENCE_TYPE_BY_STAGE.hot).toBeNull();
  });

  test("non-hot stages map to a valid sequenceType", () => {
    expect(SEQUENCE_TYPE_BY_STAGE.unqualified).toBe("discovery");
    expect(SEQUENCE_TYPE_BY_STAGE.nurture).toBe("nurture");
    expect(SEQUENCE_TYPE_BY_STAGE.warm).toBe("warm_progression");
  });
});

// --- runSchedulerTick ---

describe("runSchedulerTick", () => {
  function buildSelectMock(rows: unknown[]) {
    const where = rs.fn().mockResolvedValue(rows);
    const innerJoin = rs.fn().mockReturnValue({ where });
    const from = rs.fn().mockReturnValue({ innerJoin });
    const select = rs.fn().mockReturnValue({ from });
    return { select, from, innerJoin, where };
  }

  function buildInsertMock() {
    const values = rs.fn().mockResolvedValue([]);
    const insert = rs.fn().mockReturnValue({ values });
    return { insert, values };
  }

  function buildUpdateMock() {
    const where = rs.fn().mockResolvedValue([]);
    const set = rs.fn().mockReturnValue({ where });
    const update = rs.fn().mockReturnValue({ set });
    return { update, set, where };
  }

  test("returns { drafted: 0, failed: 0 } when no due sequences", async () => {
    const { select } = buildSelectMock([]);
    const mockDb = { select } as unknown as Parameters<
      typeof runSchedulerTick
    >[0];

    const result = await runSchedulerTick(mockDb, rs.fn());
    expect(result).toEqual({ drafted: 0, failed: 0 });
  });

  test("drafts a message and advances nextStepAt for each due sequence", async () => {
    const { select } = buildSelectMock([{ seq: baseSeq, lead: baseLead }]);
    const { insert, values } = buildInsertMock();
    const { update, set } = buildUpdateMock();
    const mockDb = { select, insert, update } as unknown as Parameters<
      typeof runSchedulerTick
    >[0];

    const mockDraft = rs.fn().mockResolvedValue({
      channel: "sms",
      subject: null,
      body: "Hi Jane",
      aiReasoning: "reason",
      priority: 5,
    });

    const result = await runSchedulerTick(mockDb, mockDraft);

    expect(result).toEqual({ drafted: 1, failed: 0 });
    expect(mockDraft).toHaveBeenCalledWith({ lead: baseLead });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: LEAD_ID,
        channel: "sms",
        body: "Hi Jane",
        status: "pending",
      }),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStepAt: expect.any(Date),
      }),
    );
  });

  test("inserts message_queue row with status=pending", async () => {
    const { select } = buildSelectMock([{ seq: baseSeq, lead: baseLead }]);
    const { insert, values } = buildInsertMock();
    const { update } = buildUpdateMock();
    const mockDb = { select, insert, update } as unknown as Parameters<
      typeof runSchedulerTick
    >[0];

    const mockDraft = rs.fn().mockResolvedValue({
      channel: "email",
      subject: "Follow up",
      body: "Body",
      aiReasoning: "reason",
      priority: 3,
    });

    await runSchedulerTick(mockDb, mockDraft);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  test("continues past a thrown draftMessage and still advances nextStepAt", async () => {
    const { select } = buildSelectMock([{ seq: baseSeq, lead: baseLead }]);
    const { insert } = buildInsertMock();
    const { update, set } = buildUpdateMock();
    const mockDb = { select, insert, update } as unknown as Parameters<
      typeof runSchedulerTick
    >[0];

    const mockDraft = rs.fn().mockRejectedValue(new Error("Claude error"));

    const result = await runSchedulerTick(mockDb, mockDraft);

    expect(result).toEqual({ drafted: 0, failed: 1 });
    // nextStepAt must still advance
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ nextStepAt: expect.any(Date) }),
    );
    // No message_queue insert happened
    expect(insert).not.toHaveBeenCalled();
  });
});

// --- startOrUpdateSequence ---

describe("startOrUpdateSequence", () => {
  function buildInsertMock() {
    const values = rs.fn().mockResolvedValue([]);
    const insert = rs.fn().mockReturnValue({ values });
    return { insert, values };
  }

  function buildUpdateMock() {
    const where = rs.fn().mockResolvedValue([]);
    const set = rs.fn().mockReturnValue({ where });
    const update = rs.fn().mockReturnValue({ set });
    return { update, set, where };
  }

  test("hot stage marks active sequence completed without inserting", async () => {
    const { update, set, where } = buildUpdateMock();
    const insert = rs.fn();
    const mockDb = {
      update,
      insert,
    } as unknown as Parameters<typeof startOrUpdateSequence>[0];

    await startOrUpdateSequence(mockDb, LEAD_ID, "hot");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
    expect(where).toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  test("inserts a new active sequence when none exists", async () => {
    const { insert, values } = buildInsertMock();
    const findFirst = rs.fn().mockResolvedValue(undefined);
    const mockDb = {
      insert,
      query: { nurtureSequences: { findFirst } },
    } as unknown as Parameters<typeof startOrUpdateSequence>[0];

    await startOrUpdateSequence(mockDb, LEAD_ID, "nurture");

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: LEAD_ID,
        sequenceType: "nurture",
        status: "active",
        nextStepAt: expect.any(Date),
      }),
    );
  });

  test("updates sequenceType and nextStepAt when stage changes", async () => {
    const existingSeq = {
      ...baseSeq,
      sequenceType: "nurture" as const,
    };
    const findFirst = rs.fn().mockResolvedValue(existingSeq);
    const { update, set, where } = buildUpdateMock();
    const mockDb = {
      update,
      query: { nurtureSequences: { findFirst } },
    } as unknown as Parameters<typeof startOrUpdateSequence>[0];

    await startOrUpdateSequence(mockDb, LEAD_ID, "warm");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        sequenceType: "warm_progression",
        nextStepAt: expect.any(Date),
      }),
    );
    expect(where).toHaveBeenCalled();
  });

  test("no-ops when existing sequence type already matches", async () => {
    const existingSeq = {
      ...baseSeq,
      sequenceType: "nurture" as const,
    };
    const findFirst = rs.fn().mockResolvedValue(existingSeq);
    const update = rs.fn();
    const insert = rs.fn();
    const mockDb = {
      update,
      insert,
      query: { nurtureSequences: { findFirst } },
    } as unknown as Parameters<typeof startOrUpdateSequence>[0];

    await startOrUpdateSequence(mockDb, LEAD_ID, "nurture");

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
