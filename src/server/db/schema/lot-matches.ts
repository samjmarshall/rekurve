import {
  pgTable,
  text,
  uuid,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { matchStrengthEnum, outreachStatusEnum } from "./enums";
import { leads } from "./leads";
import { lots } from "./lots";

export const lotMatches = pgTable(
  "lot_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    matchStrength: matchStrengthEnum("match_strength").notNull(),
    matchReasoning: text("match_reasoning"),
    outreachStatus: outreachStatusEnum("outreach_status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("lot_matches_lot_lead_idx").on(table.lotId, table.leadId),
  ],
);
