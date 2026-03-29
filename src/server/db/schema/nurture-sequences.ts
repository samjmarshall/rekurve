import {
  pgTable,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { sequenceTypeEnum, sequenceStatusEnum } from "./enums";
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
  ],
);
