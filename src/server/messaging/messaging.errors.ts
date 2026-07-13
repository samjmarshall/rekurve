import "server-only";

// Domain errors (adr020): the decide core and service throw transport-agnostic
// errors; the tRPC adapter (messaging.router.ts) owns their TRPCError mapping.
// Every message string below is byte-pinned — MessageNotActionableError and
// EmailPreconditionError messages are user-facing and asserted verbatim by the
// dispatch matrix test (messaging.decide.test.ts).

export class MessageNotFoundError extends Error {
  constructor(readonly messageId: string) {
    super(`Message ${messageId} not found`);
    this.name = "MessageNotFoundError";
  }
}

/** Terminal-status guard (G1): only pending/snoozed rows are actionable. */
export class MessageNotActionableError extends Error {
  constructor(
    readonly action: "approve" | "edit" | "snooze" | "dismiss",
    readonly status: string,
  ) {
    super(`Cannot ${action} message in ${status} state`);
    this.name = "MessageNotActionableError";
  }
}

/**
 * Email dispatch precondition failure (G3): synchronous fast-fail so the
 * consultant sees "Connect your Microsoft account" (etc.) immediately, with the
 * queue row left at its current status. The message carries the distinguishing
 * data — it maps verbatim onto PRECONDITION_FAILED.
 */
export class EmailPreconditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailPreconditionError";
  }
}
