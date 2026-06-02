import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { aiRouter } from "./routers/ai";
import { conversationsRouter } from "./routers/conversations";
import { leadsRouter } from "./routers/leads";
import { lotsRouter } from "./routers/lots";
import { messagesRouter } from "./routers/messages";
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  conversations: conversationsRouter,
  leads: leadsRouter,
  lots: lotsRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
