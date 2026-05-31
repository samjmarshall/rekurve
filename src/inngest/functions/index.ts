import type { InngestFunction } from "inngest";

import { leadHubspotSync } from "~/server/leads/hubspot-sync";
import { outboxPrune } from "~/server/outbox/prune";
import { outboxSweep } from "~/server/outbox/sweep";

export const functions: InngestFunction.Like[] = [
  outboxSweep,
  outboxPrune,
  leadHubspotSync,
];
