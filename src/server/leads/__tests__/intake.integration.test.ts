// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

describe.skipIf(!process.env.INTEGRATION_DB)(
  "captureLead / updateLead integration",
  () => {
    const createdLeadIds: string[] = [];
    const createdOutboxIds: string[] = [];

    beforeEach(() => {
      rs.resetModules();

      // HubSpot must not be called — mock it to throw if invoked
      rs.doMock("~/server/hubspot", () => ({
        findExistingContact: rs
          .fn()
          .mockRejectedValue(
            new Error("HubSpot must not be called in DB-first mode"),
          ),
        createContact: rs
          .fn()
          .mockRejectedValue(
            new Error("HubSpot must not be called in DB-first mode"),
          ),
        updateContact: rs
          .fn()
          .mockRejectedValue(
            new Error("HubSpot must not be called in DB-first mode"),
          ),
        toContactProperties: rs.fn().mockReturnValue({}),
      }));

      // Mock inngest.send so sendPostCommit doesn't actually send
      rs.doMock("~/inngest/client", () => ({
        inngest: { send: rs.fn().mockResolvedValue(undefined) },
      }));

      rs.doMock("~/server/nurture/scheduler", () => ({
        startOrUpdateSequence: rs.fn().mockResolvedValue(undefined),
      }));
    });

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { outbox } = await import("~/server/db/schema/outbox");
      if (createdLeadIds.length > 0) {
        await db.delete(leads).where(inArray(leads.id, createdLeadIds));
      }
      if (createdOutboxIds.length > 0) {
        await db.delete(outbox).where(inArray(outbox.id, createdOutboxIds));
      }
    });

    // ---- captureLead ----

    test("returns row with null hubspotContactId and scoring fields set", async () => {
      const { db } = await import("~/server/db");
      const { captureLead } = await import("~/server/leads/intake");

      const email = `intake.${RUN_ID}.t1@test.example`;
      const input = {
        firstName: "Integration",
        lastName: "Test",
        email,
        hasLand: true,
        landRegistered: true,
        landSizeSqm: "450",
        seenBroker: true,
        constructionTimeline: "ready_now" as const,
        budget: "$650000",
        propertyType: "first_home_buyer" as const,
      };

      const lead = await captureLead(db, input, {
        db,
        userId: `user-${RUN_ID}`,
      });
      createdLeadIds.push(lead.id);

      expect(lead.hubspotContactId).toBeNull();
      expect(lead.leadScore).toBeGreaterThan(0);
      expect(lead.leadStage).not.toBe("unqualified");
      expect(lead.scoreMetadata).not.toBeNull();
    });

    test("writes lead row and outbox row atomically (both present after call)", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { outbox } = await import("~/server/db/schema/outbox");
      const { captureLead } = await import("~/server/leads/intake");

      const userId = `user-atomic-${RUN_ID}`;
      const email = `intake.${RUN_ID}.t2@test.example`;

      const lead = await captureLead(
        db,
        { firstName: "Atomic", lastName: "Test", email },
        { db, userId },
      );
      createdLeadIds.push(lead.id);

      // Both rows present immediately after the call
      const leadRow = await db.query.leads.findFirst({
        where: eq(leads.id, lead.id),
      });
      expect(leadRow).toBeDefined();
      expect(leadRow!.hubspotContactId).toBeNull();

      const outboxRows = await db
        .select()
        .from(outbox)
        .where(eq(outbox.eventName, "lead.captured"));
      const ourRow = outboxRows.find(
        (r) =>
          (r.payload as Record<string, unknown>).leadId === lead.id &&
          (r.payload as Record<string, unknown>).userId === userId,
      );
      expect(ourRow).toBeDefined();
      createdOutboxIds.push(ourRow!.id);
    });

    test("same-email re-capture updates in place (upsert preserved)", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { captureLead } = await import("~/server/leads/intake");

      const email = `intake.${RUN_ID}.t3@test.example`;
      const userId = `user-upsert-${RUN_ID}`;

      const first = await captureLead(
        db,
        { firstName: "First", lastName: "Capture", email },
        { db, userId },
      );
      createdLeadIds.push(first.id);

      const second = await captureLead(
        db,
        { firstName: "Second", lastName: "Capture", email },
        { db, userId },
      );

      // Same row updated, not a new row
      expect(second.id).toBe(first.id);
      expect(second.firstName).toBe("Second");

      const rows = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.email, email));
      expect(rows).toHaveLength(1);
    });

    test("makes no synchronous HubSpot calls (mocks would throw if called)", async () => {
      const { db } = await import("~/server/db");
      const { captureLead } = await import("~/server/leads/intake");

      // If HubSpot is called the mock throws — this just needs to resolve
      const lead = await captureLead(
        db,
        { firstName: "NoHubspot", lastName: "Test" },
        { db, userId: `user-${RUN_ID}` },
      );
      createdLeadIds.push(lead.id);

      expect(lead.hubspotContactId).toBeNull();
    });

    // ---- updateLead ----

    test("qualifying edit re-scores and writes lead.updated outbox row", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { outbox } = await import("~/server/db/schema/outbox");
      const { updateLead } = await import("~/server/leads/intake");

      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "Rescore",
          lastName: "Test",
          leadScore: 0,
          leadStage: "unqualified",
        })
        .returning();
      createdLeadIds.push(lead!.id);

      const userId = `user-rescore-${RUN_ID}`;
      const before = new Date();
      const updated = await updateLead(
        db,
        lead!.id,
        { landSizeSqm: "800", landRegistered: true, hasLand: true },
        { db, userId },
      );

      expect(updated.leadScore).toBeGreaterThan(0);
      expect(updated.scoreMetadata).not.toBeNull();
      expect(
        new Date(updated.scoreMetadata!.scoredAt).getTime(),
      ).toBeGreaterThanOrEqual(before.getTime());

      const outboxRows = await db
        .select()
        .from(outbox)
        .where(eq(outbox.eventName, "lead.updated"));
      const ourRow = outboxRows.find(
        (r) =>
          (r.payload as Record<string, unknown>).leadId === lead!.id &&
          (r.payload as Record<string, unknown>).userId === userId,
      );
      expect(ourRow).toBeDefined();
      createdOutboxIds.push(ourRow!.id);
    });

    test("non-qualifying edit still writes lead.updated outbox row", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { outbox } = await import("~/server/db/schema/outbox");
      const { updateLead } = await import("~/server/leads/intake");

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Notes", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const userId = `user-notes-${RUN_ID}`;
      await updateLead(db, lead!.id, { notes: "just a note" }, { db, userId });

      const outboxRows = await db
        .select()
        .from(outbox)
        .where(eq(outbox.eventName, "lead.updated"));
      const ourRow = outboxRows.find(
        (r) =>
          (r.payload as Record<string, unknown>).leadId === lead!.id &&
          (r.payload as Record<string, unknown>).userId === userId,
      );
      expect(ourRow).toBeDefined();
      createdOutboxIds.push(ourRow!.id);
    });

    // ---- captureLeadFromHubspot ----

    test("captureLeadFromHubspot writes scored lead row with hubspotContactId and outbox row with hubspotSync:false", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { outbox } = await import("~/server/db/schema/outbox");
      const { captureLeadFromHubspot } = await import("~/server/leads/intake");

      const hubspotContactId = `hs-${RUN_ID}`;
      const userId = `user-hs-${RUN_ID}`;
      const properties = {
        firstName: "HubSpot",
        lastName: "Origin",
        hasLand: true,
        landRegistered: true,
        landSizeSqm: "450",
        seenBroker: true,
        constructionTimeline: "ready_now" as const,
        budget: "$650000",
        propertyType: "first_home_buyer" as const,
      };

      const lead = await captureLeadFromHubspot(
        db,
        hubspotContactId,
        properties,
        {
          db,
          userId,
        },
      );
      createdLeadIds.push(lead.id);

      // Lead row has hubspotContactId stamped and is scored
      const leadRow = await db.query.leads.findFirst({
        where: eq(leads.id, lead.id),
      });
      expect(leadRow).toBeDefined();
      expect(leadRow!.hubspotContactId).toBe(hubspotContactId);
      expect(leadRow!.leadScore).toBeGreaterThan(0);
      expect(leadRow!.leadStage).not.toBe("unqualified");
      expect(leadRow!.scoreMetadata).not.toBeNull();

      // Outbox row has hubspotSync: false
      const outboxRows = await db
        .select()
        .from(outbox)
        .where(eq(outbox.eventName, "lead.captured"));
      const ourRow = outboxRows.find(
        (r) =>
          (r.payload as Record<string, unknown>).leadId === lead.id &&
          (r.payload as Record<string, unknown>).userId === userId,
      );
      expect(ourRow).toBeDefined();
      expect((ourRow!.payload as Record<string, unknown>).hubspotSync).toBe(
        false,
      );
      createdOutboxIds.push(ourRow!.id);
    });

    test("updateLead — not found throws NOT_FOUND", async () => {
      const { db } = await import("~/server/db");
      const { updateLead } = await import("~/server/leads/intake");

      try {
        await updateLead(
          db,
          crypto.randomUUID(),
          { notes: "ghost" },
          { db, userId: "user-ghost" },
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as InstanceType<typeof TRPCError>).code).toBe("NOT_FOUND");
      }
    });
  },
);
