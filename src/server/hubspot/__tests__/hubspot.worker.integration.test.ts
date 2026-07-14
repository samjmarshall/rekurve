// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { afterAll, beforeEach, describe, expect, rs, test } from "@rstest/core";
import { eq } from "drizzle-orm";

import { makeStep as makeInlineStep } from "~/server/inngest/__tests__/step-fake";
import { cleanupLeads, makeHsContact } from "./fixtures";

const RUN_ID = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

// Integration: run the real lead-hubspot-sync worker core against Neon — real
// leadsModule.service ports (getById, stampHubspotContactId → repo.commit) and
// the real publishLeadUpdated channel adapter, with the external HubSpot API
// seam (findExistingContact/createContact/updateContact) injected as fakes
// through the service factory (adr020 — no module mocks). Assertions are the
// pre-move lead-fanout suite unchanged: dedup/create/patch flow, the
// hubspotContactId stamp landing on the row BEFORE the realtime publish, the
// hubspotSync gate, and double-run idempotency.

describe.skipIf(!process.env.INTEGRATION_DB)(
  "runLeadHubspotSync integration",
  () => {
    const createdLeadIds: string[] = [];

    let mockFindExisting: ReturnType<typeof rs.fn>;
    let mockCreateContact: ReturnType<typeof rs.fn>;
    let mockUpdateContact: ReturnType<typeof rs.fn>;
    let mockPublish: ReturnType<typeof rs.fn>;

    beforeEach(() => {
      mockFindExisting = rs.fn().mockResolvedValue(null);
      mockCreateContact = rs
        .fn()
        .mockResolvedValue(makeHsContact(`hs-default-${RUN_ID}`));
      mockUpdateContact = rs
        .fn()
        .mockResolvedValue(makeHsContact(`hs-default-${RUN_ID}`));
      mockPublish = rs.fn().mockResolvedValue(undefined);
    });

    afterAll(() => cleanupLeads(createdLeadIds));

    // Shared inline-run step fake plus the realtime slice this worker needs.
    function makeStep() {
      return { ...makeInlineStep(), realtime: { publish: mockPublish } };
    }

    // Composes the worker run fn over real leads ports + fake HubSpot API fns.
    async function makeRun() {
      const { leadsModule } = await import("~/server/leads/leads.module");
      const { publishLeadUpdated } = await import(
        "~/server/leads/leads.channels"
      );
      const { makeHubspotService } = await import("../hubspot.service");
      const { makeRunLeadHubspotSync } = await import("../hubspot.worker");

      const service = makeHubspotService({
        stampHubspotContactId: leadsModule.service.stampHubspotContactId,
        findExistingContact: mockFindExisting as never,
        createContact: mockCreateContact as never,
        updateContact: mockUpdateContact as never,
        // Not exercised by the sync flow — satisfies the service deps shape.
        listEmailEngagementsForContact: async () => [],
      });
      return makeRunLeadHubspotSync({
        getLead: leadsModule.service.getById,
        syncLeadContact: service.syncLeadContact,
        publishLeadUpdated,
      });
    }

    test("capture-flow: stamps hubspotContactId, calls createContact, publishes", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const runLeadHubspotSync = await makeRun();

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Sync", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const hsId = `hs-capture-${RUN_ID}`;
      mockCreateContact.mockResolvedValue(makeHsContact(hsId));

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

    test("dedup-flow: uses updateContact when existing HubSpot contact found", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const runLeadHubspotSync = await makeRun();

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Dedup", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const existingHsId = `hs-existing-${RUN_ID}`;
      mockFindExisting.mockResolvedValue(makeHsContact(existingHsId));
      mockUpdateContact.mockResolvedValue(makeHsContact(existingHsId));

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
      const { leads } = await import("~/server/leads/leads.schema");
      const runLeadHubspotSync = await makeRun();

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "Idempotent", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const hsId = `hs-idempotent-${RUN_ID}`;
      mockCreateContact.mockResolvedValue(makeHsContact(hsId));
      mockUpdateContact.mockResolvedValue(makeHsContact(hsId));

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

    test("hubspotSync:false — publish fires, but createContact/updateContact not called", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const runLeadHubspotSync = await makeRun();

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "SkipHS", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      await runLeadHubspotSync(
        { data: { leadId: lead!.id, userId: "user-sync", hubspotSync: false } },
        makeStep(),
      );

      expect(mockCreateContact).not.toHaveBeenCalled();
      expect(mockUpdateContact).not.toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledOnce();
    });

    test("hubspotSync absent (default true) — existing create/patch behaviour preserved", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const runLeadHubspotSync = await makeRun();

      const [lead] = await db
        .insert(leads)
        .values({ firstName: "DefaultSync", lastName: "Test" })
        .returning();
      createdLeadIds.push(lead!.id);

      const hsId = `hs-default-flag-${RUN_ID}`;
      mockCreateContact.mockResolvedValue(makeHsContact(hsId));

      await runLeadHubspotSync(
        { data: { leadId: lead!.id, userId: "user-sync" } },
        makeStep(),
      );

      expect(mockCreateContact).toHaveBeenCalledOnce();
      expect(mockPublish).toHaveBeenCalledOnce();
    });

    test("linked lead.updated: skips dedup/create, only patches HubSpot", async () => {
      const { db } = await import("~/server/db");
      const { leads } = await import("~/server/leads/leads.schema");
      const runLeadHubspotSync = await makeRun();

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

      mockUpdateContact.mockResolvedValue(makeHsContact(existingHsId));

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
