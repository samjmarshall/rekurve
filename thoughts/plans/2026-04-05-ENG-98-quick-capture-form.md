# Quick Capture Form (#98) Implementation Plan

## Overview

Build a minimal lead-capture modal (first name + last name + phone + notes + optional lead source) that opens from a floating action button on the dashboard. Target: a consultant at a networking event or social gathering captures a lead in under 60 seconds and moves on. The captured lead lands in the `unqualified` stage with score 0; AI scoring (#99) will later fill in the gaps.

This plan also introduces two reusable UI primitives the codebase does not yet have — a `Dialog` adapter and a `Toast` adapter — both built on `@base-ui/react@1.3.0`, matching the existing pattern used for `Select` and `Checkbox`.

## Current State Analysis

**Server is already ready.** The existing `leads.create` mutation at `src/server/api/routers/leads.ts:13-25` accepts minimal payloads — `leadCreateSchema` only requires `firstName` + `lastName`, with every other field `.nullish()`. It hardcodes `leadStage: "unqualified"` and `leadScore: 0` on insert (lines 20-21). The unit test at `src/server/api/__tests__/leads-router.test.ts:105-121` already verifies that a `{ firstName, lastName, phone, notes }` payload creates a valid lead. **No router changes are needed.**

**The `leadQuickCaptureSchema` exists** at `src/server/api/schemas/leads.ts:79-94` but is unused by any tRPC procedure. It was originally designed for a dedicated `quickCreate` procedure that never shipped. For this feature it serves as conceptual reference only — the client form will use its own zod schema tuned for form validation, and submit against `leadCreateSchema` via `leads.create`.

**The full lead form established all the patterns** this form will reuse: `useTRPC()` + `useMutation(trpc.leads.create.mutationOptions({...}))` (`src/app/(application)/leads/new/_components/lead-form.tsx:69-93`), `leadFormResolver` empty-string cleaner (`_lib/schema.ts:28-36`), AU mobile regex + `isValidAuMobile` helper (`_lib/schema.ts:7-12`), Zod `superRefine` for phone validation (`_lib/schema.ts:14-24`), and `data-testid` naming (`lead-form-*`). The full-form submit-error pattern — extract `error.data.zodError.fieldErrors` and hydrate via `form.setError` — will be copied.

**The codebase has no Dialog, Sheet, Drawer, or Toast component.** `@base-ui/react@1.3.0` is installed and the codebase's convention is to wrap base-ui primitives in thin adapters under `src/components/ui/` (see `select.tsx`, `checkbox.tsx`). Dialog and Toast primitives ship with base-ui and both need adapter wrappers.

**The dashboard is an empty placeholder** (`src/app/(application)/dashboard/page.tsx`) — an `Inbox` icon plus "No pending actions" copy. It is a server component. Adding the quick capture FAB means importing a client component and rendering it.

**An E2E placeholder exists** at `e2e/features/leads-crud.spec.ts:118-120` (`test.fixme()`). The auth pattern (`createTestSession` + `getSessionCookie`) and page-object pattern (`e2e/pages/sections/lead-form.section.ts`) are well-established.

### Key Discoveries:
- `leadCreateSchema` already accepts the minimal quick-capture shape — no new procedure needed (`src/server/api/schemas/leads.ts:41-76`).
- Router hardcodes `leadStage: "unqualified"` + `leadScore: 0` on insert (`src/server/api/routers/leads.ts:18-22`).
- `isValidAuMobile` and `AU_MOBILE_REGEX` are defined at `src/app/(application)/leads/new/_lib/schema.ts:7-12` but locked in an underscored `_lib` folder — will be promoted to `src/lib/phone.ts` for reuse.
- Base UI Dialog API (`v1.3.0`): `Dialog.Root` / `Trigger` / `Portal` / `Backdrop` / `Popup` / `Title` / `Description` / `Close`, with `open` + `onOpenChange` props for controlled state and `initialFocus` on `Popup` for autofocus control.
- Base UI Toast API (`v1.3.0`): `Toast.createToastManager()` for global instance, `Toast.Provider` + `Toast.Viewport`, `Toast.useToastManager()` hook, `toastManager.add({ title, description, actionProps: { children, onClick } })` — `actionProps` satisfies the ticket's "View Lead action" requirement.
- `leadSourceEnum` has values `["walk_in", "referral", "social", "web", "other"]` (`src/server/db/schema/enums.ts:32-37`). The ticket's suggested "networking" option is not in the enum — per confirmed decision, we use the existing enum values and label `web` as "Web" in the selector.

## Desired End State

A consultant on a mobile device taps a Quick Add floating action button on the `/dashboard` page. A bottom-sheet modal slides up with the keyboard-focused First Name input. They fill first name, last name, phone, and optionally a short note, then tap Save. The dialog closes, a toast appears at the bottom of the screen confirming "Lead created" with a **View Lead** action button. Tapping **View Lead** navigates to `/leads/[id]`. The toast auto-dismisses after ~6 seconds.

On desktop the same dialog renders as a centered modal. The toast appears in the bottom-right.

A new lead row exists in the `leads` table with `leadStage: "unqualified"`, `leadScore: 0`, and only the fields the consultant entered.

### Verification:
- `make test` passes — includes new client schema unit tests.
- `make test_e2e` passes — includes the new quick-capture E2E test (replacing the existing `test.fixme`).
- `make check` passes — biome + tsc clean.
- Manual: on a mobile viewport, the form can be completed and submitted in under 60 seconds.
- Manual: the toast's "View Lead" action navigates to the created lead's detail page.

## What We're NOT Doing

- **No `leads.quickCreate` tRPC procedure.** Reusing `leads.create`.
- **No changes to `leadCreateSchema`, `leadQuickCaptureSchema`, or the leads router.** Server-side is untouched.
- **No `full_name` single-input with client-side splitting.** Using two separate inputs (firstName, lastName) per confirmed decision.
- **No global Quick Add button on every page.** Dashboard only for MVP. The component lives at `_components/quick-capture/` so it can be dropped onto other pages later without moving files.
- **No URL-driven dialog state / intercepting routes.** Local `useState`.
- **No HubSpot contact sync.** That's a separate issue (#102).
- **No AI scoring trigger from quick capture.** That's #99.
- **No lead-profile page build-out.** If `/leads/[id]` doesn't exist yet, the View Lead toast action will still link there; when #101 lands, the link starts resolving to a real page.
- **No lead-source `networking` enum value.** Ticket's suggestion doesn't match the existing enum; using existing values per confirmed decision.

## Implementation Approach

Six phases, ordered so that each phase can be validated independently before the next builds on it:

1. **Phase 1** — Extract AU phone helpers to `src/lib/phone.ts` (tiny refactor, keeps phase 3 clean).
2. **Phase 2** — Build the reusable `Dialog` adapter in `src/components/ui/dialog.tsx`.
3. **Phase 3** — Build the reusable `Toast` adapter in `src/components/ui/toast.tsx` and mount its provider in the `(application)` layout.
4. **Phase 4** — Build the quick capture form logic: client zod schema + form component + unit tests. No UI wiring yet.
5. **Phase 5** — Wire the FAB button + Dialog + Toast together, mount on the dashboard.
6. **Phase 6** — Replace the E2E `fixme` placeholder with a real test covering the happy path.

Phases 1-3 are infrastructure. Phases 4-6 are the feature itself. Phases 2 and 3 are independent and can be done in parallel if desired.

---

## Phase 1: Extract AU phone helpers to shared lib

### Overview
Move `AU_MOBILE_REGEX` and `isValidAuMobile` out of the full-form's private `_lib` folder into `src/lib/phone.ts` so the quick-capture schema can import them without reaching into another feature's underscored folder.

### Changes Required:

#### 1. New shared helper
**File**: `src/lib/phone.ts` (new)
**Changes**: Export `AU_MOBILE_REGEX` and `isValidAuMobile`. Copy verbatim from existing location.

```ts
// Australian mobile: 04xx xxx xxx or +614xx xxx xxx
// Strips spaces/dashes/parens before matching
export const AU_MOBILE_REGEX = /^(\+?61|0)4\d{8}$/;

export function isValidAuMobile(value: string): boolean {
  const stripped = value.replace(/[\s\-()]/g, "");
  return AU_MOBILE_REGEX.test(stripped);
}
```

#### 2. Update existing full-form schema to import from shared lib
**File**: `src/app/(application)/leads/new/_lib/schema.ts`
**Changes**: Replace the local `AU_MOBILE_REGEX` + `isValidAuMobile` definitions (lines 5-12) with an import from `~/lib/phone`. Keep re-exporting `isValidAuMobile` from this file so existing unit tests at `src/app/(application)/leads/new/_lib/__tests__/schema.test.ts` continue to work unchanged.

```ts
export { isValidAuMobile } from "~/lib/phone";
import { isValidAuMobile } from "~/lib/phone";
// ...rest of file unchanged
```

#### 3. Tests (reuse existing)
**File**: `src/app/(application)/leads/new/_lib/__tests__/schema.test.ts`
**Tests**: Existing `isValidAuMobile` tests continue to pass unchanged — they import through the re-export.

### Success Criteria:

#### Automated Verification:
- [x] `make test` passes — existing phone validation tests still green.
- [x] `make check` passes — no type or lint errors from the move.

#### Manual Verification:
- [x] Grep confirms no lingering duplicate of `AU_MOBILE_REGEX` outside `src/lib/phone.ts`.

---

## Phase 2: Dialog adapter on base-ui

### Overview
Create `src/components/ui/dialog.tsx` — a thin wrapper around `@base-ui/react/dialog` matching the style and shape of the existing `select.tsx` adapter. Ships the first Dialog in the codebase; designed for reuse in future modals (edit lead, delete confirm, etc.).

The popup must responsively render as a bottom sheet on mobile (`< md`) and a centered modal on desktop (`md+`).

### Changes Required:

#### 1. Dialog adapter
**File**: `src/components/ui/dialog.tsx` (new)
**Changes**: Export `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogBackdrop`, `DialogPopup`, `DialogTitle`, `DialogDescription`, `DialogClose`. Mirror the `select.tsx` wrapping convention — forward props, attach `data-slot` attributes, merge className via `cn()`.

```tsx
"use client";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "~/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "data-open:animate-in data-open:fade-in-0",
        "data-closed:animate-out data-closed:fade-out-0",
        "duration-150",
        className,
      )}
      {...props}
    />
  );
}

function DialogPopup({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-popup"
      className={cn(
        // Base: z-index, background, text color
        "fixed z-50 bg-background text-foreground shadow-lg outline-none",
        // Mobile: bottom sheet — full width, pinned to bottom, rounded top corners
        "inset-x-0 bottom-0 rounded-t-2xl border-t",
        "pb-[env(safe-area-inset-bottom)]",
        // Desktop: centered modal
        "md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-lg",
        "md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border",
        // Animations
        "data-open:animate-in data-closed:animate-out",
        "data-open:fade-in-0 data-closed:fade-out-0",
        "data-open:slide-in-from-bottom-full data-closed:slide-out-to-bottom-full",
        "md:data-open:slide-in-from-bottom-4 md:data-closed:slide-out-to-bottom-4",
        "md:data-open:zoom-in-95 md:data-closed:zoom-out-95",
        "duration-200",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute top-3 right-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
      >
        <XIcon className="size-5" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Popup>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-semibold text-lg leading-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes — tsc resolves all base-ui Dialog type names.
- [x] Build succeeds: `make build`.

#### Manual Verification:
- [ ] A throwaway demo page (or Storybook-free mental check via the quick-capture form in Phase 5) shows the dialog opening and closing without layout jank.
- [ ] Dialog slides up from the bottom on a mobile viewport and animates centered on desktop.
- [ ] Pressing `Escape` closes the dialog.
- [ ] Clicking the backdrop closes the dialog.
- [ ] The built-in `X` close button is keyboard-focusable and has visible focus ring.

---

## Phase 3: Toast adapter + provider mounting

### Overview
Create `src/components/ui/toast.tsx` wrapping `@base-ui/react/toast`. Expose a global `toastManager` instance (so it can be imported and called outside React components — useful for future use), a `ToastProvider` client component, and re-export the `useToastManager` hook. Mount `ToastProvider` + viewport in `src/app/(application)/layout.tsx`.

### Changes Required:

#### 1. Toast adapter
**File**: `src/components/ui/toast.tsx` (new)
**Changes**:

```tsx
"use client";
import { Toast } from "@base-ui/react/toast";
import { cn } from "~/lib/utils";

export const toastManager = Toast.createToastManager();

function ToastViewport() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport
        className={cn(
          "fixed z-[60] flex flex-col gap-2 outline-none",
          // Mobile: full width, above bottom nav
          "inset-x-4 bottom-20",
          // Desktop: bottom-right, fixed width
          "md:inset-auto md:right-6 md:bottom-6 md:left-auto md:w-96",
        )}
      >
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            toast={t}
            className={cn(
              "group relative flex w-full items-start gap-3 rounded-lg border bg-background p-4 shadow-lg",
              "data-open:animate-in data-open:slide-in-from-bottom-4 data-open:fade-in-0",
              "data-closed:animate-out data-closed:fade-out-0",
              "data-[type=error]:border-destructive/30 data-[type=error]:bg-destructive/5",
              "duration-200",
            )}
          >
            <div className="flex flex-1 flex-col gap-1">
              <Toast.Title className="font-medium text-sm leading-tight" />
              <Toast.Description className="text-muted-foreground text-sm" />
              <Toast.Action className="mt-2 inline-flex h-8 w-fit items-center rounded-md border bg-background px-3 font-medium text-sm transition-colors hover:bg-accent" />
            </div>
            <Toast.Close
              className="-m-1 p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              ×
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <ToastViewport />
    </Toast.Provider>
  );
}

