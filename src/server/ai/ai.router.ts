import "server-only";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Thin tRPC adapter (adr020): procedure names and shapes are byte-stable
// (router-paths golden pins ai.healthCheck). No injected deps —
// healthCheck is a pure liveness probe; the no-arg factory shape is kept
// for parity with the other domain routers wired in ~/server/api/root.ts.
export function makeAiRouter() {
  return createTRPCRouter({
    healthCheck: protectedProcedure.query(() => {
      return { status: "ok" as const };
    }),
  });
}
