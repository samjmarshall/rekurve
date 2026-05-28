// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { toContactProperties } from "~/server/hubspot/properties";

// Unique per-run prefix keeps test data isolated across concurrent runs
const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

describe.skipIf(!process.env.INTEGRATION_DB)(
  "captureLead / updateLead integration",
  () => {
    const createdLeadIds: string[] = [];

    let mockFindExisting: ReturnType<typeof rs.fn>;
    let mockCreateContact: ReturnType<typeof rs.fn>;
    let mockUpdateContact: ReturnType<typeof rs.fn>;
    let mockStartOrUpdateSequence: ReturnType<typeof rs.fn>;

    beforeEach(() => {
      rs.resetModules();

      mockFindExisting = rs.fn().mockResolvedValue(null);
      mockCreateContact = rs.fn().mockResolvedValue({
        id: `hs-default-${RUN_ID}`,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact = rs.fn().mockResolvedValue({
        id: `hs-default-${RUN_ID}`,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockStartOrUpdateSequence = rs.fn().mockResolvedValue(undefined);

      // toContactProperties is captured before resetModules so we get the real fn
      rs.doMock("~/server/hubspot", () => ({
        findExistingContact: mockFindExisting,
        createContact: mockCreateContact,
        updateContact: mockUpdateContact,
        toContactProperties,
      }));

      // Always mock the scheduler — doMock registrations persist across
      // resetModules() calls, so a test-body doMock would leak into later tests.
      // Behaviour is configured per-test via mockStartOrUpdateSequence.
      rs.doMock("~/server/nurture/scheduler", () => ({
        startOrUpdateSequence: mockStartOrUpdateSequence,
      }));
    });

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      if (createdLeadIds.length > 0) {
        await db.delete(leads).where(inArray(leads.id, createdLeadIds));
      }
    });

    // ---- captureLead ----

    test("captureLead — new contact, no existing HubSpot match", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { captureLead } = await import("~/server/leads/intake");

      const email = `intake.${RUN_ID}.t1@test.example`;
      const hsId = `hs-t1-${RUN_ID}`;
      mockCreateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

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
        userId: "integration-test",
      });
      createdLeadIds.push(lead.id);

      expect(mockCreateContact).toHaveBeenCalledOnce();
      expect(mockCreateContact).toHaveBeenCalledWith(
        expect.objectContaining({ firstname: "Integration" }),
      );
      expect(mockUpdateContact).toHaveBeenCalledWith(
        hsId,
        expect.objectContaining({
          lead_score: expect.any(String),
          lead_stage: expect.any(String),
        }),
      );

      const row = await db.query.leads.findFirst({
        where: eq(leads.id, lead.id),
      });
      expect(row).toBeDefined();
      expect(row!.hubspotContactId).toBe(hsId);
      expect(row!.leadScore).toBeGreaterThan(0);
      expect(row!.leadStage).not.toBe("unqualified");
      expect(row!.scoreMetadata).not.toBeNull();

      expect(mockStartOrUpdateSequence).toHaveBeenCalledWith(
        expect.anything(),
        lead.id,
        expect.any(String),
      );
    });

    test("captureLead — existing HubSpot match", async () => {
      const { db } = await import("~/server/db");
      const { captureLead } = await import("~/server/leads/intake");

      const email = `intake.${RUN_ID}.t2@test.example`;
      const hsId = `hs-t2-existing-${RUN_ID}`;
      mockFindExisting.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      const lead = await captureLead(
        db,
        { firstName: "Existing", lastName: "Contact", email },
        { db, userId: "integration-test" },
      );
      createdLeadIds.push(lead.id);

      expect(mockCreateContact).not.toHaveBeenCalled();
      // updateContact called twice: once for data push, once for score sync
      expect(mockUpdateContact).toHaveBeenCalledTimes(2);
      expect(lead.hubspotContactId).toBe(hsId);
    });

    test("captureLead — webhook-conflict resolve (onConflictDoUpdate)", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { captureLead } = await import("~/server/leads/intake");

      const hsId = `hs-t3-conflict-${RUN_ID}`;
      // Simulate webhook landing first — placeholder row already exists
      const [placeholder] = await db
        .insert(leads)
        .values({
          firstName: "Placeholder",
          lastName: "Row",
          hubspotContactId: hsId,
        })
        .returning();
      createdLeadIds.push(placeholder!.id);

      mockCreateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      const email = `intake.${RUN_ID}.t3@test.example`;
      const lead = await captureLead(
        db,
        { firstName: "Real", lastName: "Person", email, hasLand: true },
        { db, userId: "integration-test" },
      );

      // onConflictDoUpdate updates the placeholder in-place — same row, not a new one
      expect(lead.id).toBe(placeholder!.id);
      expect(lead.firstName).toBe("Real");
      expect(lead.email).toBe(email);
      expect(lead.scoreMetadata).not.toBeNull();

      const rows = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.hubspotContactId, hsId));
      expect(rows).toHaveLength(1);
    });

    test("captureLead — HubSpot dedup failure propagates, no row inserted", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { captureLead } = await import("~/server/leads/intake");

      mockFindExisting.mockRejectedValue(new Error("HubSpot 500"));
      const email = `intake.${RUN_ID}.t4@test.example`;

      await expect(
        captureLead(
          db,
          { firstName: "Fail", lastName: "Test", email },
          { db, userId: "integration-test" },
        ),
      ).rejects.toThrow("HubSpot 500");

      const notCreated = await db.query.leads.findFirst({
        where: eq(leads.email, email),
      });
      expect(notCreated).toBeUndefined();
    });

    test("captureLead — post-write HubSpot score sync failure is swallowed", async () => {
      const { db } = await import("~/server/db");
      const { captureLead } = await import("~/server/leads/intake");

      const email = `intake.${RUN_ID}.t5@test.example`;
      const hsId = `hs-t5-${RUN_ID}`;
      mockCreateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact.mockRejectedValue(new Error("score sync failed"));

      const consoleSpy = rs
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const lead = await captureLead(
        db,
        { firstName: "Score", lastName: "SyncFail", email },
        { db, userId: "integration-test" },
      );
      createdLeadIds.push(lead.id);

      expect(lead).toBeDefined();
      expect(lead.hubspotContactId).toBe(hsId);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[intake.captureLead] HubSpot score sync failed",
        ),
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });

    test("captureLead — nurture-start failure is swallowed", async () => {
      // Configure the always-registered scheduler mock to reject for this test
      mockStartOrUpdateSequence.mockRejectedValue(new Error("nurture failed"));

      const { db } = await import("~/server/db");
      const { captureLead } = await import("~/server/leads/intake");

      const email = `intake.${RUN_ID}.t6@test.example`;
      const hsId = `hs-t6-${RUN_ID}`;
      mockCreateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      const consoleSpy = rs
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const lead = await captureLead(
        db,
        { firstName: "Nurture", lastName: "Fail", email },
        { db, userId: "integration-test" },
      );
      createdLeadIds.push(lead.id);

      expect(lead).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[intake.captureLead] nurture sequence start failed",
        ),
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });

    // ---- updateLead ----

    test("updateLead — non-qualification field change does not re-score", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { updateLead } = await import("~/server/leads/intake");

      const hsId = `hs-t7-${RUN_ID}`;
      mockUpdateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "Notes",
          lastName: "Test",
          hubspotContactId: hsId,
          leadScore: 20,
          leadStage: "nurture",
        })
        .returning();
      createdLeadIds.push(lead!.id);

      const updated = await updateLead(
        db,
        lead!.id,
        { notes: "meeting notes" },
        { db, userId: "integration-test" },
      );

      expect(updated.notes).toBe("meeting notes");
      expect(updated.leadScore).toBe(20);
      expect(updated.leadStage).toBe("nurture");

      // updateContact called once for data push only — no score sync
      expect(mockUpdateContact).toHaveBeenCalledOnce();
      expect(mockUpdateContact).toHaveBeenCalledWith(
        hsId,
        expect.objectContaining({ notes: "meeting notes" }),
      );
      expect(mockStartOrUpdateSequence).not.toHaveBeenCalled();
    });

    test("updateLead — qualification field change re-scores and fires nurture", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { updateLead } = await import("~/server/leads/intake");

      const hsId = `hs-t8-${RUN_ID}`;
      mockUpdateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "Rescore",
          lastName: "Test",
          hubspotContactId: hsId,
          leadScore: 0,
          leadStage: "unqualified",
        })
        .returning();
      createdLeadIds.push(lead!.id);

      const before = new Date();
      const updated = await updateLead(
        db,
        lead!.id,
        { landSizeSqm: "800", landRegistered: true, hasLand: true },
        { db, userId: "integration-test" },
      );

      expect(updated.landSizeSqm).toBe("800");
      expect(updated.leadScore).toBeGreaterThan(0);
      expect(updated.scoreMetadata).not.toBeNull();
      expect(
        new Date(updated.scoreMetadata!.scoredAt).getTime(),
      ).toBeGreaterThanOrEqual(before.getTime());

      // updateContact: once for data, once for score sync
      expect(mockUpdateContact).toHaveBeenCalledTimes(2);

      expect(mockStartOrUpdateSequence).toHaveBeenCalledWith(
        expect.anything(),
        lead!.id,
        expect.any(String),
      );
    });

    test("updateLead — not found throws NOT_FOUND", async () => {
      const { db } = await import("~/server/db");
      const { updateLead } = await import("~/server/leads/intake");

      try {
        await updateLead(
          db,
          crypto.randomUUID(),
          { notes: "ghost" },
          { db, userId: "integration-test" },
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
        expect((e as InstanceType<typeof TRPCError>).code).toBe("NOT_FOUND");
      }
    });

    test("updateLead — no HubSpot link skips updateContact", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { updateLead } = await import("~/server/leads/intake");

      const [unlinked] = await db
        .insert(leads)
        .values({ firstName: "Unlinked", lastName: "Lead" })
        .returning();
      createdLeadIds.push(unlinked!.id);

      await updateLead(
        db,
        unlinked!.id,
        { notes: "no hubspot" },
        { db, userId: "integration-test" },
      );

      expect(mockUpdateContact).not.toHaveBeenCalled();

      const row = await db.query.leads.findFirst({
        where: eq(leads.id, unlinked!.id),
      });
      expect(row!.notes).toBe("no hubspot");
    });
  },
);
