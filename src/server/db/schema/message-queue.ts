import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { channelEnum, messageStatusEnum } from "./enums";
import { leads } from "./leads";

export const messageQueue = pgTable(
  "message_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    aiReasoning: text("ai_reasoning"),
    priority: integer("priority").default(0).notNull(),
    status: messageStatusEnum("status").default("pending").notNull(),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    originalBody: text("original_body"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("message_queue_status_priority_idx").on(table.status, table.priority),
  ],
);
