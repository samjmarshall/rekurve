import type { ScoreResult } from "./schema";
import {
  detectGaps,
  pickNextQuestion,
  scoreBudget,
  scoreEngagement,
  scoreFinance,
  scoreLand,
  scorePropertyType,
  scoreTimeline,
} from "./score-factors";

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

interface LeadInput {
  firstName: string;
  lastName: string;
  hasLand?: boolean | null;
  landRegistered?: boolean | null;
  landAddress?: string | null;
  landSizeSqm?: string | null;
  landWidth?: string | null;
  landDepth?: string | null;
  seenBroker?: boolean | null;
  constructionTimeline?: string | null;
  budget?: string | null;
  propertyType?: string | null;
  preferredEstates?: string[] | null;
  preferredSuburbs?: string[] | null;
  notes?: string | null;
}

export function qualifyAndScore(lead: LeadInput): QualifyAndScoreResult {
  const breakdown = {
    land: scoreLand(lead),
    finance: scoreFinance(lead),
    timeline: scoreTimeline(lead),
    budget: scoreBudget(lead),
    propertyType: scorePropertyType(lead),
    engagement: scoreEngagement(),
  };

  const score = Object.values(breakdown).reduce((sum, f) => sum + f.score, 0);
  const gaps = detectGaps(lead as unknown as Record<string, unknown>);
  const nextQuestion = pickNextQuestion(gaps);

  return {
    score,
    stage: deriveStage(score),
    breakdown,
    gaps,
    nextQuestion,
  };
}
