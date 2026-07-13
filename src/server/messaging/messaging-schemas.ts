import "server-only";

import { z } from "zod";

// tRPC input schemas for the messaging domain (adr020 isomorphic-by-need:
// zero client importers, so these live server-side, not in src/domain).

// approve / dismiss — id only
export const messageApproveSchema = z.object({
  id: z.string().uuid(),
  skipDispatch: z.boolean().optional(),
});

export const messageDismissSchema = z.object({
  id: z.string().uuid(),
});

// editAndApprove — id + new body (trimmed, non-empty, <= 1600 chars).
// 1600 is the SMS segment ceiling; email is fine at the same bound.
export const messageEditAndApproveSchema = z.object({
  id: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message body cannot be empty")
    .max(1600, "Message body cannot exceed 1600 characters"),
  skipDispatch: z.boolean().optional(),
});

// snooze — id + snoozedUntil at least MIN_SNOOZE_BUFFER_MS in the future
export const MIN_SNOOZE_BUFFER_MS = 15 * 60 * 1000;
export const messageSnoozeSchema = z.object({
  id: z.string().uuid(),
  snoozedUntil: z.coerce
    .date()
    .refine((date) => date.getTime() >= Date.now() + MIN_SNOOZE_BUFFER_MS, {
      message: "Snooze time must be at least 15 minutes from now.",
    }),
});

// conversations.list — lead-scoped read
export const conversationsListSchema = z.object({ leadId: z.string().uuid() });

export type MessageApprove = z.infer<typeof messageApproveSchema>;
export type MessageEditAndApprove = z.infer<typeof messageEditAndApproveSchema>;
export type MessageSnooze = z.infer<typeof messageSnoozeSchema>;
export type ConversationsList = z.infer<typeof conversationsListSchema>;
