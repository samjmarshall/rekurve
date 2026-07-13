import { describe, expect, test } from "@rstest/core";

import { makeLead } from "~/server/leads/__tests__/fixtures";
import { LeadNotFoundError } from "~/server/leads/leads.errors";
import type { MessagingWrite } from "~/server/messaging/messaging.decide";
import {
  assertActionable,
  decideApprove,
  decideEditAndApprove,
} from "~/server/messaging/messaging.decide";
import {
  EmailPreconditionError,
  MessageNotActionableError,
} from "~/server/messaging/messaging.errors";
import { MESSAGE_ID, MESSAGE_LEAD_ID, makeMessage } from "./fixtures";

/**
 * THE DISPATCH MATRIX — executable spec for messages.approve / editAndApprove.
 *
 * Derived from the pre-split router (git show
 * d0af33a:src/server/api/routers/messages.ts:141-290), written before that
 * router was deleted (plan §PR 3: "exhaustive matrix test lands BEFORE router
 * thinning"). The decide fns (adr020 hybrid write-path clause: message
 * approve/dispatch earns a decide() seam) satisfy every cell unchanged.
 *
 * ── Decision dimensions ────────────────────────────────────────────────────
 *   action       approve | editAndApprove
 *   channel      email | sms | imessage      (message_queue.channel enum)
 *   skipDispatch true | false/undefined      (input flag; native-share path)
 *   status       pending | snoozed | approved | edited_and_approved | dismissed
 *   lead         present | missing; hubspotContactId ∅ | email ∅ (email path)
 *   msGraph      token present | absent      (email path)
 *   edit body    changed | identical; originalBody null | pre-set
 *
 * ── The matrix (observable outcome per cell, from the pre-split router) ────
 *
 * Guards, in the pre-split router's byte-order (short-circuit, first hit wins):
 *   G1 status ∉ {pending, snoozed}  → BAD_REQUEST "Cannot <approve|edit> message
 *      in <status> state" (action word for editAndApprove is "edit").
 *      snoozedUntil is NEVER consulted — a snoozed row with a future
 *      snoozedUntil is still actionable; approve does NOT clear snoozedUntil.
 *   G2 lead row missing            → NOT_FOUND "Lead not found" — fires even on
 *      the skipDispatch path (lead loaded before any branch).
 *   G3 email channel only, in order (checkEmailPreconditions), all
 *      PRECONDITION_FAILED, row left at its current status (no write):
 *        a. !lead.hubspotContactId → "This lead isn't synced with HubSpot yet.
 *           Contact support."
 *        b. !lead.email            → "This lead has no email address."
 *        c. no msGraphTokens row   → "Connect your Microsoft account to send
 *           emails."
 *      sms/imessage NEVER run preconditions.
 *
 * Happy-path cells (write set keys are EXACT; nothing else is written — in
 * particular snoozedUntil, dispatchingAt, subject, priority are never touched):
 *
 *  action          channel   skip  write.set                                    events
 *  approve         email     any*  {status:"approved", approvedAt:now}          1× approval-requested channel:"email" body:message.body
 *  approve         sms       no    {status:"approved", approvedAt:now}          1× approval-requested channel:"sms"   body:message.body
 *  approve         sms       yes   {status:"approved", approvedAt:now,          none
 *                                    sentAt:now}
 *  approve         imessage  no    (falls into the sms else-branch)             1× approval-requested channel:"sms" ← hardcoded, NOT "imessage"
 *  approve         imessage  yes   same as sms/yes                              none
 *  editAndApprove  email     any*  {status:"edited_and_approved",               1× approval-requested channel:"email" body:input.body (NEW body)
 *                                    body:input.body,
 *                                    originalBody: existing.originalBody
 *                                      ?? existing.body,
 *                                    approvedAt:now}
 *  editAndApprove  sms       no    same set as email cell                       1× approval-requested channel:"sms" body:input.body
 *  editAndApprove  sms       yes   same set + sentAt:now                        none
 *  editAndApprove  imessage  —     falls into sms else-branch (as approve)
 *
 *  (*) skipDispatch is IGNORED on the email channel — the email block returns
 *      before the flag is read: event still emitted, sentAt NOT stamped.
 *
 * Event payload key-set (message.approval-requested, EVENT_REGISTRY-strict):
 *   exactly {messageId, correlationId, channel, body, leadId};
 *   messageId === correlationId === message.id; leadId === lead.id.
 *
 * Quirks pinned deliberately:
 *   - imessage → channel:"sms" in the event (dispatch-sms would fire, not
 *     dispatch-imessage — that trigger is unreachable today: no producer emits
 *     channel:"imessage"; ai channel-selection returns only sms|email, and the
 *     zod API channelSchema omits imessage entirely).
 *   - editAndApprove does NO body-equality check: an edit with an identical
 *     body still lands status:"edited_and_approved" + originalBody stamp +
 *     dispatch event.
 *   - originalBody is first-edit-wins: existing.originalBody ?? existing.body
 *     (terminal statuses make a second edit unreachable via the router, but
 *     the ?? is the pinned semantic).
 *
 * ── decide API decisions (the spec this file imposes) ──────────────────────
 *   - decide owns G1→G2→G3 in that order; it throws domain errors that the
 *     router maps: MessageNotActionableError → BAD_REQUEST,
 *     LeadNotFoundError (reused from the leads domain) → NOT_FOUND,
 *     EmailPreconditionError → PRECONDITION_FAILED (err.message verbatim —
 *     the strings are user-facing).
 *   - The msGraphTokens lookup is I/O, so the service injects its result as
 *     ctx.hasMsGraphToken; decide stays pure.
 *   - The pre-split router called new Date() per field (approvedAt/sentAt could differ
 *     by ms); decide takes one injected `now` for both — behavior-equivalent.
 *   - write is the messaging repository's discriminated union; approve/edit
 *     both produce the { kind: "updateMessage", id, set } variant.
 *   - snooze/dismiss stay imperative (adr020: decide only where earned), but
 *     share the G1 guard via the exported assertActionable(message, action).
 *     Their writes are pinned here as documentation and asserted in
 *     messaging.service.test.ts ("pinned write sets"): snooze → set
 *     {status:"snoozed", snoozedUntil:input.snoozedUntil}, dismiss → set
 *     {status:"dismissed"}; neither emits events; neither clears approvedAt
 *     or (for dismiss) snoozedUntil; row-missing NOT_FOUND ("Message not
 *     found") stays a service concern.
 */

