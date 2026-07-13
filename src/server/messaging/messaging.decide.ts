import "server-only";

import type { OutboxEventDescriptor } from "~/server/inngest/events";
import { LeadNotFoundError } from "~/server/leads/leads.errors";
import type { LeadRow } from "~/server/leads/leads.schema";
import {
  EmailPreconditionError,
  MessageNotActionableError,
} from "./messaging.errors";
import type {
  ConversationInsert,
  MessageInsert,
  MessageRow,
} from "./messaging.schema";

// Pure decision core for the message approve/dispatch write paths (adr020
// hybrid write-path clause: message approve/editAndApprove earn a decide()
// seam). No db, no I/O, no nondeterminism — message row + input + lead row +
// injected ctx/now → a write descriptor + outbox event descriptors. The full
// channel × skipDispatch × status × precondition matrix is the executable spec
// in __tests__/messaging.decide.test.ts, written against the pre-split router
// (messages.ts:141-290); every cell here is behavior-preserving, quirks
// included (imessage → channel:"sms" in the event; skipDispatch ignored on
// email). server-only by policy: decide fns are not isomorphic-kernel
// residents.

/**
 * All nondeterminism is injected: the result of the msGraphTokens lookup
 * (I/O — the service resolves it, decide stays pure); the clock arrives as
 * `now`. No decide path reads the acting user — identity stays a service/
 * adapter concern.
 */
type MessagingDecideCtx = { hasMsGraphToken: boolean };

/**
 * Write descriptors — the discriminated union the repository's plural write
 * door, `commit(writes, events)`, maps to Drizzle statements (one db.batch
 * per commit):
 * - updateMessage: update-by-id with `.returning()` (approve/editAndApprove/
 *   snooze/dismiss — mutations return the fresh row, adr006)
 * - markDispatching: dispatchingAt fence stamp, no returning (dispatch workers,
 *   immediately before the external send — the dismiss-during-dispatch guard)
 * - stampSent: sentAt stamp guarded on `sentAt IS NULL`, no returning
 *   (dispatch workers, post-send — a second stamp is a no-op)
 * - insertConversation: outbound conversation record (dispatch workers;
 *   idempotence is the service's check-then-insert — no unique index yet)
 * - stampActivity: hubspotActivityId onto the conversation, keyed by
 *   messageQueueId (engagement webhook match / reconciler)
 * - recordDeliveryStatus: Twilio delivery status by message SID (status route)
 */
export type MessagingWrite =
  | { kind: "updateMessage"; id: string; set: Partial<MessageInsert> }
  | { kind: "markDispatching"; id: string; dispatchingAt: Date }
  | { kind: "stampSent"; id: string; sentAt: Date }
  | { kind: "insertConversation"; values: ConversationInsert }
  | { kind: "stampActivity"; messageQueueId: string; hubspotActivityId: string }
  | {
      kind: "recordDeliveryStatus";
      twilioMessageSid: string;
      deliveryStatus: string;
    };

export type ApprovalDecision = {
  write: Extract<MessagingWrite, { kind: "updateMessage" }>;
  events: OutboxEventDescriptor[];
};

/**
 * G1 — shared status guard: terminal states (approved, edited_and_approved,
 * dismissed) reject the action. snoozedUntil is deliberately never consulted:
 * a snoozed row with a future snoozedUntil is still actionable, and no action
 * clears the stale stamp. snooze/dismiss stay imperative in the service
 * (adr020: decide only where earned) but share this guard.
 */
export function assertActionable(
  message: MessageRow,
  action: "approve" | "edit" | "snooze" | "dismiss",
): void {
  if (message.status !== "pending" && message.status !== "snoozed") {
    throw new MessageNotActionableError(action, message.status);
  }
}

/**
 * G3 — email-only dispatch preconditions, checked before the status write so a
 * failure leaves the queue row at its current status. Order is byte-pinned
 * (hubspot sync → lead email → Graph token), as are the user-facing messages.
 */
