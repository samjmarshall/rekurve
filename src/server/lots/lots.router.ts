import "server-only";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Thin tRPC adapter (adr020) for the lots stub domain. `getAll` is a
// placeholder pinned by the router-paths golden — it returns [] until the lot
// matching feature lands (the lots/lot_matches tables in lots.schema.ts are
// ahead of any read/write path).
//
// Deliberately NO lots.module.ts (adr020 collapse rule, same judgment as
// nurture): lots has no service ports, no repository reads, no workers — the
// stub router and the schema file are the domain's only artifacts, so a
// module would compose an empty {service}. Add lots.module.ts +
// lots.repository.ts when the first real query lands, and take a `service`
// dep here like makeLeadsRouter does.
export function makeLotsRouter() {
  return createTRPCRouter({
    getAll: protectedProcedure.query(() => {
      return [];
    }),
  });
}
