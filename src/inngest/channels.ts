import { channel } from "inngest/realtime";
import { z } from "zod";

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
