import "server-only";

import { Signature } from "@hubspot/api-client";
import { extractCorrelationId } from "~/domain/messaging/correlation";
import { env } from "~/env";
import type { EventName, OutboxEventDescriptor } from "~/server/inngest/events";
import type { LeadRow } from "~/server/leads/leads.schema";
import type { HubSpotContact } from "./contacts";
import type { EmailEngagement } from "./emails";
import { fromContactProperties } from "./properties";

// `satisfies` pins the name to an EVENT_REGISTRY key (adr019 clause 7) —
// type-only, so no runtime dep on the registry module (or the outbox barrel's
// db/inngest graph). Module-private: the wire string is pinned by the webhook
// tests and the registry golden.
const HUBSPOT_WEBHOOK_EVENTS = {
  ENGAGEMENT_CREATED: "hubspot.email.engagement-created",
} as const satisfies Record<string, EventName>;

export interface HubspotWebhookEvent {
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

export type WebhookVerification =
  | { valid: true; events: HubspotWebhookEvent[] }
  | { valid: false; error: string };

// Webhook port surface (adr020): the contact/engagement fetches are the
// external HubSpot API seam (injected so tests fake them through the
// factory; hubspot.module binds the real, HUBSPOT_MOCK-aware fns), the lead
// ingest goes through leads service ports, and the engagement emission goes
// through the outbox's write-less `publish` (adr019 — no direct inngest.send
// from a handler, adr014).
export type HubspotWebhookDeps = {
  getContact: (hubspotId: string) => Promise<HubSpotContact>;
  getEmailEngagement: (emailId: string) => Promise<EmailEngagement | null>;
  /** leads port (leadsModule.service.captureLeadFromHubspot): upsert on
   * hubspot_contact_id — idempotent, as adr004 requires of every handler. */
  captureLeadFromHubspot: (
    hubspotContactId: string,
    properties: Partial<LeadRow>,
    ctx: { userId: string },
  ) => Promise<unknown>;
  /** leads port: pre-ownership-column owner resolution (#289 seam). */
  resolveOwnerUserId: () => Promise<string>;
  /** outbox port (~/server/outbox publish): write-less commit — outbox
   * inserts in ONE db.batch, then the best-effort post-commit send. */
  publish: (events: readonly OutboxEventDescriptor[]) => Promise<void>;
};

/**
 * The webhook handler as service fns (adr004 — the Next route is a thin HTTP
 * adapter over these two):
 *
 * - `verifyWebhookSignature`: the ONLY hard rejections — missing headers, the
 *   5-minute timestamp window, and the v3 signature check. Anything past this
 *   gate is best-effort and must stay on the always-200 path.
 * - `routeWebhookEvents`: per-event dispatch with the per-event try/catch
 *   swallow — a poison event logs and never blocks its batch neighbours, and
 *   the route returns 200 regardless (adr004; HubSpot retries whole batches
 *   on 5xx).
 */
export function makeHubspotWebhook(deps: HubspotWebhookDeps) {
  async function verifyWebhookSignature(
    request: Request,
  ): Promise<WebhookVerification> {
    const signature = request.headers.get("x-hubspot-signature-v3");
    const timestamp = request.headers.get("x-hubspot-request-timestamp");

    if (!signature || !timestamp) {
      return { valid: false, error: "Missing signature headers" };
    }

    // Reject requests older than 5 minutes
    if (Date.now() - Number(timestamp) > 5 * 60 * 1000) {
      return { valid: false, error: "Timestamp expired" };
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
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true, events: JSON.parse(body) as HubspotWebhookEvent[] };
  }

  async function routeWebhookEvents(
    events: HubspotWebhookEvent[],
  ): Promise<void> {
    for (const event of events) {
      try {
        await processEvent(event);
      } catch (error) {
        // Log and continue — the route returns 200 to prevent HubSpot retry storm
        console.error(
          `[HubSpot Webhook] Failed to process ${event.subscriptionType} for objectId ${event.objectId}:`,
          error,
        );
      }
    }
  }

  async function processEvent(event: HubspotWebhookEvent): Promise<void> {
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
    // Contact fetch + owner resolution are independent reads, so they run
    // concurrently (deferred PR-2 review follow-up; the route serialised
    // them). Accepted deviation (review): when BOTH reads fail, Promise.all
    // surfaces whichever rejection settles first, whereas the serialised
    // handler made the contact-fetch error the deterministic one —
    // diagnostics-only (per-event swallow log identity); no side-effect or
    // ordering change.
    const [contact, userId] = await Promise.all([
      deps.getContact(hubspotId),
      deps.resolveOwnerUserId(),
    ]);
    const properties = fromContactProperties(contact.properties);
    await deps.captureLeadFromHubspot(hubspotId, properties, { userId });
  }

  async function handleEmailCreation(emailObjectId: string): Promise<void> {
    const engagement = await deps.getEmailEngagement(emailObjectId);
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
    await deps.publish([
      {
        name: HUBSPOT_WEBHOOK_EVENTS.ENGAGEMENT_CREATED,
        data: { correlationId, hubspotActivityId: emailObjectId },
      },
    ]);
  }

  return { verifyWebhookSignature, routeWebhookEvents };
}

export type HubspotWebhook = ReturnType<typeof makeHubspotWebhook>;
