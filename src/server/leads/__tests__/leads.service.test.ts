import { describe, expect, rs, test } from "@rstest/core";

import { LeadNotFoundError } from "~/server/leads/leads.errors";
import type { LeadsRepository } from "~/server/leads/leads.repository";
import { makeLeadsService } from "~/server/leads/leads.service";
import { makeLead } from "./fixtures";

// Service tests over a fake repo object literal — no rs.doMock. The service
// has no HubSpot (or any non-repo) dependency: the old "makes no HubSpot
// calls" invariant is now structural. The service throws domain errors
// (LeadNotFoundError) — transport mapping is asserted at the router seam.

const LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_ID = "user-test-1";
const CTX = { userId: USER_ID };

const leadRow = makeLead({ id: LEAD_ID });

function makeFakeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: rs.fn().mockResolvedValue(leadRow),
    findByEmail: rs.fn().mockResolvedValue(undefined),
    findByHubspotContactId: rs.fn().mockResolvedValue(undefined),
    getContact: rs.fn().mockResolvedValue({ email: null }),
    list: rs.fn().mockResolvedValue({ rows: [], total: 0 }),
    listByStage: rs.fn().mockResolvedValue([]),
    firstUserCreated: rs.fn().mockResolvedValue({ id: "user-earliest" }),
    deleteById: rs.fn(),
    // Plural door: resolves the positional results tuple — one entry per write.
    commit: rs.fn().mockResolvedValue([leadRow]),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeFakeRepo>) {
  return makeLeadsService({ repo: repo as unknown as LeadsRepository });
}

describe("captureLead", () => {
  test("no email — skips the pre-read, commits an insert with lead.captured", async () => {
    const repo = makeFakeRepo();
    const service = makeService(repo);

    const result = await service.captureLead(
      { firstName: "John", lastName: "Smith" },
      CTX,
    );

    expect(repo.findByEmail).not.toHaveBeenCalled();
    expect(repo.commit).toHaveBeenCalledOnce();
    const [writes, events] = repo.commit.mock.calls[0] as [
      { kind: string }[],
      { name: string }[],
    ];
    expect(writes).toHaveLength(1);
    expect(writes[0]!.kind).toBe("insert");
    expect(events.map((e) => e.name)).toContain("lead.captured");
    expect(result).toEqual(leadRow);
  });

  test("email present — pre-reads by email; existing lead becomes an update", async () => {
    const repo = makeFakeRepo({
      findByEmail: rs
        .fn()
        .mockResolvedValue({ id: LEAD_ID, leadStage: "unqualified" }),
    });
    const service = makeService(repo);

    await service.captureLead(
      { firstName: "John", lastName: "Smith", email: "john@test.com" },
      CTX,
    );

    expect(repo.findByEmail).toHaveBeenCalledWith("john@test.com");
    const [writes] = repo.commit.mock.calls[0] as [
      { kind: string; id?: string }[],
    ];
    expect(writes[0]!.kind).toBe("update");
    expect(writes[0]!.id).toBe(LEAD_ID);
  });

  test("returns the post-scoring row from commit (adr006)", async () => {
    const scored = { ...leadRow, leadScore: 50, leadStage: "nurture" as const };
    const repo = makeFakeRepo({ commit: rs.fn().mockResolvedValue([scored]) });
    const service = makeService(repo);

    const result = await service.captureLead(
      { firstName: "John", lastName: "Smith" },
      CTX,
    );

    expect(result).toEqual(scored);
  });
});

describe("captureLeadFromHubspot", () => {
  const HS_ID = "hs-contact-abc123";

  test("pre-reads by hubspotContactId and commits the upsert with hubspotSync:false", async () => {
    const repo = makeFakeRepo();
    const service = makeService(repo);

    await service.captureLeadFromHubspot(
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      CTX,
    );

    expect(repo.findByHubspotContactId).toHaveBeenCalledWith(HS_ID);
    const [writes, events] = repo.commit.mock.calls[0] as [
      { kind: string; record?: { hubspotContactId: string } }[],
      { name: string; data: Record<string, unknown> }[],
    ];
    expect(writes).toHaveLength(1);
    expect(writes[0]!.kind).toBe("upsert");
    expect(writes[0]!.record?.hubspotContactId).toBe(HS_ID);
    expect(events[0]).toMatchObject({
      name: "lead.captured",
      data: { hubspotSync: false, userId: USER_ID },
    });
  });

  test("returns the committed row", async () => {
    const hsRow = { ...leadRow, hubspotContactId: HS_ID };
    const repo = makeFakeRepo({ commit: rs.fn().mockResolvedValue([hsRow]) });
    const service = makeService(repo);

    const result = await service.captureLeadFromHubspot(
      HS_ID,
      { firstName: "Jane", lastName: "Doe" },
      CTX,
    );

    expect(result.hubspotContactId).toBe(HS_ID);
  });
});

