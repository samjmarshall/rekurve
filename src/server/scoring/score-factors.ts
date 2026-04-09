import type { ScoreResult } from "./schema";

type FactorBreakdown = ScoreResult["breakdown"][keyof ScoreResult["breakdown"]];
type Gap = ScoreResult["gaps"][number];

// --- Land Status (30 pts) ---

export function scoreLand(lead: {
  hasLand?: boolean | null;
  landRegistered?: boolean | null;
  landSizeSqm?: string | null;
  landWidth?: string | null;
  landDepth?: string | null;
  preferredEstates?: string[] | null;
  preferredSuburbs?: string[] | null;
}): FactorBreakdown {
  const hasDimensions = !!(
    lead.landSizeSqm ||
    (lead.landWidth && lead.landDepth)
  );

  if (lead.hasLand && lead.landRegistered && hasDimensions) {
    return {
      score: 30,
      maxScore: 30,
      reasoning: "Registered land with known dimensions",
    };
  }
  if (lead.hasLand && lead.landRegistered) {
    return { score: 22, maxScore: 30, reasoning: "Has registered land" };
  }
  if (lead.hasLand) {
    return {
      score: 15,
      maxScore: 30,
      reasoning: "Has land, not yet registered",
    };
  }
  if (lead.preferredEstates?.length) {
    return {
      score: 15,
      maxScore: 30,
      reasoning: "Actively searching specific estates",
    };
  }
  if (lead.preferredSuburbs?.length) {
    return {
      score: 5,
      maxScore: 30,
      reasoning: "Exploring suburbs, no specific land yet",
    };
  }
  return { score: 0, maxScore: 30, reasoning: "No land information provided" };
}

// --- Finance Status (25 pts) ---
// Note: seenBroker is a boolean — can't distinguish pre-approved (25) from
// seen-but-not-approved (15). Capped at 15 until field becomes an enum.

export function scoreFinance(lead: {
  seenBroker?: boolean | null;
}): FactorBreakdown {
  if (lead.seenBroker === true) {
    return { score: 15, maxScore: 25, reasoning: "Has spoken with a broker" };
  }
  if (lead.seenBroker === false) {
    return { score: 0, maxScore: 25, reasoning: "Has not seen a broker" };
  }
  return { score: 0, maxScore: 25, reasoning: "Finance status unknown" };
}

// --- Timeline (20 pts) ---

export function scoreTimeline(lead: {
  constructionTimeline?: string | null;
}): FactorBreakdown {
  switch (lead.constructionTimeline) {
    case "ready_now":
      return { score: 20, maxScore: 20, reasoning: "Ready to build now" };
    case "3_6_months":
      return {
        score: 12,
        maxScore: 20,
        reasoning: "Planning to build in 3-6 months",
      };
    case "12_months_plus":
      return {
        score: 4,
        maxScore: 20,
        reasoning: "Timeline is 12+ months out",
      };
    default:
      return { score: 0, maxScore: 20, reasoning: "No timeline provided" };
  }
}

// --- Budget Clarity (10 pts) ---

const BUDGET_RANGE = { min: 400_000, max: 900_000 } as const;

/** Extract a dollar amount from free-text budget string */
export function parseBudgetAmount(budget: string): number | null {
  const match = budget.match(/\$?\s*([\d,.]+)\s*([kKmM])?/);
  if (!match) return null;

  let amount = parseFloat(match[1]!.replace(/,/g, ""));
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") amount *= 1_000;
  if (suffix === "m") amount *= 1_000_000;

  return Number.isFinite(amount) ? amount : null;
}

export function scoreBudget(lead: { budget?: string | null }): FactorBreakdown {
  if (!lead.budget) {
    return { score: 0, maxScore: 10, reasoning: "No budget provided" };
  }

  const amount = parseBudgetAmount(lead.budget);
  if (amount === null) {
    return {
      score: 2,
      maxScore: 10,
      reasoning: "Budget mentioned but unclear",
    };
  }
  if (amount >= BUDGET_RANGE.min && amount <= BUDGET_RANGE.max) {
    return {
      score: 10,
      maxScore: 10,
      reasoning: `Budget of ${lead.budget} aligns with Creation Homes range`,
    };
  }
  return {
    score: 5,
    maxScore: 10,
    reasoning: `Budget of ${lead.budget} is outside Creation Homes range`,
  };
}

// --- Property Type (10 pts) ---

const CLEAR_INTENT_TYPES = new Set([
  "first_home_buyer",
  "single_storey",
  "double_storey",
]);
const GENERAL_INTENT_TYPES = new Set(["investment", "upsize", "downsize"]);

export function scorePropertyType(lead: {
  propertyType?: string | null;
}): FactorBreakdown {
  if (!lead.propertyType) {
    return { score: 0, maxScore: 10, reasoning: "No property type specified" };
  }
  if (CLEAR_INTENT_TYPES.has(lead.propertyType)) {
    return {
      score: 10,
      maxScore: 10,
      reasoning: `Clear intent: ${lead.propertyType.replace(/_/g, " ")}`,
    };
  }
  if (GENERAL_INTENT_TYPES.has(lead.propertyType)) {
    return {
      score: 6,
      maxScore: 10,
      reasoning: `General intent: ${lead.propertyType}`,
    };
  }
  return { score: 2, maxScore: 10, reasoning: "Unrecognised property type" };
}

// --- Engagement (5 pts) — hardcoded 0 until engagement data exists ---

export function scoreEngagement(): FactorBreakdown {
  return { score: 0, maxScore: 5, reasoning: "No engagement data available" };
}

// --- Gaps ---

const GAP_FIELDS: Array<{
  field: string;
  key: string;
  weight: number;
  description: string;
}> = [
  {
    field: "land",
    key: "hasLand",
    weight: 30,
    description: "No land status provided",
  },
  {
    field: "finance",
    key: "seenBroker",
    weight: 25,
    description: "Finance status unknown",
  },
  {
    field: "timeline",
    key: "constructionTimeline",
    weight: 20,
    description: "No construction timeline",
  },
  {
    field: "budget",
    key: "budget",
    weight: 10,
    description: "No budget provided",
  },
  {
    field: "propertyType",
    key: "propertyType",
    weight: 10,
    description: "No property type specified",
  },
];

export function detectGaps(lead: Record<string, unknown>): Gap[] {
  return GAP_FIELDS.filter(({ key }) => lead[key] == null).map(
    ({ field, weight, description }) => ({
      field,
      impact: weight >= 20 ? "high" : weight >= 10 ? "medium" : "low",
      description,
    }),
  );
}

// --- Next Question ---

const NEXT_QUESTIONS: Record<string, string> = {
  land: "Do you have land picked out, or are you still exploring options?",
  finance:
    "Have you had a chance to chat with a broker or lender about finance?",
  timeline: "When are you ideally looking to start building?",
  budget: "Do you have a rough budget in mind for the build?",
  propertyType: "What type of home are you looking to build?",
};

const FALLBACK_QUESTION =
  "Is there anything else you'd like to know about the build process?";

export function pickNextQuestion(gaps: Gap[]): string {
  const highestGap = gaps[0]; // already sorted by weight (high → low)
  if (!highestGap) return FALLBACK_QUESTION;
  return NEXT_QUESTIONS[highestGap.field] ?? FALLBACK_QUESTION;
}
