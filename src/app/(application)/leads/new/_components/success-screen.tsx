import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { buttonVariants } from "~/components/ui/button-variants";

interface SuccessScreenProps {
  leadName: string;
  onAddAnother: () => void;
}

export function SuccessScreen({ leadName, onAddAnother }: SuccessScreenProps) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center"
      data-testid="lead-form-success"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-state-success/10">
        <CheckCircle className="size-8 text-state-success" />
      </div>

      <div>
        <h2 className="font-semibold text-xl">Lead saved</h2>
        <p className="mt-2 text-muted-foreground">{leadName}</p>
        <Badge variant="outline" className="mt-2">
          Unqualified
        </Badge>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onAddAnother}
          className="w-full"
          data-testid="lead-form-add-another"
        >
          Add Another Lead
        </Button>
        <Link
          href="/pipeline"
          className={buttonVariants({
            variant: "ghost",
            size: "lg",
            className: "w-full",
          })}
          data-testid="lead-form-go-pipeline"
        >
          Go to Pipeline
        </Link>
      </div>
    </div>
  );
}
