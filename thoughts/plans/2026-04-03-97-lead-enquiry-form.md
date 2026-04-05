# Full Lead Enquiry Form Implementation Plan

## Overview

Build a mobile-first, 4-step enquiry form at `/leads/new` within the `(application)` route group. The consultant fills this out on their phone after a display home walk-in conversation. The form mirrors the Creation Homes Display Client Enquiry Form v1.2, submits via the existing `leads.create` tRPC mutation, and validates with the existing `leadCreateSchema` plus client-side AU mobile phone format validation. Target: under 3 minutes to complete on mobile.

## Current State Analysis

### What exists:
- **tRPC leads router** with `leads.create` mutation — inserts lead, returns it, hardcodes `leadStage: "unqualified"` and `leadScore: 0` (`src/server/api/routers/leads.ts:13-25`)
- **`leadCreateSchema`** with all required fields — only `firstName`/`lastName` required, everything else `.nullish()` (`src/server/api/schemas/leads.ts:41-70`)
- **`LeadCreate` type** exported for form components (`src/server/api/schemas/leads.ts:105`)
- **`(application)` route group** with auth-gated layout, sidebar, bottom nav (`src/app/(application)/layout.tsx`)
- **Pipeline page** — empty placeholder "No leads yet" (`src/app/(application)/pipeline/page.tsx`)
- **Multi-step form pattern** — BookingForm.tsx with React Hook Form + Zod + AnimatePresence (`src/app/(website)/_components/sections/BookingForm.tsx`)
- **UI primitives** — Field, FieldLabel, FieldError, FieldGroup, Input, Select, Checkbox, Textarea, Button, Card (`src/components/ui/`)
- **Dependencies installed** — `react-hook-form@7.66.0`, `@hookform/resolvers@5.2.2`, `framer-motion@12.23.24`, `zod`
- **tRPC client** — `useTRPC()` hook from `@trpc/tanstack-react-query` with `mutationOptions()` pattern (`src/trpc/react.tsx:14`)
- **E2E test stubs** — `leads-crud.spec.ts` with `test.fixme()` placeholders (`e2e/features/leads-crud.spec.ts`)

### What's missing:
- No `/leads/` routes exist
- No radio/toggle/segmented-control UI components (needed for Yes/No and short enum fields)
- No "Add Lead" action on the Pipeline page
- No AU phone number validation
- No lead profile page (success state will link to Pipeline)

### Key Discoveries:
- The `Select` component uses `@base-ui/react/select` with portal positioning (`src/components/ui/select.tsx:3`)
- The existing `BookingForm` uses `Controller` from react-hook-form for Select/Checkbox integration (`BookingForm.tsx:513-787`)
- tRPC v11 mutation pattern: `useMutation(trpc.leads.create.mutationOptions())` from `@tanstack/react-query`
- `FieldError` supports both `children` and `errors` array prop (`src/components/ui/field.tsx:175-225`)

## Desired End State

A working multi-step lead enquiry form accessible from the Pipeline page header. The consultant taps "Add Lead," fills four steps of qualification data (contact, land, build, additional), and submits. The form validates per-step, submits via tRPC, and shows a success screen with the lead's name and stage. The form is fast, thumb-friendly, and completable in under 3 minutes on mobile.

### Verification:
- `make check` passes (lint + typecheck)
- `make test` passes (unit tests including AU phone validation)
- `make test_e2e` passes (E2E tests for form navigation and submission)
- Manual: Complete the form on a mobile viewport in under 3 minutes

## What We're NOT Doing

- Lead profile/detail page (separate issue)
- Quick capture form (separate flow, different schema)
- Voice-to-text input for notes
- Offline/PWA support
- Analytics tracking on form steps (can be added later)
- Form draft auto-save/persistence

## Implementation Approach

Follow the existing BookingForm pattern: React Hook Form with `zodResolver`, per-step validation via `trigger()`, AnimatePresence for step transitions. For mobile-optimised Yes/No and short-enum fields, build a lightweight `SegmentedControl` component instead of using dropdowns (larger tap targets, single-tap selection). Keep the form in a dedicated route `/leads/new` rather than a modal, giving full screen real estate on mobile.

