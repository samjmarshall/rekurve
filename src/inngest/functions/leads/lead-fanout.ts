import { inngest } from "~/inngest/client";
import {
  createContact,
  findExistingContact,
  toContactProperties,
  updateContact,
} from "~/server/hubspot";
import {
  publishLeadUpdated,
  type RealtimePublishStep,
} from "~/server/leads/leads.channels";
import { leadsModule } from "~/server/leads/leads.module";
import { OUTBOX_EVENTS } from "~/server/outbox";

type Step = RealtimePublishStep & {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
};

// Post-commit fan-out for a captured/updated lead: starts the nurture sequence,
// optionally pushes to HubSpot, then publishes the realtime update. Triggered by
// the `lead.captured` / `lead.updated` outbox events. The HubSpot push is gated
// by `hubspotSync` (default true); a HubSpot-origin ingest sets it false so the
// contact isn't echoed back, while nurture-start and the realtime publish — the
// reason the outbox row exists on that path — still run. See ADR-013.
export async function runLeadCapturedFanout(
  event: { data: { leadId: string; userId: string; hubspotSync?: boolean } },
  step: Step,
): Promise<void> {
  const { leadId, userId, hubspotSync = true } = event.data;

  const lead = await step.run("load-lead", () =>
    leadsModule.service.getById(leadId),
  );
  if (!lead) return;

  let { hubspotContactId } = lead;

  if (hubspotSync) {
    if (!hubspotContactId) {
      const existing = await step.run("hs-dedup", () =>
        findExistingContact(lead.email, lead.phone),
      );
      const contact = existing
        ? await step.run("hs-update", () =>
            updateContact(existing.id, toContactProperties(lead)),
          )
        : await step.run("hs-create", () =>
            createContact(toContactProperties(lead)),
          );
      hubspotContactId = contact.id;
      await step.run("stamp", () =>
        leadsModule.service.stampHubspotContactId(leadId, contact.id),
      );
    } else {
      await step.run("hs-patch", () =>
        updateContact(hubspotContactId!, toContactProperties(lead)),
      );
    }
  }

  await publishLeadUpdated(step, userId, {
    leadId,
    hubspotContactId,
  });
}

export const leadCapturedFanout = inngest.createFunction(
  {
    // Inngest function id is a stable external identifier (run history,
    // concurrency keys) — kept as "lead-hubspot-sync" despite the rename.
    id: "lead-hubspot-sync",
    triggers: [
      { event: OUTBOX_EVENTS.LEAD_CAPTURED },
      { event: OUTBOX_EVENTS.LEAD_UPDATED },
    ],
  },
  ({ event, step }) =>
    runLeadCapturedFanout(
      event as unknown as {
        data: { leadId: string; userId: string; hubspotSync?: boolean };
      },
      step,
    ),
);
