import { isNotNull } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  boolean,
  numeric,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  preferredContactTimeEnum,
  propertyTypeEnum,
  constructionTimelineEnum,
  leadStageEnum,
  leadSourceEnum,
} from "./enums";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hubspotContactId: text("hubspot_contact_id").unique(),

    // Contact
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    preferredContactTime: preferredContactTimeEnum("preferred_contact_time"),

    // Land
    hasLand: boolean("has_land"),
    landRegistered: boolean("land_registered"),
    landAddress: text("land_address"),
    landSizeSqm: numeric("land_size_sqm"),
    landWidth: numeric("land_width"),
    landDepth: numeric("land_depth"),

    // Qualification
    propertyType: propertyTypeEnum("property_type"),
    budget: text("budget"),
    seenBroker: boolean("seen_broker"),
    constructionTimeline: constructionTimelineEnum("construction_timeline"),

    // Scoring
    leadScore: integer("lead_score").default(0),
    leadStage: leadStageEnum("lead_stage").default("unqualified").notNull(),

    // Preferences
    preferredEstates: text("preferred_estates").array(),
    preferredSuburbs: text("preferred_suburbs").array(),

    // Source
    leadSource: leadSourceEnum("lead_source"),
    referrerName: text("referrer_name"),
    notes: text("notes"),

    // Resolve Finance
    resolveFinanceOptedIn: boolean("resolve_finance_opted_in").default(false),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("leads_email_idx")
      .on(table.email)
      .where(isNotNull(table.email)),
    index("leads_lead_stage_idx").on(table.leadStage),
  ],
);