---

## Phase 1: Route, Navigation & Form Shell

### Overview
Create the page route, add the "Add Lead" header action on the Pipeline page, and build the form shell with step navigation state, progress indicator, and React Hook Form + Zod wiring.

### Changes Required:

#### 1. Pipeline Page — Add Lead Header Action
**File**: `src/app/(application)/pipeline/page.tsx`
**Changes**: Add a header bar with "Add Lead" button linking to `/leads/new`. Keep the empty state content below.

```tsx
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "~/components/ui/Button";

export default function PipelinePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold text-lg">Pipeline</h1>
        <Button asChild variant="primary" size="sm">
          <Link href="/leads/new">
            <Plus className="mr-1.5 size-4" />
            Add Lead
          </Link>
        </Button>
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="font-semibold text-lg">No leads yet</h2>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm">
            Your leads will appear here, grouped by stage
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Lead Form Page Route
**File**: `src/app/(application)/leads/new/page.tsx`
**Changes**: Server Component that renders the client-side form. Minimal — just a page wrapper.

```tsx
import type { Metadata } from "next";
import { LeadForm } from "./_components/lead-form";

export const metadata: Metadata = {
  title: "New Lead | Rekurve",
};

export default function NewLeadPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LeadForm />
    </div>
  );
}
```

#### 3. Form Shell — Main Orchestrator
**File**: `src/app/(application)/leads/new/_components/lead-form.tsx`
**Changes**: Client component that manages form state, step navigation, progress indicator, and step rendering. Sets up React Hook Form with the extended client schema.

Key responsibilities:
- `useForm<LeadCreate>` with `zodResolver(leadFormSchema)` where `leadFormSchema` extends `leadCreateSchema` with AU phone validation
- `currentStep` state (1-4) plus "success" state
- `handleNextStep()` — validates current step fields via `trigger()`, advances if valid
- `handlePrevStep()` — decrements step, no validation needed
- `onSubmit()` — calls tRPC `leads.create` mutation
- Renders `FormProgress`, step components inside `AnimatePresence`, and `FormNavigation`

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/Button";
import type { LeadCreate } from "~/server/api/schemas/leads";
import { useTRPC } from "~/trpc/react";
import { leadFormSchema } from "../_lib/schema";
import { AdditionalInfo } from "./form-steps/additional-info";
import { BuildDetails } from "./form-steps/build-details";
import { ContactDetails } from "./form-steps/contact-details";
import { LandStatus } from "./form-steps/land-status";
import { FormNavigation } from "./form-navigation";
import { FormProgress } from "./form-progress";
import { SuccessScreen } from "./success-screen";

const STEPS = [
  { id: 1, title: "Contact" },
  { id: 2, title: "Land" },
  { id: 3, title: "Build" },
  { id: 4, title: "Additional" },
] as const;

// Fields to validate per step
const STEP_FIELDS: Record<number, (keyof LeadCreate)[]> = {
  1: ["firstName", "lastName", "phone", "email", "preferredContactTime"],
  2: ["hasLand", "landRegistered", "landAddress", "landSizeSqm", "landWidth", "landDepth"],
  3: ["propertyType", "budget", "seenBroker", "constructionTimeline"],
  4: ["resolveFinanceOptedIn", "preferredEstates", "preferredSuburbs", "notes", "leadSource"],
};

export function LeadForm() {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<LeadCreate>({
    resolver: zodResolver(leadFormSchema),
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
    }),
  );

  const handleNextStep = async () => {
    const fields = STEP_FIELDS[currentStep];
    const isValid = await form.trigger(fields);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = (data: LeadCreate) => {
    createLead.mutate(data);
  };

  if (currentStep === 5) {
    return (
      <SuccessScreen
        leadName={`${form.getValues("firstName")} ${form.getValues("lastName")}`}
        onAddAnother={() => {
          form.reset({ leadSource: "walk_in" });
          setCurrentStep(1);
        }}
      />
    );
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="sm" className="size-9 p-0">
          <Link href="/pipeline" aria-label="Back to pipeline">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-semibold text-lg">New Lead</h1>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <FormProgress steps={STEPS} currentStep={currentStep} />

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-1 flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <ContactDetails form={form} />
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <LandStatus form={form} />
                </motion.div>
              )}
              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <BuildDetails form={form} />
                </motion.div>
              )}
              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
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
    </>
  );
}
```

