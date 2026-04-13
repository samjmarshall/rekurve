import { z } from "zod";

import type { leads } from "~/server/db/schema";

export type LeadRow = typeof leads.$inferSelect;

export const draftMessageOutputSchema = z.object({
  channel: z.enum(["sms", "email"]),
  subject: z.string().nullable(),
  body: z.string().min(1).max(1600),
  aiReasoning: z.string(),
  priority: z.number().int().min(0).max(100),
});

export type DraftMessageOutput = z.infer<typeof draftMessageOutputSchema>;

export interface DraftMessageInput {
  lead: LeadRow;
}

// Claude-authored fields only — priority + channel are computed deterministically
// and overwritten on the way out, so we don't trust the model with them.
export const claudeDraftSchema = z.object({
  subject: z.string().max(78).nullable(),
  body: z.string().min(1).max(1600),
  reasoning: z.string(),
});

export type ClaudeDraft = z.infer<typeof claudeDraftSchema>;