const LEAD_ID = MESSAGE_LEAD_ID;
const NOW = new Date("2026-07-01T00:00:00.000Z");

const CTX = { hasMsGraphToken: true };
const CTX_NO_TOKEN = { hasMsGraphToken: false };

/** Lead that passes every email precondition. */
const dispatchableLead = makeLead({
  id: LEAD_ID,
  hubspotContactId: "hs-contact-1",
  email: "jane@example.com",
});

/** Lead with no HubSpot id, no email — fails every email precondition. */
const bareLead = makeLead({ id: LEAD_ID });

/** Narrow a MessagingWrite to one variant, failing loudly on a kind mismatch. */
function expectKind<K extends MessagingWrite["kind"]>(
  write: MessagingWrite,
  kind: K,
): Extract<MessagingWrite, { kind: K }> {
  expect(write.kind).toBe(kind);
  return write as Extract<MessagingWrite, { kind: K }>;
}

/** Pin the approval-requested wire contract: name, exact key set, identity. */
function expectApprovalEvent(
  events: { name: string; data: Record<string, unknown> }[],
  expected: { channel: "email" | "sms"; body: string },
) {
  expect(events).toHaveLength(1);
  const evt = events[0]!;
  expect(evt.name).toBe("message.approval-requested");
  expect(Object.keys(evt.data).sort()).toEqual([
    "body",
    "channel",
    "correlationId",
    "leadId",
    "messageId",
  ]);
  expect(evt.data).toEqual({
    messageId: MESSAGE_ID,
    correlationId: MESSAGE_ID, // correlationId === messageId (dispatch #261)
    channel: expected.channel,
    body: expected.body,
    leadId: LEAD_ID,
  });
}

