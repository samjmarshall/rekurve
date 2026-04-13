import { type LeadStage, STAGE_META } from "../_lib/stage-meta";
import { LeadCard, type LeadCardData } from "./lead-card";

interface StageColumnProps {
  stage: LeadStage;
  leads: LeadCardData[];
}

export function StageColumn({ stage, leads }: StageColumnProps) {
  const meta = STAGE_META[stage];
  return (
    <section
      data-testid={`pipeline-column-${stage}`}
      aria-label={`${meta.label} leads`}
      className="flex w-[calc(100vw-2rem)] shrink-0 snap-center flex-col rounded-lg border bg-card md:w-80"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-base">{meta.label}</h2>
        <span
          data-testid={`pipeline-column-count-${stage}`}
          className="rounded-full bg-secondary px-2 py-0.5 font-mono text-muted-foreground text-xs"
        >
          {leads.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {leads.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            No {meta.label.toLowerCase()} leads
          </p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </section>
  );
}