#### 4. Client-Side Form Schema with AU Phone Validation
**File**: `src/app/(application)/leads/new/_lib/schema.ts`
**Changes**: Extends `leadCreateSchema` with a `.superRefine()` for AU mobile phone format. The server schema stays unchanged — this is client-only enhancement.

```ts
import { leadCreateSchema } from "~/server/api/schemas/leads";

// Australian mobile: 04xx xxx xxx or +614xx xxx xxx
// Strips spaces/dashes before matching
const AU_MOBILE_REGEX = /^(\+?61|0)4\d{8}$/;

export function isValidAuMobile(value: string): boolean {
  const stripped = value.replace(/[\s\-()]/g, "");
  return AU_MOBILE_REGEX.test(stripped);
}

export const leadFormSchema = leadCreateSchema.superRefine((data, ctx) => {
  if (data.phone) {
    if (!isValidAuMobile(data.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a valid AU mobile number (e.g. 0412 345 678)",
      });
    }
  }
});
```

#### 5. Progress Indicator
**File**: `src/app/(application)/leads/new/_components/form-progress.tsx`
**Changes**: Horizontal step indicator. Mobile-optimised: shows step numbers with active/completed states and step titles.

```tsx
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
            <li key={step.id} className="flex flex-1 items-center">
              {index > 0 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    isCompleted || isActive ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive && "border-2 border-primary text-primary",
                    !isActive && !isCompleted && "border border-border text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
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
```

#### 6. Form Navigation (Back / Next / Submit)
**File**: `src/app/(application)/leads/new/_components/form-navigation.tsx`
**Changes**: Bottom-anchored navigation buttons. "Back" on left (steps 2-4), "Next" or "Submit" on right. Submit button shows loading state.

```tsx
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
            variant="outline"
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
```

### Tests:

#### Unit Test — AU Phone Validation
**File**: `src/app/(application)/leads/new/_lib/__tests__/schema.test.ts`

```ts
import { describe, expect, test } from "@rstest/core";
import { isValidAuMobile, leadFormSchema } from "../schema";

describe("isValidAuMobile", () => {
  test("accepts standard AU mobile format", () => {
    expect(isValidAuMobile("0412345678")).toBe(true);
  });

  test("accepts format with spaces", () => {
    expect(isValidAuMobile("0412 345 678")).toBe(true);
  });

  test("accepts international format", () => {
    expect(isValidAuMobile("+61412345678")).toBe(true);
  });

  test("accepts format with dashes", () => {
    expect(isValidAuMobile("0412-345-678")).toBe(true);
  });

  test("rejects landline number", () => {
    expect(isValidAuMobile("0732001234")).toBe(false);
  });

  test("rejects too-short number", () => {
    expect(isValidAuMobile("041234567")).toBe(false);
  });

  test("rejects non-AU number", () => {
    expect(isValidAuMobile("+1555123456")).toBe(false);
  });
});

describe("leadFormSchema", () => {
  test("accepts valid data with AU phone", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      phone: "0412 345 678",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid AU phone", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      phone: "555-1234",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty phone (optional field)", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes — no type errors, no lint errors
- [x] `make test` passes — AU phone validation unit tests green
- [ ] Page route renders at `/leads/new` (navigable from Pipeline)
- [ ] Form shell renders with progress indicator and navigation buttons

#### Manual Verification:
- [ ] "Add Lead" button visible on Pipeline page header
- [ ] Clicking "Add Lead" navigates to `/leads/new`
- [ ] Back arrow in form header returns to `/pipeline`
- [ ] Progress indicator shows 4 steps with correct active state
- [ ] Next/Back buttons navigate between steps

---

## Phase 2: Form Steps 1-4

### Overview
Implement all four form step components with their fields, per-step validation, and a reusable `SegmentedControl` for Yes/No and short-enum selections.

### Changes Required:

#### 1. Segmented Control Component
**File**: `src/app/(application)/leads/new/_components/segmented-control.tsx`
**Changes**: A mobile-friendly button group for selecting from 2-4 options. Larger tap targets than a dropdown. Used for Yes/No fields, preferred contact time, construction timeline, and property type.

```tsx
"use client";

