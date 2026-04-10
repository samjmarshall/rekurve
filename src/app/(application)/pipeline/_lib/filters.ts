import {
  type PipelineFilters,
  pipelineFiltersSchema,
} from "~/server/api/schemas/leads";
import { type LeadStage, STAGE_ORDER } from "./stage-meta";

type RawParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function pick(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Parse backend filter args from URL search params. */
export function parseFiltersFromSearchParams(
  params: RawParams,
): PipelineFilters {
  const timeline = pick(params, "timeline") ?? null;
  const estate = pick(params, "estate") ?? null;
  const fhog = pick(params, "fhog") === "true" ? true : null;

  // When nothing is set, return null so the query key stays stable.
  if (timeline === null && estate === null && fhog === null) return null;

  const parsed = pipelineFiltersSchema.safeParse({
    constructionTimeline: timeline,
    preferredEstate: estate,
    fhogEligible: fhog,
  });
  return parsed.success ? parsed.data : null;
}

/** Parse the client-only "which columns are visible" filter. */
export function parseVisibleStages(params: RawParams): Set<LeadStage> {
  const raw = pick(params, "stages");
  if (!raw) return new Set(STAGE_ORDER);

  const stages = raw
    .split(",")
    .filter((s): s is LeadStage =>
      (STAGE_ORDER as readonly string[]).includes(s),
    );
  return new Set(stages.length > 0 ? stages : STAGE_ORDER);
}

export interface PipelineUrlState {
  filters: NonNullable<PipelineFilters>;
  visibleStages: Set<LeadStage>;
}

/** Serialise current pipeline state into a URLSearchParams string. */
export function buildPipelineSearchParams(state: PipelineUrlState): string {
  const params = new URLSearchParams();
  if (state.filters.constructionTimeline)
    params.set("timeline", state.filters.constructionTimeline);
  if (state.filters.preferredEstate)
    params.set("estate", state.filters.preferredEstate);
  if (state.filters.fhogEligible) params.set("fhog", "true");

  // Only persist stages when the user has hidden at least one.
  if (state.visibleStages.size < STAGE_ORDER.length) {
    params.set(
      "stages",
      STAGE_ORDER.filter((s) => state.visibleStages.has(s)).join(","),
    );
  }
  return params.toString();
}
