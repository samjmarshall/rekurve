import "server-only";

import type { LeadRow } from "~/server/leads/leads.schema";
import type { HubSpotContact } from "./contacts";
import type { EmailEngagement } from "./emails";
import {
  type HubSpotContactProperties,
  toContactProperties,
} from "./properties";

/**
 * The step-run slice of Inngest's step tooling — the only step surface
 * `syncLeadContact` needs. The sync sub-ops run as SEPARATE steps because
 * their ids (hs-dedup / hs-update / hs-create / stamp / hs-patch) are frozen
 * Inngest memoisation keys: in-flight `lead-hubspot-sync` runs replay against
 * them, so collapsing the flow into one step would strand those runs.
 */
export type HubspotSyncStep = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

/**
 * What `syncLeadContact` reads off the lead: identity + dedup keys +
 * `hubspotContactId` (the linked/unlinked discriminator), plus whatever
 * `toContactProperties` maps onto the HubSpot wire format. Structural on
 * purpose — the worker hands over the step-memoised (JSON-serialised) row.
 */
export type SyncableLead = Pick<
  LeadRow,
  "id" | "email" | "phone" | "hubspotContactId"
> &
  Parameters<typeof toContactProperties>[0];

// Service port surface (adr020): hubspot owns NO tables — no repository, no
// schema. Its writes go through leads ports (stampHubspotContactId) and the
// outbox publish seam (hubspot.webhook.ts); everything else is the external
// HubSpot API. The API adapter fns (./contacts and ./emails —
// HUBSPOT_MOCK-aware) are injected so tests fake the I/O seam through the
// factory; hubspot.module binds the real fns.
export type HubspotServiceDeps = {
  /** leads port (leadsModule.service.stampHubspotContactId): guarded stamp of
   * the synced contact id back onto the lead row (no outbox event). */
  stampHubspotContactId: (
    leadId: string,
    hubspotContactId: string,
  ) => Promise<void>;
  findExistingContact: (
    email?: string | null,
    phone?: string | null,
  ) => Promise<HubSpotContact | null>;
  createContact: (
    properties: HubSpotContactProperties,
  ) => Promise<HubSpotContact>;
  updateContact: (
    hubspotId: string,
    properties: HubSpotContactProperties,
  ) => Promise<HubSpotContact>;
  /** ./emails adapter: a contact's email engagements (header property
   * included) for the reconcile worker's correlation matching. */
  listEmailEngagementsForContact: (
    contactId: string,
    since?: Date,
  ) => Promise<EmailEngagement[]>;
};

export function makeHubspotService(deps: HubspotServiceDeps) {
  /**
   * The fan-out worker's contact-sync flow, semantics preserved exactly from
   * the pre-adr020 lead-fanout body (the `hubspotSync` gate stays in the
   * worker, not here):
   *
   * - unlinked lead → dedup by email/phone ("hs-dedup"), then update the
   *   match ("hs-update") or create ("hs-create"), then stamp the contact id
   *   onto the lead through the leads port ("stamp") — the stamp lands BEFORE
   *   this fn returns, i.e. before the worker's realtime publish.
   * - linked lead → patch the known contact ("hs-patch"); no dedup, no stamp.
   *
   * Returns the lead's HubSpot contact id (fresh or pre-existing).
   */
  async function syncLeadContact(
    lead: SyncableLead,
    step: HubspotSyncStep,
  ): Promise<string> {
    const { hubspotContactId } = lead;
    if (!hubspotContactId) {
      const existing = await step.run("hs-dedup", () =>
        deps.findExistingContact(lead.email, lead.phone),
      );
      const contact = existing
        ? await step.run("hs-update", () =>
            deps.updateContact(existing.id, toContactProperties(lead)),
          )
        : await step.run("hs-create", () =>
            deps.createContact(toContactProperties(lead)),
          );
      await step.run("stamp", () =>
        deps.stampHubspotContactId(lead.id, contact.id),
      );
      return contact.id;
    }
    await step.run("hs-patch", () =>
      deps.updateContact(hubspotContactId, toContactProperties(lead)),
    );
    return hubspotContactId;
  }

  return {
    syncLeadContact,
    // Engagement read port — the reconcile worker (via messaging.workers.ts)
    // is its only external consumer. Injected pass-through over the
    // module-private ./emails adapter; the webhook's getEmailEngagement is
    // wired straight into makeHubspotWebhook by hubspot.module, so it is NOT
    // a service port.
    listEmailEngagementsForContact: deps.listEmailEngagementsForContact,
  };
}

export type HubspotService = ReturnType<typeof makeHubspotService>;
