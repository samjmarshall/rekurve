import "server-only";

import type { DraftFn } from "./stub";
import { resolveWorkerDraftFn } from "./stub";

// Thin adapter module (adr020 collapse rule): ai is a genuine external
// adapter with no service/repository tiers — this module is just the typed
// draft surface the owning domain injects, plus the golden-pinned
// ai.healthCheck probe in ai.router.ts (wired in ~/server/api/root.ts).
// nurture.workers.ts wires its worker's `draftFn` dep from here;
// resolveWorkerDraftFn preserves the env-gated stub swap (AI_STUB=1 outside
// production) and lazy-loads the Anthropic-backed draftMessage so the stub
// path never touches the SDK.
//
// PLAN DEVIATION (recorded): plan §PR 4 slated channel-selection, priority,
// prompts and draft-schemas for the isomorphic kernel (src/domain/ai/), but
// adr020's isomorphic-by-need clause governs — purity alone does not buy a
// kernel seat, and no client code imports any of them (verified 2026-07-13:
// zero importers outside the server graph). They stay here, server-only
// marked; the kernel move (incl. untangling draft-schemas' LeadRow re-export
// from leads.schema) is earned the day a client component needs one.
export const aiModule = {
  resolveWorkerDraftFn,
};

export type { DraftFn };
