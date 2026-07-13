import "server-only";

import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { leads } from "~/server/leads/leads.schema";

export const channelEnum = pgEnum("channel", ["sms", "email", "imessage"]);

export const messageStatusEnum = pgEnum("message_status", [
  "pending",
  "approved",
  "edited_and_approved",
  "dismissed",
  "snoozed",
]);

export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "imessage",
  "sms",
  "email",
]);

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
    // Fence stamped by the dispatch-email worker immediately before each Graph
    // send, guarding the dismiss-during-dispatch race (#261).
    dispatchingAt: timestamp("dispatching_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("message_queue_status_priority_idx").on(table.status, table.priority),
  ],
);

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
    twilioMessageSid: text("twilio_message_sid"),
    deliveryStatus: text("delivery_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversations_lead_id_idx").on(table.leadId),
    index("conversations_twilio_sid_idx").on(table.twilioMessageSid),
  ],
);

export type MessageRow = typeof messageQueue.$inferSelect;
export type MessageInsert = typeof messageQueue.$inferInsert;
export type ConversationInsert = typeof conversations.$inferInsert;
