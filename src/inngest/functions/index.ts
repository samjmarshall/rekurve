import "server-only";

import type { InngestFunction } from "inngest";
import { messagingWorkers } from "~/server/messaging/messaging.workers";
import { nurtureWorkers } from "~/server/nurture/nurture.workers";
import { leadCapturedFanout } from "./leads/lead-fanout";
import { outboxPrune } from "./outbox/prune";
import { outboxSweep } from "./outbox/sweep";

export const functions: InngestFunction.Like[] = [
  outboxSweep,
  outboxPrune,
  leadCapturedFanout,
  nurtureWorkers.nurturePlanRunner,
  messagingWorkers.dispatchEmail,
  messagingWorkers.dispatchSms,
  messagingWorkers.dispatchImessage,
  messagingWorkers.reconcileMissedEngagement,
];