import { cn } from "~/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  "aria-label"?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  columns = options.length <= 3 ? options.length as 2 | 3 : 2,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

#### 2. Step 1 — Contact Details
**File**: `src/app/(application)/leads/new/_components/form-steps/contact-details.tsx`
**Changes**: Full name (first + last), phone, email, preferred contact time. Phone has inline AU format hint.

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/Input";
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
  const { register, control, formState: { errors } } = form;

  return (
    <FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!errors.firstName}>
          <FieldLabel htmlFor="firstName">
            First name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            {...register("firstName")}
            id="firstName"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            data-testid="lead-form-first-name"
          />
          {errors.firstName && (
            <FieldError id="firstName-error">{errors.firstName.message}</FieldError>
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
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            data-testid="lead-form-last-name"
          />
          {errors.lastName && (
            <FieldError id="lastName-error">{errors.lastName.message}</FieldError>
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
        <FieldLabel>Best time for contact</FieldLabel>
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
```

#### 3. Step 2 — Land Status
**File**: `src/app/(application)/leads/new/_components/form-steps/land-status.tsx`
**Changes**: Has land? (Yes/No) -> conditional: land registered? (Yes/No), address, dimensions (m2, width, depth). Land details only show when `hasLand` is true.

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/Input";
import type { LeadCreate } from "~/server/api/schemas/leads";
import { SegmentedControl } from "../segmented-control";

const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

interface LandStatusProps {
  form: UseFormReturn<LeadCreate>;
}

export function LandStatus({ form }: LandStatusProps) {
  const { register, control, watch, formState: { errors } } = form;
  const hasLand = watch("hasLand");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Do you have land?</FieldLabel>
        <Controller
          name="hasLand"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              options={YES_NO_OPTIONS}
              value={field.value == null ? undefined : String(field.value)}
              onChange={(v) => field.onChange(v === "true")}
              aria-label="Has land"
            />
          )}
        />
      </Field>

      <AnimatePresence>
        {hasLand && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Is land registered?</FieldLabel>
                <Controller
                  name="landRegistered"
                  control={control}
                  render={({ field }) => (
                    <SegmentedControl
                      options={YES_NO_OPTIONS}
                      value={field.value == null ? undefined : String(field.value)}
                      onChange={(v) => field.onChange(v === "true")}
                      aria-label="Land registered"
                    />
                  )}
                />
              </Field>

              <Field data-invalid={!!errors.landAddress}>
                <FieldLabel htmlFor="landAddress">Property address</FieldLabel>
                <Input
                  {...register("landAddress")}
                  id="landAddress"
                  placeholder="123 Example St, Springfield"
                  aria-invalid={!!errors.landAddress}
                  data-testid="lead-form-land-address"
                />
                {errors.landAddress && (
                  <FieldError>{errors.landAddress.message}</FieldError>
                )}
              </Field>

              <div>
                <FieldLabel>Property dimensions</FieldLabel>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <Field data-invalid={!!errors.landSizeSqm}>
                    <FieldLabel htmlFor="landSizeSqm" className="text-xs text-muted-foreground">
                      Area (m2)
                    </FieldLabel>
                    <Input
                      {...register("landSizeSqm")}
                      id="landSizeSqm"
                      inputMode="decimal"
                      placeholder="450"
                      data-testid="lead-form-land-sqm"
                    />
                  </Field>
                  <Field data-invalid={!!errors.landWidth}>
                    <FieldLabel htmlFor="landWidth" className="text-xs text-muted-foreground">
                      Width (m)
                    </FieldLabel>
                    <Input
                      {...register("landWidth")}
                      id="landWidth"
                      inputMode="decimal"
                      placeholder="15"
                      data-testid="lead-form-land-width"
                    />
                  </Field>
                  <Field data-invalid={!!errors.landDepth}>
                    <FieldLabel htmlFor="landDepth" className="text-xs text-muted-foreground">
                      Depth (m)
                    </FieldLabel>
                    <Input
                      {...register("landDepth")}
                      id="landDepth"
                      inputMode="decimal"
                      placeholder="30"
                      data-testid="lead-form-land-depth"
                    />
                  </Field>
                </div>
              </div>
            </FieldGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </FieldGroup>
  );
}
```

#### 4. Step 3 — Build Details
**File**: `src/app/(application)/leads/new/_components/form-steps/build-details.tsx`
**Changes**: Property type (6 options, 2-col segmented control), budget (free text), seen broker? (Yes/No), construction timeline (3 options segmented).

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/Input";
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
  const { register, control, formState: { errors } } = form;

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
              aria-label="Property type"
            />
          )}
        />
        {errors.propertyType && (
          <FieldError>{errors.propertyType.message}</FieldError>
        )}
      </Field>

      <Field data-invalid={!!errors.budget}>
        <FieldLabel htmlFor="budget">Budget</FieldLabel>
        <Input
          {...register("budget")}
          id="budget"
          placeholder="e.g. $650,000"
          inputMode="text"
          data-testid="lead-form-budget"
        />
        {errors.budget && (
          <FieldError>{errors.budget.message}</FieldError>
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
              aria-label="Construction timeline"
            />
          )}
        />
        {errors.constructionTimeline && (
          <FieldError>{errors.constructionTimeline.message}</FieldError>
        )}
      </Field>
    </FieldGroup>
  );
}
```

#### 5. Step 4 — Additional Info
**File**: `src/app/(application)/leads/new/_components/form-steps/additional-info.tsx`
**Changes**: Resolve Finance opt-in (checkbox), preferred estates/suburbs (comma-separated text input, split to array on submit), notes (textarea), lead source (select dropdown).

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/Textarea";
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
  const { register, control, formState: { errors } } = form;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Resolve Finance referral</FieldLabel>
        <Controller
          name="resolveFinanceOptedIn"
          control={control}
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                className="mt-0.5"
                data-testid="lead-form-resolve-finance"
              />
              <span className="text-sm">
                Yes, I would like Resolve Finance to contact me for an obligation-free loan enquiry.
              </span>
            </label>
          )}
        />
      </Field>

      <Field data-invalid={!!errors.preferredEstates}>
        <FieldLabel htmlFor="preferredEstates">Preferred estates</FieldLabel>
        <FieldDescription>Separate multiple estates with commas</FieldDescription>
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
                  val ? val.split(",").map((s) => s.trim()).filter(Boolean) : null,
                );
              }}
              data-testid="lead-form-preferred-estates"
            />
          )}
        />
      </Field>

      <Field data-invalid={!!errors.preferredSuburbs}>
        <FieldLabel htmlFor="preferredSuburbs">Preferred suburbs</FieldLabel>
        <FieldDescription>Separate multiple suburbs with commas</FieldDescription>
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
                  val ? val.split(",").map((s) => s.trim()).filter(Boolean) : null,
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
          placeholder="Any additional context from the conversation..."
          aria-invalid={!!errors.notes}
          data-testid="lead-form-notes"
        />
        {errors.notes && (
          <FieldError>{errors.notes.message}</FieldError>
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
                <SelectValue placeholder="Select source" />
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
```

