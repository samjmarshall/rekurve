import { Users } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "~/components/ui/button-variants";

export default function LeadNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Users className="mx-auto mb-4 size-12 text-muted-foreground/50" />
        <h2 className="font-semibold text-lg">Lead not found</h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          This lead doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/pipeline"
          className={buttonVariants({
            variant: "outline",
            size: "md",
            className: "mt-4",
          })}
        >
          Back to pipeline
        </Link>
      </div>
    </div>
  );
}