describe("updateLead", () => {
  test("throws LeadNotFoundError when the lead does not exist", async () => {
    const repo = makeFakeRepo({
      findById: rs.fn().mockResolvedValue(undefined),
    });
    const service = makeService(repo);

    const ghostId = crypto.randomUUID();
    await expect(
      service.updateLead(ghostId, { notes: "ghost" }, CTX),
    ).rejects.toThrow(LeadNotFoundError);
    expect(repo.commit).not.toHaveBeenCalled();
  });

  test("throws LeadNotFoundError when commit returns no row (concurrent delete)", async () => {
    const repo = makeFakeRepo({
      commit: rs.fn().mockResolvedValue([undefined]),
    });
    const service = makeService(repo);

    await expect(
      service.updateLead(LEAD_ID, { notes: "missing" }, CTX),
    ).rejects.toThrow(LeadNotFoundError);
  });

  test("carries the missing lead id on the domain error", async () => {
    const repo = makeFakeRepo({
      findById: rs.fn().mockResolvedValue(undefined),
    });
    const service = makeService(repo);

    await expect(
      service.updateLead(LEAD_ID, { notes: "ghost" }, CTX),
    ).rejects.toMatchObject({ name: "LeadNotFoundError", leadId: LEAD_ID });
  });

  test("loads existing, commits decide output, returns the updated row", async () => {
    const updated = { ...leadRow, notes: "updated" };
    const repo = makeFakeRepo({
      commit: rs.fn().mockResolvedValue([updated]),
    });
    const service = makeService(repo);

    const result = await service.updateLead(LEAD_ID, { notes: "updated" }, CTX);

    expect(repo.findById).toHaveBeenCalledWith(LEAD_ID);
    const [writes, events] = repo.commit.mock.calls[0] as [
      { kind: string; id: string }[],
      { name: string }[],
    ];
    expect(writes).toHaveLength(1);
    expect(writes[0]!.kind).toBe("update");
    expect(writes[0]!.id).toBe(LEAD_ID);
    expect(events.map((e) => e.name)).toContain("lead.updated");
    expect(result).toEqual(updated);
  });
});

describe("list", () => {
  test("shapes the repository's {rows, total} into the pagination envelope", async () => {
    const rows = [leadRow];
    const repo = makeFakeRepo({
      list: rs.fn().mockResolvedValue({ rows, total: 41 }),
    });
    const service = makeService(repo);

    const filter = {
      page: 2,
      limit: 20,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    };
    const result = await service.list(filter);

    expect(repo.list).toHaveBeenCalledWith(filter);
    expect(result).toEqual({
      items: rows,
      pagination: { page: 2, limit: 20, total: 41, totalPages: 3 },
    });
  });

  test("empty result — totalPages is 0", async () => {
    const repo = makeFakeRepo();
    const service = makeService(repo);

    const result = await service.list({
      page: 1,
      limit: 20,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    });

    expect(result.items).toHaveLength(0);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });
});

describe("getByStage", () => {
  test("buckets the repository rows into the four stage lanes", async () => {
    const rows = [
      makeLead({ id: "1", leadStage: "unqualified" }),
      makeLead({ id: "2", leadStage: "warm" }),
      makeLead({ id: "3", leadStage: "hot" }),
      makeLead({ id: "4", leadStage: "nurture" }),
      makeLead({ id: "5", leadStage: "hot" }),
    ];
    const repo = makeFakeRepo({
      listByStage: rs.fn().mockResolvedValue(rows),
    });
    const service = makeService(repo);

    const result = await service.getByStage(undefined);

    expect(repo.listByStage).toHaveBeenCalledWith(undefined);
    expect(result.unqualified.map((l) => l.id)).toEqual(["1"]);
    expect(result.nurture.map((l) => l.id)).toEqual(["4"]);
    expect(result.warm.map((l) => l.id)).toEqual(["2"]);
    expect(result.hot.map((l) => l.id)).toEqual(["3", "5"]);
  });

  test("returns empty buckets when no leads exist", async () => {
    const repo = makeFakeRepo();
    const service = makeService(repo);

    const result = await service.getByStage(undefined);

    expect(result).toEqual({
      unqualified: [],
      nurture: [],
      warm: [],
      hot: [],
    });
  });
});

describe("resolveOwnerUserId", () => {
  test("returns the earliest user id when users exist", async () => {
    const repo = makeFakeRepo();
    const service = makeService(repo);

    const id = await service.resolveOwnerUserId();

    expect(id).toBe("user-earliest");
    expect(repo.firstUserCreated).toHaveBeenCalledOnce();
  });

  test("throws when no consultant user found", async () => {
    const repo = makeFakeRepo({
      firstUserCreated: rs.fn().mockResolvedValue(undefined),
    });
    const service = makeService(repo);

    await expect(service.resolveOwnerUserId()).rejects.toThrow(
      "[leads] resolveLeadOwnerUserId: no consultant user found",
    );
  });
});

describe("cross-domain ports", () => {
  test("stampHubspotContactId commits the guarded stamp write with no events", async () => {
    const repo = makeFakeRepo();
    const service = makeService(repo);

    await service.stampHubspotContactId(LEAD_ID, "hs-1");

    expect(repo.commit).toHaveBeenCalledWith(
      [{ kind: "stamp", id: LEAD_ID, hubspotContactId: "hs-1" }],
      [],
    );
  });

  test("getLeadContact passes through to the repository", async () => {
    const contact = { email: "jane@example.com" };
    const repo = makeFakeRepo({
      getContact: rs.fn().mockResolvedValue(contact),
    });
    const service = makeService(repo);

    const result = await service.getLeadContact(LEAD_ID);

    expect(repo.getContact).toHaveBeenCalledWith(LEAD_ID);
    expect(result).toEqual(contact);
  });
});

describe("pass-through reads", () => {
  test("getById / deleteLead delegate to the repository", async () => {
    const repo = makeFakeRepo({
      deleteById: rs.fn().mockResolvedValue({ id: LEAD_ID }),
    });
    const service = makeService(repo);

    await service.getById(LEAD_ID);
    expect(repo.findById).toHaveBeenCalledWith(LEAD_ID);

    const deleted = await service.deleteLead(LEAD_ID);
    expect(repo.deleteById).toHaveBeenCalledWith(LEAD_ID);
    expect(deleted).toEqual({ id: LEAD_ID });
  });
});
