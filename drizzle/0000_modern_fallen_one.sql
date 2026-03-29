CREATE TYPE "public"."availability_type" AS ENUM('first_come', 'exclusive_territory', 'developer_direct');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."construction_timeline" AS ENUM('ready_now', '3_6_months', '12_months_plus');--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('imessage', 'sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('walk_in', 'referral', 'social', 'web', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('unqualified', 'nurture', 'warm', 'hot');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('available', 'matched', 'sold', 'expired');--> statement-breakpoint
CREATE TYPE "public"."match_strength" AS ENUM('strong', 'partial', 'stretch');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('pending', 'approved', 'edited_and_approved', 'dismissed', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('pending', 'queued', 'sent', 'responded');--> statement-breakpoint
CREATE TYPE "public"."preferred_contact_time" AS ENUM('weekdays', 'weekends', 'anytime');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('single_storey', 'double_storey', 'investment', 'upsize', 'downsize', 'first_home_buyer');--> statement-breakpoint
CREATE TYPE "public"."sequence_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sequence_type" AS ENUM('discovery', 'nurture', 'warm_progression', 'lot_alert');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hubspot_contact_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"preferred_contact_time" "preferred_contact_time",
	"has_land" boolean,
	"land_registered" boolean,
	"land_address" text,
	"land_size_sqm" numeric,
	"land_width" numeric,
	"land_depth" numeric,
	"property_type" "property_type",
	"budget" text,
	"seen_broker" boolean,
	"construction_timeline" "construction_timeline",
	"lead_score" integer DEFAULT 0,
	"lead_stage" "lead_stage" DEFAULT 'unqualified' NOT NULL,
	"preferred_estates" text[],
	"preferred_suburbs" text[],
	"lead_source" "lead_source",
	"referrer_name" text,
	"notes" text,
	"resolve_finance_opted_in" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_contacted_at" timestamp with time zone,
	CONSTRAINT "leads_hubspot_contact_id_unique" UNIQUE("hubspot_contact_id")
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estate_name" text NOT NULL,
	"suburb" text NOT NULL,
	"lot_number" text NOT NULL,
	"land_size_sqm" numeric,
	"frontage_m" numeric,
	"depth_m" numeric,
	"price" numeric,
	"availability_type" "availability_type",
	"exclusive_until" timestamp with time zone,
	"status" "lot_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lot_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"match_strength" "match_strength" NOT NULL,
	"match_reasoning" text,
	"outreach_status" "outreach_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"ai_reasoning" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" "message_status" DEFAULT 'pending' NOT NULL,
	"snoozed_until" timestamp with time zone,
	"original_body" text,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"message_queue_id" uuid,
	"channel" "channel" NOT NULL,
	"direction" "direction" NOT NULL,
	"delivery_method" "delivery_method",
	"subject" text,
	"body" text NOT NULL,
	"hubspot_activity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nurture_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"sequence_type" "sequence_type" NOT NULL,
	"status" "sequence_status" DEFAULT 'active' NOT NULL,
	"next_step_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_matches" ADD CONSTRAINT "lot_matches_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_matches" ADD CONSTRAINT "lot_matches_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_queue" ADD CONSTRAINT "message_queue_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_message_queue_id_message_queue_id_fk" FOREIGN KEY ("message_queue_id") REFERENCES "public"."message_queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurture_sequences" ADD CONSTRAINT "nurture_sequences_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_email_idx" ON "leads" USING btree ("email") WHERE "leads"."email" is not null;--> statement-breakpoint
CREATE INDEX "leads_lead_stage_idx" ON "leads" USING btree ("lead_stage");--> statement-breakpoint
CREATE INDEX "lots_status_idx" ON "lots" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "lot_matches_lot_lead_idx" ON "lot_matches" USING btree ("lot_id","lead_id");--> statement-breakpoint
CREATE INDEX "message_queue_status_priority_idx" ON "message_queue" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "conversations_lead_id_idx" ON "conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "nurture_sequences_lead_status_idx" ON "nurture_sequences" USING btree ("lead_id","status");