ALTER TABLE "conversations" ADD COLUMN "twilio_message_sid" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "delivery_status" text;--> statement-breakpoint
CREATE INDEX "conversations_twilio_sid_idx" ON "conversations" USING btree ("twilio_message_sid");