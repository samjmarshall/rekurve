"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import type { LeadCreate } from "~/server/api/schemas/leads";
import { SegmentedControl } from "../segmented-control";

const PROPERTY_TYPE_OPTIONS = [
  { value: "single_storey" as const, label: "Single Storey" },
  { value: "double_storey" as const, label: "Double Storey" },
  { value: "investment" as const, label: "Investment" },
  { value: "upsize" as const, label: "Upsize" },
  { value: "downsize" as const, label: "Downsize" },
  { value: "first_home_buyer" as const, label: "First Home Buyer" },
];

const TIMELINE_OPTIONS = [
  { value: "ready_now" as const, label: "Ready Now" },
  { value: "3_6_months" as const, label: "3-6 Months" },
  { value: "12_months_plus" as const, label: "12+ Months" },
];

const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

interface BuildDetailsProps {
  form: UseFormReturn<LeadCreate>;
}

export function BuildDetails({ form }: BuildDetailsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.propertyType}>
        <FieldLabel>Type of property</FieldLabel>
        <Controller
          name="propertyType"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              options={PROPERTY_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              columns={2}
              invalid={!!errors.propertyType}
              aria-label="Property type"
              aria-describedby={
                errors.propertyType ? "propertyType-error" : undefined
              }
            />
          )}
        />
        {errors.propertyType && (
          <FieldError id="propertyType-error">
            {errors.propertyType.message}
          </FieldError>
        )}
      </Field>

      <Field data-invalid={!!errors.budget}>
        <FieldLabel htmlFor="budget">Budget</FieldLabel>
        <Input
          {...register("budget")}
          id="budget"
          placeholder="e.g. $650,000"
          inputMode="text"
          aria-invalid={!!errors.budget}
          aria-describedby={errors.budget ? "budget-error" : undefined}
          data-testid="lead-form-budget"
        />
        {errors.budget && (
          <FieldError id="budget-error">{errors.budget.message}</FieldError>
        )}
      </Field>

      <Field>
        <FieldLabel>Have you seen a broker/lender?</FieldLabel>
        <Controller
          name="seenBroker"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              options={YES_NO_OPTIONS}
              value={field.value == null ? undefined : String(field.value)}
              onChange={(v) => field.onChange(v === "true")}
              aria-label="Seen broker"
            />
          )}
        />
      </Field>

      <Field data-invalid={!!errors.constructionTimeline}>
        <FieldLabel>Timeline to start construction</FieldLabel>
        <Controller
          name="constructionTimeline"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              options={TIMELINE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              columns={3}
              invalid={!!errors.constructionTimeline}
              aria-label="Construction timeline"
              aria-describedby={
                errors.constructionTimeline
                  ? "constructionTimeline-error"
                  : undefined
              }
            />
          )}
        />
        {errors.constructionTimeline && (
          <FieldError id="constructionTimeline-error">
            {errors.constructionTimeline.message}
          </FieldError>
        )}
      </Field>
    </FieldGroup>
  );
}
