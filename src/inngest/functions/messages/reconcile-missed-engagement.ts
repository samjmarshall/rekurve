import { eq } from "drizzle-orm";
import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { conversations, leads } from "~/server/db/schema";
import { extractCorrelationId } from "~/server/dispatch/correlation";
import { listEmailEngagementsForContact } from "~/server/hubspot";
import { HUBSPOT_EMAIL_EVENTS } from "~/server/outbox";

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

type ReconcileEvent = {
  data: { messageId: string; leadId: string; correlationId: string };
};

/**
 * One-shot backstop for the dispatch-email 1-hour `waitForEvent` timeout (#261).
 * The engagement webhook never arrived, so query HubSpot directly, match by the
 * correlation header, and stamp `hubspotActivityId` — or log to BetterStack for
 * an operator if no engagement matches.
 */
export async function runReconcileMissedEngagement(
  event: ReconcileEvent,
  step: Step,
): Promise<void> {
  const { messageId, correlationId } = event.data;

  // 1. Load the conversation. Exit if it's gone or already reconciled.
  const loaded = await step.run("load-conversation", async () => {
    const [conv] = await db
      .select({
        leadId: conversations.leadId,
        hubspotActivityId: conversations.hubspotActivityId,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(eq(conversations.messageQueueId, messageId))
      .limit(1);
    if (!conv || conv.hubspotActivityId) {
      return { done: true as const };
    }
    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, conv.leadId),
      columns: { hubspotContactId: true },
    });
    return {
      done: false as const,
      leadId: conv.leadId,
      hubspotContactId: lead?.hubspotContactId ?? null,
      createdAt: conv.createdAt,
    };
  });

  if (loaded.done) return;
  if (!loaded.hubspotContactId) {
    console.error(
      "[reconcile-missed-engagement] lead has no hubspotContactId",
      { messageId, leadId: loaded.leadId },
    );
    return;
  }

  // 2. Query HubSpot for the contact's engagements and match by correlation id.
  const activityId = await step.run("query-hubspot", async () => {
    const since = loaded.createdAt ? new Date(loaded.createdAt) : undefined;
    const engagements = await listEmailEngagementsForContact(
      loaded.hubspotContactId as string,
      since,
    );
    const match = engagements.find(
      (e) => extractCorrelationId(e.headers) === correlationId,
    );
    return match?.id ?? null;
  });

  // 3. Stamp the activity id, or alert the operator (BetterStack drain).
  await step.run("stamp-or-alert", async () => {
    if (activityId) {
      await db
        .update(conversations)
        .set({ hubspotActivityId: activityId })
        .where(eq(conversations.messageQueueId, messageId));
    } else {
      console.error("[reconcile-missed-engagement] no engagement matched", {
        messageId,
        leadId: loaded.leadId,
      });
    }
  });
}

export const reconcileMissedEngagement = inngest.createFunction(
  {
    id: "reconcile-missed-engagement",
    triggers: [{ event: HUBSPOT_EMAIL_EVENTS.ENGAGEMENT_MISSED }],
    concurrency: [{ key: "event.data.messageId", limit: 1 }],
    retries: 3,
  },
  ({ event, step }) =>
    runReconcileMissedEngagement(event as unknown as ReconcileEvent, step),
);