const TERMINAL_STATUSES = [
  "approved",
  "edited_and_approved",
  "dismissed",
] as const;

describe("decideApprove — email channel", () => {
  const message = makeMessage({ channel: "email" });

  test("pending → approved write with exactly {status, approvedAt}; nothing else touched", () => {
    const { write } = decideApprove(message, {}, dispatchableLead, CTX, NOW);

    const { id, set } = expectKind(write, "updateMessage");
    expect(id).toBe(MESSAGE_ID);
    expect(Object.keys(set).sort()).toEqual(["approvedAt", "status"]);
    expect(set.status).toBe("approved");
    expect(set.approvedAt).toEqual(NOW);
  });

  test("emits one approval-requested with channel email and the UNEDITED body", () => {
    const { events } = decideApprove(message, {}, dispatchableLead, CTX, NOW);

    expectApprovalEvent(events, { channel: "email", body: message.body });
  });

  test("skipDispatch is IGNORED on email — event still emitted, sentAt NOT stamped", () => {
    const { write, events } = decideApprove(
      message,
      { skipDispatch: true },
      dispatchableLead,
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "updateMessage");
    expect(Object.keys(set).sort()).toEqual(["approvedAt", "status"]);
    expectApprovalEvent(events, { channel: "email", body: message.body });
  });

  test("snoozed row with FUTURE snoozedUntil is still approvable; snoozedUntil NOT cleared", () => {
    const snoozed = makeMessage({
      channel: "email",
      status: "snoozed",
      snoozedUntil: new Date("2026-08-01T00:00:00.000Z"),
    });

    const { write, events } = decideApprove(
      snoozed,
      {},
      dispatchableLead,
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "updateMessage");
    // snoozedUntil absent from the set — the stale stamp survives on the row.
    expect(Object.keys(set).sort()).toEqual(["approvedAt", "status"]);
    expect(set.status).toBe("approved");
    expectApprovalEvent(events, { channel: "email", body: snoozed.body });
  });

  test("precondition a: missing hubspotContactId → EmailPreconditionError, no write", () => {
    const lead = makeLead({
      id: LEAD_ID,
      hubspotContactId: null,
      email: "jane@example.com",
    });

    const run = () => decideApprove(message, {}, lead, CTX, NOW);
    expect(run).toThrow(EmailPreconditionError);
    expect(run).toThrow(
      "This lead isn't synced with HubSpot yet. Contact support.",
    );
  });

  test("precondition b: missing lead email → EmailPreconditionError", () => {
    const lead = makeLead({
      id: LEAD_ID,
      hubspotContactId: "hs-contact-1",
      email: null,
    });

    const run = () => decideApprove(message, {}, lead, CTX, NOW);
    expect(run).toThrow(EmailPreconditionError);
    expect(run).toThrow("This lead has no email address.");
  });

  test("precondition c: no Microsoft Graph token → EmailPreconditionError", () => {
    const run = () =>
      decideApprove(message, {}, dispatchableLead, CTX_NO_TOKEN, NOW);
    expect(run).toThrow(EmailPreconditionError);
    expect(run).toThrow("Connect your Microsoft account to send emails.");
  });

  test("precondition ORDER: hubspotContactId is checked before email", () => {
    // bareLead fails both a and b — a's message must win.
    const run = () => decideApprove(message, {}, bareLead, CTX_NO_TOKEN, NOW);
    expect(run).toThrow(
      "This lead isn't synced with HubSpot yet. Contact support.",
    );
  });
});

