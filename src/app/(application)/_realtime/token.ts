"use server";

// useRealtime needs a *full* subscription token — channel + topics + key — so
// it can reconstruct what to subscribe to. Two pitfalls we have to thread:
//
//   1. getClientSubscriptionToken returns only { key, apiBaseUrl }. Without
//      channel/topics the hook throws "token() returned a key object but
//      channel/topics were not provided" and the WebSocket never opens (the
//      badge never flips).
//   2. getSubscriptionToken with a *channel instance* embeds the topic's Zod
//      schema in token.channel, which RSC rejects ("Only plain objects … can
//      be passed to Client Components").
//
// Passing the channel *name* (a plain string) sidesteps both: the returned
// token is { channel: "user:…", topics: ["lead.updated"], key, apiBaseUrl } —
// fully serialisable, and complete enough for useRealtime to subscribe.
import { getSubscriptionToken } from "inngest/realtime";
import { getSession } from "~/server/auth/session";
import { inngest } from "~/server/inngest/client";
// Channel definition only — not the composition root, which would drag the
// db/outbox wiring into this server action.
import { userChannel } from "~/server/leads/leads.channels";

export async function fetchLeadSubscriptionToken() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return getSubscriptionToken(inngest, {
    channel: userChannel(session.user.id).name,
    topics: ["lead.updated"],
  });
}
