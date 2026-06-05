import { Signature } from "@hubspot/api-client";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { extractCorrelationId } from "~/server/dispatch/correlation";
import {
  fromContactProperties,
  getContact,
  getEmailEngagement,
} from "~/server/hubspot";
import { captureLeadFromHubspot } from "~/server/leads/intake";
import { resolveLeadOwnerUserId } from "~/server/leads/owner";
import {
  buildOutboxEvent,
  HUBSPOT_EMAIL_EVENTS,
  sendPostCommit,
} from "~/server/outbox";

interface WebhookEvent {
  subscriptionType: string;
  objectTypeId?: string;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  eventId: number;
  occurredAt: number;
  attemptNumber: number;
}

// HubSpot objectTypeId for the 1:1 Email engagement (generic webhook subscriptions, Aug 2024+)
const HUBSPOT_EMAIL_OBJECT_TYPE_ID = "0-49";

export async function POST(request: Request) {
  const signature = request.headers.get("x-hubspot-signature-v3");
  const timestamp = request.headers.get("x-hubspot-request-timestamp");

  if (!signature || !timestamp) {
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 401 },
    );
  }

  // Reject requests older than 5 minutes
  if (Date.now() - Number(timestamp) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Timestamp expired" }, { status: 401 });
  }

  // Defer body read until after cheap header/timestamp checks
  const body = await request.text();

  const isValid = Signature.isValid({
    signatureVersion: "v3",
    signature,
    method: "POST",
    clientSecret: env.HUBSPOT_CLIENT_SECRET,
    requestBody: body,
    url: request.url,
    timestamp: Number(timestamp),
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const events = JSON.parse(body) as WebhookEvent[];

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      // Log and continue — return 200 to prevent HubSpot retry storm
      console.error(
        `[HubSpot Webhook] Failed to process ${event.subscriptionType} for objectId ${event.objectId}:`,
        error,
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function processEvent(event: WebhookEvent): Promise<void> {
  const hubspotId = String(event.objectId);

  switch (event.subscriptionType) {
    case "contact.creation":
      return handleContactCreation(hubspotId);
    case "contact.propertyChange":
    case "contact.deletion":
      console.warn(
        `[HubSpot Webhook] Dropping ${event.subscriptionType} for contact ${hubspotId} — local DB is canonical (ADR-013); inbound HubSpot edits are not honoured pre-PMF`,
      );
      return;
    case "object.creation":
      if (event.objectTypeId === HUBSPOT_EMAIL_OBJECT_TYPE_ID) {
        return handleEmailCreation(hubspotId);
      }
      console.log(
        `[HubSpot Webhook] Ignoring object.creation for objectTypeId ${event.objectTypeId}`,
      );
      return;
    default:
      console.log(
        `[HubSpot Webhook] Ignoring unhandled event: ${event.subscriptionType}`,
      );
  }
}

async function handleContactCreation(hubspotId: string): Promise<void> {
  const contact = await getContact(hubspotId);
  const properties = fromContactProperties(contact.properties);
  const userId = await resolveLeadOwnerUserId(db);
  await captureLeadFromHubspot(db, hubspotId, properties, { db, userId });
}

async function handleEmailCreation(emailObjectId: string): Promise<void> {
  const engagement = await getEmailEngagement(emailObjectId);
  if (!engagement) return;

  // Outbound only — "EMAIL" is HubSpot's enum for outbound, "INCOMING_EMAIL" for inbound
  if (engagement.direction !== "EMAIL") return;

  // Deterministic correlation (#261): pull our X-Rekurve-Correlation-Id back off
  // the engagement headers. Absent → not one of ours (or a mailto/draft send we
  // can't stamp); nothing to reconcile.
  const correlationId = extractCorrelationId(engagement.headers);
  if (!correlationId) {
    console.log(
      `[HubSpot Webhook] No correlation id on email.creation ${emailObjectId}; skipping`,
    );
    return;
  }

  // Emit through the outbox (ADR-014: no direct inngest.send from a handler).
  // The waiting dispatch-email run matches on data.correlationId; the sweep is
  // the backstop and the 1-h waitForEvent tolerates ≤30 s sweep latency.
  const evt = buildOutboxEvent(HUBSPOT_EMAIL_EVENTS.ENGAGEMENT_CREATED, {
    correlationId,
    hubspotActivityId: emailObjectId,
  });
  await evt.query;
  await sendPostCommit([
    { id: evt.id, name: evt.eventName, data: evt.payload },
  ]);
}
