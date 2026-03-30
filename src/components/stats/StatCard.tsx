"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Stat } from "./stats-data";

interface StatCardProps {
  stat: Stat;
  className?: string;
}

export function StatCard({ stat, className }: StatCardProps) {
  const Icon = stat.icon;
  const citationText = stat.citation.year
    ? `${stat.citation.name}, ${stat.citation.year}`
    : stat.citation.name;

  return (
    <div
      className={cn(
        "mx-4 my-1 min-h-[140px] max-w-sm rounded-xl bg-card/90 px-4 shadow md:max-w-sm md:p-8",
        "max-md:max-w-[280px]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-bold text-xl md:text-xl">{stat.headline}</p>
          <p className="mt-1 line-clamp-2 text-neutral-700 text-sm md:text-sm dark:text-neutral-400">
            {stat.subtext}
          </p>
          <a
            href={stat.citation.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View source: ${citationText} (opens in new tab)`}
            className="mt-2 inline-flex items-center gap-1 text-neutral-500 text-xs transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 md:text-xs"
          >
            — {citationText}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
