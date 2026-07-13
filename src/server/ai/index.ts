import "server-only";

// Barrel kept for scripts/smoke-draft-message.ts (dev-only smoke entry).
// Domain code does NOT consume draftMessage from here — nurture goes through
// aiModule.resolveWorkerDraftFn (ai.module.ts); anthropic-client and
// draft-message stay module-private otherwise.
export { draftMessage } from "./draft-message";
export type { DraftMessageInput, DraftMessageOutput } from "./draft-schemas";
