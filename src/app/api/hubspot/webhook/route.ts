import { Signature } from "@hubspot/api-client";
import { NextResponse } from "next/server";
import { env } from "~/env";

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

  // Log the event — actual processing deferred to Epic 2+
  const events = JSON.parse(body) as Array<{
    subscriptionType: string;
    objectId: number;
    propertyName?: string;
  }>;
  console.log(
    `[HubSpot Webhook] Received ${events.length} event(s):`,
    events.map((e) => e.subscriptionType),
  );

  return NextResponse.json({ received: true });
}
