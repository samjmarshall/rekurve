import "server-only";

import { env } from "~/env";
import { inngest } from "~/inngest/client";
import { listEmailEngagementsForContact } from "~/server/hubspot";
import { leadsModule } from "~/server/leads/leads.module";
import { sendEmail } from "~/server/ms-graph";
import { sendSmsToConsultant } from "~/server/twilio";
import { makeDispatchEmailWorker } from "./dispatch-email.worker";
import { makeDispatchImessageWorker } from "./dispatch-imessage.worker";
import { makeDispatchSmsWorker } from "./dispatch-sms.worker";
import { messagingModule } from "./messaging.module";
import { makeReconcileMissedEngagementWorker } from "./reconcile-engagement.worker";

// Workers composition root (adr020): the *.worker.ts factories consume the
// messaging service's worker-facing ports (loadDispatchable, markDispatching,
// recordEmailSend, recordSmsSend, stampSent, loadReconciliationTarget,
// stampEngagement) plus the lead ports and channel adapters wired here. Kept
// separate from messaging.module.ts (same split as leads) so service-only
// consumers — the Twilio status route — never load the inngest client or the
// ms-graph/twilio/hubspot adapter graphs. The four Inngest adapters are built
// ONCE at module scope; the functions registry (~/inngest/functions) serves
// them — worker files export only factories.
const { service } = messagingModule;

export const messagingWorkers = {
  dispatchEmail: makeDispatchEmailWorker({
    loadDispatchable: service.loadDispatchable,
    markDispatching: service.markDispatching,
    recordEmailSend: service.recordEmailSend,
    stampSent: service.stampSent,
    stampEngagement: service.stampEngagement,
    resolveOwnerUserId: leadsModule.service.resolveOwnerUserId,
    getLeadContact: leadsModule.service.getLeadContact,
    sendEmail,
    sendEvent: (evt) => inngest.send(evt),
  }),
  dispatchSms: makeDispatchSmsWorker({
    loadDispatchable: service.loadDispatchable,
    markDispatching: service.markDispatching,
    recordSmsSend: service.recordSmsSend,
    stampSent: service.stampSent,
    sendSmsToConsultant,
    statusCallbackUrl: `${env.BETTER_AUTH_URL}/api/twilio/status`,
  }),
  dispatchImessage: makeDispatchImessageWorker({
    loadDispatchable: service.loadDispatchable,
  }),
  reconcileMissedEngagement: makeReconcileMissedEngagementWorker({
    loadReconciliationTarget: service.loadReconciliationTarget,
    listEmailEngagementsForContact,
    stampEngagement: service.stampEngagement,
  }),
};
