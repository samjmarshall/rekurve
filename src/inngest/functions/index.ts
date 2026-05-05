import type { InngestFunction } from "inngest";

import { outboxPrune } from "~/server/outbox/prune";
import { outboxSweep } from "~/server/outbox/sweep";

export const functions: InngestFunction.Like[] = [outboxSweep, outboxPrune];
