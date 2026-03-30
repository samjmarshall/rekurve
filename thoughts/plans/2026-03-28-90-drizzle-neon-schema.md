# Drizzle ORM + Neon Database Setup & Schema

## Overview

Install and configure Drizzle ORM with Neon Postgres (serverless). Define all database tables — 6 domain tables plus 4 better-auth tables. Run initial migration. The Neon project is already provisioned via Vercel integration with `DATABASE_URL` available in `.env.local`.

**Issue**: #90
**Epic**: #85 (MVP Foundation)

## Current State Analysis

- `src/server/` directory does not exist — completely greenfield
- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` already provisioned in `.env.local` (Neon ap-southeast-2, pooled via PgBouncer)
- No Drizzle, Neon driver, or better-auth packages installed
- `.env.example` and `src/env.js` only validate PostHog variables
- Project uses Yarn 3.8.7, `~/` path alias → `src/*`, strict TypeScript, `verbatimModuleSyntax: true`
- Zod v4 installed

### Key Discoveries:
- Design doc specifies `conversations.delivery_method` (enum: `imessage | sms | email`) per ADR-001 — included in schema
- better-auth Drizzle adapter expects specific column names/types — tables defined to match exactly (can be generated via `npx @better-auth/cli generate`)
- Neon serverless driver uses pooled URL for queries, unpooled URL for migrations

## Desired End State

- Drizzle ORM configured with Neon serverless driver
- 10 tables created in Neon Postgres (4 better-auth + 6 domain)
- All enums, indexes, and foreign keys in place
- `make check` passes (lint + typecheck)
- `yarn db:generate` produces migration files
- `yarn db:push` applies schema without errors

## What We're NOT Doing

- Seed data
- tRPC procedures (separate issue)
- HubSpot sync logic (separate issue)
- better-auth configuration/plugins (separate issue — we only define the adapter-compatible tables)
- Installing `better-auth` (done when auth is set up)

## Implementation Approach

Four sequential phases: install deps and configure tooling, define auth schema, define domain schema, then generate and push migration. Each phase is independently verifiable.

---

## Phase 1: Package Installation & Configuration

### Overview
Install Drizzle ORM and Neon driver, create the DB client, Drizzle config, update env validation, and add convenience scripts.

### Changes Required:

#### 1. Install packages

```bash
yarn add drizzle-orm @neondatabase/serverless
yarn add -D drizzle-kit
```

#### 2. Drizzle config
**File**: `drizzle.config.ts` (new)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
```

> Uses `DATABASE_URL_UNPOOLED` for migrations (direct connection, no PgBouncer — required for DDL).

#### 3. Database client
**File**: `src/server/db/index.ts` (new)

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

> Uses pooled `DATABASE_URL` for runtime queries (PgBouncer). Schema is passed to enable Drizzle's relational query API.

#### 4. Update env validation
**File**: `src/env.js`
**Changes**: Add `DATABASE_URL` to the server schema and runtimeEnv.

```javascript
server: {
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  POSTHOG_ERROR_TRACKING_API_KEY: z.string(),
  POSTHOG_PROJECT_ID: z.string().regex(/^\d+$/, "Must be a numeric string"),
},
```

Add to `runtimeEnv`:
```javascript
DATABASE_URL: process.env.DATABASE_URL,
```

#### 5. Update `.env.example`
**File**: `.env.example`
**Changes**: Add DATABASE_URL placeholder.

```bash
# Neon Postgres (provisioned via Vercel integration)
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

#### 6. Add convenience scripts
**File**: `package.json`
**Changes**: Add db scripts.

```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:migrate": "drizzle-kit migrate"
```

#### 7. Add Makefile targets
**File**: `Makefile`
**Changes**: Add db targets.

```makefile
db_generate: install
	yarn db:generate

db_push: install
	yarn db:push

db_studio: install
	yarn db:studio
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (TypeScript compiles, lint clean)
- [x] `yarn db:generate` runs without error (produces empty migration since no tables yet)

#### Manual Verification:
- [x] `src/server/db/index.ts` exists and exports `db`
- [x] `drizzle.config.ts` exists at project root

---

## Phase 2: better-auth Schema

### Overview
Define the 4 better-auth tables matching the Drizzle adapter's expected schema. These tables will be ready for the adapter when better-auth is configured in a later issue. Can also be generated via `npx @better-auth/cli generate --output ./src/server/db/schema/auth.ts`.

### Changes Required:

#### 1. Auth schema
**File**: `src/server/db/schema/auth.ts` (new)

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
```

**Key differences from NextAuth adapter tables:**
- `user.emailVerified` is `boolean` (not `timestamp`)
- `session` uses `token` field (not `sessionToken`), has `ipAddress`/`userAgent` tracking
- `account` has `id` primary key, `providerId`/`accountId` (not composite PK), includes `password` field
- `verification` replaces `verificationTokens` — more general purpose (handles OTPs, email verification)
- All tables have `createdAt`/`updatedAt` timestamps

**No external imports needed** — unlike NextAuth's `AdapterAccountType`, better-auth schema is pure Drizzle with no auth package dependency.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes

#### Manual Verification:
- [x] Schema file exports `user`, `account`, `session`, `verification`

---

## Phase 3: Domain Schema

### Overview
Define 6 domain tables with all enums, foreign keys, and indexes as specified in the issue and design doc.

### Changes Required:

#### 1. Shared enums
**File**: `src/server/db/schema/enums.ts` (new)

```typescript
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
```

#### 2. Leads table
**File**: `src/server/db/schema/leads.ts` (new)

```typescript
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
      .where(table.email.isNotNull()),
    index("leads_lead_stage_idx").on(table.leadStage),
  ],
);
```

> Note: `hubspot_contact_id` unique constraint is handled by `.unique()` on the column definition. `email` uses a partial unique index (where not null) per the issue spec.

#### 3. Lots table
**File**: `src/server/db/schema/lots.ts` (new)

```typescript
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
```

#### 4. Lot Matches table
**File**: `src/server/db/schema/lot-matches.ts` (new)

```typescript
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
```

#### 5. Message Queue table
**File**: `src/server/db/schema/message-queue.ts` (new)

```typescript
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
```

#### 6. Conversations table
**File**: `src/server/db/schema/conversations.ts` (new)

```typescript
import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { channelEnum, directionEnum, deliveryMethodEnum } from "./enums";
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
```

#### 7. Nurture Sequences table
**File**: `src/server/db/schema/nurture-sequences.ts` (new)

```typescript
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
```

#### 8. Barrel export
**File**: `src/server/db/schema/index.ts` (new)

```typescript
export * from "./enums";
export * from "./auth";
export * from "./leads";
export * from "./lots";
export * from "./lot-matches";
export * from "./message-queue";
export * from "./conversations";
export * from "./nurture-sequences";
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes (all schema types correctly inferred, no lint errors)

#### Manual Verification:
- [x] All 6 domain tables exported from barrel
- [x] All 4 better-auth tables exported from barrel
- [x] All enums defined with correct values
- [x] Foreign key relationships correct (leads → lots, message_queue, conversations, etc.)

---

## Phase 4: Migration & Verification

### Overview
Generate the initial migration and push the schema to Neon. Verify all tables, enums, and indexes are created.

### Changes Required:

#### 1. Generate migration

```bash
make db_generate
```

This produces migration SQL files in the `drizzle/` directory.

#### 2. Push schema to Neon

```bash
make db_push
```

This applies the schema directly to the Neon database.

#### 3. Add `drizzle/` to `.gitignore` consideration

The `drizzle/` directory contains migration files and should be committed (it's the migration history). Verify it's **not** in `.gitignore`.

### Success Criteria:

#### Automated Verification:
- [x] `make db_generate` produces migration files without errors
- [x] `make db_push` applies schema to Neon without errors
- [x] `make build` succeeds
- [x] `make check` passes

#### Manual Verification:
- [x] All 10 tables visible in Neon console (6 domain + 4 better-auth)
- [ ] Enum types created correctly in Postgres
- [ ] Indexes exist on specified columns
- [x] `DATABASE_URL` configured in `.env.local` (already done) and Vercel

---

## Testing Strategy

### Automated:
- `make check` — TypeScript compilation + lint validates schema types are correctly inferred
- `make build` — Full Next.js build ensures no import/runtime issues
- `make db_generate` — Drizzle Kit validates schema is well-formed

### Manual Testing Steps:
1. Open Neon console → verify all 10 tables exist
2. Check enum types in Postgres (e.g., `SELECT typname FROM pg_type WHERE typtype = 'e'`)
3. Verify indexes with `\di` in psql or Neon SQL editor
4. Verify foreign keys reference correct tables

## Performance Considerations

- Runtime queries use pooled `DATABASE_URL` (PgBouncer) for connection efficiency in serverless
- Migrations use `DATABASE_URL_UNPOOLED` (direct) since DDL requires persistent connections
- `neon-http` driver (not `neon-serverless` WebSocket) — simpler, one HTTP request per query, ideal for serverless

## References

- Issue: #90
- Parent Epic: #85
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- Enquiry form: `docs/sales/Display-Client-Enquiry-Form-v1.2.md`
- ADR-001 (iMessage/delivery_method): `docs/architecture-decisions/adr001-imessage-integration-for-sales-automation.md`
- better-auth Drizzle adapter schema: https://www.better-auth.com/docs/adapters/drizzle
- Drizzle + Neon setup: https://orm.drizzle.team/docs/get-started/neon-new
