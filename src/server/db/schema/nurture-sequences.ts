import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { sequenceStatusEnum, sequenceTypeEnum } from "./enums";
import { leads } from "./leads";

export const nurtureSequences = pgTable(
  "nurture_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    sequenceType: sequenceTypeEnum("sequence_type").notNull(),
    status: sequenceStatusEnum("status").default("active").notNull(),
    nextStepAt: timestamp("next_step_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("nurture_sequences_lead_status_idx").on(table.leadId, table.status),
    uniqueIndex("nurture_active_one_per_lead_uidx")
      .on(table.leadId)
      .where(sql`status = 'active'`),
  ],
);
