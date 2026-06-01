import type { InngestFunction } from "inngest";
import { leadHubspotSync } from "./leads/hubspot-sync";
import { outboxPrune } from "./outbox/prune";
import { outboxSweep } from "./outbox/sweep";

export const functions: InngestFunction.Like[] = [
  outboxSweep,
  outboxPrune,
  leadHubspotSync,
];
