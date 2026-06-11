import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ActionQueueSection } from "../pages/sections/action-queue.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import {
  cleanupConversationsForLead,
  cleanupLeads,
  cleanupMessages,
  getConversationsForMessage,
  getMessageStatus,
  seedConversation,
  seedLead,
  seedPendingMessage,
} from "../utils/messages-helper";
import { getSessionCookie } from "../utils/session-cookie";

/**
 * Compute a valid Twilio webhook signature.
 * Algorithm: Base64(HMAC-SHA1(authToken, url + sortedParams))
 */
function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  let str = url;
  for (const key of Object.keys(params).sort()) {
    str += key + params[key];
  }
  return createHmac("sha1", authToken).update(str, "utf8").digest("base64");
}

const hasTwilioAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
const hasTwilioCredentials =
  hasTwilioAuthToken &&
  !process.env.TWILIO_AUTH_TOKEN!.startsWith("placeholder");

test.describe("SMS Dispatch — E2E", () => {
  let session: TestSession;
  const leadIds: string[] = [];
  const messageIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    for (const leadId of leadIds) {
      await cleanupConversationsForLead(leadId);
    }
    await cleanupMessages(messageIds);
    await cleanupLeads(leadIds);
    await deleteTestSession(session.userId);
  });

  // ---------------------------------------------------------------------------
  // Status callback route — no real Twilio needed. Signatures are computed
  // locally against the same TWILIO_AUTH_TOKEN the server reads, so they match
  // even with placeholder credentials.
  // ---------------------------------------------------------------------------

  test("status callback: valid signature updates delivery_status and returns 200", async ({
    request,
    baseURL,
  }) => {
    test.skip(
      !hasTwilioAuthToken,
      "Requires TWILIO_AUTH_TOKEN for webhook signature computation — set a placeholder value if needed",
    );

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const lead = await seedLead({
      firstName: "StatusCb",
      lastName: `E2E-${uniqueSuffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Status callback test ${uniqueSuffix}`,
    });
    messageIds.push(msg.id);

    const sid = `SMcbtest${uniqueSuffix.replace(/-/g, "").slice(0, 26)}`;
    await seedConversation({
      leadId: lead.id,
      messageQueueId: msg.id,
      channel: "sms",
      direction: "outbound",
      deliveryMethod: "sms",
      body: `Status callback test ${uniqueSuffix}`,
      twilioMessageSid: sid,
      deliveryStatus: "queued",
    });

    const url = `${baseURL}/api/twilio/status`;
    const params = { MessageSid: sid, MessageStatus: "delivered" };
    const signature = computeTwilioSignature(
      process.env.TWILIO_AUTH_TOKEN!,
      url,
      params,
    );

    const response = await request.post(url, {
      form: params,
      headers: { "x-twilio-signature": signature },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(1);
    expect(convRows[0]?.delivery_status).toBe("delivered");
  });

  test("status callback: tampered signature returns 403, row unchanged", async ({
    request,
    baseURL,
  }) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const lead = await seedLead({
      firstName: "StatusCbBadSig",
      lastName: `E2E-${uniqueSuffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Bad sig test ${uniqueSuffix}`,
    });
    messageIds.push(msg.id);

    const sid = `SMbadsig${uniqueSuffix.replace(/-/g, "").slice(0, 26)}`;
    await seedConversation({
      leadId: lead.id,
      messageQueueId: msg.id,
      channel: "sms",
      direction: "outbound",
      deliveryMethod: "sms",
      body: `Bad sig test ${uniqueSuffix}`,
      twilioMessageSid: sid,
      deliveryStatus: "queued",
    });

    const url = `${baseURL}/api/twilio/status`;
    const response = await request.post(url, {
      form: { MessageSid: sid, MessageStatus: "delivered" },
      headers: { "x-twilio-signature": "tampered-invalid-signature" },
    });

    expect(response.status()).toBe(403);

    // Row unchanged — delivery_status still queued
    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows[0]?.delivery_status).toBe("queued");
  });

  test("status callback: missing X-Twilio-Signature returns 403", async ({
    request,
    baseURL,
  }) => {
    const url = `${baseURL}/api/twilio/status`;
    const response = await request.post(url, {
      form: { MessageSid: "SMtest", MessageStatus: "delivered" },
    });
    expect(response.status()).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // Async contract — works when Twilio credentials are absent/placeholder.
  // Approve commits the status flip + outbox event atomically and returns
  // immediately; the Twilio send happens later in the dispatch-sms Inngest
  // worker. With placeholder credentials the worker can never succeed, so
  // sent_at stays null and no conversations row is ever written.
  // ---------------------------------------------------------------------------

  test("approve with flag ON: dispatch queued async; placeholder creds never stamp sentAt", async ({
    context,
    page,
    baseURL,
  }) => {
    test.skip(
      hasTwilioCredentials,
      "Never-sent assertions only hold when TWILIO_AUTH_TOKEN is a placeholder (worker can't succeed)",
    );

    // Force sms-twilio-dispatch flag ON so the Twilio path runs (not the share sheet).
    await page.route(/\/rk\/(flags|decide)/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          featureFlags: { "sms-twilio-dispatch": true },
        }),
      });
    });

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsFailPath",
      lastName: `E2E-${uniqueSuffix}`,
    });
    leadIds.push(lead.id);

    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body: `Failure path test ${uniqueSuffix}`,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await expect(queue.row(msg.id)).toBeVisible();
    await queue.approveButton(msg.id).click();

    // Approve succeeds immediately — the send is the worker's problem
    await expect(
      page.getByTestId("app-toast").filter({ hasText: "Draft approved" }),
    ).toBeVisible();

    // Row leaves the queue (optimistic removal)
    await expect(queue.row(msg.id)).toBeHidden();

    // DB: status flipped, approved_at stamped, sent_at not — the dispatch-sms
    // worker fails against placeholder credentials and never stamps it
    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("approved");
    expect(dbState?.approved_at).not.toBeNull();
    expect(dbState?.sent_at).toBeNull();

    // No conversations row — the worker never gets past the Twilio send
    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Happy path — requires real Twilio credentials (test numbers/account).
  //
  // Disabled until the Twilio account is fully configured. Re-enable by
  // changing `test.skip` back to `test` once TWILIO_FROM_NUMBER and
  // TWILIO_CONSULTANT_NUMBER are set (in addition to TWILIO_AUTH_TOKEN);
  // without those, the dispatch-sms worker fails with "Twilio phone numbers
  // are not configured." and the sentAt poll below times out.
  // ---------------------------------------------------------------------------

  test.skip("happy path: approve relays SMS, creates conversations row, callback updates status", async ({
    context,
    page,
    request,
    baseURL,
  }) => {
    test.skip(
      !hasTwilioCredentials,
      "Requires real Twilio credentials — set TWILIO_AUTH_TOKEN",
    );

    // Force sms-twilio-dispatch flag ON so the Twilio path runs (not the share sheet).
    await page.route(/\/rk\/(flags|decide)/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          featureFlags: { "sms-twilio-dispatch": true },
        }),
      });
    });

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lead = await seedLead({
      firstName: "SmsHappyPath",
      lastName: `E2E-${uniqueSuffix}`,
    });
    leadIds.push(lead.id);

    const body = `ENG-129 E2E test ${uniqueSuffix}`;
    const msg = await seedPendingMessage({
      leadId: lead.id,
      channel: "sms",
      body,
      priority: 80,
    });
    messageIds.push(msg.id);

    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await expect(queue.row(msg.id)).toBeVisible();
    await queue.approveButton(msg.id).click();

    // Success toast
    await expect(
      page.getByTestId("app-toast").filter({ hasText: "Draft approved" }),
    ).toBeVisible();

    // Row leaves the queue
    await expect(queue.row(msg.id)).toBeHidden();

    // message_queue: status=approved, approved_at set
    const dbState = await getMessageStatus(msg.id);
    expect(dbState?.status).toBe("approved");
    expect(dbState?.approved_at).not.toBeNull();

    // Poll until the dispatch-sms worker completes: it writes the conversation
    // row then stamps sentAt. The outbox sweep runs on a 30s cron so allow 60s.
    await expect
      .poll(
        async () => {
          const status = await getMessageStatus(msg.id);
          return status?.sent_at;
        },
        {
          timeout: 60_000,
          message: "dispatch-sms worker did not stamp sentAt within 60s",
        },
      )
      .not.toBeNull();

    // conversations row created with SID
    const convRows = await getConversationsForMessage(msg.id);
    expect(convRows).toHaveLength(1);
    const conv = convRows[0]!;
    expect(conv.twilio_message_sid).toMatch(/^SM/);
    expect(conv.delivery_status).toBe("queued");
    expect(conv.body).toBe(body);

    // Replay a signed status callback: delivered
    const callbackUrl = `${baseURL}/api/twilio/status`;
    const callbackParams = {
      MessageSid: conv.twilio_message_sid!,
      MessageStatus: "delivered",
    };
    const sig = computeTwilioSignature(
      process.env.TWILIO_AUTH_TOKEN!,
      callbackUrl,
      callbackParams,
    );
    const cbResponse = await request.post(callbackUrl, {
      form: callbackParams,
      headers: { "x-twilio-signature": sig },
    });
    expect(cbResponse.status()).toBe(200);

    // delivery_status updated
    const updatedRows = await getConversationsForMessage(msg.id);
    expect(updatedRows[0]?.delivery_status).toBe("delivered");

    // Tampered callback: 403, row unchanged
    const badCbResponse = await request.post(callbackUrl, {
      form: callbackParams,
      headers: { "x-twilio-signature": `tampered-${sig}` },
    });
    expect(badCbResponse.status()).toBe(403);
    const afterBad = await getConversationsForMessage(msg.id);
    expect(afterBad[0]?.delivery_status).toBe("delivered");
  });
});
