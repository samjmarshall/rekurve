import type { NeonHttpQueryResultHKT } from "drizzle-orm/neon-http";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm/relations";

import type * as schema from "~/server/db/schema";
import { outbox } from "~/server/db/schema/outbox";

type Tx = PgTransaction<
  NeonHttpQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export async function publish(
  tx: Tx,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = crypto.randomUUID();
  await tx.insert(outbox).values({ id, eventName, payload });
  return id;
}
