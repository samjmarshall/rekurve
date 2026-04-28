"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonVariants } from "~/components/ui/button-variants";
import { useTRPC } from "~/trpc/react";
import { shouldShowGlobalEmpty } from "../_lib/empty-state";
import {
  parseFiltersFromSearchParams,
  parseVisibleStages,
} from "../_lib/filters";
import { STAGE_ORDER } from "../_lib/stage-meta";
import { PipelineFilters } from "./pipeline-filters";
import { StageColumn } from "./stage-column";

export function PipelineBoard() {
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );
  const visibleStages = useMemo(
    () => parseVisibleStages(searchParams),
    [searchParams],
  );

  const trpc = useTRPC();
  const { data } = useQuery(trpc.leads.getByStage.queryOptions(filters));

  const totalLeads = data
    ? data.unqualified.length +
      data.nurture.length +
      data.warm.length +
      data.hot.length
    : 0;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showRightEdge, setShowRightEdge] = useState(false);
  const [showLeftEdge, setShowLeftEdge] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when data loads so the effect sees scrollerRef after the board scroller mounts
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setShowLeftEdge(el.scrollLeft > 4);
      setShowRightEdge(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [data]);

  const showGlobalEmpty = shouldShowGlobalEmpty({
    totalLeads,
    filters,
    visibleStages,
    dataLoaded: data !== undefined,
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold text-lg">Pipeline</h1>
        <Link
          href="/leads/new"
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          <Plus className="mr-1.5 size-4" />
          Add Lead
        </Link>
      </header>

      <PipelineFilters />

      {showGlobalEmpty ? (
        <div
          data-testid="pipeline-empty"
          className="flex flex-1 items-center justify-center p-4"
        >
          <div className="text-center">
            <Users
              size={48}
              className="mx-auto mb-4 text-muted-foreground/50"
            />
            <h2 className="font-semibold text-lg">No leads yet</h2>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              Your leads will appear here, grouped by stage
            </p>
            <Link
              href="/leads/new"
              className={buttonVariants({
                variant: "outline",
                size: "md",
                className: "mt-4",
              })}
            >
              <Plus className="mr-1.5 size-4" />
              Add your first lead
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative flex min-w-0 flex-1">
          <div
            ref={scrollerRef}
            data-testid="pipeline-board"
            className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-4 lg:snap-none"
          >
            {STAGE_ORDER.filter((s) => visibleStages.has(s)).map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                leads={data?.[stage] ?? []}
              />
            ))}
          </div>
          {showLeftEdge && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
            />
          )}
          {showRightEdge && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
            />
          )}
        </div>
      )}
    </div>
  );
}
