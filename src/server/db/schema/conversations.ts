import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { channelEnum, deliveryMethodEnum, directionEnum } from "./enums";
import { leads } from "./leads";
import { messageQueue } from "./message-queue";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    messageQueueId: uuid("message_queue_id").references(() => messageQueue.id),
    channel: channelEnum("channel").notNull(),
    direction: directionEnum("direction").notNull(),
    deliveryMethod: deliveryMethodEnum("delivery_method"),
    subject: text("subject"),
    body: text("body").notNull(),
    hubspotActivityId: text("hubspot_activity_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("conversations_lead_id_idx").on(table.leadId)],
);