export const useToastManager = Toast.useToastManager;
```

#### 2. Mount provider in application layout
**File**: `src/app/(application)/layout.tsx`
**Changes**: Wrap the main `<div className="flex min-h-screen">` inside `TRPCReactProvider` with `<ToastProvider>`. Add the import at the top.

```tsx
import { ToastProvider } from "~/components/ui/toast";
// ...
<TRPCReactProvider>
  <ToastProvider>
    <div className="flex min-h-screen">
      <AppSidebar ... />
      <main ...>{children}</main>
      <BottomNav />
    </div>
  </ToastProvider>
</TRPCReactProvider>
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes.
- [x] `make build` passes.
- [ ] Existing E2E tests (`make test_e2e`) still pass — adding the toast provider should not break any existing selectors.

#### Manual Verification:
- [ ] A test toast fired from the browser console (`window.__testToast?.()` or a temporary button) appears in the correct position on mobile and desktop.
- [ ] Toast auto-dismisses after its default timeout.
- [ ] The `actionProps` button is clickable and fires its callback.

---

## Phase 4: Quick capture form — schema, component, unit tests

### Overview
Build the form itself: a client-side zod schema tuned for quick capture (phone required, AU mobile validated, lead source optional with "other" default), a React Hook Form component that submits to `api.leads.create`, and unit tests for the schema.

