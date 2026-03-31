import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { aiRouter } from "./routers/ai";
import { leadsRouter } from "./routers/leads";
import { lotsRouter } from "./routers/lots";
import { messagesRouter } from "./routers/messages";
import { nurtureRouter } from "./routers/nurture";

export const appRouter = createTRPCRouter({
  ai: aiRouter,
  leads: leadsRouter,
  lots: lotsRouter,
  messages: messagesRouter,
  nurture: nurtureRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
