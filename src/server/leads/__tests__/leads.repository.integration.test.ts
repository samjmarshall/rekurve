// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, rs, test } from "@rstest/core";
import { eq, inArray } from "drizzle-orm";

const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

// Real Neon through the real module graph (leads.module composition root →
// repository commit → commitWithOutbox → one db.batch). Only the Inngest
// client is mocked so the post-commit send is a no-op; the row + outbox-row
// atomicity assertions are the executable spec of adr017/adr019.

describe.skipIf(!process.env.INTEGRATION_DB)(
  "leadsModule capture / update integration",
  () => {
    const createdLeadIds: string[] = [];
    const createdOutboxIds: string[] = [];

    beforeEach(() => {
      rs.resetModules();

      // HubSpot must not be called — mock the contacts adapter (the barrel is
      // gone under #329; the mock registry keys on the resolved module, so
      // this intercepts the hubspot module's relative import too) to throw if
      // invoked.
      rs.doMock("~/server/hubspot/contacts", () => ({
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
      }));

      // Mock inngest.send so the post-commit send doesn't actually send
      rs.doMock("~/inngest/client", () => ({
        inngest: { send: rs.fn().mockResolvedValue(undefined) },
      }));
    });

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      if (createdLeadIds.length > 0) {
        await db.delete(leads).where(inArray(leads.id, createdLeadIds));
      }
      if (createdOutboxIds.length > 0) {
        await db.delete(outbox).where(inArray(outbox.id, createdOutboxIds));
      }
    });

    // ---- captureLead ----

    test("returns row with null hubspotContactId and scoring fields set", async () => {
      const { leadsModule } = await import("~/server/leads/leads.module");

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

      const lead = await leadsModule.service.captureLead(input, {
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
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const userId = `user-atomic-${RUN_ID}`;
      const email = `intake.${RUN_ID}.t2@test.example`;

      const lead = await leadsModule.service.captureLead(
        { firstName: "Atomic", lastName: "Test", email },
        { userId },
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
      const { leads } = await import("~/server/leads/leads.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const email = `intake.${RUN_ID}.t3@test.example`;
      const userId = `user-upsert-${RUN_ID}`;

      const first = await leadsModule.service.captureLead(
        { firstName: "First", lastName: "Capture", email },
        { userId },
      );
      createdLeadIds.push(first.id);

      const second = await leadsModule.service.captureLead(
        { firstName: "Second", lastName: "Capture", email },
        { userId },
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
      const { leadsModule } = await import("~/server/leads/leads.module");

      // If HubSpot is called the mock throws — this just needs to resolve
      const lead = await leadsModule.service.captureLead(
        { firstName: "NoHubspot", lastName: "Test" },
        { userId: `user-${RUN_ID}` },
      );
      createdLeadIds.push(lead.id);

      expect(lead.hubspotContactId).toBeNull();
    });

    // ---- updateLead ----

    test("qualifying edit re-scores and writes lead.updated outbox row", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

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
      const updated = await leadsModule.service.updateLead(
        lead!.id,
        { landSizeSqm: "800", landRegistered: true, hasLand: true },
        { userId },
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
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Notes", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const userId = `user-notes-${RUN_ID}`;
      await leadsModule.service.updateLead(
        lead!.id,
        { notes: "just a note" },
        { userId },
      );

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
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

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

      const lead = await leadsModule.service.captureLeadFromHubspot(
        hubspotContactId,
        properties,
        { userId },
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

    test("updateLead — not found throws LeadNotFoundError (domain error, not transport)", async () => {
      const { leadsModule } = await import("~/server/leads/leads.module");
      // Same-registry import (post-resetModules) so instanceof matches the
      // class the freshly-imported service throws.
      const { LeadNotFoundError } = await import("~/server/leads/leads.errors");

      const ghostId = crypto.randomUUID();
      try {
        await leadsModule.service.updateLead(
          ghostId,
          { notes: "ghost" },
          { userId: "user-ghost" },
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LeadNotFoundError);
        expect((e as InstanceType<typeof LeadNotFoundError>).leadId).toBe(
          ghostId,
        );
      }
    });

    // ---- deleteLead / stampHubspotContactId (commit variants) ----

    test("deleteLead round-trips through commit — row gone, {id} returned", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const lead = await leadsModule.service.captureLead(
        { firstName: "Delete", lastName: "Me" },
        { userId: `user-delete-${RUN_ID}` },
      );
      createdLeadIds.push(lead.id); // harmless if already deleted

      const deleted = await leadsModule.service.deleteLead(lead.id);
      expect(deleted).toEqual({ id: lead.id });

      const row = await db.query.leads.findFirst({
        where: eq(leads.id, lead.id),
      });
      expect(row).toBeUndefined();

      // Deleting a missing row returns undefined (router maps to NOT_FOUND).
      const again = await leadsModule.service.deleteLead(lead.id);
      expect(again).toBeUndefined();
    });

    test("stampHubspotContactId — guarded stamp sets only while NULL", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const lead = await leadsModule.service.captureLead(
        { firstName: "Stamp", lastName: "Test" },
        { userId: `user-stamp-${RUN_ID}` },
      );
      createdLeadIds.push(lead.id);
      expect(lead.hubspotContactId).toBeNull();

      const firstStamp = `hs-stamp-${RUN_ID}`;
      await leadsModule.service.stampHubspotContactId(lead.id, firstStamp);

      const stamped = await db.query.leads.findFirst({
        where: eq(leads.id, lead.id),
      });
      expect(stamped!.hubspotContactId).toBe(firstStamp);

      // Idempotency fence: a second stamp must not overwrite.
      await leadsModule.service.stampHubspotContactId(
        lead.id,
        `hs-stamp-late-${RUN_ID}`,
      );
      const after = await db.query.leads.findFirst({
        where: eq(leads.id, lead.id),
      });
      expect(after!.hubspotContactId).toBe(firstStamp);
    });

    // ---- lead.stage-changed outbox rows ----

    test("captureLead — new lead writes lead.stage-changed outbox row with fromStage:null", async () => {
      const { db } = await import("~/server/db");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const userId = `user-stage-new-${RUN_ID}`;
      const lead = await leadsModule.service.captureLead(
        { firstName: "StageNew", lastName: "Test" },
        { userId },
      );
      createdLeadIds.push(lead.id);

      const outboxRows = await db
        .select()
        .from(outbox)
        .where(eq(outbox.eventName, "lead.stage-changed"));
      const row = outboxRows.find(
        (r) =>
          (r.payload as Record<string, unknown>).leadId === lead.id &&
          (r.payload as Record<string, unknown>).userId === userId,
      );
      expect(row).toBeDefined();
      expect((row!.payload as Record<string, unknown>).fromStage).toBeNull();
      expect((row!.payload as Record<string, unknown>).toStage).toBeDefined();
      createdOutboxIds.push(row!.id);
    });

    test("updateLead — qualifying edit that changes stage writes lead.stage-changed row", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "StageChange",
          lastName: "Test",
          leadScore: 0,
          leadStage: "unqualified",
        })
        .returning();
      createdLeadIds.push(lead!.id);

      const userId = `user-stage-change-${RUN_ID}`;
      const updated = await leadsModule.service.updateLead(
        lead!.id,
        { landSizeSqm: "800", landRegistered: true, hasLand: true },
        { userId },
      );

      // Only check for stage-changed if the stage actually changed
      if (updated.leadStage !== "unqualified") {
        const outboxRows = await db
          .select()
          .from(outbox)
          .where(eq(outbox.eventName, "lead.stage-changed"));
        const row = outboxRows.find(
          (r) =>
            (r.payload as Record<string, unknown>).leadId === lead!.id &&
            (r.payload as Record<string, unknown>).userId === userId,
        );
        expect(row).toBeDefined();
        expect((row!.payload as Record<string, unknown>).fromStage).toBe(
          "unqualified",
        );
        createdOutboxIds.push(row!.id);
      }
    });

    test("updateLead — non-qualifying edit does NOT write lead.stage-changed row", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const { outbox } = await import("~/server/outbox/outbox.schema");
      const { leadsModule } = await import("~/server/leads/leads.module");

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "NoStage", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const userId = `user-no-stage-${RUN_ID}`;
      await leadsModule.service.updateLead(
        lead!.id,
        { notes: "just a note" },
        { userId },
      );

      const outboxRows = await db
        .select()
        .from(outbox)
        .where(eq(outbox.eventName, "lead.stage-changed"));
      const row = outboxRows.find(
        (r) =>
          (r.payload as Record<string, unknown>).leadId === lead!.id &&
          (r.payload as Record<string, unknown>).userId === userId,
      );
      expect(row).toBeUndefined();
    });
  },
);
