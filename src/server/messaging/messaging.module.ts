import "server-only";

import { db } from "~/server/db";
import { makeCommitWithOutbox } from "~/server/outbox/commit";
import { makeMessagingRepository } from "./messaging.repository";
import { makeMessagingService } from "./messaging.service";

// Composition root (adr020): the only place real deps are wired. The
// repository is deliberately NOT exported — other code consumes messaging
// through the service ports.
//
// Deliberately NO router here (same recorded deviation as leads.module.ts):
// the tRPC adapters are wired by their host registry (~/server/api/root.ts)
// via makeMessagesRouter/makeConversationsRouter({ service }), so service-only
// consumers — the Twilio status route — never import the trpc/auth graph.
// Revisit in the PR-6 conventions sweep.
//
// Deliberately NO workers here either (same split as PR 2's leads module fix):
// the Inngest adapters are composed by messaging.workers.ts, so service-only
// consumers never load the inngest client or the ms-graph/twilio/hubspot/leads
// adapter graphs.
const repo = makeMessagingRepository({
  db,
  commitWithOutbox: makeCommitWithOutbox(db),
});
const service = makeMessagingService({ repo });

export const messagingModule = {
  service,
};
