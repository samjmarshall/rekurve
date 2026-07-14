import "server-only";

import type { InngestFunction } from "inngest";
import { hubspotWorkers } from "~/server/hubspot/hubspot.workers";
import { messagingWorkers } from "~/server/messaging/messaging.workers";
import { nurtureWorkers } from "~/server/nurture/nurture.workers";
import { outboxPrune } from "./outbox/prune";
import { outboxSweep } from "./outbox/sweep";

export const functions: InngestFunction.Like[] = [
  outboxSweep,
  outboxPrune,
  hubspotWorkers.leadHubspotSync,
  nurtureWorkers.nurturePlanRunner,
  messagingWorkers.dispatchEmail,
  messagingWorkers.dispatchSms,
  messagingWorkers.dispatchImessage,
  messagingWorkers.reconcileMissedEngagement,
];
