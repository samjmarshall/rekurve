import { describe, expect, rs, test } from "@rstest/core";
import type { MessagingWrite } from "~/server/messaging/messaging.decide";
import { makeMessagingService } from "~/server/messaging/messaging.service";
import { MESSAGE_ID, MESSAGE_LEAD_ID, makeMessage } from "./fixtures";

/**
 * Service-port tests — the file the worker tests' "see messaging.service
 * tests" comments point at. The dispatch workers' former inline re-entry/
 * cancellation fence and the reconcile worker's already-reconciled probe moved
 * into messagingService.loadDispatchable / loadReconciliationTarget (#261
 * domain split); the worker unit tests now stub those ports, so the guard
 * logic itself is pinned HERE against a stubbed repository:
 *
 *   loadDispatchable      missing row | pending | snoozed | dismissed |
 *                         sentAt already set        → null (worker no-ops)
 *                         approved | edited_and_approved, unsent → the row
 *   loadReconciliationTarget
 *                         conversation missing | hubspotActivityId stamped
 *                           → { done: true } (no lead read)
 *                         unstamped → { done: false, leadId, hubspotContactId,
 *                           createdAt } (exact key set — Inngest memoises it)
 *
 * A regression here (e.g. a dropped sentAt check) means a double SMS/email
 * send on Inngest retry, which no worker test can catch any more.
 *
 * Also pinned here, against the plural write door `commit(writes, events)`:
 *   stampSent                 → ONE commit([stampSent], [])
 *   recordEmailSend/recordSmsSend
 *                             → check-then-insert idempotence: existing
 *                               conversation drops the insert write; both
 *                               shapes land in ONE commit (one db.batch)
 *   snooze / dismiss          → the exact write sets the matrix header in
 *                               messaging.decide.test.ts documents
 */

const MSG_ID = MESSAGE_ID;
const LEAD_ID = MESSAGE_LEAD_ID;
const CREATED_AT = new Date("2026-06-01T00:00:00.000Z");
const APPROVED_AT = new Date("2026-06-01T12:00:00.000Z");
const SENT_AT = new Date("2026-06-02T00:00:00.000Z");

/** The shared fixture defaults to a pending draft; these ports mostly want an
 * approved, unsent row. */
function makeApproved(overrides: Parameters<typeof makeMessage>[0] = {}) {
  return makeMessage({
    status: "approved",
    approvedAt: APPROVED_AT,
    ...overrides,
  });
}

/** Stubbed repository: only the reads these ports touch; commit is a spy so
 * an unexpected write fails loudly instead of vanishing. */
function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findMessage: rs.fn().mockResolvedValue(undefined),
    findConversationByMessageQueueId: rs.fn().mockResolvedValue([]),
    findConversationForReconciliation: rs.fn().mockResolvedValue([]),
    findLeadHubspotContactId: rs.fn().mockResolvedValue(undefined),
    commit: rs.fn().mockResolvedValue([undefined]),
    ...overrides,
  };
}

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const repo = makeRepo(repoOverrides);
  const service = makeMessagingService({ repo: repo as never });
  return { service, repo };
}

describe("messagingService.loadDispatchable — re-entry/cancellation fence", () => {
  test("missing row → null", async () => {
    const { service, repo } = makeService();

    await expect(service.loadDispatchable(MSG_ID)).resolves.toBeNull();
    expect(repo.findMessage).toHaveBeenCalledWith(MSG_ID);
  });

  for (const status of ["pending", "snoozed", "dismissed"] as const) {
    test(`${status} row → null (not an approved status)`, async () => {
      const { service } = makeService({
        findMessage: rs
          .fn()
          .mockResolvedValue(makeMessage({ status, approvedAt: null })),
      });

      await expect(service.loadDispatchable(MSG_ID)).resolves.toBeNull();
    });
  }

  for (const status of ["approved", "edited_and_approved"] as const) {
    test(`${status} row with sentAt already set → null (idempotent re-entry)`, async () => {
      const { service } = makeService({
        findMessage: rs
          .fn()
          .mockResolvedValue(makeMessage({ status, sentAt: SENT_AT })),
      });

      await expect(service.loadDispatchable(MSG_ID)).resolves.toBeNull();
    });

    test(`${status} row, unsent → returns the row`, async () => {
      const row = makeMessage({ status });
      const { service } = makeService({
        findMessage: rs.fn().mockResolvedValue(row),
      });

      await expect(service.loadDispatchable(MSG_ID)).resolves.toBe(row);
    });
  }

  test("never writes — pure read fence", async () => {
    const { service, repo } = makeService({
      findMessage: rs.fn().mockResolvedValue(makeApproved()),
    });

    await service.loadDispatchable(MSG_ID);

    expect(repo.commit).not.toHaveBeenCalled();
  });
});

