import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../client";
import { formatLeadForScoring, SCORING_SYSTEM_PROMPT } from "./prompt";
import { type ScoreResult, scoreResultSchema } from "./schema";

type LeadStage = "unqualified" | "nurture" | "warm" | "hot";

function deriveStage(score: number): LeadStage {
  if (score >= 76) return "hot";
  if (score >= 51) return "warm";
  if (score >= 26) return "nurture";
  return "unqualified";
}

export interface QualifyAndScoreResult {
  score: number;
  stage: LeadStage;
  breakdown: ScoreResult["breakdown"];
  gaps: ScoreResult["gaps"];
  nextQuestion: string;
}

export async function qualifyAndScore(
  lead: Parameters<typeof formatLeadForScoring>[0],
): Promise<QualifyAndScoreResult> {
  const response = await anthropic.messages.parse({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SCORING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Score this lead:\n${formatLeadForScoring(lead)}`,
      },
    ],
    output_config: { format: zodOutputFormat(scoreResultSchema) },
  });

  const result = response.parsed_output;
  if (!result) {
    throw new Error("Claude returned no structured output");
  }

  return {
    score: result.score,
    stage: deriveStage(result.score),
    breakdown: result.breakdown,
    gaps: result.gaps,
    nextQuestion: result.nextQuestion,
  };
}
