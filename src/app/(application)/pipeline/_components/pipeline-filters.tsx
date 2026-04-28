"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { Button } from "~/components/ui/Button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import type { constructionTimelineSchema } from "~/server/api/schemas/leads";
import {
  buildPipelineSearchParams,
  parseFiltersFromSearchParams,
  parseVisibleStages,
} from "../_lib/filters";
import { type LeadStage, STAGE_META, STAGE_ORDER } from "../_lib/stage-meta";

/**
 * Sentinel value for "no timeline filter applied" inside the Radix Select.
 * Radix Select does not allow null/undefined as item values, so we need a
 * string that cannot collide with any real constructionTimeline enum value.
 * The compile-time guard below fails typecheck if a future enum value ever
 * starts with `__`, forcing us to pick a new sentinel.
 */
const ANY_TIMELINE = "__any__" as const;

type RealTimeline = z.infer<typeof constructionTimelineSchema>;
// If this errors, ANY_TIMELINE collides with a real enum value — rename it.
type _SentinelGuard = RealTimeline extends `__${string}` ? never : true;
const _sentinelOk: _SentinelGuard = true;
void _sentinelOk;

const TIMELINE_OPTIONS = [
  { value: ANY_TIMELINE, label: "Any timeline" },
  { value: "ready_now", label: "Ready now" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "12_months_plus", label: "12 months+" },
] as const;

type TimelineValue = (typeof TIMELINE_OPTIONS)[number]["value"];

export function PipelineFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );
  const visibleStages = useMemo(
    () => parseVisibleStages(searchParams),
    [searchParams],
  );

  const currentEstate = filters?.preferredEstate ?? "";
  const currentFhog = filters?.fhogEligible ?? null;
  const currentTimeline: TimelineValue =
    filters?.constructionTimeline ?? ANY_TIMELINE;

  // Local state for the debounced estate text input.
  const [estate, setEstate] = useState<string>(currentEstate);
  useEffect(() => {
    setEstate(currentEstate);
  }, [currentEstate]);

  const updateUrl = useCallback(
    (next: {
      preferredEstate?: string | null;
      fhogEligible?: boolean | null;
      constructionTimeline?: TimelineValue;
      visibleStages?: Set<LeadStage>;
    }) => {
      const resolvedTimeline =
        next.constructionTimeline !== undefined
          ? next.constructionTimeline
          : currentTimeline;
      const qs = buildPipelineSearchParams({
        filters: {
          preferredEstate:
            next.preferredEstate !== undefined
              ? next.preferredEstate
              : currentEstate || null,
          fhogEligible:
            next.fhogEligible !== undefined ? next.fhogEligible : currentFhog,
          constructionTimeline:
            resolvedTimeline === ANY_TIMELINE ? null : resolvedTimeline,
        },
        visibleStages: next.visibleStages ?? visibleStages,
      });
      router.replace(qs ? `/pipeline?${qs}` : "/pipeline", { scroll: false });
    },
    [router, currentEstate, currentFhog, currentTimeline, visibleStages],
  );

  // Debounce the estate text input so each keystroke doesn't hit the URL.
  useEffect(() => {
    if (estate === currentEstate) return;
    const t = setTimeout(() => {
      updateUrl({ preferredEstate: estate.length > 0 ? estate : null });
    }, 300);
    return () => clearTimeout(t);
  }, [estate, currentEstate, updateUrl]);

  const toggleStage = (stage: LeadStage, checked: boolean) => {
    const next = new Set(visibleStages);
    if (checked) next.add(stage);
    else next.delete(stage);
    // Never let all four be hidden — that's equivalent to the default.
    if (next.size === 0) {
      for (const s of STAGE_ORDER) next.add(s);
    }
    updateUrl({ visibleStages: next });
  };

  const hasActiveFilter =
    (filters?.preferredEstate ?? null) !== null ||
    (filters?.fhogEligible ?? false) === true ||
    (filters?.constructionTimeline ?? null) !== null ||
    visibleStages.size < STAGE_ORDER.length;

  const clearAll = () => {
    setEstate("");
    router.replace("/pipeline", { scroll: false });
  };

  return (
    <div
      data-testid="pipeline-filters"
      className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
    >
      <Input
        type="search"
        value={estate}
        onChange={(e) => setEstate(e.target.value)}
        placeholder="Filter by estate…"
        aria-label="Filter by estate"
        data-testid="filter-estate"
        className="h-9 w-full sm:w-56"
      />

      {/* biome-ignore lint/a11y/noLabelWithoutControl: label wraps Checkbox (Radix input) as its control */}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={currentFhog === true}
          onCheckedChange={(checked) =>
            updateUrl({ fhogEligible: checked === true ? true : null })
          }
          data-testid="filter-fhog"
        />
        FHOG eligible
      </label>

      <Select
        value={currentTimeline}
        onValueChange={(v) =>
          updateUrl({ constructionTimeline: v as TimelineValue })
        }
      >
        <SelectTrigger
          className="h-9 min-w-[10rem]"
          data-testid="filter-timeline"
          aria-label="Construction timeline"
        >
          <span className="flex flex-1 text-left" data-slot="select-value">
            {TIMELINE_OPTIONS.find((o) => o.value === currentTimeline)?.label ??
              "Any timeline"}
          </span>
        </SelectTrigger>
        <SelectContent>
          {TIMELINE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <legend className="sr-only">Visible stages</legend>
        {STAGE_ORDER.map((stage) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: label wraps Checkbox (Radix input) as its control
          <label
            key={stage}
            className="flex items-center gap-1.5 text-sm"
            data-testid={`filter-stage-${stage}`}
          >
            <Checkbox
              checked={visibleStages.has(stage)}
              onCheckedChange={(checked) =>
                toggleStage(stage, checked === true)
              }
            />
            {STAGE_META[stage].label}
          </label>
        ))}
      </fieldset>

      {hasActiveFilter && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          data-testid="filter-clear"
          className="ml-auto"
        >
          <X className="mr-1 size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
