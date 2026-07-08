import "server-only";

import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { leads } from "~/server/leads/leads.schema";

export const availabilityTypeEnum = pgEnum("availability_type", [
  "first_come",
  "exclusive_territory",
  "developer_direct",
]);

export const lotStatusEnum = pgEnum("lot_status", [
  "available",
  "matched",
  "sold",
  "expired",
]);

export const matchStrengthEnum = pgEnum("match_strength", [
  "strong",
  "partial",
  "stretch",
]);

export const outreachStatusEnum = pgEnum("outreach_status", [
  "pending",
  "queued",
  "sent",
  "responded",
]);

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