function checkEmailPreconditions(lead: LeadRow, ctx: MessagingDecideCtx): void {
  if (!lead.hubspotContactId) {
    throw new EmailPreconditionError(
      "This lead isn't synced with HubSpot yet. Contact support.",
    );
  }
  if (!lead.email) {
    throw new EmailPreconditionError("This lead has no email address.");
  }
  if (!ctx.hasMsGraphToken) {
    throw new EmailPreconditionError(
      "Connect your Microsoft account to send emails.",
    );
  }
}

/** Guard order pinned by the matrix test: G1 status, then G2 lead-missing. */
function guardActionableWithLead(
  message: MessageRow,
  action: "approve" | "edit",
  lead: LeadRow | undefined,
): LeadRow {
  assertActionable(message, action);
  if (!lead) {
    throw new LeadNotFoundError(message.leadId);
  }
  return lead;
}

/**
 * The one approval-requested wire envelope: exactly
 * {messageId, correlationId, channel, body, leadId}, with
 * correlationId === messageId (dispatch #261). `channel` is the DISPATCH
 * channel: imessage rows fall into the sms else-branch, so the event carries
 * "sms", never "imessage" (that worker trigger is unreachable, pending adr001).
 */
function approvalRequestedEvent(
  message: MessageRow,
  lead: LeadRow,
  channel: "email" | "sms",
  body: string,
): OutboxEventDescriptor {
  return {
    name: "message.approval-requested",
    data: {
      messageId: message.id,
      correlationId: message.id,
      channel,
      body,
      leadId: lead.id,
    },
  };
}

export function decideApprove(
  message: MessageRow,
  input: { skipDispatch?: boolean },
  lead: LeadRow | undefined,
  ctx: MessagingDecideCtx,
  now: Date,
): ApprovalDecision {
  const foundLead = guardActionableWithLead(message, "approve", lead);

  if (message.channel === "email") {
    // skipDispatch is IGNORED on email — the pre-split router's email block
    // returned before the flag was read: event still emitted, no sentAt.
    checkEmailPreconditions(foundLead, ctx);
    return {
      write: {
        kind: "updateMessage",
        id: message.id,
        set: { status: "approved", approvedAt: now },
      },
      events: [
        approvalRequestedEvent(message, foundLead, "email", message.body),
      ],
    };
  }

  // SMS else-branch (imessage rows fall through here too).
  // skipDispatch (native-share): stamp sentAt inline, no outbox event.
  if (input.skipDispatch) {
    return {
      write: {
        kind: "updateMessage",
        id: message.id,
        set: { status: "approved", approvedAt: now, sentAt: now },
      },
      events: [],
    };
  }

  return {
    write: {
      kind: "updateMessage",
      id: message.id,
      set: { status: "approved", approvedAt: now },
    },
    events: [approvalRequestedEvent(message, foundLead, "sms", message.body)],
  };
}

export function decideEditAndApprove(
  message: MessageRow,
  input: { body: string; skipDispatch?: boolean },
  lead: LeadRow | undefined,
  ctx: MessagingDecideCtx,
  now: Date,
): ApprovalDecision {
  const foundLead = guardActionableWithLead(message, "edit", lead);

  // First-edit-wins: preserve the pre-edit body only if no original is stamped
  // yet. No body-equality shortcut — an identical body still edits + dispatches.
  const editSet: Partial<MessageInsert> = {
    status: "edited_and_approved",
    body: input.body,
    originalBody: message.originalBody ?? message.body,
    approvedAt: now,
  };

  if (message.channel === "email") {
    checkEmailPreconditions(foundLead, ctx);
    return {
      write: { kind: "updateMessage", id: message.id, set: editSet },
      events: [approvalRequestedEvent(message, foundLead, "email", input.body)],
    };
  }

  if (input.skipDispatch) {
    return {
      write: {
        kind: "updateMessage",
        id: message.id,
        set: { ...editSet, sentAt: now },
      },
      events: [],
    };
  }

  return {
    write: { kind: "updateMessage", id: message.id, set: editSet },
    events: [approvalRequestedEvent(message, foundLead, "sms", input.body)],
  };
}
