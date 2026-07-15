import "server-only";

import { db } from "~/server/db";
import { makeCommitWithOutbox } from "~/server/outbox/commit";
import { publishLeadUpdated, userChannel } from "./leads.channels";
import { makeLeadsRepository } from "./leads.repository";
import { makeLeadsService } from "./leads.service";

// Composition root (adr020): the only place real deps are wired. The
// repository is deliberately NOT exported — other domains consume leads
// through the service ports.
//
// Deliberately NO router here: the tRPC adapter is wired by its host registry
// (~/server/api/root.ts) via makeLeadsRouter({ service }), so service-only
// consumers — Inngest workers, the HubSpot webhook, the realtime token action —
// never import the trpc/auth graph (module-scope Resend + Upstash clients).
// Settled convention per adr020's consequence update (module surface is
// { service }); operational statement in .claude/rules/server-architecture.md.
const repo = makeLeadsRepository({
  db,
  commitWithOutbox: makeCommitWithOutbox(db),
});
const service = makeLeadsService({ repo });

export const leadsModule = {
  service,
  channels: { userChannel, publishLeadUpdated },
};
