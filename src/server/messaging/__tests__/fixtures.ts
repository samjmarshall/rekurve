import type { MessageRow } from "~/server/messaging/messaging.schema";

/** Default fixture identity — the fixture row's id/leadId; assert against
 * these (or override them) rather than re-declaring the literals per file. */
export const MESSAGE_ID = "cccccccc-0000-0000-0000-000000000003";
export const MESSAGE_LEAD_ID = "aaaaaaaa-0000-0000-0000-000000000001";

/**
 * Shared base messageQueue fixture, owned by the messaging domain (pattern:
 * the leads reference domain, src/server/leads/__tests__/fixtures.ts).
 * Defaults are a pending, unsent, never-snoozed sms draft — override any
 * fields per test. The one place that lists every messageQueue column: a new
 * column is added HERE once, not per test file.
 */
export function makeMessage(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: MESSAGE_ID,
    leadId: MESSAGE_LEAD_ID,
    channel: "sms",
    subject: null,
    body: "Hi Jane, following up on your enquiry.",
    aiReasoning: null,
    priority: 0,
    status: "pending",
    snoozedUntil: null,
    originalBody: null,
    approvedAt: null,
    sentAt: null,
    dispatchingAt: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
  };
}
