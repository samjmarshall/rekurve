import "server-only";

import { inngest } from "~/inngest/client";
import type { EventPayload } from "~/server/inngest/events";
import type { RealtimePublishStep } from "~/server/leads/leads.channels";
import type { LeadRow } from "~/server/leads/leads.schema";
import { OUTBOX_EVENTS } from "~/server/outbox";
import type { HubspotSyncStep, SyncableLead } from "./hubspot.service";

type Step = RealtimePublishStep & HubspotSyncStep;

// Payload type comes from the EVENT_REGISTRY (adr019 clause 7) — the single
// payload authority. Typed as the honest union of both triggers — today the
// two schemas are structurally identical ({ leadId, userId, hubspotSync? }),
// and the union keeps this type truthful if one of them ever drifts. The wire
// strings stay the frozen ~/server/outbox consts.
type LeadHubspotSyncEvent = {
  data: EventPayload<"lead.captured"> | EventPayload<"lead.updated">;
};

// Worker port surface (adr020): the lead read comes from leadsModule.service,
// the contact sync from hubspotModule.service (which stamps the contact id
// back through the leads port before returning), and the realtime publish is
// the leads channel adapter. All injected through the factory so tests assert
// against a fake deps object, not module mocks.
export type LeadHubspotSyncWorkerDeps = {
  /** leads port (leadsModule.service.getById): the full lead row feeds the
   * HubSpot property mapping. Undefined → fan-out is a no-op (lead deleted). */
  getLead: (id: string) => Promise<LeadRow | undefined>;
  /** hubspot service port (hubspotModule.service.syncLeadContact): the
   * dedup/create/update/patch flow as separate frozen steps; stamps the
   * contact id via the leads port BEFORE it returns. */
  syncLeadContact: (
    lead: SyncableLead,
    step: HubspotSyncStep,
  ) => Promise<string>;
  /** leads channel adapter (leadsModule.channels.publishLeadUpdated): the
   * realtime `lead.updated` publish on the user channel. */
  publishLeadUpdated: (
    step: RealtimePublishStep,
    userId: string,
    payload: { leadId: string; hubspotContactId: string | null },
  ) => Promise<unknown>;
};

/**
 * Post-commit fan-out for a captured/updated lead: optionally pushes to
 * HubSpot, then publishes the realtime update. Triggered by the
 * `lead.captured` / `lead.updated` outbox events. The HubSpot push is gated
 * by `hubspotSync` (default true); a HubSpot-origin ingest sets it false so
 * the contact isn't echoed back, while the realtime publish — the reason the
 * outbox row exists on that path — still runs. See ADR-013.
 *
 * Step ids are FROZEN (Inngest memoisation keys — in-flight runs replay
 * against them): load-lead, then hs-dedup / hs-update / hs-create / stamp /
 * hs-patch (inside syncLeadContact), then publish-lead-updated.
 */
export function makeRunLeadHubspotSync(deps: LeadHubspotSyncWorkerDeps) {
  return async function runLeadHubspotSync(
    event: LeadHubspotSyncEvent,
    step: Step,
  ): Promise<void> {
    const { leadId, userId, hubspotSync = true } = event.data;

    const lead = await step.run("load-lead", () => deps.getLead(leadId));
    if (!lead) return;

    let { hubspotContactId } = lead;

    if (hubspotSync) {
      // syncLeadContact stamps a freshly-linked contact id through the leads
      // port before resolving — the stamp is durable BEFORE the publish below.
      hubspotContactId = await deps.syncLeadContact(lead, step);
    }

    await deps.publishLeadUpdated(step, userId, {
      leadId,
      hubspotContactId,
    });
  };
}

// Thin Inngest adapter factory: real deps are wired by the workers composition
// root (hubspot.workers.ts), which exposes the built function as
// hubspotWorkers.leadHubspotSync. Config is byte-stable — id and the two
// triggers are pinned by the registry golden test.
export function makeLeadHubspotSyncWorker(deps: LeadHubspotSyncWorkerDeps) {
  // Build the run closure ONCE here — Inngest re-invokes the handler on every
  // step replay, so constructing it inside the handler rebuilt it per replay.
  const run = makeRunLeadHubspotSync(deps);
  return inngest.createFunction(
    {
      // ⚠️ THIS STAYS ONE FUNCTION — do NOT split the HubSpot push from the
      // realtime publish. Inngest memoises step state per function id, so a
      // split strands every in-flight run's step state, and it would break
      // the ordering guarantee that hubspotContactId is stamped onto the lead
      // BEFORE the realtime publish carries it to the dashboard. The id is a
      // stable external identifier (run history, concurrency keys) — kept as
      // "lead-hubspot-sync" through the domain move; pinned by the registry
      // golden test and recorded in #329.
      id: "lead-hubspot-sync",
      triggers: [
        { event: OUTBOX_EVENTS.LEAD_CAPTURED },
        { event: OUTBOX_EVENTS.LEAD_UPDATED },
      ],
    },
    // The shared Inngest client is untyped (typed schemas are a PR-6 concern);
    // the trigger config pins the event names, so narrow `data` to the
    // registry payload once at the boundary — no `as unknown as` double-cast.
    ({ event, step }) =>
      run({ data: event.data as LeadHubspotSyncEvent["data"] }, step),
  );
}
