import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/Button";

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  submitError?: string;
}

export function FormNavigation({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  isSubmitting,
  submitError,
}: FormNavigationProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="mt-8 space-y-3">
      {submitError && (
        <p className="text-center text-destructive text-sm" role="alert">
          {submitError}
        </p>
      )}
      <div className="flex gap-3">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onPrev}
            className="flex-1 gap-2"
            data-testid="lead-form-back-btn"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        )}
        {isLastStep ? (
          <Button
            key="submit"
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="flex-1 gap-2"
            data-testid="lead-form-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Lead"
            )}
          </Button>
        ) : (
          <Button
            key="next"
            type="button"
            variant="primary"
            size="lg"
            onClick={onNext}
            className="flex-1 gap-2"
            data-testid="lead-form-next-btn"
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
