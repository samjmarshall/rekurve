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

const CONTACT_TIME_OPTIONS = [
  { value: "weekdays" as const, label: "Weekdays" },
  { value: "weekends" as const, label: "Weekends" },
  { value: "anytime" as const, label: "Anytime" },
];

interface ContactDetailsProps {
  form: UseFormReturn<LeadCreate>;
}

export function ContactDetails({ form }: ContactDetailsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.firstName}>
          <FieldLabel htmlFor="firstName">
            First name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            {...register("firstName")}
            id="firstName"
            autoComplete="given-name"
            aria-required="true"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            data-testid="lead-form-first-name"
          />
          {errors.firstName && (
            <FieldError id="firstName-error">
              {errors.firstName.message}
            </FieldError>
          )}
        </Field>

        <Field data-invalid={!!errors.lastName}>
          <FieldLabel htmlFor="lastName">
            Last name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            {...register("lastName")}
            id="lastName"
            autoComplete="family-name"
            aria-required="true"
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            data-testid="lead-form-last-name"
          />
          {errors.lastName && (
            <FieldError id="lastName-error">
              {errors.lastName.message}
            </FieldError>
          )}
        </Field>
      </div>

      <Field data-invalid={!!errors.phone}>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input
          {...register("phone")}
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0412 345 678"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          data-testid="lead-form-phone"
        />
        {errors.phone && (
          <FieldError id="phone-error">{errors.phone.message}</FieldError>
        )}
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="john@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          data-testid="lead-form-email"
        />
        {errors.email && (
          <FieldError id="email-error">{errors.email.message}</FieldError>
        )}
      </Field>

      <Field>
        <FieldLabel>
          Best time for contact{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Controller
          name="preferredContactTime"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              options={CONTACT_TIME_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              aria-label="Preferred contact time"
            />
          )}
        />
      </Field>
    </FieldGroup>
  );
}
