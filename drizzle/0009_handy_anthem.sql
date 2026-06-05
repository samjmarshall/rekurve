-- Rollback: Postgres cannot drop an enum value. To revert, recreate the type
-- without 'imessage' and update all dependent columns. See CLAUDE.md for the
-- standard migration note on this constraint.
ALTER TYPE "public"."channel" ADD VALUE 'imessage';