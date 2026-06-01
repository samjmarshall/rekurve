import { and, eq, isNull } from "drizzle-orm";
import type { Realtime } from "inngest/realtime";

import { userChannel } from "~/inngest/channels";
import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { leads } from "~/server/db/schema";
import {
  createContact,
  findExistingContact,
  toContactProperties,
  updateContact,
} from "~/server/hubspot";
import { startOrUpdateSequence } from "~/server/nurture/scheduler";
import { OUTBOX_EVENTS } from "~/server/outbox";

type Step = {
  // biome-ignore lint/suspicious/noExplicitAny: Inngest serialises step results via JSON (Jsonify<T> ≠ T)
  run: (id: string, fn: () => Promise<any>) => Promise<any>;
  realtime: {
    publish: <TData>(
      id: string,
      topicRef: Realtime.TopicRef<TData>,
      data: TData,
    ) => Promise<TData>;
  };
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
    db.query.leads.findFirst({ where: eq(leads.id, leadId) }),
  );
  if (!lead) return;

  // Auto-start / re-align the nurture sequence for this lead's stage. The
  // DB-first intake cutover (#258) moved this off the request path; the worker
  // now owns it. Idempotent (startOrUpdateSequence no-ops when the active
  // sequence already matches the stage), so step memoisation + retries are safe.
  await step.run("start-nurture", () =>
    startOrUpdateSequence(db, leadId, lead.leadStage),
  );

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
        db
          .update(leads)
          .set({ hubspotContactId })
          .where(and(eq(leads.id, leadId), isNull(leads.hubspotContactId))),
      );
    } else {
      await step.run("hs-patch", () =>
        updateContact(hubspotContactId!, toContactProperties(lead)),
      );
    }
  }

  await step.realtime.publish(
    "publish-lead-updated",
    userChannel(userId)["lead.updated"],
    { leadId, hubspotContactId },
  );
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
