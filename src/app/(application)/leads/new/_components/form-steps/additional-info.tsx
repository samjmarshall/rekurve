"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
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
import type { LeadCreate } from "~/server/api/schemas/leads";

const LEAD_SOURCE_OPTIONS = [
  { value: "walk_in", label: "Display Home Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social Media" },
  { value: "web", label: "Website" },
  { value: "other", label: "Other" },
];

interface AdditionalInfoProps {
  form: UseFormReturn<LeadCreate>;
}

export function AdditionalInfo({ form }: AdditionalInfoProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Resolve Finance referral</FieldLabel>
        <Controller
          name="resolveFinanceOptedIn"
          control={control}
          render={({ field }) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: label wraps Checkbox (Radix input) as its control
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                className="mt-0.5"
                data-testid="lead-form-resolve-finance"
              />
              <span className="text-sm">
                Yes, I would like Resolve Finance to contact me for an
                obligation-free loan enquiry.
              </span>
            </label>
          )}
        />
      </Field>

      <Field data-invalid={!!errors.preferredEstates}>
        <FieldLabel htmlFor="preferredEstates">Preferred estates</FieldLabel>
        <FieldDescription>
          Separate multiple estates with commas
        </FieldDescription>
        <Controller
          name="preferredEstates"
          control={control}
          render={({ field }) => (
            <Input
              id="preferredEstates"
              placeholder="e.g. Springfield, Yarrabilba"
              value={field.value?.join(", ") ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(
                  val
                    ? val
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : null,
                );
              }}
              data-testid="lead-form-preferred-estates"
            />
          )}
        />
      </Field>

      <Field data-invalid={!!errors.preferredSuburbs}>
        <FieldLabel htmlFor="preferredSuburbs">Preferred suburbs</FieldLabel>
        <FieldDescription>
          Separate multiple suburbs with commas
        </FieldDescription>
        <Controller
          name="preferredSuburbs"
          control={control}
          render={({ field }) => (
            <Input
              id="preferredSuburbs"
              placeholder="e.g. Springfield Lakes, Ripley"
              value={field.value?.join(", ") ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(
                  val
                    ? val
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : null,
                );
              }}
              data-testid="lead-form-preferred-suburbs"
            />
          )}
        />
      </Field>

      <Field data-invalid={!!errors.notes}>
        <FieldLabel htmlFor="notes">Additional notes</FieldLabel>
        <Textarea
          {...register("notes")}
          id="notes"
          rows={3}
          className="resize-none"
          placeholder="Any additional context from the conversation..."
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? "notes-error" : undefined}
          data-testid="lead-form-notes"
        />
        {errors.notes && (
          <FieldError id="notes-error">{errors.notes.message}</FieldError>
        )}
      </Field>

      <Field data-invalid={!!errors.leadSource}>
        <FieldLabel>Lead source</FieldLabel>
        <Controller
          name="leadSource"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "walk_in"}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={!!errors.leadSource}
                data-testid="lead-form-lead-source"
              >
                <span
                  className="flex flex-1 text-left"
                  data-slot="select-value"
                >
                  {LEAD_SOURCE_OPTIONS.find(
                    (o) => o.value === (field.value ?? "walk_in"),
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
  );
}
