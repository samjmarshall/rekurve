"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "~/components/ui/Button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useTRPC } from "~/trpc/react";
import {
  type QuickCaptureFormValues,
  quickCaptureFormResolver,
} from "./schema";

interface QuickCaptureFormProps {
  onSuccess: (lead: {
    id: string;
    firstName: string;
    lastName: string;
  }) => void;
  autoFocusRef?: React.RefObject<HTMLInputElement | null>;
}

const LEAD_SOURCE_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social" },
  { value: "web", label: "Web" },
  { value: "other", label: "Other" },
] as const;

export function QuickCaptureForm({
  onSuccess,
  autoFocusRef,
}: QuickCaptureFormProps) {
  const form = useForm<QuickCaptureFormValues>({
    resolver: quickCaptureFormResolver,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { leadSource: "other" },
  });

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = form;

  const trpc = useTRPC();
  const createLead = useMutation(
    trpc.leads.create.mutationOptions({
      onSuccess: (lead) => {
        onSuccess({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
        });
      },
      onError: (error) => {
        const zodErrors = (
          error.data as {
            zodError?: { fieldErrors?: Record<string, string[]> };
          }
        )?.zodError?.fieldErrors;
        if (zodErrors) {
          for (const [field, messages] of Object.entries(zodErrors)) {
            if (messages?.[0]) {
              setError(field as keyof QuickCaptureFormValues, {
                message: messages[0],
              });
            }
          }
        }
      },
    }),
  );

  const onSubmit = (data: QuickCaptureFormValues) => {
    createLead.mutate(data);
  };

  const firstNameRegister = register("firstName");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="qc-firstName">
              First name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              {...firstNameRegister}
              ref={(el) => {
                firstNameRegister.ref(el);
                if (autoFocusRef) autoFocusRef.current = el;
              }}
              id="qc-firstName"
              autoComplete="given-name"
              aria-required="true"
              aria-invalid={!!errors.firstName}
              data-testid="quick-capture-first-name"
            />
            {errors.firstName && (
              <FieldError>{errors.firstName.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="qc-lastName">
              Last name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              {...register("lastName")}
              id="qc-lastName"
              autoComplete="family-name"
              aria-required="true"
              aria-invalid={!!errors.lastName}
              data-testid="quick-capture-last-name"
            />
            {errors.lastName && (
              <FieldError>{errors.lastName.message}</FieldError>
            )}
          </Field>
        </div>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="qc-phone">
            Phone <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            {...register("phone")}
            id="qc-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            aria-required="true"
            aria-invalid={!!errors.phone}
            data-testid="quick-capture-phone"
          />
          {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="qc-notes">
            Notes{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Textarea
            {...register("notes")}
            id="qc-notes"
            rows={3}
            placeholder="Met at BBQ, interested in Springfield estate…"
            data-testid="quick-capture-notes"
          />
        </Field>

        <Field>
          <FieldLabel>Lead source</FieldLabel>
          <Controller
            name="leadSource"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "other"}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  className="w-full"
                  data-testid="quick-capture-lead-source"
                >
                  <span
                    className="flex flex-1 text-left"
                    data-slot="select-value"
                  >
                    {LEAD_SOURCE_OPTIONS.find(
                      (o) => o.value === (field.value ?? "other"),
                    )?.label ?? "Select source"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      {createLead.error && !createLead.error.data && (
        <p role="alert" className="text-destructive text-sm">
          {createLead.error.message}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={createLead.isPending}
        data-testid="quick-capture-submit"
        className="w-full"
      >
        {createLead.isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save lead"
        )}
      </Button>
    </form>
  );
}
