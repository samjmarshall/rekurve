import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "~/env";
import * as leadsSchema from "~/server/leads/leads.schema";
import * as lotsSchema from "~/server/lots/lots.schema";
import * as messagingSchema from "~/server/messaging/messaging.schema";
import * as msGraphSchema from "~/server/ms-graph/ms-graph.schema";
import * as outboxSchema from "~/server/outbox/outbox.schema";

import * as sharedSchema from "./shared.schema";

// Spread-merge barrel (adr021): same key set as the old `export *` barrel —
// export variable names are preserved, so the `db.query.*` surface is stable.
const schema = {
  ...sharedSchema,
  ...leadsSchema,
  ...messagingSchema,
  ...lotsSchema,
  ...msGraphSchema,
  ...outboxSchema,
};

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });
