import type { InngestFunction } from "inngest";
import { leadCapturedFanout } from "./leads/lead-fanout";
import { dispatchEmailWorker } from "./messages/dispatch-email";
import { reconcileMissedEngagement } from "./messages/reconcile-missed-engagement";
import { nurturePlanRunner } from "./nurture/nurture-plan-runner";
import { outboxPrune } from "./outbox/prune";
import { outboxSweep } from "./outbox/sweep";

export const functions: InngestFunction.Like[] = [
  outboxSweep,
  outboxPrune,
  leadCapturedFanout,
  nurturePlanRunner,
  dispatchEmailWorker,
  reconcileMissedEngagement,
];
