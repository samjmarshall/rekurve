import "server-only";

import type { db as defaultDb } from "~/server/db";
import type { OutboxEventDescriptor } from "~/server/inngest/events";
import { buildOutboxEvent, sendPostCommit } from "./index";

type Db = typeof defaultDb;
type BatchItems = Parameters<Db["batch"]>[0];
type BatchItem = BatchItems[number];

/**
 * The write-path primitive behind every repository `commit(writes, events)`
 * (adr019 clause 2, adr020): canonical rows and their outbox rows land in ONE
 * `db.batch` — Neon's array-transaction endpoint, never an interactive tx
 * (adr017) — then the post-commit send runs as the best-effort fast path with
 * the hourly sweep as backstop.
 *
 * DI caveat: the injected `db` executes the batch, but `buildOutboxEvent`
 * builds its insert statements on the module-level singleton from ~/server/db,
 * and `sendPostCommit` stamps `processedAt` on that same singleton. Passing
 * anything other than the app singleton (e.g. a per-test Neon-branch client)
 * would silently split traffic across two clients — thread `db` through
 * buildOutboxEvent/sendPostCommit before constructing repositories on a
 * non-singleton instance (PR 2).
 */
export function makeCommitWithOutbox(db: Db) {
  return async function commitWithOutbox(
    stmts: readonly BatchItem[],
    events: readonly OutboxEventDescriptor[],
  ) {
    // Zod-parses each payload at write time (throws before anything commits).
    const built = events.map((evt) => buildOutboxEvent(evt.name, evt.data));

    const items = [...stmts, ...built.map((evt) => evt.query)];
    // db.batch requires a non-empty tuple; a commit with no writes and no
    // events is a no-op.
    const results =
      items.length > 0 ? await db.batch(items as unknown as BatchItems) : [];

    await sendPostCommit(
      built.map((evt) => ({
        id: evt.id,
        name: evt.eventName,
        data: evt.payload,
      })),
    );

    // Full batch results, positionally aligned with `stmts` (outbox insert
    // results trail), so `.returning()` rows flow back to callers.
    return results;
  };
}

export type CommitWithOutbox = ReturnType<typeof makeCommitWithOutbox>;
