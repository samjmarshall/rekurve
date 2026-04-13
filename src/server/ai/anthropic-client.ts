import Anthropic from "@anthropic-ai/sdk";

import { env } from "~/env";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  _client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export const DRAFT_MODEL = "claude-sonnet-4-6" as const;
export const DRAFT_MAX_TOKENS = 1024;
export const DRAFT_TEMPERATURE = 0.3;
