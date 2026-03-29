import { pgEnum } from "drizzle-orm/pg-core";

// Leads
export const preferredContactTimeEnum = pgEnum("preferred_contact_time", [
  "weekdays",
  "weekends",
  "anytime",
]);

export const propertyTypeEnum = pgEnum("property_type", [
  "single_storey",
  "double_storey",
  "investment",
  "upsize",
  "downsize",
  "first_home_buyer",
]);

export const constructionTimelineEnum = pgEnum("construction_timeline", [
  "ready_now",
  "3_6_months",
  "12_months_plus",
]);

export const leadStageEnum = pgEnum("lead_stage", [
  "unqualified",
  "nurture",
  "warm",
  "hot",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "walk_in",
  "referral",
  "social",
  "web",
  "other",
]);

// Lots
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

// Lot Matches
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

// Message Queue
export const channelEnum = pgEnum("channel", ["sms", "email"]);

export const messageStatusEnum = pgEnum("message_status", [
  "pending",
  "approved",
  "edited_and_approved",
  "dismissed",
  "snoozed",
]);

// Conversations
export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "imessage",
  "sms",
  "email",
]);

// Nurture Sequences
export const sequenceTypeEnum = pgEnum("sequence_type", [
  "discovery",
  "nurture",
  "warm_progression",
  "lot_alert",
]);

export const sequenceStatusEnum = pgEnum("sequence_status", [
  "active",
  "paused",
  "completed",
]);