This phase creates the form in isolation — it does not yet wire up the Dialog or FAB. We verify the form renders and submits by temporarily rendering it on a route; Phase 5 wires it into the Dialog.

### Changes Required:

#### 1. Client schema
**File**: `src/app/(application)/_components/quick-capture/schema.ts` (new)
**Changes**:

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import { isValidAuMobile } from "~/lib/phone";
import { leadSourceSchema } from "~/server/api/schemas/leads";

export const quickCaptureFormSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .min(1, "First name is required")
    .max(100),
  lastName: z
    .string({ error: "Last name is required" })
    .min(1, "Last name is required")
    .max(100),
  phone: z
    .string({ error: "Phone number is required" })
    .min(1, "Phone number is required")
    .max(20)
    .refine(isValidAuMobile, {
      message: "Enter a valid AU mobile number (e.g. 0412 345 678)",
    }),
  notes: z.string().max(5000).optional(),
  leadSource: leadSourceSchema.default("other"),
});

export type QuickCaptureFormValues = z.infer<typeof quickCaptureFormSchema>;

// React Hook Form sends "" for unfilled optional inputs — clean to undefined
// so the optional fields validate correctly.
export const quickCaptureFormResolver: Resolver<QuickCaptureFormValues> = (
  values,
  ctx,
  opts,
) => {
  const cleaned: Record<string, unknown> = { ...values };
  if (cleaned.notes === "") cleaned.notes = undefined;
  return zodResolver(quickCaptureFormSchema)(
    cleaned as QuickCaptureFormValues,
    ctx,
    opts,
  );
};
```

#### 2. Schema unit tests
**File**: `src/app/(application)/_components/quick-capture/__tests__/schema.test.ts` (new)
**Tests**: Verify required-field errors, phone format acceptance/rejection, default lead source.

```ts
import { describe, expect, test } from "@rstest/core";
import { quickCaptureFormSchema } from "../schema";

