import { selectChannel } from "~/server/ai/channel-selection";
import { computePriority } from "~/server/ai/priority";
import type { DraftMessageInput, DraftMessageOutput } from "~/server/ai/schema";

export type DraftFn = (input: DraftMessageInput) => Promise<DraftMessageOutput>;

export function stubDraft({ lead }: DraftMessageInput): DraftMessageOutput {
  const channel = selectChannel(lead);
  return {
    channel,
    subject: channel === "sms" ? null : "[ai-stub] subject",
    body: `[ai-stub] body for ${lead.id}`,
    aiReasoning: "[ai-stub]",
    priority: computePriority(lead),
  };
}

export function resolveWorkerDraftFn(): DraftFn {
  if (process.env.NODE_ENV !== "production" && process.env.AI_STUB === "1") {
    return (input) => Promise.resolve(stubDraft(input));
  }
  return async (input) => {
    const { draftMessage } = await import("~/server/ai/draft-message");
    return draftMessage(input);
  };
}