describe("messagingService.loadReconciliationTarget — reconciliation probe", () => {
  test("missing conversation → { done: true }, no lead read", async () => {
    const { service, repo } = makeService();

    await expect(service.loadReconciliationTarget(MSG_ID)).resolves.toEqual({
      done: true,
    });
    expect(repo.findConversationForReconciliation).toHaveBeenCalledWith(MSG_ID);
    expect(repo.findLeadHubspotContactId).not.toHaveBeenCalled();
  });

  test("hubspotActivityId already stamped → { done: true }, no lead read", async () => {
    const { service, repo } = makeService({
      findConversationForReconciliation: rs.fn().mockResolvedValue([
        {
          leadId: LEAD_ID,
          hubspotActivityId: "hs-eng-1",
          createdAt: CREATED_AT,
        },
      ]),
    });

    await expect(service.loadReconciliationTarget(MSG_ID)).resolves.toEqual({
      done: true,
    });
    expect(repo.findLeadHubspotContactId).not.toHaveBeenCalled();
  });

  test("unstamped conversation → { done: false } with exactly {leadId, hubspotContactId, createdAt}", async () => {
    const { service, repo } = makeService({
      findConversationForReconciliation: rs
        .fn()
        .mockResolvedValue([
          { leadId: LEAD_ID, hubspotActivityId: null, createdAt: CREATED_AT },
        ]),
      findLeadHubspotContactId: rs
        .fn()
        .mockResolvedValue({ hubspotContactId: "hs-contact-1" }),
    });

    const result = await service.loadReconciliationTarget(MSG_ID);

    expect(result).toEqual({
      done: false,
      leadId: LEAD_ID,
      hubspotContactId: "hs-contact-1",
      createdAt: CREATED_AT,
    });
    // Exact key set — this object is an Inngest step memoisation payload.
    expect(Object.keys(result).sort()).toEqual([
      "createdAt",
      "done",
      "hubspotContactId",
      "leadId",
    ]);
    expect(repo.findLeadHubspotContactId).toHaveBeenCalledWith(LEAD_ID);
  });

  test("unstamped conversation, lead row missing → hubspotContactId null (worker logs + skips)", async () => {
    const { service } = makeService({
      findConversationForReconciliation: rs
        .fn()
        .mockResolvedValue([
          { leadId: LEAD_ID, hubspotActivityId: null, createdAt: CREATED_AT },
        ]),
    });

    await expect(service.loadReconciliationTarget(MSG_ID)).resolves.toEqual({
      done: false,
      leadId: LEAD_ID,
      hubspotContactId: null,
      createdAt: CREATED_AT,
    });
  });
});

