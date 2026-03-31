import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const messagesRouter = createTRPCRouter({
  getPending: protectedProcedure.query(() => {
    return [];
  }),
});
