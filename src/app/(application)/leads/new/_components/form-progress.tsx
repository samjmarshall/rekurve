import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

interface FormProgressProps {
  steps: readonly { id: number; title: string }[];
  currentStep: number;
}

export function FormProgress({ steps, currentStep }: FormProgressProps) {
  return (
    <nav aria-label="Form progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <li
              key={step.id}
              className="flex flex-1 items-center"
              aria-current={isActive ? "step" : undefined}
            >
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isCompleted || isActive ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full font-medium text-xs transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive &&
                      "border-2 border-primary bg-primary/10 text-primary",
                    !isActive &&
                      !isCompleted &&
                      "border border-border text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <>
                      <Check className="size-4" />
                      <span className="sr-only">Completed: </span>
                    </>
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