describe("decideApprove — sms channel", () => {
  const message = makeMessage({ channel: "sms" });

  test("dispatch path (skipDispatch absent) → approved write + sms event with unedited body", () => {
    const { write, events } = decideApprove(
      message,
      {},
      dispatchableLead,
      CTX,
      NOW,
    );

    const { id, set } = expectKind(write, "updateMessage");
    expect(id).toBe(MESSAGE_ID);
    expect(Object.keys(set).sort()).toEqual(["approvedAt", "status"]);
    expect(set.status).toBe("approved");
    expect(set.approvedAt).toEqual(NOW);
    expectApprovalEvent(events, { channel: "sms", body: message.body });
  });

  test("skipDispatch: false behaves as the dispatch path", () => {
    const { events } = decideApprove(
      message,
      { skipDispatch: false },
      dispatchableLead,
      CTX,
      NOW,
    );

    expectApprovalEvent(events, { channel: "sms", body: message.body });
  });

  test("skipDispatch (native-share) → sentAt stamped inline, NO outbox event", () => {
    const { write, events } = decideApprove(
      message,
      { skipDispatch: true },
      dispatchableLead,
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "updateMessage");
    expect(Object.keys(set).sort()).toEqual(["approvedAt", "sentAt", "status"]);
    expect(set.status).toBe("approved");
    expect(set.approvedAt).toEqual(NOW);
    expect(set.sentAt).toEqual(NOW);
    expect(events).toEqual([]);
  });

  test("email preconditions are NOT applied to sms — bare lead + no token still approves", () => {
    const { write, events } = decideApprove(
      message,
      {},
      bareLead,
      CTX_NO_TOKEN,
      NOW,
    );

    expect(expectKind(write, "updateMessage").set.status).toBe("approved");
    expect(events).toHaveLength(1);
  });
});

describe("decideApprove — imessage channel (else-branch fallthrough quirk)", () => {
  // No producer emits channel:"imessage" today (ai channel-selection returns
  // only sms|email) — but the enum admits it, and the router's else-branch
  // would label the event channel:"sms". Pinned so a refactor can't silently
  // route these rows to dispatch-imessage (whose trigger is unreachable,
  // retries:0, pending adr001).
  const message = makeMessage({ channel: "imessage" });

  test("dispatch path emits channel 'sms', NOT 'imessage'", () => {
    const { events } = decideApprove(message, {}, dispatchableLead, CTX, NOW);

    expectApprovalEvent(events, { channel: "sms", body: message.body });
  });

  test("skipDispatch stamps sentAt with no event, same as sms", () => {
    const { write, events } = decideApprove(
      message,
      { skipDispatch: true },
      dispatchableLead,
      CTX,
      NOW,
    );

    expect(Object.keys(expectKind(write, "updateMessage").set).sort()).toEqual([
      "approvedAt",
      "sentAt",
      "status",
    ]);
    expect(events).toEqual([]);
  });
});

describe("decideApprove — guards", () => {
  for (const status of TERMINAL_STATUSES) {
    test(`status guard: ${status} → MessageNotActionableError ("Cannot approve message in ${status} state")`, () => {
      const message = makeMessage({ status });

      const run = () => decideApprove(message, {}, dispatchableLead, CTX, NOW);
      expect(run).toThrow(MessageNotActionableError);
      expect(run).toThrow(`Cannot approve message in ${status} state`);
    });
  }

  test("pending row with a future snoozedUntil is actionable (snoozedUntil never consulted)", () => {
    const message = makeMessage({
      channel: "sms",
      snoozedUntil: new Date("2026-08-01T00:00:00.000Z"),
    });

    const { write } = decideApprove(message, {}, dispatchableLead, CTX, NOW);
    expect(expectKind(write, "updateMessage").set.status).toBe("approved");
  });

  test("missing lead → LeadNotFoundError, even on the skipDispatch path", () => {
    const message = makeMessage({ channel: "sms" });

    expect(() =>
      decideApprove(message, { skipDispatch: true }, undefined, CTX, NOW),
    ).toThrow(LeadNotFoundError);
  });

  test("guard order: terminal status wins over missing lead", () => {
    const message = makeMessage({ status: "dismissed" });

    expect(() => decideApprove(message, {}, undefined, CTX, NOW)).toThrow(
      MessageNotActionableError,
    );
  });
});

