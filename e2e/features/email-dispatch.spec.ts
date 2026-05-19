import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ActionQueueSection } from "../pages/sections/action-queue.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import {
  cleanupLeads,
  cleanupMessages,
  getConversationsForLead,
  getMessageStatus,
  seedEmailQueueItem,
  seedMsGraphTokens,
} from "../utils/messages-helper";
import { getSessionCookie } from "../utils/session-cookie";

function signHubSpotWebhook(args: {
  clientSecret: string;
  method: string;
  url: string;
  body: string;
  timestamp: number;
}): string {
  const message = `${args.method}${args.url}${args.body}${args.timestamp}`;
  return createHmac("sha256", args.clientSecret)
    .update(message)
    .digest("base64");
}

test.describe("Email Dispatch — E2E", () => {
  test.skip(
    !process.env.HUBSPOT_CLIENT_SECRET,
    "Requires HUBSPOT_CLIENT_SECRET",
  );

  let session: TestSession;
  const leadIds: string[] = [];
  const messageIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupMessages(messageIds);
    await cleanupLeads(leadIds); // cascades conversations
    await deleteTestSession(session.userId); // cascades ms_graph_tokens
  });

  test("webhook endpoint accepts a signed object.creation EMAIL event and returns 200", async ({
    request,
    baseURL,
  }) => {
    const timestamp = Date.now();
    const body = JSON.stringify([
      {
        subscriptionType: "object.creation",
        objectTypeId: "0-49",
        objectId: 88888,
        eventId: 9001,
        occurredAt: timestamp,
        attemptNumber: 0,
      },
    ]);

    const url = `${baseURL}/api/hubspot/webhook`;
    const signature = signHubSpotWebhook({
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
      method: "POST",
      url,
      body,
      timestamp,
    });

    const response = await request.post(url, {
      data: body,
      headers: {
        "content-type": "application/json",
        "x-hubspot-signature-v3": signature,
        "x-hubspot-request-timestamp": String(timestamp),
      },
    });

    // The handler catches any HubSpot API errors (fake engagement ID) and still
    // returns 200 to prevent HubSpot retry storms.
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  test("approving an email-channel message sends email and shows 'Sent via email' toast", async ({
    context,
    page,
    baseURL,
  }) => {
    test.skip(
      !process.env.MS_GRAPH_TEST_ACCESS_TOKEN,
      "Requires MS_GRAPH_TEST_ACCESS_TOKEN — manual pilot test",
    );

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item = await seedEmailQueueItem({
      firstName: "EmailDispatch",
      lastName: `E2E-${uniqueSuffix}`,
      email: `e2e-${uniqueSuffix}@test.rekurve.dev`,
      hubspotContactId: `hs-e2e-${uniqueSuffix}`,
      subject: `E2E Test ${uniqueSuffix}`,
      body: `Hello from E2E test ${uniqueSuffix}`,
    });
    leadIds.push(item.leadId);
    messageIds.push(item.messageId);

    await seedMsGraphTokens(session.userId, {
      accessToken: process.env.MS_GRAPH_TEST_ACCESS_TOKEN!,
    });

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await expect(queue.row(item.messageId)).toBeVisible();
    await queue.approveButton(item.messageId).click();

    await expect(queue.row(item.messageId)).toBeHidden();
    await expect(
      page.getByTestId("app-toast").filter({ hasText: /Sent via email/i }),
    ).toBeVisible();

    const convs = await getConversationsForLead(item.leadId);
    expect(convs.length).toBeGreaterThan(0);
    expect(convs[0]!.direction).toBe("outbound");
    expect(convs[0]!.delivery_method).toBe("email");
  });

  test("approve fails when MS Graph token is invalid; row stays pending and is retryable", async ({
    context,
    page,
    baseURL,
  }) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item = await seedEmailQueueItem({
      firstName: "FailPath",
      lastName: `E2E-${uniqueSuffix}`,
      email: `e2e-fail-${uniqueSuffix}@test.rekurve.dev`,
      hubspotContactId: `hs-fail-${uniqueSuffix}`,
      subject: `E2E Fail Test ${uniqueSuffix}`,
      body: `Hello from E2E fail test ${uniqueSuffix}`,
    });
    leadIds.push(item.leadId);
    messageIds.push(item.messageId);

    // Seed an invalid token — token row exists so checkEmailPreconditions passes,
    // but the Graph call itself will fail with a 401.
    await seedMsGraphTokens(session.userId, {
      accessToken: "invalid-token-for-failure-path",
    });

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/dashboard");
    const queue = new ActionQueueSection(page);

    await expect(queue.row(item.messageId)).toBeVisible();
    await queue.approveButton(item.messageId).click();

    // Error toast should surface
    await expect(
      page
        .getByTestId("app-toast")
        .filter({ hasText: /Failed to send email/i }),
    ).toBeVisible();

    // Row must remain visible — dispatch failure left it pending
    await expect(queue.row(item.messageId)).toBeVisible();

    // DB state: status still pending, approvedAt null
    const dbState = await getMessageStatus(item.messageId);
    expect(dbState?.status).toBe("pending");
    expect(dbState?.approved_at).toBeNull();

    // Recovery path: overwrite with a real token and re-approve
    test.skip(
      !process.env.MS_GRAPH_TEST_ACCESS_TOKEN,
      "Recovery path requires MS_GRAPH_TEST_ACCESS_TOKEN",
    );

    await seedMsGraphTokens(session.userId, {
      accessToken: process.env.MS_GRAPH_TEST_ACCESS_TOKEN!,
    });

    await queue.approveButton(item.messageId).click();

    await expect(queue.row(item.messageId)).toBeHidden();
    await expect(
      page.getByTestId("app-toast").filter({ hasText: /Sent via email/i }),
    ).toBeVisible();
  });
});
