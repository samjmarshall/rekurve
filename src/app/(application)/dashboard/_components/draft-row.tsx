"use client";

import { Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { STAGE_META } from "~/app/(application)/pipeline/_lib/stage-meta";
import { Badge } from "~/components/ui/Badge";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { DraftActionBar } from "./draft-action-bar";

export type DraftRowData = RouterOutputs["messages"]["listPending"][number];

export function DraftRow({ row }: { row: DraftRowData }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STAGE_META[row.lead.leadStage];
  const ChannelIcon = row.channel === "sms" ? MessageSquare : Mail;
  const channelLabel = row.channel === "sms" ? "SMS" : "Email";

  return (
    <article
      data-testid={`queue-row-${row.id}`}
      className="rounded-lg border bg-card p-4 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <p className="truncate font-medium text-sm">
            {row.lead.firstName} {row.lead.lastName}
          </p>
          <Badge
            variant={meta.badgeVariant}
            data-testid={`queue-row-score-${row.id}`}
          >
            {row.lead.leadScore ?? 0}
          </Badge>
          <span
            aria-label={`Stage: ${meta.label}`}
            data-testid={`queue-row-stage-${row.id}`}
            className="text-muted-foreground text-xs"
          >
            {meta.label}
          </span>
        </div>
        <ChannelIcon
          size={16}
          aria-label={channelLabel}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
      </div>

      {row.subject ? (
        <p className="mt-2 truncate font-medium text-sm">{row.subject}</p>
      ) : null}

      <p
        data-testid={`queue-row-body-${row.id}`}
        className={cn(
          "mt-2 whitespace-pre-wrap text-sm",
          expanded ? "" : "line-clamp-3",
        )}
      >
        {row.body}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`queue-row-toggle-${row.id}`}
        className="mt-1 text-muted-foreground text-xs hover:text-foreground"
      >
        {expanded ? "Show less" : "Show more"}
      </button>

      {row.aiReasoning ? (
        <details className="mt-3">
          <summary
            data-testid={`queue-row-reasoning-${row.id}`}
            className="cursor-pointer select-none text-muted-foreground text-xs hover:text-foreground"
          >
            Why this message?
          </summary>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-muted-foreground text-xs">
            {row.aiReasoning}
          </p>
        </details>
      ) : null}

      <div className="mt-3">
        <DraftActionBar row={row} />
      </div>
    </article>
  );
}
