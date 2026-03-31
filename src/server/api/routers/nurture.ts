import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const nurtureRouter = createTRPCRouter({
  getActive: protectedProcedure.query(() => {
    return [];
  }),
});
