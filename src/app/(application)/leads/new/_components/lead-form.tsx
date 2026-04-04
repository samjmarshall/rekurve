"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { buttonVariants } from "~/components/ui/button-variants";
import type { LeadCreate } from "~/server/api/schemas/leads";
import { useTRPC } from "~/trpc/react";
import { leadFormResolver } from "../_lib/schema";
import { FormNavigation } from "./form-navigation";
import { FormProgress } from "./form-progress";
import { AdditionalInfo } from "./form-steps/additional-info";
import { BuildDetails } from "./form-steps/build-details";
import { ContactDetails } from "./form-steps/contact-details";
import { LandStatus } from "./form-steps/land-status";
import { SuccessScreen } from "./success-screen";

const STEPS = [
  { id: 1, title: "Contact" },
  { id: 2, title: "Land" },
  { id: 3, title: "Build" },
  { id: 4, title: "More" },
] as const;

// Fields to validate per step
const STEP_FIELDS: Record<number, (keyof LeadCreate)[]> = {
  1: ["firstName", "lastName", "phone", "email", "preferredContactTime"],
  2: [
    "hasLand",
    "landRegistered",
    "landAddress",
    "landSizeSqm",
    "landWidth",
    "landDepth",
  ],
  3: ["propertyType", "budget", "seenBroker", "constructionTimeline"],
  4: [
    "resolveFinanceOptedIn",
    "preferredEstates",
    "preferredSuburbs",
    "notes",
    "leadSource",
  ],
};

export function LeadForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const goToStep = (step: number) => {
    setCurrentStep(step);
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
  };

  const form = useForm<LeadCreate>({
    resolver: leadFormResolver,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      leadSource: "walk_in",
    },
  });

  const trpc = useTRPC();
  const createLead = useMutation(
    trpc.leads.create.mutationOptions({
      onSuccess: () => {
        setCurrentStep(5); // success state
      },
      onError: (error) => {
        // If tRPC returns Zod field errors, set them on the form
        const zodErrors = (
          error.data as {
            zodError?: { fieldErrors?: Record<string, string[]> };
          }
        )?.zodError?.fieldErrors;
        if (zodErrors) {
          for (const [field, messages] of Object.entries(zodErrors)) {
            if (messages?.[0]) {
              form.setError(field as keyof LeadCreate, {
                message: messages[0],
              });
            }
          }
        }
      },
    }),
  );

  const handleNextStep = async () => {
    const fields = STEP_FIELDS[currentStep];
    const isValid = await form.trigger(fields);
    if (isValid) {
      goToStep(Math.min(currentStep + 1, 4));
    } else {
      const firstErrorField = fields?.find((f) => form.formState.errors[f]);
      if (firstErrorField) {
        form.setFocus(firstErrorField);
      }
    }
  };

  const handlePrevStep = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };

  const onSubmit = (data: LeadCreate) => {
    createLead.mutate(data);
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/pipeline"
          aria-label="Back to pipeline"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "size-9 p-0",
          })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-semibold text-lg">New Lead</h1>
      </header>

      {currentStep === 5 ? (
        <SuccessScreen
          leadName={`${form.getValues("firstName")} ${form.getValues("lastName")}`}
          onAddAnother={() => {
            form.reset({ leadSource: "walk_in" });
            setCurrentStep(1);
          }}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
          <FormProgress steps={STEPS} currentStep={currentStep} />

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="mt-6 flex flex-1 flex-col"
          >
            <div className="flex-1">
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="mb-4 font-medium text-base text-muted-foreground outline-none"
              >
                {STEPS[currentStep - 1]?.title}
              </h2>
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ContactDetails form={form} />
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LandStatus form={form} />
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BuildDetails form={form} />
                  </motion.div>
                )}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AdditionalInfo form={form} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <FormNavigation
              currentStep={currentStep}
              totalSteps={4}
              onPrev={handlePrevStep}
              onNext={handleNextStep}
              isSubmitting={createLead.isPending}
              submitError={createLead.error?.message}
            />
          </form>
        </div>
      )}
    </>
  );
}
