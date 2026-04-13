import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  DRAFT_MAX_TOKENS,
  DRAFT_MODEL,
  DRAFT_TEMPERATURE,
  getAnthropicClient,
} from "./anthropic-client";
import { selectChannel } from "./channel-selection";
import { computePriority } from "./priority";
import { buildUserPrompt, DRAFT_SYSTEM_PROMPT } from "./prompts";
import {
  claudeDraftSchema,
  type DraftMessageInput,
  type DraftMessageOutput,
} from "./schema";

const MS_PER_DAY = 86_400_000;

export async function draftMessage(
  input: DraftMessageInput,
): Promise<DraftMessageOutput> {
  const { lead } = input;

  // Deterministic pieces computed up front — any failure here (e.g. no
  // contact method) throws before we burn Claude tokens.
  const channel = selectChannel(lead);
  const priority = computePriority(lead);

  const daysSinceLastContact = lead.lastContactedAt
    ? Math.floor((Date.now() - lead.lastContactedAt.getTime()) / MS_PER_DAY)
    : null;

  const userPrompt = buildUserPrompt({ lead, channel, daysSinceLastContact });

  const client = getAnthropicClient();

  const response = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: DRAFT_MAX_TOKENS,
    temperature: DRAFT_TEMPERATURE,
    // System as array with cache_control so repeated calls (nurture
    // scheduler #132) amortize the system-prompt token cost.
    system: [
      {
        type: "text",
        text: DRAFT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(claudeDraftSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("draftMessage: Claude returned no structured output");
  }

  // SMS has no subject regardless of what Claude emitted.
  const subject = channel === "email" ? parsed.subject : null;

  return {
    channel,
    subject,
    body: parsed.body,
    aiReasoning: parsed.reasoning,
    priority,
  };
}
