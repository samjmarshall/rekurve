import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import type { db as defaultDb } from "~/server/db";
import type { inngest as defaultInngest } from "~/server/inngest/client";
import {
  EVENT_REGISTRY,
  type EventName,
  type EventPayload,
  type OutboxEventDescriptor,
} from "~/server/inngest/events";
import { outbox } from "./outbox.schema";

type Db = typeof defaultDb;
type InngestClient = typeof defaultInngest;
type BatchItems = Parameters<Db["batch"]>[0];
type BatchItem = BatchItems[number];

/**
 * DI seam over the outbox primitives: every helper closes over the ONE
 * injected `db`, so the outbox insert statements, the commit batch, and the
 * `processedAt` stamp all execute on the same client — constructing the
 * helpers on a non-singleton instance (a per-test Neon-branch client, a
 * repository's injected db) can never split traffic across two clients.
 * `~/server/outbox` (index.ts) binds the app singletons.
 */
export function createOutboxHelpers({
  db,
  inngest,
}: {
  db: Db;
  inngest: InngestClient;
}) {
  // #330 resolution: buildOutboxEvent/sendPostCommit are now INTERNAL to this
  // factory (and its direct tests) — the ~/server/outbox barrel exports only
  // `publish`, and repositories go through commitWithOutbox. With no external
  // call sites left, the legacy member names {id, eventName, payload, query}
  // are a private detail; the adr019 clause 7 shape {id, name, data, insert}
  // is a rename to take opportunistically if this file is ever touched for a
  // real change. The inline `await evt.query; sendPostCommit(...)` idiom is
  // retired — do not copy it into new handlers; emit through `publish` or a
  // repository commit.
  function buildOutboxEvent<K extends EventName>(
    eventName: K,
    payload: EventPayload<K>,
  ) {
    // Write-time validation only (adr019 clause 7): the sweep/prune read path
    // must never re-parse — a legacy in-flight row that predates the registry
    // would error-loop the backstop. Registry schemas are strict, so an unknown
    // payload key throws here rather than being silently stripped.
    const data = EVENT_REGISTRY[eventName].parse(payload) as EventPayload<K>;
    const id = crypto.randomUUID();
    const query = db.insert(outbox).values({ id, eventName, payload: data });
    return { id, eventName, payload: data, query };
  }

  async function sendPostCommit(
    events: { id: string; name: string; data: Record<string, unknown> }[],
  ): Promise<void> {
    for (const evt of events) {
      try {
        await inngest.send({ id: evt.id, name: evt.name, data: evt.data });
        await db
          .update(outbox)
          .set({ processedAt: sql`now()` })
          .where(and(eq(outbox.id, evt.id), isNull(outbox.processedAt)));
      } catch (err) {
        console.error(
          "[outbox] post-commit send failed; sweep will retry:",
          err,
        );
      }
    }
  }

  /**
   * The write-path primitive behind every repository `commit(writes, events)`
   * (adr019 clause 2, adr020): canonical rows and their outbox rows land in
   * ONE `db.batch` — Neon's array-transaction endpoint, never an interactive
   * tx (adr017) — then the post-commit send runs as the best-effort fast path
   * with the hourly sweep as backstop.
   */
  async function commitWithOutbox(
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
  }

  /**
   * Write-less commit (adr019 clause 7; deferred from the enabling-infra PR to
   * its first caller — the webhook's engagement-created emission): for
   * emit-only surfaces with no canonical rows of their own. Builds the outbox
   * inserts, commits them in ONE `db.batch` (adr017 — batch-shaped, never an
   * interactive tx), then runs the same best-effort post-commit send +
   * `processedAt` stamp (log-and-swallow on failure; hourly sweep backstop)
   * as every other commit path.
   */
  async function publish(
    events: readonly OutboxEventDescriptor[],
  ): Promise<void> {
    await commitWithOutbox([], events);
  }

  return { buildOutboxEvent, sendPostCommit, commitWithOutbox, publish };
}
