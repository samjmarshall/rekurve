import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const leadsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(() => {
    return [];
  }),
});
