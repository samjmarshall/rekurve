import "dotenv/config";

import { inArray } from "drizzle-orm";
import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { leads } from "~/server/db/schema";
import { OUTBOX_EVENTS } from "~/server/outbox";

const ACTIVE_STAGES = ["unqualified", "nurture", "warm"] as const;

const rows = await db
  .select({ id: leads.id, leadStage: leads.leadStage })
  .from(leads)
  .where(inArray(leads.leadStage, [...ACTIVE_STAGES]));

console.log(
  `Firing ${OUTBOX_EVENTS.LEAD_STAGE_CHANGED} for ${rows.length} active lead(s)…`,
);

await Promise.all(
  rows.map((row) =>
    inngest.send({
      name: OUTBOX_EVENTS.LEAD_STAGE_CHANGED,
      data: { leadId: row.id, fromStage: null, toStage: row.leadStage },
    }),
  ),
);

console.log(`Done — ${rows.length} runner(s) queued.`);
