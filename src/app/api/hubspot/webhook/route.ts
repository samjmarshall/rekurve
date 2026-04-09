import { Signature } from "@hubspot/api-client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { leads } from "~/server/db/schema";
import { coerceFromHubSpot, getContact, toAppField } from "~/server/hubspot";

interface WebhookEvent {
  subscriptionType: string;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  eventId: number;
  occurredAt: number;
  attemptNumber: number;
}

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
      return handlePropertyChange(
        hubspotId,
        event.propertyName!,
        event.propertyValue!,
      );
    case "contact.deletion":
      return handleContactDeletion(hubspotId);
    default:
      console.log(
        `[HubSpot Webhook] Ignoring unhandled event: ${event.subscriptionType}`,
      );
  }
}

async function handleContactCreation(hubspotId: string): Promise<void> {
  // Fetch full contact from HubSpot (creation events don't include properties)
  const contact = await getContact(hubspotId);

  // Build local record from HubSpot properties
  const record: Record<string, unknown> = {
    hubspotContactId: hubspotId,
    firstName: contact.properties.firstName ?? "Unknown",
    lastName: contact.properties.lastName ?? "Unknown",
    updatedAt: new Date(),
  };

  // Map all available properties with type coercion
  for (const [field, value] of Object.entries(contact.properties)) {
    if (value != null && field !== "firstName" && field !== "lastName") {
      record[field] = coerceFromHubSpot(
        field as Parameters<typeof coerceFromHubSpot>[0],
        value,
      );
    }
  }

  // Upsert: insert or update if hubspotContactId already exists
  await db
    .insert(leads)
    .values(record as typeof leads.$inferInsert)
    .onConflictDoUpdate({
      target: leads.hubspotContactId,
      set: record as Partial<typeof leads.$inferInsert>,
    });
}

async function handlePropertyChange(
  hubspotId: string,
  propertyName: string,
  propertyValue: string,
): Promise<void> {
  const appField = toAppField(propertyName);
  if (!appField) return; // Not a mapped property — ignore

  const coerced = coerceFromHubSpot(appField, propertyValue);

  await db
    .update(leads)
    .set({ [appField]: coerced, updatedAt: new Date() })
    .where(eq(leads.hubspotContactId, hubspotId));
}

async function handleContactDeletion(hubspotId: string): Promise<void> {
  await db.delete(leads).where(eq(leads.hubspotContactId, hubspotId));
}
