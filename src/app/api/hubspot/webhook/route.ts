import { NextResponse } from "next/server";
import { hubspotModule } from "~/server/hubspot/hubspot.module";

// Thin HTTP adapter (adr020): signature/timestamp verification and per-event
// routing live on hubspotModule.service. The adr004 contract — signature and
// timestamp are the ONLY hard rejections (401); past that gate the service
// swallows per-event failures so this route always returns 200 and a poison
// event can never trigger a HubSpot batch-retry storm — is pinned by
// __tests__/route.test.ts, response codes and bodies included.
export async function POST(request: Request) {
  const verification =
    await hubspotModule.service.verifyWebhookSignature(request);

  if (!verification.valid) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  await hubspotModule.service.routeWebhookEvents(verification.events);

  return NextResponse.json({ received: true });
}
