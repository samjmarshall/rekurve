-- #261 email-dispatch-inngest-worker: add the dispatching_at fence column.
-- The dispatch-email worker stamps this immediately before each Graph send to
-- guard the dismiss-during-dispatch race. Nullable, no backfill needed.
-- Rollback: ALTER TABLE "message_queue" DROP COLUMN "dispatching_at";
ALTER TABLE "message_queue" ADD COLUMN "dispatching_at" timestamp with time zone;
