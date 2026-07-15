import "server-only";

import { db } from "~/server/db";
import { inngest } from "~/server/inngest/client";
import { makeOutboxPruneWorker, makeOutboxSweepWorker } from "./outbox.worker";

// Workers composition root (adr020): binds the app db singleton and the raw
// inngest send onto the outbox.worker.ts factories. Composition-root
// invariants (adapter built ONCE at module scope, served by the functions
// registry — ~/server/inngest/functions; workers file kept separate so the
// factories stay dependency-injected for tests) are documented in full on
// messaging.workers.ts — the same rules apply here.
export const outboxWorkers = {
  sweep: makeOutboxSweepWorker({ db, send: (evt) => inngest.send(evt) }),
  prune: makeOutboxPruneWorker({ db }),
};