#### 6. Success Screen
**File**: `src/app/(application)/leads/new/_components/success-screen.tsx`
**Changes**: Confirmation screen shown after successful submission. Shows lead name, "Unqualified" stage badge, and two action buttons.

```tsx
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";

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
      <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
      </div>

      <div>
        <h2 className="font-semibold text-xl">Lead saved</h2>
        <p className="mt-2 text-muted-foreground">{leadName}</p>
        <Badge variant="secondary" className="mt-2">
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
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/pipeline" data-testid="lead-form-go-pipeline">
            Go to Pipeline
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

### Tests:

No new unit tests required for this phase — the form step components are presentational and rely on the Zod schema (already tested) and React Hook Form integration (tested via E2E in Phase 4).

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes — all new components typecheck correctly
- [x] `make test` passes — existing tests unaffected

#### Manual Verification:
- [ ] Step 1: First name, last name, phone, email, preferred contact time all render and accept input
- [ ] Step 2: "Has land?" Yes/No toggles conditional fields; dimensions render in 3-col grid
- [ ] Step 3: Property type shows 6 options in 2-col layout; timeline shows 3 options
- [ ] Step 4: Resolve Finance checkbox, comma-separated estates/suburbs, notes textarea, lead source dropdown
- [ ] Validation: Next button blocked with inline errors when required fields empty on step 1
- [ ] Back navigation preserves all entered data
- [ ] AnimatePresence transitions smooth between steps

---

## Phase 3: Submission & Success Integration

### Overview
Wire the form submission end-to-end: tRPC mutation, error handling, success screen behaviour, and the "Add Another" reset flow.

### Changes Required:

#### 1. Verify tRPC Mutation Integration
The mutation is already wired in Phase 1's `lead-form.tsx`. This phase focuses on:
- Verifying the full submit flow works with the tRPC `leads.create` mutation
- Handling server-side validation errors (Zod errors from tRPC are formatted with `zodError` field)
- Testing the `onSuccess` callback transitions to the success screen
- Testing the "Add Another Lead" button resets the form and returns to step 1

No new files needed — this is integration verification of Phase 1 + 2 code.

#### 2. Error Display Refinement
**File**: `src/app/(application)/leads/new/_components/form-navigation.tsx`
**Changes**: If the tRPC error contains Zod field errors, surface them more helpfully. The existing `submitError` string display handles generic errors; for field-level errors, the form's `setError` can be used.

Update `lead-form.tsx` `onError` to handle field-level errors:

```tsx
// In lead-form.tsx — add to mutationOptions
const createLead = useMutation(
  trpc.leads.create.mutationOptions({
    onSuccess: () => {
      setCurrentStep(5);
    },
    onError: (error) => {
      // If tRPC returns Zod field errors, set them on the form
      const zodErrors = (error.data as { zodError?: { fieldErrors?: Record<string, string[]> } })?.zodError?.fieldErrors;
      if (zodErrors) {
        for (const [field, messages] of Object.entries(zodErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof LeadCreate, { message: messages[0] });
          }
        }
      }
    },
  }),
);
```

### Tests:

No new unit tests for this phase — integration is validated via E2E in Phase 4.

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `make test` passes

#### Manual Verification:
- [ ] Fill all 4 steps and submit — lead is created, success screen shows with correct name
- [ ] "Add Another Lead" resets form, returns to step 1 with `leadSource` defaulted to "walk_in"
- [ ] "Go to Pipeline" navigates to `/pipeline`
- [ ] Submit with server down — error message displays
- [ ] Loading spinner shows on submit button while request is in-flight
- [ ] Submit button disabled during submission (prevents double-submit)

---

## Phase 4: E2E Tests

### Overview
Implement the E2E test for the full enquiry form flow in the existing `leads-crud.spec.ts` stub. Create a page object for the lead form.

### Changes Required:

#### 1. Lead Form Page Object
**File**: `e2e/pages/sections/lead-form.section.ts`
**Changes**: Page object with selectors for all form fields, step navigation methods, and assertion helpers. Follows the existing `BookingFormSection` pattern.

```ts
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LeadFormSection {
  readonly page: Page;

  // Navigation
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly successScreen: Locator;
  readonly addAnotherButton: Locator;
  readonly goToPipelineLink: Locator;

  // Step 1: Contact
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;

  // Step 2: Land
  readonly landAddressInput: Locator;
  readonly landSqmInput: Locator;
  readonly landWidthInput: Locator;
  readonly landDepthInput: Locator;

  // Step 3: Build
  readonly budgetInput: Locator;

  // Step 4: Additional
  readonly resolveFinanceCheckbox: Locator;
  readonly preferredEstatesInput: Locator;
  readonly preferredSuburbsInput: Locator;
  readonly notesTextarea: Locator;
  readonly leadSourceTrigger: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nextButton = page.locator('[data-testid="lead-form-next-btn"]');
    this.backButton = page.locator('[data-testid="lead-form-back-btn"]');
    this.submitButton = page.locator('[data-testid="lead-form-submit-btn"]');
    this.successScreen = page.locator('[data-testid="lead-form-success"]');
    this.addAnotherButton = page.locator('[data-testid="lead-form-add-another"]');
    this.goToPipelineLink = page.locator('[data-testid="lead-form-go-pipeline"]');

    // Step 1
    this.firstNameInput = page.locator('[data-testid="lead-form-first-name"]');
    this.lastNameInput = page.locator('[data-testid="lead-form-last-name"]');
    this.phoneInput = page.locator('[data-testid="lead-form-phone"]');
    this.emailInput = page.locator('[data-testid="lead-form-email"]');

    // Step 2
    this.landAddressInput = page.locator('[data-testid="lead-form-land-address"]');
    this.landSqmInput = page.locator('[data-testid="lead-form-land-sqm"]');
    this.landWidthInput = page.locator('[data-testid="lead-form-land-width"]');
    this.landDepthInput = page.locator('[data-testid="lead-form-land-depth"]');

    // Step 3
    this.budgetInput = page.locator('[data-testid="lead-form-budget"]');

    // Step 4
    this.resolveFinanceCheckbox = page.locator('[data-testid="lead-form-resolve-finance"]');
    this.preferredEstatesInput = page.locator('[data-testid="lead-form-preferred-estates"]');
    this.preferredSuburbsInput = page.locator('[data-testid="lead-form-preferred-suburbs"]');
    this.notesTextarea = page.locator('[data-testid="lead-form-notes"]');
    this.leadSourceTrigger = page.locator('[data-testid="lead-form-lead-source"]');
  }

  async fillStep1(data: { firstName: string; lastName: string; phone?: string; email?: string }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    if (data.phone) await this.phoneInput.fill(data.phone);
    if (data.email) await this.emailInput.fill(data.email);
  }

  async selectSegmented(label: string, optionText: string) {
    const group = this.page.getByRole("radiogroup", { name: label });
    await group.getByRole("radio", { name: optionText }).click();
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async expectSuccess(name: string) {
    await expect(this.successScreen).toBeVisible({ timeout: 10000 });
    await expect(this.successScreen).toContainText(name);
  }
}
```

#### 2. E2E Test — Full Enquiry Form Flow
**File**: `e2e/features/leads-crud.spec.ts`
**Changes**: Implement the first test stub: create a lead via the full enquiry form and verify success.

```ts
import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import { getSessionCookie } from "../utils/session-cookie";
import { LeadFormSection } from "../pages/sections/lead-form.section";

