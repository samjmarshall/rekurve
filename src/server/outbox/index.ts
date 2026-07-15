import "server-only";

import { db } from "~/server/db";
import { inngest } from "~/server/inngest/client";
import { createOutboxHelpers } from "./core";

// App-singleton binding of the outbox helpers (core.ts holds the logic and
// its DI seam). Repositories constructed on a non-singleton db go through
// makeCommitWithOutbox (./commit) or createOutboxHelpers directly.
//
// `publish` is the ONLY export (#330): the write-less commit for emit-only
// surfaces with no canonical rows (adr019 clause 7; sole consumer today is
// hubspot.module.ts wiring the webhook's engagement-created emission). The
// legacy buildOutboxEvent/sendPostCommit pair is deliberately NOT re-exported
// — no runtime importer remained, and every legitimate emit path goes through
// `publish` or a repository's commit(writes, events); reach for
// createOutboxHelpers({ db, inngest }) directly if a new binding is needed.
// The OUTBOX_EVENTS/MESSAGE_EVENTS/HUBSPOT_EMAIL_EVENTS name maps are retired
// too — consumers pin wire strings module-privately with
// `satisfies Record<string, EventName>` against the EVENT_REGISTRY (the
// naming authority, adr019 clause 7).
export const { publish } = createOutboxHelpers({
  db,
  inngest,
});