describe("decideEditAndApprove — email channel", () => {
  const message = makeMessage({ channel: "email" });
  const EDITED = "Edited follow-up body.";

  test("pending → edited_and_approved write with exactly {status, body, originalBody, approvedAt}", () => {
    const { write } = decideEditAndApprove(
      message,
      { body: EDITED },
      dispatchableLead,
      CTX,
      NOW,
    );

    const { id, set } = expectKind(write, "updateMessage");
    expect(id).toBe(MESSAGE_ID);
    expect(Object.keys(set).sort()).toEqual([
      "approvedAt",
      "body",
      "originalBody",
      "status",
    ]);
    expect(set.status).toBe("edited_and_approved");
    expect(set.body).toBe(EDITED);
    // First edit: original preserved from the pre-edit row body.
    expect(set.originalBody).toBe(message.body);
    expect(set.approvedAt).toEqual(NOW);
  });

  test("emits one approval-requested carrying the NEW body", () => {
    const { events } = decideEditAndApprove(
      message,
      { body: EDITED },
      dispatchableLead,
      CTX,
      NOW,
    );

    expectApprovalEvent(events, { channel: "email", body: EDITED });
  });

  test("originalBody is first-edit-wins: a pre-set originalBody is preserved", () => {
    const prior = makeMessage({
      channel: "email",
      originalBody: "The very first draft.",
    });

    const { write } = decideEditAndApprove(
      prior,
      { body: EDITED },
      dispatchableLead,
      CTX,
      NOW,
    );

    expect(expectKind(write, "updateMessage").set.originalBody).toBe(
      "The very first draft.",
    );
  });

  test("NO body-equality shortcut: identical body still edits, stamps originalBody, and dispatches", () => {
    const { write, events } = decideEditAndApprove(
      message,
      { body: message.body },
      dispatchableLead,
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "updateMessage");
    expect(set.status).toBe("edited_and_approved");
    expect(set.originalBody).toBe(message.body);
    expectApprovalEvent(events, { channel: "email", body: message.body });
  });

  test("skipDispatch is IGNORED on email — event still emitted, sentAt NOT stamped", () => {
    const { write, events } = decideEditAndApprove(
      message,
      { body: EDITED, skipDispatch: true },
      dispatchableLead,
      CTX,
      NOW,
    );

    expect(Object.keys(expectKind(write, "updateMessage").set).sort()).toEqual([
      "approvedAt",
      "body",
      "originalBody",
      "status",
    ]);
    expectApprovalEvent(events, { channel: "email", body: EDITED });
  });

  test("email preconditions apply, in the same a→b→c order as approve", () => {
    const runBare = () =>
      decideEditAndApprove(message, { body: EDITED }, bareLead, CTX, NOW);
    expect(runBare).toThrow(EmailPreconditionError);
    expect(runBare).toThrow(
      "This lead isn't synced with HubSpot yet. Contact support.",
    );

    const noEmailLead = makeLead({
      id: LEAD_ID,
      hubspotContactId: "hs-contact-1",
      email: null,
    });
    expect(() =>
      decideEditAndApprove(message, { body: EDITED }, noEmailLead, CTX, NOW),
    ).toThrow("This lead has no email address.");

    expect(() =>
      decideEditAndApprove(
        message,
        { body: EDITED },
        dispatchableLead,
        CTX_NO_TOKEN,
        NOW,
      ),
    ).toThrow("Connect your Microsoft account to send emails.");
  });
});

