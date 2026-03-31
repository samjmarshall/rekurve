import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const aiRouter = createTRPCRouter({
  healthCheck: protectedProcedure.query(() => {
    return { status: "ok" as const };
  }),
});
