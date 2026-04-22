import { z } from "zod";

// Enum schemas — mirror values from src/server/db/schema/enums.ts
export const sequenceTypeSchema = z.enum([
  "discovery",
  "nurture",
  "warm_progression",
  "lot_alert",
]);

export const sequenceStatusSchema = z.enum(["active", "paused", "completed"]);

export const startSequenceSchema = z.object({
  leadId: z.string().uuid(),
  sequenceType: sequenceTypeSchema,
});

export const pauseSequenceSchema = z.object({
  id: z.string().uuid(),
});

export const resumeSequenceSchema = z.object({
  id: z.string().uuid(),
});

export type SequenceType = z.infer<typeof sequenceTypeSchema>;
export type SequenceStatus = z.infer<typeof sequenceStatusSchema>;
export type StartSequence = z.infer<typeof startSequenceSchema>;
export type PauseSequence = z.infer<typeof pauseSequenceSchema>;
export type ResumeSequence = z.infer<typeof resumeSequenceSchema>;
