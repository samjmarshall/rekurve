import type { InngestFunction } from "inngest";
import { leadCapturedFanout } from "./leads/lead-fanout";
import { outboxPrune } from "./outbox/prune";
import { outboxSweep } from "./outbox/sweep";

export const functions: InngestFunction.Like[] = [
  outboxSweep,
  outboxPrune,
  leadCapturedFanout,
];
