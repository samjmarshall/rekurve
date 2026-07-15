import "server-only";

import { extractCorrelationId } from "~/domain/messaging/correlation";
import { inngest } from "~/server/inngest/client";
import type { EventName, EventPayload } from "~/server/inngest/events";

// `satisfies` pins the name to an EVENT_REGISTRY key (adr019 clause 7) —
// type-only, so no runtime dep on the registry module. Module-private: the
// only consumer is this file's trigger config (the registry golden pins the
// raw wire string).
const HUBSPOT_EMAIL_EVENTS = {
  ENGAGEMENT_MISSED: "hubspot.engagement-missed",
} as const satisfies Record<string, EventName>;

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

// Payload type comes from the EVENT_REGISTRY (adr019 clause 7) — the single
// payload authority; the wire string stays the frozen module-private const.
type ReconcileEvent = { data: EventPayload<"hubspot.engagement-missed"> };

// Worker port surface (adr020): the conversation/lead read and the engagement
// stamp come from messagingModule.service; listEmailEngagementsForContact is
// wired from hubspotModule.service in the composition root (#329).
export type ReconcileEngagementWorkerDeps = {
  /**
   * Loads the conversation for the message plus the lead's hubspotContactId.
   * `done: true` ⇔ conversation missing or already reconciled — the same
   * discriminated shape the pre-adr020 step body returned (it is an Inngest
   * memoisation payload; keep it stable).
   */
  loadReconciliationTarget: (messageId: string) => Promise<
    | { done: true }
    | {
        done: false;
        leadId: string;
        hubspotContactId: string | null;
        createdAt: string | Date | null;
      }
  >;
  listEmailEngagementsForContact: (
    contactId: string,
    since?: Date,
  ) => Promise<{ id: string; headers: string | null }[]>;
  /** Stamps the HubSpot engagement id onto the conversation row. */
  stampEngagement: (args: {
    messageId: string;
    hubspotActivityId: string;
  }) => Promise<void>;
};

/**
 * One-shot backstop for the dispatch-email 1-hour `waitForEvent` timeout (#261).
 * The engagement webhook never arrived, so query HubSpot directly, match by the
 * correlation header, and stamp `hubspotActivityId` — or log for an operator if
 * no engagement matches.
 *
 * Step ids are FROZEN (Inngest memoisation keys — in-flight runs replay
 * against them): load-conversation, query-hubspot, stamp-or-alert.
 */
export function makeRunReconcileMissedEngagement(
  deps: ReconcileEngagementWorkerDeps,
) {
  return async function runReconcileMissedEngagement(
    event: ReconcileEvent,
    step: Step,
  ): Promise<void> {
    const { messageId, correlationId } = event.data;

    // 1. Load the conversation. Exit if it's gone or already reconciled.
    const loaded = await step.run("load-conversation", () =>
      deps.loadReconciliationTarget(messageId),
    );

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
      const engagements = await deps.listEmailEngagementsForContact(
        loaded.hubspotContactId as string,
        since,
      );
      const match = engagements.find(
        (e) => extractCorrelationId(e.headers) === correlationId,
      );
      return match?.id ?? null;
    });

    // 3. Stamp the activity id, or alert the operator (log drain).
    await step.run("stamp-or-alert", async () => {
      if (activityId) {
        await deps.stampEngagement({
          messageId,
          hubspotActivityId: activityId,
        });
      } else {
        console.error("[reconcile-missed-engagement] no engagement matched", {
          messageId,
          leadId: loaded.leadId,
        });
      }
    });
  };
}

// Thin Inngest adapter factory: real deps are wired by the workers composition
// root (messaging.workers.ts), which exposes the built function as
// messagingWorkers.reconcileMissedEngagement. The file moved to the
// messaging domain but the function id stays "reconcile-missed-engagement" —
// it is a frozen external identifier (run history, concurrency scoping),
// pinned by the registry golden test.
export function makeReconcileMissedEngagementWorker(
  deps: ReconcileEngagementWorkerDeps,
) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunReconcileMissedEngagement(deps);
  return inngest.createFunction(
    {
      id: "reconcile-missed-engagement",
      triggers: [{ event: HUBSPOT_EMAIL_EVENTS.ENGAGEMENT_MISSED }],
      concurrency: [{ key: "event.data.messageId", limit: 1 }],
      retries: 3,
    },
    // The shared Inngest client is untyped (typed schemas deliberately deferred);
    // the trigger config pins the event name, so narrow `data` to the registry
    // payload once at the boundary — no `as unknown as` double-cast.
    ({ event, step }) =>
      run({ data: event.data as ReconcileEvent["data"] }, step),
  );
}
