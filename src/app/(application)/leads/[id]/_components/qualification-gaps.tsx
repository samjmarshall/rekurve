"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "~/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import { type FactorKey, factorLabel, impactTone } from "../_lib/display";
import type { Lead } from "./lead-profile-view";

export function QualificationGaps({ lead }: { lead: Lead }) {
  const metadata = lead.scoreMetadata;

  if (!metadata) {
    return (
      <Card data-testid="lead-profile-gaps-card">
        <CardHeader>
          <CardTitle className="text-xl">Qualification gaps</CardTitle>
          <CardDescription>Score pending…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { gaps, nextQuestion } = metadata;

  if (gaps.length === 0) {
    return (
      <Card data-testid="lead-profile-gaps-card">
        <CardHeader>
          <CardTitle className="text-xl">Qualification gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="rounded-md bg-state-success/10 px-3 py-2 text-sm text-state-success"
            data-testid="lead-profile-gaps-empty"
          >
            No gaps — this lead is fully qualified.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="lead-profile-gaps-card">
      <CardHeader>
        <CardTitle className="text-xl">Qualification gaps</CardTitle>
        <CardDescription>
          Top {gaps.length} {gaps.length === 1 ? "gap" : "gaps"} — ranked by
          impact.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="rounded-md border border-primary/20 bg-primary/5 p-3"
          data-testid="lead-profile-next-question"
        >
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-primary text-xs uppercase tracking-wide">
            <Sparkles className="size-3" aria-hidden="true" />
            Suggested next question
          </div>
          <p className="text-sm italic">“{nextQuestion}”</p>
        </div>

        <ul
          className="flex flex-col gap-3"
          data-testid="lead-profile-gaps-list"
        >
          {gaps.map((gap) => (
            <li
              key={gap.field}
              className="flex flex-col gap-1 border-border border-l-2 pl-3"
              data-testid={`lead-profile-gap-item-${gap.field}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">
                  {factorLabel(gap.field as FactorKey)}
                </span>
                <Badge variant={impactTone(gap.impact)} className="capitalize">
                  {gap.impact}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">{gap.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