describe("messagingService.enqueueDraft — nurture draft port", () => {
  // Write-shape pin: the exact insert column set of the nurture plan-runner's
  // former inline message_queue insert — {leadId, channel, subject, body,
  // aiReasoning, priority, status:"pending"}, defaults covering the rest.
  // toEqual (not objectContaining) so a stray extra key or a dropped column
  // fails the test. NO outbox event: nurture.followup-message-drafted is the
  // worker's own emit step (direct inngest send), never a commit rider.
  const draft = {
    leadId: LEAD_ID,
    channel: "sms" as const,
    subject: null,
    body: "Hi Jane, checking in on your build plans.",
    aiReasoning: "[stub] warm lead, sms preferred",
    priority: 50,
  };

  test("commits exactly ONE insertMessage with the pinned column set, no events", async () => {
    const { service, repo } = makeService({
      commit: rs.fn().mockResolvedValue([{ id: MSG_ID }]),
    });

    await service.enqueueDraft(draft);

    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [
        {
          kind: "insertMessage",
          values: {
            leadId: LEAD_ID,
            channel: "sms",
            subject: null,
            body: "Hi Jane, checking in on your build plans.",
            aiReasoning: "[stub] warm lead, sms preferred",
            priority: 50,
            status: "pending",
          },
        },
      ],
      [],
    );
  });

  test("returns the inserted id (the worker's Inngest-memoised step value)", async () => {
    const { service } = makeService({
      commit: rs.fn().mockResolvedValue([{ id: MSG_ID }]),
    });

    const inserted = await service.enqueueDraft(draft);

    expect(inserted).toEqual({ id: MSG_ID });
  });
});

describe("messagingService.stampSent — idempotent stamp-only port", () => {
  // Idempotence itself lives in the repository's `sentAt IS NULL` guard on the
  // stampSent statement; the service's contract is the wire shape: exactly one
  // guarded stampSent write, no events, per call.
  test("commits exactly [stampSent], no events", async () => {
    const { service, repo } = makeService();

    await service.stampSent({ messageId: MSG_ID, sentAt: SENT_AT });

    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [{ kind: "stampSent", id: MSG_ID, sentAt: SENT_AT }],
      [],
    );
  });
});

describe("messagingService.recordEmailSend / recordSmsSend — check-then-insert idempotence", () => {
  // The check half (findConversationByMessageQueueId) runs BEFORE the writes
  // are built (no unique index on messageQueueId yet); both writes land in ONE
  // commit — one db.batch round-trip. The writes arrays are pinned with
  // toEqual, so a stray extra write or payload key fails the test.
  const emailArgs = {
    messageId: MSG_ID,
    leadId: LEAD_ID,
    subject: "Following up",
    body: "Hi Jane",
    sentAt: SENT_AT,
  };
  const smsArgs = {
    messageId: MSG_ID,
    leadId: LEAD_ID,
    subject: null,
    body: "Hi Jane",
    sid: "SMabc",
    status: "queued",
    sentAt: SENT_AT,
  };

  test("email, no existing conversation → ONE commit([insertConversation, stampSent], [])", async () => {
    const { service, repo } = makeService();

    await service.recordEmailSend(emailArgs);

    expect(repo.findConversationByMessageQueueId).toHaveBeenCalledWith(MSG_ID);
    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [
        {
          kind: "insertConversation",
          values: {
            leadId: LEAD_ID,
            messageQueueId: MSG_ID,
            channel: "email",
            direction: "outbound",
            deliveryMethod: "email",
            subject: "Following up",
            body: "Hi Jane",
            hubspotActivityId: null,
          },
        },
        { kind: "stampSent", id: MSG_ID, sentAt: SENT_AT },
      ],
      [],
    );
  });

  test("email, existing conversation → ONE commit([stampSent], []) — NO insert write", async () => {
    const { service, repo } = makeService({
      findConversationByMessageQueueId: rs
        .fn()
        .mockResolvedValue([{ id: "conv-1" }]),
    });

    await service.recordEmailSend(emailArgs);

    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [{ kind: "stampSent", id: MSG_ID, sentAt: SENT_AT }],
      [],
    );
    const writes = repo.commit.mock.calls[0]![0] as MessagingWrite[];
    expect(writes.map((w) => w.kind)).toEqual(["stampSent"]);
  });

  test("sms, no existing conversation → insert carries {twilioMessageSid, deliveryStatus} + stampSent, one batch", async () => {
    const { service, repo } = makeService();

    await service.recordSmsSend(smsArgs);

    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [
        {
          kind: "insertConversation",
          values: {
            leadId: LEAD_ID,
            messageQueueId: MSG_ID,
            channel: "sms",
            direction: "outbound",
            deliveryMethod: "sms",
            subject: null,
            body: "Hi Jane",
            twilioMessageSid: "SMabc",
            deliveryStatus: "queued",
            hubspotActivityId: null,
          },
        },
        { kind: "stampSent", id: MSG_ID, sentAt: SENT_AT },
      ],
      [],
    );
  });

  test("sms, existing conversation → ONE commit([stampSent], []) — NO insert write", async () => {
    const { service, repo } = makeService({
      findConversationByMessageQueueId: rs
        .fn()
        .mockResolvedValue([{ id: "conv-1" }]),
    });

    await service.recordSmsSend(smsArgs);

    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [{ kind: "stampSent", id: MSG_ID, sentAt: SENT_AT }],
      [],
    );
  });
});

