import "server-only";

import { makeAiRouter } from "~/server/ai/ai.router";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { leadsModule } from "~/server/leads/leads.module";
import { makeLeadsRouter } from "~/server/leads/leads.router";
import { messagingModule } from "~/server/messaging/messaging.module";
import {
  makeConversationsRouter,
  makeMessagesRouter,
} from "~/server/messaging/messaging.router";
import { lotsRouter } from "./routers/lots";

export const appRouter = createTRPCRouter({
  ai: makeAiRouter(),
  conversations: makeConversationsRouter({ service: messagingModule.service }),
  // The leads/messaging tRPC adapters are wired here, not in their modules:
  // root already sits on the trpc/auth graph, keeping service-only consumers
  // off it.
  leads: makeLeadsRouter({ service: leadsModule.service }),
  lots: lotsRouter,
  messages: makeMessagesRouter({ service: messagingModule.service }),
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
