// Compatibility re-export barrel (adr021): tables are authored per-domain in
// `src/server/<domain>/<domain>.schema.ts` + `db/shared.schema.ts`. Deleted in
// the final domain-refactor PR once all importers are repointed.
export * from "~/server/db/shared.schema";
export * from "~/server/leads/leads.schema";
export * from "~/server/lots/lots.schema";
export * from "~/server/messaging/messaging.schema";
export * from "~/server/ms-graph/ms-graph.schema";
export * from "~/server/outbox/outbox.schema";
