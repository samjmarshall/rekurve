import type { PipelineFilters } from "~/server/api/schemas/leads";
import { type LeadStage, STAGE_ORDER } from "./stage-meta";

interface EmptyStateInput {
  totalLeads: number;
  filters: PipelineFilters;
  visibleStages: Set<LeadStage>;
  /** True once the tRPC query has resolved at least once. */
  dataLoaded: boolean;
}

/**
 * The global "No leads yet / Add your first lead" CTA is the marketing-style
 * empty state for a brand-new account. It must NOT fire when filters are
 * active, even if the filters narrow the result to zero — that case should
 * fall through to the per-column "No {stage} leads" messages so the user
 * understands the filter is responsible for the emptiness.
 */
export function shouldShowGlobalEmpty(input: EmptyStateInput): boolean {
  if (!input.dataLoaded) return false;
  if (input.totalLeads > 0) return false;
  if (input.filters !== null && input.filters !== undefined) {
    const f = input.filters;
    if (f.constructionTimeline || f.preferredEstate || f.fhogEligible) {
      return false;
    }
  }
  if (input.visibleStages.size < STAGE_ORDER.length) return false;
  return true;
}
