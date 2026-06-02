# Nurture → Inngest Cutover Runbook

## Cutover

1. **Deploy the PR** — merge the feat/260 branch to main and wait for the Vercel deployment to complete.
2. **Run the cutover script** against the production environment:
   ```sh
   yarn cutover:nurture
   ```
   This fires one `lead.stage-changed` event per Lead whose stage is `unqualified`, `nurture`, or `warm`. Inngest spins up a `nurture-plan-runner` instance per Lead, serialised behind the concurrency key (`event.data.leadId`).
3. **Verify in the Inngest dashboard** — confirm one running instance per active Lead. After the first rhythm boundary passes, draft messages should appear in `message_queue`.

The script is idempotent: re-running fires a fresh `lead.stage-changed`, which supersedes the waiting instance (via `waitForEvent`). The fresh instance starts from the current `leadStage`.

## Rollback (git-revert path)

If the cutover needs to be reversed:

1. **`git revert` the merge commit** on main. This restores:
   - `nurture_sequences` schema + indexes + enums (`sequence_type`, `sequence_status`)
   - `src/server/nurture/scheduler.ts` and all scheduler logic
   - The tRPC nurture router (`src/server/api/routers/nurture.ts`) + schemas
   - The Vercel cron entry (`/api/cron/nurture-scheduler`, `0 0 * * *`)
   - The `lead-fanout` `start-nurture` step
   - The seed fixture (`src/server/db/seed/fixtures/nurture-sequences.ts`)

   And removes:
   - `nurture-plan-runner` and `src/server/nurture/rhythm.ts`
   - `lead.stage-changed` emission from intake
   - `scripts/cutover-nurture-plans.ts`

2. **Regenerate and apply the migration:**
   ```sh
   make db_generate
   make db_migrate
   ```
   Drizzle re-creates `nurture_sequences`, `nurture_sequences_lead_status_idx`, `nurture_active_one_per_lead_uidx`, and both sequence enums.

3. **Repopulate active sequences** — run a one-off script or manually call the restored `startOrUpdateSequence` for each Lead with stage `unqualified`, `nurture`, or `warm` to seed an active row in `nurture_sequences`.

4. **Redeploy** — the restored Vercel cron is re-enabled on the next deploy.

5. **Bulk-cancel orphaned `nurture-plan-runner` instances** in the Inngest dashboard — any runners queued during the cutover window must be cancelled to prevent duplicate drafts once the cron resumes.
