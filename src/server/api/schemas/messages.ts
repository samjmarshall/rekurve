import { z } from "zod";

// Enum schemas — mirror values from src/server/db/schema/enums.ts
export const channelSchema = z.enum(["sms", "email"]);

export const messageStatusSchema = z.enum([
  "pending",
  "approved",
  "edited_and_approved",
  "dismissed",
  "snoozed",
]);

// approve / dismiss — id only
export const messageApproveSchema = z.object({
  id: z.string().uuid(),
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
});

// snooze — id + future snoozedUntil (coerced from ISO string)
export const messageSnoozeSchema = z.object({
  id: z.string().uuid(),
  snoozedUntil: z.coerce.date().refine((date) => date > new Date(), {
    message: "snoozedUntil must be a future date",
  }),
});

export type MessageApprove = z.infer<typeof messageApproveSchema>;
export type MessageDismiss = z.infer<typeof messageDismissSchema>;
export type MessageEditAndApprove = z.infer<typeof messageEditAndApproveSchema>;
export type MessageSnooze = z.infer<typeof messageSnoozeSchema>;
