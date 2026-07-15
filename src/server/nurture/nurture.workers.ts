import "server-only";

import { aiModule } from "~/server/ai/ai.module";
import { inngest } from "~/server/inngest/client";
import { leadsModule } from "~/server/leads/leads.module";
import { messagingModule } from "~/server/messaging/messaging.module";
import { makeNurturePlanRunner } from "./nurture.worker";

// Workers composition root (adr020): the nurture.worker.ts factory consumes
// the leads read port, messaging's enqueueDraft write door, and the ai draft
// port wired here. The Inngest adapter is built ONCE at module scope; the
// functions registry (~/server/inngest/functions) serves it — the worker file
// exports only factories.
//
// Deliberately NO nurture.module.ts (adr020 collapse rule, recorded
// deviation from plan §PR 4): nurture owns no tables, no router, and no
// service surface — the worker is the domain's only public artifact, and
// rhythm.ts is domain-internal (its sole consumer is this worker). A module
// file would compose an empty {service}; add one only when a genuine service
// port appears.
export const nurtureWorkers = {
  nurturePlanRunner: makeNurturePlanRunner({
    getLead: leadsModule.service.getById,
    enqueueDraft: messagingModule.service.enqueueDraft,
    // Per-invocation resolution preserved: HEAD called resolveWorkerDraftFn()
    // inside the draft step, so the AI_STUB/NODE_ENV gate is read at run
    // time, not composition time — do not hoist the resolve out of the
    // closure.
    draftFn: (input) => aiModule.resolveWorkerDraftFn()(input),
    sendEvent: (evt) => inngest.send(evt),
  }),
};
