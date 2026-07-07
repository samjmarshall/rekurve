---
paths:
  - "drizzle/**"
  - "src/server/db/**"
  - "scripts/seed-dev.ts"
---

# Database Migrations

**Never use `drizzle-kit push`** — it applies schema changes directly without recording them in the migrations table, breaking idempotency.

Always use this two-step process:

1. `make db_generate` — generate a migration SQL file in `drizzle/`
2. `make db_migrate` — apply pending migrations and record them in `__drizzle_migrations`

When schema changes touch tables seeded by `scripts/seed-dev.ts`, update the corresponding fixture in `src/server/db/seed/fixtures/*` in the same PR. The seeder is typesafe — a stale fixture will fail `make check` and `make build`.

## Data migrations

Data changes coupled to a schema change (back-fill, cutover, seed) belong in a SQL migration alongside it, not in a one-off script someone must remember to run. Generate the file with `make db_custom name=<slug>`, write the `INSERT`/`UPDATE`/`DELETE`, then `make db_migrate`.

Drizzle migrations are pure SQL — no JS hooks. To trigger an Inngest workflow from one, `INSERT` a row into `outbox` instead of calling `inngest.send` from a script; the `outbox-sweep` cron delivers it at-least-once, idempotent on row id — the seam intake already uses ([ADR-013](../../docs/adr/adr013-local-db-canonical-for-lead-data.md)/[ADR-014](../../docs/adr/adr014-outbox-pattern-for-inngest-delivery.md)). Put rollback notes in a comment at the top of the file. Worked example: `drizzle/0007_seed_nurture_cutover.sql`.
