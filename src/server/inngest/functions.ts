import "server-only";

import type { InngestFunction } from "inngest";
import { hubspotWorkers } from "~/server/hubspot/hubspot.workers";
import { messagingWorkers } from "~/server/messaging/messaging.workers";
import { nurtureWorkers } from "~/server/nurture/nurture.workers";
import { outboxWorkers } from "~/server/outbox/outbox.workers";

export const functions: InngestFunction.Like[] = [
  outboxWorkers.sweep,
  outboxWorkers.prune,
  hubspotWorkers.leadHubspotSync,
  nurtureWorkers.nurturePlanRunner,
  messagingWorkers.dispatchEmail,
  messagingWorkers.dispatchSms,
  messagingWorkers.dispatchImessage,
  messagingWorkers.reconcileMissedEngagement,
];
