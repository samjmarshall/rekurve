"use server";

import { getSubscriptionToken } from "inngest/realtime";

import { userChannel } from "~/inngest/channels";
import { inngest } from "~/inngest/client";
import { getSession } from "~/lib/session";

export async function fetchLeadSubscriptionToken() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return getSubscriptionToken(inngest, {
    channel: userChannel(session.user.id),
    topics: ["lead.updated"] as const,
  });
}
