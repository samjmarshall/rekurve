import "server-only";

import type { Realtime } from "inngest/realtime";
import { channel } from "inngest/realtime";
import { z } from "zod";

// Realtime surface for the leads domain. Channel name (`user:{userId}`) and
// topic (`lead.updated`) are byte-stable external identifiers — the client
// subscription token is built from these strings.
export const userChannel = channel({
  name: (userId: string) => `user:${userId}`,
  topics: {
    "lead.updated": {
      schema: z.object({
        leadId: z.string(),
        hubspotContactId: z.string().nullable(),
      }),
    },
  },
});

// The realtime-publish slice of Inngest's step tooling — the only step surface
// the channel helpers need. Workers intersect this with their own step needs.
export type RealtimePublishStep = {
  realtime: {
    publish: <TData>(
      id: string,
      topicRef: Realtime.TopicRef<TData>,
      data: TData,
    ) => Promise<TData>;
  };
};

export function publishLeadUpdated(
  step: RealtimePublishStep,
  userId: string,
  payload: { leadId: string; hubspotContactId: string | null },
) {
  return step.realtime.publish(
    "publish-lead-updated",
    userChannel(userId)["lead.updated"],
    payload,
  );
}