test.describe("Leads CRUD — E2E", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  test("create a lead via the full enquiry form and verify it appears in the pipeline", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    // Navigate to form via Pipeline page
    await page.goto("/pipeline");
    await page.getByRole("link", { name: /add lead/i }).click();
    await page.waitForURL("**/leads/new");

    const form = new LeadFormSection(page);
    const uniqueId = Date.now().toString(36);

    // Step 1: Contact
    await form.fillStep1({
      firstName: "E2E",
      lastName: `Test ${uniqueId}`,
      phone: "0412345678",
      email: `e2e-${uniqueId}@test.rekurve.dev`,
    });
    await form.selectSegmented("Preferred contact time", "Anytime");
    await form.clickNext();

    // Step 2: Land
    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landAddressInput.fill("123 Test St");
    await form.landSqmInput.fill("450");
    await form.landWidthInput.fill("15");
    await form.landDepthInput.fill("30");
    await form.clickNext();

    // Step 3: Build
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$650,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    // Step 4: Additional
    await form.notesTextarea.fill("E2E test lead");
    await form.clickSubmit();

    // Verify success
    await form.expectSuccess(`E2E Test ${uniqueId}`);
  });

  test("step validation prevents advancing with empty required fields", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/leads/new");

    const form = new LeadFormSection(page);

    // Try to advance without filling required fields
    await form.clickNext();

    // Should still be on step 1 — validation error visible
    await expect(form.firstNameInput).toBeVisible();
    await expect(page.locator('[data-slot="field-error"]').first()).toBeVisible();
  });

  test("back navigation preserves entered data", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
    await page.goto("/leads/new");

    const form = new LeadFormSection(page);

    // Fill step 1
    await form.fillStep1({ firstName: "Persist", lastName: "Test" });
    await form.clickNext();

    // Go back
    await page.locator('[data-testid="lead-form-back-btn"]').click();

    // Data should be preserved
    await expect(form.firstNameInput).toHaveValue("Persist");
    await expect(form.lastNameInput).toHaveValue("Test");
  });

  test("create a lead via quick capture and verify stage defaults to unqualified", () => {
    test.fixme();
  });

  test("update a lead's details and verify changes persist on reload", () => {
    test.fixme();
  });

  test("delete a lead and verify it is removed from the pipeline", () => {
    test.fixme();
  });

  test("filter the lead list by stage and verify correct results", () => {
    test.fixme();
  });

  test("pipeline board displays leads grouped by stage (unqualified, nurture, warm, hot)", () => {
    test.fixme();
  });

  test("Zod validation errors surface in the UI when submitting invalid form data", () => {
    test.fixme();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes
- [x] `make test` passes — all unit tests green including AU phone validation
- [ ] `make test_e2e` passes (locally with DATABASE_URL) — lead form E2E tests green

#### Manual Verification:
- [ ] Full form completion on mobile viewport (375px) in under 3 minutes
- [ ] Keyboard navigation works through all form fields (Tab, Enter, Space)
- [ ] Screen reader labels present on all inputs (test with VoiceOver)
- [ ] Dark mode renders correctly across all steps

---

## Performance Considerations

- **Bundle size**: The form is in the `(application)` route group behind auth, so it's already code-split from the public site. AnimatePresence/motion adds ~15KB gzipped but is already a dependency.
- **No unnecessary re-renders**: React Hook Form's `useForm` with `mode: "onSubmit"` prevents validating on every keystroke. `watch("hasLand")` only triggers re-render on that specific field change.
- **Mobile performance**: No heavy animations — 200ms opacity/slide transitions. `inputMode="decimal"` on numeric fields opens the numeric keyboard on mobile.

## Migration Notes

No migration needed. This is a new feature with no existing data to migrate.

## File Summary

New files to create:
```
src/app/(application)/leads/new/
  page.tsx
  _lib/
    schema.ts
    __tests__/
      schema.test.ts
  _components/
    lead-form.tsx
    form-progress.tsx
    form-navigation.tsx
    success-screen.tsx
    segmented-control.tsx
    form-steps/
      contact-details.tsx
      land-status.tsx
      build-details.tsx
      additional-info.tsx

e2e/pages/sections/lead-form.section.ts
```

Existing files to modify:
```
src/app/(application)/pipeline/page.tsx  — add header with "Add Lead" button
e2e/features/leads-crud.spec.ts          — implement first 3 test stubs
```

## References

- GitHub issue: #97
- Enquiry form spec: `docs/sales/Display-Client-Enquiry-Form-v1.2.md`
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- Existing multi-step form: `src/app/(website)/_components/sections/BookingForm.tsx`
- tRPC leads router: `src/server/api/routers/leads.ts`
- Lead validation schemas: `src/server/api/schemas/leads.ts`
- E2E test stubs: `e2e/features/leads-crud.spec.ts`
- tRPC leads router plan: `thoughts/plans/2026-04-02-96-trpc-leads-router-validation-schema.md`
