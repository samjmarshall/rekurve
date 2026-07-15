import "server-only";

import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";

import type { db as defaultDb } from "~/server/db";
import { withDbTimeout } from "~/server/db/with-timeout";
import { inngest } from "~/server/inngest/client";
import { outbox } from "./outbox.schema";

type Db = typeof defaultDb;

// biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
type Step = { run: (id: string, fn: () => Promise<any>) => Promise<any> };

// Bound each Neon HTTP call so a hung query fails fast as a retriable step error
// instead of burning the function budget and 504-ing. Generous enough to absorb
// a cold-resume (the hourly cadence means the compute is usually suspended when
// the sweep fires), far below the route's 300s `maxDuration`.
const DB_TIMEOUT_MS = 20_000;

// Worker port surface (adr020, collapse rule): the sweep/prune ARE the outbox
// read path — they hit the rows directly on the injected db, no repository or
// service tier in between. `send` deliberately is NOT the typed SendEvent
// port: swept rows replay whatever eventName was committed (a legacy in-flight
// row may predate the registry), so the name stays a raw string and the
// payload is never re-parsed here — write-time validation only (adr019
// clause 7; re-parsing would error-loop the backstop).
export type OutboxSweepWorkerDeps = {
  db: Db;
  send: (evt: {
    id: string;
    name: string;
    data: Record<string, unknown>;
  }) => Promise<unknown>;
};

export type OutboxPruneWorkerDeps = {
  db: Db;
};

/**
 * Durable backstop for the post-commit fast path (ADR-014): re-sends any
 * outbox row whose `inngest.send` never landed. The 30s row-age filter keeps
 * it off rows whose post-commit send is still in flight.
 *
 * Step ids are FROZEN (Inngest memoisation keys — in-flight runs replay
 * against them): select-unprocessed, then row-{id} per row.
 */
export function makeRunSweep(deps: OutboxSweepWorkerDeps) {
  return async function runSweep(step: Step): Promise<void> {
    const rows = await step.run("select-unprocessed", () =>
      withDbTimeout("outbox-sweep:select", DB_TIMEOUT_MS, () =>
        deps.db
          .select()
          .from(outbox)
          .where(
            and(
              isNull(outbox.processedAt),
              lt(outbox.createdAt, sql`now() - interval '30 seconds'`),
            ),
          )
          .orderBy(outbox.createdAt)
          .limit(100),
      ),
    );

    for (const row of rows) {
      await step.run(`row-${row.id}`, async () => {
        try {
          await deps.send({
            id: row.id,
            name: row.eventName,
            data: row.payload as Record<string, unknown>,
          });
          await withDbTimeout(
            "outbox-sweep:mark-processed",
            DB_TIMEOUT_MS,
            () =>
              deps.db
                .update(outbox)
                .set({ processedAt: sql`now()` })
                .where(and(eq(outbox.id, row.id), isNull(outbox.processedAt))),
          );
        } catch (err) {
          await withDbTimeout("outbox-sweep:record-error", DB_TIMEOUT_MS, () =>
            deps.db
              .update(outbox)
              .set({
                attempts: sql`${outbox.attempts} + 1`,
                lastError: String(err),
              })
              .where(eq(outbox.id, row.id)),
          );
        }
      });
    }
  };
}

/** Deletes processed rows older than 7 days. Step id FROZEN: delete-processed. */
export function makeRunPrune(deps: OutboxPruneWorkerDeps) {
  return async function runPrune(step: Step): Promise<void> {
    await step.run("delete-processed", () =>
      deps.db
        .delete(outbox)
        .where(
          and(
            isNotNull(outbox.processedAt),
            lt(outbox.processedAt, sql`now() - interval '7 days'`),
          ),
        ),
    );
  };
}

// Hourly, not per-minute: the post-commit `inngest.send` is the fast path that
// delivers ~every event in real time; this sweep is only the backstop for the
// rare event whose post-commit send failed (ADR-014 — cadence is "a tunable
// knob, not a contract"). A per-minute query kept Neon's compute from ever
// autosuspending (scale-to-zero), pinning it ~24/7 and driving DB usage to
// quota. Hourly lets the compute idle between sweeps; worst-case recovery for a
// failed publish is bounded by this interval.
//
// Thin Inngest adapter factories: real deps are wired by the workers
// composition root (outbox.workers.ts). Config is byte-stable — ids and crons
// are pinned by the registry golden test.
export function makeOutboxSweepWorker(deps: OutboxSweepWorkerDeps) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunSweep(deps);
  return inngest.createFunction(
    { id: "outbox-sweep", triggers: { cron: "0 * * * *" } },
    ({ step }) => run(step),
  );
}

export function makeOutboxPruneWorker(deps: OutboxPruneWorkerDeps) {
  const run = makeRunPrune(deps);
  return inngest.createFunction(
    { id: "outbox-prune", triggers: { cron: "0 3 * * *" } },
    ({ step }) => run(step),
  );
}