describe("quickCaptureFormSchema", () => {
  test("accepts minimal valid input with AU mobile", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "0412345678",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.leadSource).toBe("other");
  });

  test("rejects missing first name", () => {
    const result = quickCaptureFormSchema.safeParse({
      lastName: "Doe",
      phone: "0412345678",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing phone", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-AU phone format", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "555-1234",
    });
    expect(result.success).toBe(false);
  });

  test("accepts phone with spaces and international prefix", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+61 412 345 678",
    });
    expect(result.success).toBe(true);
  });

  test("accepts optional notes and lead source override", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "0412345678",
      notes: "Met at BBQ",
      leadSource: "referral",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Met at BBQ");
      expect(result.data.leadSource).toBe("referral");
    }
  });
});
```

#### 3. Form component
**File**: `src/app/(application)/_components/quick-capture/form.tsx` (new)
**Changes**: A React Hook Form component that renders the four inputs + lead source select, submits to `api.leads.create`, and invokes callbacks on success/error. No dialog UI here — just the form body.

```tsx
"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
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
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useTRPC } from "~/trpc/react";
import {
  type QuickCaptureFormValues,
  quickCaptureFormResolver,
} from "./schema";

interface QuickCaptureFormProps {
  onSuccess: (lead: { id: string; firstName: string; lastName: string }) => void;
  autoFocusRef?: React.RefObject<HTMLInputElement | null>;
}

