"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import { FACTOR_ORDER, factorLabel } from "../_lib/display";
import type { Lead } from "./lead-profile-view";

export function ScoreBreakdown({ lead }: { lead: Lead }) {
  const metadata = lead.scoreMetadata;

  if (!metadata) {
    return (
      <Card data-testid="lead-profile-score-breakdown">
        <CardHeader>
          <CardTitle className="text-xl">Score breakdown</CardTitle>
          <CardDescription>Score pending…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { breakdown, score } = metadata;

  return (
    <Card data-testid="lead-profile-score-breakdown">
      <CardHeader>
        <CardTitle className="text-xl">Score breakdown</CardTitle>
        <CardDescription>
          Total: <span className="font-semibold text-foreground">{score}</span>{" "}
          out of 100
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {FACTOR_ORDER.map((key) => {
          const factor = breakdown[key];
          const pct =
            factor.maxScore > 0 ? (factor.score / factor.maxScore) * 100 : 0;
          return (
            <div
              key={key}
              className="flex flex-col gap-1.5"
              data-testid={`lead-profile-score-factor-${key}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{factorLabel(key)}</span>
                <span
                  className="text-muted-foreground text-sm tabular-nums"
                  data-testid={`lead-profile-score-factor-${key}-value`}
                >
                  {factor.score}/{factor.maxScore}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={factor.score}
                aria-valuemin={0}
                aria-valuemax={factor.maxScore}
                aria-label={`${factorLabel(key)} score`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {factor.reasoning}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
