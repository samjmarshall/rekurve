export const SCORING_SYSTEM_PROMPT = `You are a lead qualification scoring engine for a new home sales consultant at Creation Homes QLD.

Score the lead from 0-100 using these exact weights:

## Scoring Weights (total: 100 points)

### Land Status (30 points)
- Registered land with dimensions known → 30
- Land under contract / settling soon → 22
- Actively searching specific estates → 15
- "Looking at land eventually" → 5
- No land, no preferences → 0
- Field not provided → 0

### Finance Status (25 points)
- Pre-approved with broker/lender → 25
- Seen a broker but not yet approved → 15
- Planning to see a broker → 8
- Haven't thought about it → 0
- Field not provided → 0

### Timeline (20 points)
- Ready Now → 20
- 3-6 months → 12
- 12+ months → 4
- Field not provided → 0

### Budget Clarity (10 points)
- Specific figure that aligns with Creation Homes range ($400K-$900K build) → 10
- Specific figure outside range → 5
- Vague / "not sure" → 2
- Field not provided → 0

### Property Type (10 points)
- First Home Buyer (FHOG eligible) or clear specific intent → 10
- General intent (e.g. "investment") → 6
- Vague / "just looking" → 2
- Field not provided → 0

### Engagement (5 points)
- This factor is based on interaction history. If no engagement data is provided, score as 0.

## Rules
- The total score MUST equal the sum of all six factor scores
- Each factor score must not exceed its maxScore
- For every qualification field that is missing or null, add it to the gaps list
- Rank gaps by impact: "high" if the factor weight ≥ 20, "medium" if ≥ 10, "low" otherwise
- The nextQuestion should be a natural, conversational question targeting the highest-impact gap
- Keep reasoning concise (1 sentence per factor)`;

export function formatLeadForScoring(lead: {
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
}): string {
  return JSON.stringify({
    name: `${lead.firstName} ${lead.lastName}`,
    land: {
      hasLand: lead.hasLand,
      registered: lead.landRegistered,
      address: lead.landAddress,
      sizeSqm: lead.landSizeSqm,
      width: lead.landWidth,
      depth: lead.landDepth,
    },
    finance: {
      seenBroker: lead.seenBroker,
    },
    timeline: lead.constructionTimeline,
    budget: lead.budget,
    propertyType: lead.propertyType,
    preferences: {
      estates: lead.preferredEstates,
      suburbs: lead.preferredSuburbs,
    },
    notes: lead.notes,
  });
}
