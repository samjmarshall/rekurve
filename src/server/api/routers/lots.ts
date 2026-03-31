import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const lotsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(() => {
    return [];
  }),
});
