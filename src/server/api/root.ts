import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { leadsModule } from "~/server/leads/leads.module";
import { makeLeadsRouter } from "~/server/leads/leads.router";
import { aiRouter } from "./routers/ai";
import { conversationsRouter } from "./routers/conversations";
import { lotsRouter } from "./routers/lots";
import { messagesRouter } from "./routers/messages";
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  conversations: conversationsRouter,
  // The leads tRPC adapter is wired here, not in leads.module.ts: root already
  // sits on the trpc/auth graph, keeping service-only consumers off it.
  leads: makeLeadsRouter({ service: leadsModule.service }),
  lots: lotsRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
