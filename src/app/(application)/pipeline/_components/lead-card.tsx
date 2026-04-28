import Link from "next/link";
import { Badge } from "~/components/ui/Badge";
import type { RouterOutputs } from "~/trpc/react";
import { formatLastContact } from "../_lib/format-last-contact";
import { STAGE_META } from "../_lib/stage-meta";
import { extractTopGap } from "../_lib/top-gap";

export type LeadCardData =
  RouterOutputs["leads"]["getByStage"]["unqualified"][number];

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const meta = STAGE_META[lead.leadStage];
  return (
    <Link
      href={`/leads/${lead.id}`}
      data-testid={`lead-card-${lead.id}`}
      className="block rounded-md border bg-background p-3 transition-all hover:border-primary/40 hover:bg-secondary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 truncate font-medium text-sm">
          {lead.firstName} {lead.lastName}
        </p>
        <Badge
          variant={meta.badgeVariant}
          data-testid={`lead-card-score-${lead.id}`}
        >
          {lead.leadScore ?? "—"}
        </Badge>
      </div>
      <p className="mt-1 text-muted-foreground text-xs">
        {formatLastContact(lead.lastContactedAt)}
      </p>
      <p
        className="mt-1 line-clamp-1 text-muted-foreground text-xs"
        data-testid={`lead-card-gap-${lead.id}`}
      >
        {extractTopGap(lead.scoreMetadata)}
      </p>
    </Link>
  );
}
