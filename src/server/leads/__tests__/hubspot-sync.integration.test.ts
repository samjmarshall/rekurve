// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, rs, test } from "@rstest/core";
import { eq, inArray } from "drizzle-orm";

const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

describe.skipIf(!process.env.INTEGRATION_DB)(
  "leadHubspotSync integration",
  () => {
    const createdLeadIds: string[] = [];

    let mockFindExisting: ReturnType<typeof rs.fn>;
    let mockCreateContact: ReturnType<typeof rs.fn>;
    let mockUpdateContact: ReturnType<typeof rs.fn>;
    let mockPublish: ReturnType<typeof rs.fn>;

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
      mockPublish = rs.fn().mockResolvedValue(undefined);

      rs.doMock("~/server/hubspot", () => ({
        findExistingContact: mockFindExisting,
        createContact: mockCreateContact,
        updateContact: mockUpdateContact,
        toContactProperties: rs.fn().mockReturnValue({}),
      }));

      rs.doMock("~/inngest/client", () => ({
        inngest: { createFunction: rs.fn().mockReturnValue({}) },
      }));
    });

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      if (createdLeadIds.length > 0) {
        await db.delete(leads).where(inArray(leads.id, createdLeadIds));
      }
    });

    function makeStep() {
      return {
        run: rs
          .fn()
          .mockImplementation((_id: string, fn: () => Promise<unknown>) =>
            fn(),
          ),
        realtime: { publish: mockPublish },
      };
    }

    test("capture-flow: stamps hubspotContactId, calls createContact, publishes", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { runLeadHubspotSync } = await import(
        "~/server/leads/hubspot-sync"
      );

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Sync", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const hsId = `hs-capture-${RUN_ID}`;
      mockCreateContact.mockResolvedValue({
        id: hsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      await runLeadHubspotSync(
        { data: { leadId: lead!.id, userId: "user-sync" } },
        makeStep(),
      );

      expect(mockFindExisting).toHaveBeenCalledOnce();
      expect(mockCreateContact).toHaveBeenCalledOnce();

      const row = await db.query.leads.findFirst({
        where: eq(leads.id, lead!.id),
      });
      expect(row!.hubspotContactId).toBe(hsId);

      expect(mockPublish).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ leadId: lead!.id, hubspotContactId: hsId }),
      );
    });

    test("starts a nurture sequence for the lead's stage", async () => {
      const { db } = await import("~/server/db");
      const { leads, nurtureSequences } = await import("~/server/db/schema");
      const { runLeadHubspotSync } = await import(
        "~/server/leads/hubspot-sync"
      );

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Nurture", lastName: "Worker" })
        .returning();
      createdLeadIds.push(lead!.id);

      await runLeadHubspotSync(
        { data: { leadId: lead!.id, userId: "user-sync" } },
        makeStep(),
      );

      const seq = await db.query.nurtureSequences.findFirst({
        where: eq(nurtureSequences.leadId, lead!.id),
      });
      expect(seq).toBeTruthy();
      // Default stage is "unqualified" → "discovery" sequence.
      expect(seq!.sequenceType).toBe("discovery");
      expect(seq!.status).toBe("active");
    });

    test("dedup-flow: uses updateContact when existing HubSpot contact found", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { runLeadHubspotSync } = await import(
        "~/server/leads/hubspot-sync"
      );

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Dedup", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const existingHsId = `hs-existing-${RUN_ID}`;
      mockFindExisting.mockResolvedValue({
        id: existingHsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });
      mockUpdateContact.mockResolvedValue({
        id: existingHsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      await runLeadHubspotSync(
        { data: { leadId: lead!.id, userId: "user-sync" } },
        makeStep(),
      );

      expect(mockCreateContact).not.toHaveBeenCalled();
      expect(mockUpdateContact).toHaveBeenCalledOnce();

      const row = await db.query.leads.findFirst({
        where: eq(leads.id, lead!.id),
      });
      expect(row!.hubspotContactId).toBe(existingHsId);
    });

    test("idempotency: createContact called once on double-run", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { runLeadHubspotSync } = await import(
        "~/server/leads/hubspot-sync"
      );

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Idempotent", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const hsId = `hs-idempotent-${RUN_ID}`;
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

      const event = { data: { leadId: lead!.id, userId: "user-sync" } };
      await runLeadHubspotSync(event, makeStep());
      await runLeadHubspotSync(event, makeStep());

      // First run creates; second run sees the stamp and patches instead
      expect(mockCreateContact).toHaveBeenCalledOnce();

      const row = await db.query.leads.findFirst({
        where: eq(leads.id, lead!.id),
      });
      expect(row!.hubspotContactId).toBe(hsId);
    });

    test("linked lead.updated: skips dedup/create, only patches HubSpot", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/db/schema");
      const { runLeadHubspotSync } = await import(
        "~/server/leads/hubspot-sync"
      );

      const existingHsId = `hs-linked-${RUN_ID}`;
      const [lead] = await db
        .insert(leads)
        .values({
          firstName: "Linked",
          lastName: "Test",
          hubspotContactId: existingHsId,
        })
        .returning();
      createdLeadIds.push(lead!.id);

      mockUpdateContact.mockResolvedValue({
        id: existingHsId,
        properties: {},
        createdAt: "",
        updatedAt: "",
      });

      await runLeadHubspotSync(
        { data: { leadId: lead!.id, userId: "user-sync" } },
        makeStep(),
      );

      expect(mockFindExisting).not.toHaveBeenCalled();
      expect(mockCreateContact).not.toHaveBeenCalled();
      expect(mockUpdateContact).toHaveBeenCalledWith(
        existingHsId,
        expect.anything(),
      );

      expect(mockPublish).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ hubspotContactId: existingHsId }),
      );
    });
  },
);