describe("messagingService.snooze / dismiss — pinned write sets (pre-split router, git show d0af33a:src/server/api/routers/messages.ts:292/:304)", () => {
  // The write sets the matrix header in messaging.decide.test.ts documents:
  // snooze → exactly {status:"snoozed", snoozedUntil:input.snoozedUntil},
  // dismiss → exactly {status:"dismissed"}; neither emits an outbox event;
  // dismiss does NOT clear snoozedUntil or approvedAt (toEqual pins the exact
  // key sets — a leaked snoozedUntil:null in the dismiss set fails here).
  const SNOOZED_UNTIL = new Date("2026-08-01T00:00:00.000Z");
  const CTX = { userId: "test-user-id" };

  test("snooze commits exactly [{updateMessage, set:{status, snoozedUntil}}], no events, and returns the fresh row", async () => {
    const row = makeMessage();
    const updated = { ...row, status: "snoozed", snoozedUntil: SNOOZED_UNTIL };
    const { service, repo } = makeService({
      findMessage: rs.fn().mockResolvedValue(row),
      commit: rs.fn().mockResolvedValue([updated]),
    });

    const result = await service.snooze(
      { id: MSG_ID, snoozedUntil: SNOOZED_UNTIL },
      CTX,
    );

    expect(result).toBe(updated);
    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [
        {
          kind: "updateMessage",
          id: MSG_ID,
          set: { status: "snoozed", snoozedUntil: SNOOZED_UNTIL },
        },
      ],
      [],
    );
  });

  test("dismiss commits exactly [{updateMessage, set:{status}}] — snoozedUntil/approvedAt untouched, no events", async () => {
    const row = makeMessage({
      status: "snoozed",
      snoozedUntil: SNOOZED_UNTIL,
    });
    const updated = { ...row, status: "dismissed" };
    const { service, repo } = makeService({
      findMessage: rs.fn().mockResolvedValue(row),
      commit: rs.fn().mockResolvedValue([updated]),
    });

    const result = await service.dismiss(MSG_ID, CTX);

    expect(result).toBe(updated);
    expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(repo.commit).toHaveBeenCalledWith(
      [{ kind: "updateMessage", id: MSG_ID, set: { status: "dismissed" } }],
      [],
    );
  });

  for (const status of [
    "approved",
    "edited_and_approved",
    "dismissed",
  ] as const) {
    test(`terminal guard: snooze/dismiss on ${status} → MessageNotActionableError, NO commit`, async () => {
      const { service, repo } = makeService({
        findMessage: rs.fn().mockResolvedValue(makeMessage({ status })),
      });

      await expect(
        service.snooze({ id: MSG_ID, snoozedUntil: SNOOZED_UNTIL }, CTX),
      ).rejects.toThrow(`Cannot snooze message in ${status} state`);
      await expect(service.dismiss(MSG_ID, CTX)).rejects.toThrow(
        `Cannot dismiss message in ${status} state`,
      );
      expect(repo.commit).not.toHaveBeenCalled();
    });
  }
});
