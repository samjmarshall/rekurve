import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "~/components/ui/button-variants";

export default function PipelinePage() {
  return (
    <div className="flex flex-1 flex-col">
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
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
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
    </div>
  );
}
