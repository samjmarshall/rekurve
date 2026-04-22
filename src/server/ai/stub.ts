import { selectChannel } from "~/server/ai/channel-selection";
import { computePriority } from "~/server/ai/priority";
import type { DraftMessageInput, DraftMessageOutput } from "~/server/ai/schema";

export type DraftFn = (input: DraftMessageInput) => Promise<DraftMessageOutput>;

export function resolveDraftFn(req: Request): DraftFn | undefined {
  if (req.headers.get("x-ai-stub") !== "1") return undefined;
  return async ({ lead }: DraftMessageInput): Promise<DraftMessageOutput> => {
    const channel = selectChannel(lead);
    const url = new URL(req.url);
    console.info(`[ai-stub] route=${url.pathname} leadId=${lead.id}`);
    return {
      channel,
      subject: channel === "sms" ? null : "[ai-stub] subject",
      body: `[ai-stub] body for ${lead.id}`,
      aiReasoning: "[ai-stub]",
      priority: computePriority(lead),
    };
  };
}