const LEAD_SOURCE_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social" },
  { value: "web", label: "Web" },
  { value: "other", label: "Other" },
] as const;

export function QuickCaptureForm({ onSuccess, autoFocusRef }: QuickCaptureFormProps) {
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
    setValue,
    watch,
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
          error.data as { zodError?: { fieldErrors?: Record<string, string[]> } }
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
            <span className="font-normal text-muted-foreground">(optional)</span>
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
          <Select
            value={watch("leadSource")}
            onValueChange={(v) =>
              setValue("leadSource", v as QuickCaptureFormValues["leadSource"])
            }
          >
            <SelectTrigger data-testid="quick-capture-lead-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
```

> Note: the exact `Select` API (`value` / `onValueChange` vs controller-based) should match how the full form's `additional-info.tsx` uses it. If the base-ui Select API in this project uses `Controller`, wrap the `Select` block in a `<Controller>` instead — verify against `src/app/(application)/leads/new/_components/form-steps/additional-info.tsx` during implementation and match.

### Success Criteria:

#### Automated Verification:
- [x] `make test` passes — new `schema.test.ts` all green.
- [x] `make check` passes.

#### Manual Verification:
- [ ] Rendering `<QuickCaptureForm>` on a temporary route (e.g. a throwaway `/leads/quick-test` page) shows all five inputs with correct labels and placeholders.
- [ ] Submitting with empty required fields shows inline field errors.
- [ ] Submitting with a valid payload creates a lead in the DB (verify via Drizzle Studio or the `/pipeline` page).
- [ ] The temporary test route is removed before merging.

---

## Phase 5: FAB + Dialog + Toast integration on the dashboard

### Overview
Compose the pieces. A `QuickCaptureButton` component owns the dialog open state, renders a floating action button, and renders the `QuickCaptureForm` inside a `Dialog.Popup`. On form success it closes the dialog and fires a toast with a "View Lead" action.

### Changes Required:

#### 1. Quick capture button + dialog wrapper
**File**: `src/app/(application)/_components/quick-capture/button.tsx` (new)
**Changes**:

```tsx
"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useToastManager } from "~/components/ui/toast";
import { QuickCaptureForm } from "./form";

export function QuickCaptureButton() {
  const [open, setOpen] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toastManager = useToastManager();

  const handleSuccess = (lead: { id: string; firstName: string; lastName: string }) => {
    setOpen(false);
    toastManager.add({
      title: "Lead created",
      description: `${lead.firstName} ${lead.lastName} added to pipeline`,
      timeout: 6000,
      actionProps: {
        children: "View Lead",
        onClick: () => router.push(`/leads/${lead.id}`),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Quick add lead"
        data-testid="quick-capture-fab"
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:right-6 md:bottom-6"
      >
        <Plus className="size-6" />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          initialFocus={firstNameRef}
          data-testid="quick-capture-dialog"
          className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto p-6"
        >
          <div className="flex flex-col gap-1">
            <DialogTitle>Quick capture</DialogTitle>
            <DialogDescription>
              Capture just enough to follow up later. AI will fill the gaps.
            </DialogDescription>
          </div>
          <QuickCaptureForm
            onSuccess={handleSuccess}
            autoFocusRef={firstNameRef}
          />
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
```

#### 2. Mount the button on the dashboard
**File**: `src/app/(application)/dashboard/page.tsx`
**Changes**: Import and render `<QuickCaptureButton />` alongside the existing empty state.

```tsx
import { Inbox } from "lucide-react";
import { QuickCaptureButton } from "../_components/quick-capture/button";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Inbox size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No pending actions</h1>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          AI-drafted messages will appear here for your review
        </p>
      </div>
      <QuickCaptureButton />
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `make check` passes.
- [x] `make build` passes.
- [x] `make test` passes.

#### Manual Verification:
- [ ] On `/dashboard`, the FAB is visible bottom-right on desktop, bottom-right (above the bottom nav) on mobile.
- [ ] Tapping the FAB opens the dialog with the First Name input focused.
- [ ] Escape key and backdrop click close the dialog.
- [ ] Submitting an empty form shows inline errors for first name, last name, and phone.
- [ ] Submitting an invalid phone format shows the AU-mobile error message.
- [ ] Submitting a valid form closes the dialog and shows a toast with "Lead created" and a "View Lead" button.
- [ ] Clicking "View Lead" in the toast navigates to `/leads/[id]`.
- [ ] The toast auto-dismisses after ~6s.
- [ ] Completing the full flow (tap FAB → fill → submit → toast) takes under 60 seconds on a mobile viewport.

---

## Phase 6: E2E test for the happy path

### Overview
Replace `test.fixme()` at `e2e/features/leads-crud.spec.ts:118-120` with a real Playwright test that opens the dashboard, triggers the FAB, fills the form, submits, and asserts the success toast. Add a page-object section for the quick capture form to keep selectors organized.

### Changes Required:

#### 1. Quick capture page-object section
**File**: `e2e/pages/sections/quick-capture.section.ts` (new)
**Changes**:

```ts
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class QuickCaptureSection {
  readonly page: Page;
  readonly fab: Locator;
  readonly dialog: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly notesTextarea: Locator;
  readonly leadSourceTrigger: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fab = page.locator('[data-testid="quick-capture-fab"]');
    this.dialog = page.locator('[data-testid="quick-capture-dialog"]');
    this.firstNameInput = page.locator('[data-testid="quick-capture-first-name"]');
    this.lastNameInput = page.locator('[data-testid="quick-capture-last-name"]');
    this.phoneInput = page.locator('[data-testid="quick-capture-phone"]');
    this.notesTextarea = page.locator('[data-testid="quick-capture-notes"]');
    this.leadSourceTrigger = page.locator('[data-testid="quick-capture-lead-source"]');
    this.submitButton = page.locator('[data-testid="quick-capture-submit"]');
  }

  async open() {
    await this.fab.click();
    await expect(this.dialog).toBeVisible();
  }

  async fill(data: {
    firstName: string;
    lastName: string;
    phone: string;
    notes?: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.phoneInput.fill(data.phone);
    if (data.notes) await this.notesTextarea.fill(data.notes);
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectToast(name: string) {
    const toast = this.page.getByRole("status").filter({ hasText: "Lead created" });
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toContainText(name);
  }
}
```

> Note: base-ui's `Toast.Root` may or may not have `role="status"` by default — verify during implementation. If not, add a `data-testid="quick-capture-toast"` to the `Toast.Root` in `toast.tsx` and filter by that instead.

#### 2. E2E test — replace fixme
**File**: `e2e/features/leads-crud.spec.ts`
**Changes**: Import `QuickCaptureSection`. Replace the `test.fixme()` block at lines 118-120 with:

```ts
test("create a lead via quick capture and verify stage defaults to unqualified", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
  await page.goto("/dashboard");

  const quickCapture = new QuickCaptureSection(page);
  const uniqueId = Date.now().toString(36);

  await quickCapture.open();
  await expect(quickCapture.firstNameInput).toBeFocused();

  await quickCapture.fill({
    firstName: "Quick",
    lastName: `Capture ${uniqueId}`,
    phone: "0412345678",
    notes: "Met at BBQ",
  });
  await quickCapture.submit();

  // Success toast appears with lead name
  await quickCapture.expectToast(`Quick Capture ${uniqueId}`);

  // Dialog should be closed
  await expect(quickCapture.dialog).not.toBeVisible();

  // Verify the lead lands in the unqualified column of the pipeline
  await page.goto("/pipeline");
  await expect(
    page.getByText(`Quick Capture ${uniqueId}`).first(),
  ).toBeVisible({ timeout: 10000 });
});

test("quick capture validation surfaces phone format errors", async ({
  context,
  page,
  baseURL,
}) => {
  await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);
  await page.goto("/dashboard");

  const quickCapture = new QuickCaptureSection(page);
  await quickCapture.open();
  await quickCapture.fill({
    firstName: "Bad",
    lastName: "Phone",
    phone: "555-1234",
  });
  await quickCapture.submit();

  await expect(
    page.locator('[data-slot="field-error"]').filter({ hasText: /AU mobile/i }),
  ).toBeVisible();
});
```

> Note: The pipeline-visibility assertion at the end depends on whether the pipeline page renders lead names (currently an empty-state placeholder). If `#100` hasn't landed yet, either drop that assertion or assert via `GET /api/…/leads.list` instead. Decide during implementation by checking the current pipeline page state.

### Success Criteria:

#### Automated Verification:
- [ ] `make test_e2e` passes locally with `DATABASE_URL` set — the new test runs and passes. *(not run here — requires full build + DB; deferred to user)*
- [x] `make test_e2e` skips the new test gracefully when `DATABASE_URL` is not set (the existing `test.skip` at `leads-crud.spec.ts:11-13` applies to the whole describe).
- [x] `make check` passes.

#### Manual Verification:
- [ ] Running `yarn test:e2e:mobile` covers the FAB on a mobile viewport.
- [ ] Running `yarn test:e2e:desktop` covers the centered modal path.
- [ ] The test fails if the dialog doesn't close on submit (regression-proofing the happy path).

---

## Performance Considerations

- The Dialog and Toast primitives from base-ui ship unstyled and tree-shake well; the adapters add minimal overhead.
- The form uses no external validation calls — all checks are synchronous zod.
- The `leads.create` mutation already exists and is optimized; no new queries or N+1 risk.
- The toast viewport mounts once in the application layout and only renders toasts when present, so the perf impact on pages without toasts is a single empty portal node.

## Migration Notes

No data migrations. No schema changes to `leads`, `leadSourceEnum`, or any other table. The feature reuses existing server surfaces.

## References

- Original ticket: samjmarshall/www#98 (GitHub issue, fetched via `gh issue view 98`)
- Parent epic: samjmarshall/www#86 (Epic 2: Lead Management + AI Qualification Scoring)
- Sibling — tRPC Leads Router (closed): samjmarshall/www#96
- Sibling — Full Lead Enquiry Form (closed): samjmarshall/www#97
- Full form reference: `src/app/(application)/leads/new/_components/lead-form.tsx:69-93` (tRPC mutation pattern)
- AU phone validation: `src/app/(application)/leads/new/_lib/schema.ts:7-12`
- Schema used by server: `src/server/api/schemas/leads.ts:41-76` (`leadCreateSchema`) and `79-94` (`leadQuickCaptureSchema`, reference-only)
- Router insert with defaults: `src/server/api/routers/leads.ts:13-25`
- Existing quick-capture test fixture: `src/server/api/__tests__/leads-router.test.ts:105-121`
- Existing E2E placeholder: `e2e/features/leads-crud.spec.ts:118-120`
- Base UI Dialog docs: https://base-ui.com/react/components/dialog
- Base UI Toast docs: https://base-ui.com/react/components/toast
