import { z } from "zod";

export const conversationsListSchema = z.object({ leadId: z.string().uuid() });

export type ConversationsList = z.infer<typeof conversationsListSchema>;
