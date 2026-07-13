import "server-only";

import type { LeadRow } from "~/server/leads/leads.schema";
import type { ApprovalDecision, MessagingWrite } from "./messaging.decide";
import {
  assertActionable,
  decideApprove,
  decideEditAndApprove,
} from "./messaging.decide";
import { MessageNotFoundError } from "./messaging.errors";
import type { MessagingRepository } from "./messaging.repository";
import type { ConversationInsert, MessageRow } from "./messaging.schema";
import type {
  ConversationsList,
  MessageApprove,
  MessageEditAndApprove,
  MessageSnooze,
} from "./messaging-schemas";

type MessagingCtx = { userId: string };

// Domain service (adr020): approve/editAndApprove are load → guard → decide →
// commit and return the fresh row (adr006); snooze/dismiss stay imperative
// (decide only where earned) but share the same guards and write door. Throws
// domain errors (messaging.errors.ts) — never transport errors; adapters map
// them. The worker-facing ops at the bottom are the ports the dispatch/
// reconcile *.worker.ts adapters consume — their write shapes and order are
// byte-equal to the pre-split inline worker code (#261).
export function makeMessagingService({ repo }: { repo: MessagingRepository }) {
  /** Load + G1, in the pre-split router's I/O order: row-missing NOT_FOUND is
   * a service concern; the status guard fires before any lead read. */
  async function loadActionable(
    id: string,
    action: "approve" | "edit" | "snooze" | "dismiss",
  ): Promise<MessageRow> {
    const message = await repo.findMessage(id);
    if (!message) {
      throw new MessageNotFoundError(id);
    }
    assertActionable(message, action);
    return message;
  }

  /** The msGraphTokens lookup is I/O — resolved here (email channel only, as
   * before) and injected into the pure decide fns as ctx.hasMsGraphToken. */
  async function hasMsGraphToken(
    message: MessageRow,
    ctx: MessagingCtx,
  ): Promise<boolean> {
    if (message.channel !== "email") return false;
    return !!(await repo.findMsGraphToken(ctx.userId));
  }

  /** The one approval pipeline (approve/editAndApprove differ only in the
   * action word and decide fn): load → G1 → lead read → token read → pure
   * decide → commit — the pinned I/O order lives here once. */
  async function runApproval<I extends { id: string }>(
    input: I,
    ctx: MessagingCtx,
    action: "approve" | "edit",
    decide: (
      message: MessageRow,
      input: I,
      lead: LeadRow | undefined,
      dctx: { hasMsGraphToken: boolean },
      now: Date,
    ) => ApprovalDecision,
  ): Promise<MessageRow> {
    const message = await loadActionable(input.id, action);
    const lead = await repo.findLeadById(message.leadId);
    const { write, events } = decide(
      message,
      input,
      lead,
      { hasMsGraphToken: await hasMsGraphToken(message, ctx) },
      new Date(),
    );
    const [updated] = await repo.commit([write], events);
    return updated!;
  }

  function approve(input: MessageApprove, ctx: MessagingCtx) {
    return runApproval(input, ctx, "approve", decideApprove);
  }

  function editAndApprove(input: MessageEditAndApprove, ctx: MessagingCtx) {
    return runApproval(input, ctx, "edit", decideEditAndApprove);
  }

  // Imperative flows (adr020 hybrid clause: no decide() seam earned) — pinned
  // write sets: snooze → exactly {status, snoozedUntil}, dismiss → exactly
  // {status}; neither emits events, neither clears approvedAt/snoozedUntil.
  async function snooze(
    input: MessageSnooze,
    _ctx: MessagingCtx,
  ): Promise<MessageRow> {
    await loadActionable(input.id, "snooze");
    const [updated] = await repo.commit(
      [
        {
          kind: "updateMessage",
          id: input.id,
          set: { status: "snoozed", snoozedUntil: input.snoozedUntil },
        },
      ],
      [],
    );
    return updated!;
  }

  async function dismiss(id: string, _ctx: MessagingCtx): Promise<MessageRow> {
    await loadActionable(id, "dismiss");
    const [updated] = await repo.commit(
      [{ kind: "updateMessage", id, set: { status: "dismissed" } }],
      [],
    );
    return updated!;
  }

  // Pass-through reads (adr020 collapse rule): the designated home for future
  // role-scoping — do not "optimize away" the service hop. Output envelopes
  // are exactly the pre-split routers' (plain row arrays). The service owns
  // the clock: listPending's snooze-elapsed rule evaluates against an injected
  // now, keeping the repository deterministic.
  function listPending(_ctx: MessagingCtx) {
    return repo.listPending(new Date());
  }

  function listConversations(input: ConversationsList, _ctx: MessagingCtx) {
    return repo.listConversations(input.leadId);
  }

  // ── Worker-facing ports (#328 nurture pipeline) ───────────────────────────

  /** Nurture plan-runner port: insert one pending draft into the queue. The
   * value set is byte-equal to the runner's former inline insert — exactly
   * {leadId, channel, subject, body, aiReasoning, priority, status:"pending"}
   * (defaults cover the rest) — and only the id comes back (the worker's
   * Inngest-memoised step value). Deliberately NO outbox event: the
   * `nurture.followup-message-drafted` emit is the worker's own follow-up
   * step (direct inngest.send, its pre-split delivery path), not a commit
   * rider. */
  async function enqueueDraft(draft: {
    leadId: string;
    channel: "sms" | "email";
    subject: string | null;
    body: string;
    aiReasoning: string | null;
    priority: number;
  }): Promise<{ id: string }> {
    const [inserted] = await repo.commit(
      [
        {
          kind: "insertMessage",
          values: {
            leadId: draft.leadId,
            channel: draft.channel,
            subject: draft.subject,
            body: draft.body,
            aiReasoning: draft.aiReasoning,
            priority: draft.priority,
            status: "pending",
          },
        },
      ],
      [],
    );
    return inserted!;
  }

  // ── Worker-facing ports (#261 dispatch pipeline) ──────────────────────────
  // Consumed by the dispatch-email / dispatch-sms / dispatch-imessage /
  // reconcile-missed-engagement worker adapters. Semantics are byte-equal to
  // the workers' former inline db code; each op commits exactly where the old
  // code wrote.

  /** Re-read + re-entry/cancellation fence: null unless the row is still an
   * approved (or edited_and_approved), unsent message — the worker maps null
   * to an early return exactly as before. */
  async function loadDispatchable(
    messageId: string,
  ): Promise<MessageRow | null> {
    const message = await repo.findMessage(messageId);
    if (
      !message ||
      (message.status !== "approved" &&
        message.status !== "edited_and_approved") ||
      message.sentAt !== null
    ) {
      return null;
    }
    return message;
  }

  /** Stamp the dispatching_at fence immediately before the external send
   * (the dismiss-during-dispatch guard). */
  async function markDispatching(messageId: string): Promise<void> {
    await repo.commit(
      [{ kind: "markDispatching", id: messageId, dispatchingAt: new Date() }],
      [],
    );
  }

  /** Idempotent stamp-only port (the workers' frozen second step): a guarded
   * update — once sentAt is set, a second call is a no-op. */
  async function stampSent({
    messageId,
    sentAt,
  }: {
    messageId: string;
    sentAt: Date;
  }): Promise<void> {
    await repo.commit([{ kind: "stampSent", id: messageId, sentAt }], []);
  }

  /** Shared spine of recordEmailSend/recordSmsSend: check-then-insert the
   * conversation (existence probe BEFORE building writes — no unique index
   * yet), then stamp sentAt, all in ONE commit (one db.batch round-trip). */
  async function recordSend({
    messageId,
    sentAt,
    values,
  }: {
    messageId: string;
    sentAt: Date;
    values: ConversationInsert;
  }): Promise<void> {
    const existing = await repo.findConversationByMessageQueueId(messageId);
    const writes: MessagingWrite[] = [];
    if (existing.length === 0) {
      writes.push({ kind: "insertConversation", values });
    }
    writes.push({ kind: "stampSent", id: messageId, sentAt });
    await repo.commit(writes, []);
  }

  /** Idempotent outbound-email record: check-then-insert the conversation,
   * then stamp sentAt — same write shape and order as the worker's former
   * write-conversation / update-message-status steps, now one batch. */
  function recordEmailSend({
    messageId,
    leadId,
    subject,
    body,
    sentAt,
  }: {
    messageId: string;
    leadId: string;
    subject: string | null;
    body: string;
    sentAt: Date;
  }): Promise<void> {
    return recordSend({
      messageId,
      sentAt,
      values: {
        leadId,
        messageQueueId: messageId,
        channel: "email",
        direction: "outbound",
        deliveryMethod: "email",
        subject,
        body,
        hubspotActivityId: null,
      },
    });
  }

  /** SMS twin of recordEmailSend, carrying the Twilio send result
   * ({sid, status} — the same names the status-callback port uses). */
  function recordSmsSend({
    messageId,
    leadId,
    subject,
    body,
    sid,
    status,
    sentAt,
  }: {
    messageId: string;
    leadId: string;
    subject: string | null;
    body: string;
    sid: string;
    status: string;
    sentAt: Date;
  }): Promise<void> {
    return recordSend({
      messageId,
      sentAt,
      values: {
        leadId,
        messageQueueId: messageId,
        channel: "sms",
        direction: "outbound",
        deliveryMethod: "sms",
        subject,
        body,
        twilioMessageSid: sid,
        deliveryStatus: status,
        hubspotActivityId: null,
      },
    });
  }

  /** Reconciliation probe (reconcile-missed-engagement): the conversation for
   * the message plus the lead's hubspotContactId. `done: true` ⇔ conversation
   * missing or already reconciled — the same discriminated shape (an Inngest
   * memoisation payload) the worker's former inline step body returned. */
  async function loadReconciliationTarget(messageId: string): Promise<
    | { done: true }
    | {
        done: false;
        leadId: string;
        hubspotContactId: string | null;
        createdAt: Date | null;
      }
  > {
    const [conv] = await repo.findConversationForReconciliation(messageId);
    if (!conv || conv.hubspotActivityId) {
      return { done: true as const };
    }
    const lead = await repo.findLeadHubspotContactId(conv.leadId);
    return {
      done: false as const,
      leadId: conv.leadId,
      hubspotContactId: lead?.hubspotContactId ?? null,
      createdAt: conv.createdAt,
    };
  }

  /** Stamp the matched HubSpot engagement id onto the conversation, keyed by
   * messageQueueId (correlationId === messageId, dispatch #261). */
  async function stampEngagement({
    messageId,
    hubspotActivityId,
  }: {
    messageId: string;
    hubspotActivityId: string;
  }): Promise<void> {
    await repo.commit(
      [{ kind: "stampActivity", messageQueueId: messageId, hubspotActivityId }],
      [],
    );
  }

  /** Twilio status-callback port: delivery status by message SID. */
  async function recordDeliveryStatus({
    sid,
    status,
  }: {
    sid: string;
    status: string;
  }): Promise<void> {
    await repo.commit(
      [
        {
          kind: "recordDeliveryStatus",
          twilioMessageSid: sid,
          deliveryStatus: status,
        },
      ],
      [],
    );
  }

  return {
    approve,
    editAndApprove,
    snooze,
    dismiss,
    listPending,
    listConversations,
    enqueueDraft,
    loadDispatchable,
    markDispatching,
    stampSent,
    recordEmailSend,
    recordSmsSend,
    loadReconciliationTarget,
    stampEngagement,
    recordDeliveryStatus,
  };
}

export type MessagingService = ReturnType<typeof makeMessagingService>;
