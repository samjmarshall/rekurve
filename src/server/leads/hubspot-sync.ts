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

export async function runLeadHubspotSync(
  event: { data: { leadId: string; userId: string } },
  step: Step,
): Promise<void> {
  const { leadId, userId } = event.data;

  const lead = await step.run("load-lead", () =>
    db.query.leads.findFirst({ where: eq(leads.id, leadId) }),
  );
  if (!lead) return;

  let { hubspotContactId } = lead;

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

  await step.realtime.publish(
    "publish-lead-updated",
    userChannel(userId)["lead.updated"],
    { leadId, hubspotContactId },
  );
}

export const leadHubspotSync = inngest.createFunction(
  {
    id: "lead-hubspot-sync",
    triggers: [
      { event: OUTBOX_EVENTS.LEAD_CAPTURED },
      { event: OUTBOX_EVENTS.LEAD_UPDATED },
    ],
  },
  ({ event, step }) =>
    runLeadHubspotSync(
      event as unknown as { data: { leadId: string; userId: string } },
      step,
    ),
);
