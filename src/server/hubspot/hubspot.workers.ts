import "server-only";

import { leadsModule } from "~/server/leads/leads.module";
import { hubspotModule } from "./hubspot.module";
import { makeLeadHubspotSyncWorker } from "./hubspot.worker";

// Workers composition root (adr020): the hubspot.worker.ts factory consumes
// the leads read port, hubspot's own contact-sync service port (which stamps
// through the leads write port), and the leads realtime channel adapter wired
// here. Composition-root invariants (adapter built ONCE at module scope,
// served by the functions registry; workers/module split so service-only
// consumers never load the inngest adapter graph) are documented in full on
// messaging.workers.ts — the same rules apply here.
export const hubspotWorkers = {
  leadHubspotSync: makeLeadHubspotSyncWorker({
    getLead: leadsModule.service.getById,
    syncLeadContact: hubspotModule.service.syncLeadContact,
    publishLeadUpdated: leadsModule.channels.publishLeadUpdated,
  }),
};
