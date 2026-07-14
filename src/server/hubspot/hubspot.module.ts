import "server-only";

import { leadsModule } from "~/server/leads/leads.module";
import { publish } from "~/server/outbox";
import {
  createContact,
  findExistingContact,
  getContact,
  updateContact,
} from "./contacts";
import { getEmailEngagement, listEmailEngagementsForContact } from "./emails";
import { makeHubspotService } from "./hubspot.service";
import { makeHubspotWebhook } from "./hubspot.webhook";

// Composition root (adr020): the only place real deps are wired. hubspot owns
// no tables — no repository, no schema; the internal API adapters (client /
// contacts / emails / properties) are module-private and other domains consume
// hubspot ONLY through these service ports. Writes go through leads ports
// (stampHubspotContactId, captureLeadFromHubspot) and the outbox `publish`
// seam. Module dep graph stays acyclic: hubspot → leads only; messaging →
// hubspot via these ports; the hubspot↔messaging engagement flow is
// event-mediated (engagement-created / engagement-missed).
//
// Deliberately NO workers here (same split as leads/messaging/nurture): the
// Inngest adapter is composed by hubspot.workers.ts, so service-only
// consumers — the webhook route — load the inngest client only through the
// outbox publish binding they already share.
export const hubspotModule = {
  service: {
    ...makeHubspotService({
      stampHubspotContactId: leadsModule.service.stampHubspotContactId,
      findExistingContact,
      createContact,
      updateContact,
      listEmailEngagementsForContact,
    }),
    ...makeHubspotWebhook({
      getContact,
      getEmailEngagement,
      captureLeadFromHubspot: leadsModule.service.captureLeadFromHubspot,
      resolveOwnerUserId: leadsModule.service.resolveOwnerUserId,
      publish,
    }),
  },
};