describe("decideEditAndApprove — sms channel", () => {
  const message = makeMessage({ channel: "sms" });
  const EDITED = "Edited sms body.";

  test("dispatch path → edited write + sms event with the NEW body", () => {
    const { write, events } = decideEditAndApprove(
      message,
      { body: EDITED },
      dispatchableLead,
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "updateMessage");
    expect(Object.keys(set).sort()).toEqual([
      "approvedAt",
      "body",
      "originalBody",
      "status",
    ]);
    expect(set.status).toBe("edited_and_approved");
    expect(set.body).toBe(EDITED);
    expect(set.originalBody).toBe(message.body);
    expectApprovalEvent(events, { channel: "sms", body: EDITED });
  });

  test("skipDispatch → sentAt stamped inline, NO outbox event, edit fields intact", () => {
    const { write, events } = decideEditAndApprove(
      message,
      { body: EDITED, skipDispatch: true },
      dispatchableLead,
      CTX,
      NOW,
    );

    const { set } = expectKind(write, "updateMessage");
    expect(Object.keys(set).sort()).toEqual([
      "approvedAt",
      "body",
      "originalBody",
      "sentAt",
      "status",
    ]);
    expect(set.body).toBe(EDITED);
    expect(set.sentAt).toEqual(NOW);
    expect(events).toEqual([]);
  });

  test("email preconditions NOT applied — bare lead + no token still edits and dispatches", () => {
    const { events } = decideEditAndApprove(
      message,
      { body: EDITED },
      bareLead,
      CTX_NO_TOKEN,
      NOW,
    );

    expectApprovalEvent(events, { channel: "sms", body: EDITED });
  });
});

describe("decideEditAndApprove — imessage fallthrough + guards", () => {
  test("imessage dispatch emits channel 'sms' (same else-branch quirk as approve)", () => {
    const message = makeMessage({ channel: "imessage" });

    const { events } = decideEditAndApprove(
      message,
      { body: "Edited." },
      dispatchableLead,
      CTX,
      NOW,
    );

    expectApprovalEvent(events, { channel: "sms", body: "Edited." });
  });

  for (const status of TERMINAL_STATUSES) {
    test(`status guard uses the action word "edit": ${status} → "Cannot edit message in ${status} state"`, () => {
      const message = makeMessage({ status });

      const run = () =>
        decideEditAndApprove(
          message,
          { body: "Edited." },
          dispatchableLead,
          CTX,
          NOW,
        );
      expect(run).toThrow(MessageNotActionableError);
      expect(run).toThrow(`Cannot edit message in ${status} state`);
    });
  }

  test("snoozed row is editable", () => {
    const message = makeMessage({
      status: "snoozed",
      snoozedUntil: new Date("2026-08-01T00:00:00.000Z"),
    });

    const { write } = decideEditAndApprove(
      message,
      { body: "Edited." },
      dispatchableLead,
      CTX,
      NOW,
    );
    expect(expectKind(write, "updateMessage").set.status).toBe(
      "edited_and_approved",
    );
  });

  test("missing lead → LeadNotFoundError", () => {
    const message = makeMessage({ channel: "sms" });

    expect(() =>
      decideEditAndApprove(message, { body: "Edited." }, undefined, CTX, NOW),
    ).toThrow(LeadNotFoundError);
  });
});

describe("assertActionable — the shared snooze/dismiss guard (pre-split router, git show d0af33a:src/server/api/routers/messages.ts:292/:304)", () => {
  // snooze/dismiss stay imperative in the service (adr020: decide only where
  // earned) but share this guard. Their writes are pinned in the header
  // comment and asserted in messaging.service.test.ts ("pinned write sets"):
  // snooze sets exactly {status:"snoozed", snoozedUntil}, dismiss sets exactly
  // {status:"dismissed"}; neither emits an outbox event; dismiss does NOT
  // clear snoozedUntil or approvedAt.
  const ACTIONS = ["approve", "edit", "snooze", "dismiss"] as const;

  for (const action of ACTIONS) {
    test(`${action}: pending and snoozed rows pass; snoozedUntil never consulted`, () => {
      expect(() => assertActionable(makeMessage(), action)).not.toThrow();
      expect(() =>
        assertActionable(
          makeMessage({
            status: "snoozed",
            snoozedUntil: new Date("2026-08-01T00:00:00.000Z"),
          }),
          action,
        ),
      ).not.toThrow();
    });
  }

  for (const action of ["snooze", "dismiss"] as const) {
    for (const status of TERMINAL_STATUSES) {
      test(`${action} on ${status} → "Cannot ${action} message in ${status} state"`, () => {
        const run = () => assertActionable(makeMessage({ status }), action);
        expect(run).toThrow(MessageNotActionableError);
        expect(run).toThrow(`Cannot ${action} message in ${status} state`);
      });
    }
  }
});
