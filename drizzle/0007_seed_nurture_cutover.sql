-- Data cutover for the nurture → Inngest migration (pairs with 0006, which drops
-- nurture_sequences). Seeds one `lead.stage-changed` event per active Lead into the
-- outbox; the outbox-sweep cron delivers each to a `nurture-plan-runner` instance
-- (at-least-once, idempotent on the outbox row id — see ADR-013/ADR-014). SQL can't
-- call inngest.send, and the outbox is the seam intake already uses, so the schema
-- drop and the runner spin-up land in one `make db_migrate`.
--
-- Reads `leads` only (never nurture_sequences), so it is order-independent w.r.t.
-- 0006. drizzle records it in __drizzle_migrations, so it runs exactly once per
-- environment and no-ops on a fresh DB (the SELECT matches zero rows).
--
-- ROLLBACK: git-revert the merge (restores nurture_sequences + scheduler + cron),
--   then `make db_migrate` to recreate the table, repopulate active sequences via
--   the restored startOrUpdateSequence, and bulk-cancel the orphaned
--   nurture-plan-runner instances in the Inngest dashboard.
INSERT INTO "outbox" ("event_name", "payload")
SELECT
  'lead.stage-changed',
  jsonb_build_object('leadId', "id", 'fromStage', NULL, 'toStage', "lead_stage")
FROM "leads"
WHERE "lead_stage" IN ('unqualified', 'nurture', 'warm');
