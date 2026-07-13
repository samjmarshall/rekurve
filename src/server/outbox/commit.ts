import "server-only";

import { inngest } from "~/inngest/client";
import type { db as defaultDb } from "~/server/db";
import { createOutboxHelpers } from "./core";

type Db = typeof defaultDb;

/**
 * Composition-root entry point for repository write paths (adr020): binds the
 * app Inngest singleton onto the INJECTED `db` and returns the
 * `commitWithOutbox` primitive (see ./core.ts) — outbox inserts, the commit
 * batch, and the `processedAt` stamp all run on that one client, so passing a
 * per-test Neon-branch client is safe. To fake Inngest delivery too, use
 * `createOutboxHelpers({ db, inngest })` directly.
 */
export function makeCommitWithOutbox(db: Db) {
  return createOutboxHelpers({ db, inngest }).commitWithOutbox;
}

export type CommitWithOutbox = ReturnType<typeof makeCommitWithOutbox>;
