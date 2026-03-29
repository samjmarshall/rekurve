import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { availabilityTypeEnum, lotStatusEnum } from "./enums";

export const lots = pgTable(
  "lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estateName: text("estate_name").notNull(),
    suburb: text("suburb").notNull(),
    lotNumber: text("lot_number").notNull(),
    landSizeSqm: numeric("land_size_sqm"),
    frontageM: numeric("frontage_m"),
    depthM: numeric("depth_m"),
    price: numeric("price"),
    availabilityType: availabilityTypeEnum("availability_type"),
    exclusiveUntil: timestamp("exclusive_until", { withTimezone: true }),
    status: lotStatusEnum("status").default("available").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("lots_status_idx").on(table.status)],
);
