# Lead Profile Page Design Review Fixes

**Issue:** [samjmarshall/www#101](https://github.com/samjmarshall/www/issues/101)
**Source:** Design review of `feat/101-lead-profile-page` branch (commit `d9d6def`)
**Status:** Draft

## Overview

Fix 12 issues identified during the design review of the lead profile page. Three are accessibility must-fixes (heading hierarchy, focus management, user-facing internal jargon), five are should-fixes (link distinction, score circle coloring, cancel confirmation, aria-live for score updates, locale-dependent date), and four are nits (icon sizing, duplicated type, minor coupling).

## Current State Analysis

The lead profile page is functional with strong baseline accessibility (ARIA on progress bars, semantic HTML, decorative icon hiding). The issues are polish items that affect WCAG compliance, screen reader experience, and small UX gaps.

### Key Discoveries

- `CardTitle` renders a hardcoded `<h3>` with no `as` prop or `asChild` mechanism (`src/components/ui/Card.tsx:28-38`). Fixing the heading hierarchy requires raw `<h2>` elements with the CardTitle class names.
- The app has an existing focus management pattern: `useRef` + `requestAnimationFrame` + `.focus()` in `leads/new/_components/lead-form.tsx:51-57`. The edit mode toggle should follow this pattern.
- No `AlertDialog` exists. The only dialog primitive is `src/components/ui/dialog.tsx` (base-ui). The cancel confirmation can use this, or a simpler `window.confirm` to avoid over-engineering.
- `stageTone()` maps stages to Badge variants but nothing maps stages to raw Tailwind color classes for non-Badge elements. A new `stageRingColor()` helper is needed for the score circle.

## Desired End State

All 12 design review findings resolved. The page passes WCAG 2.1 AA for heading hierarchy, focus management, link distinction, and screen reader announcements. Score circle visually reinforces the stage. Cancel confirms when dirty. No internal terminology visible to users.

## What We're NOT Doing

- Not adding skeleton loading states (matches current app pattern of plain text loading).
- Not changing `CardTitle` default from `text-2xl` to `text-xl` globally (finding #10 is a nit, not blocking).
- Not extracting bottom-nav height into a CSS variable (finding #12 is low risk).
- Not adding an AlertDialog component from shadcn -- using `window.confirm` for the cancel flow.

## Implementation Approach

Single phase -- all changes are small, independent, and confined to the `leads/[id]/` directory plus `display.ts`. No backend changes, no new dependencies, no migrations.

---

## Phase 1: Fix all design review findings

### Overview

Address all 12 findings in one pass. Changes are grouped by file for clarity but can be made in any order.

### Changes Required

#### 1. Fix heading hierarchy -- add `<h2>` section headings

**File:** `src/app/(application)/leads/[id]/_components/lead-profile-view.tsx`

The page has `<h1>` (lead name in ProfileHeader) then jumps to `<h3>` (CardTitle). Add visually-hidden `<h2>` headings before each major section to restore the hierarchy.

- Add a `<h2 className="sr-only">` before `<ScoreBreakdown />` with text "Score & Qualification"
- Add a `<h2 className="sr-only">` before `<LeadDetails />` with text "Lead Information"
- In the sidebar column, add a `<h2 className="sr-only">` before `<QualificationGaps />` with text "Gaps & History"
- In the edit form branch, add a `<h2 className="sr-only">` before `<LeadEditForm />` with text "Edit Lead"

These headings are screen-reader-only (`sr-only` is Tailwind's built-in visually-hidden class) and don't affect the visual layout.

#### 2. Add focus management on edit mode toggle

**File:** `src/app/(application)/leads/[id]/_components/lead-profile-view.tsx`

Follow the existing pattern from `lead-form.tsx:51-57`:

- Add `useRef<HTMLButtonElement>(null)` for the Edit button.
- Pass the ref to `ProfileHeader` and attach it to the Edit `<Button>`.
- When `isEditing` transitions to `true`, focus the first focusable element inside the edit form. The edit form should expose a ref or use `autoFocus` on the first input. The simplest approach: add `useRef<HTMLFormElement>(null)` to `LeadEditForm`, attach it to the `<form>`, and in a `useEffect` on mount, call `formRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()`.
- When `isEditing` transitions to `false` (cancel or save success), call `editButtonRef.current?.focus()` inside a `requestAnimationFrame` to return focus to the Edit button.

**File:** `src/app/(application)/leads/[id]/_components/lead-edit-form.tsx`

- Add `useRef<HTMLFormElement>(null)` attached to the `<form>` element.
- Add a `useEffect` that runs on mount to focus the first input:
  ```tsx
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    });
  }, []);
  ```

**File:** `src/app/(application)/leads/[id]/_components/profile-header.tsx`

- Accept a `ref` for the Edit button via `React.forwardRef` or by passing an `editButtonRef` prop. Since the existing pattern in the codebase uses prop-based refs, add an `editButtonRef?: React.RefObject<HTMLButtonElement | null>` prop and attach it to the Edit `<Button>` via `ref={editButtonRef}`.

#### 3. Replace internal terminology in conversation history placeholder

**File:** `src/app/(application)/leads/[id]/_components/conversation-history.tsx`

Change line 19 from:
```
No messages yet — conversation history will appear here when Epic 3 is complete.
```
to:
```
No conversations yet.
```

#### 4. Add visual distinction to phone/email links

**File:** `src/app/(application)/leads/[id]/_components/profile-header.tsx`

Add `hover:underline` to both the phone and email anchor elements. Change:
```
className="inline-flex items-center gap-2 text-sm hover:text-primary"
```
to:
```
className="inline-flex items-center gap-2 text-sm hover:text-primary hover:underline"
```

Apply to both the `tel:` link (line 62) and `mailto:` link (line 72).

#### 5. Map score circle color to stage

**File:** `src/app/(application)/leads/[id]/_lib/display.ts`

Add a new `stageRingClasses()` function that returns Tailwind classes for the score circle border and background:

```ts
const STAGE_RING_CLASSES: Record<LeadStage, string> = {
  unqualified: "border-muted-foreground/30 bg-muted/10",
  nurture: "border-accent-amber/30 bg-accent-amber/5",
  warm: "border-primary/30 bg-primary/5",
  hot: "border-accent-coral/30 bg-accent-coral/5",
};

export function stageRingClasses(stage: LeadStage): string {
  return STAGE_RING_CLASSES[stage];
}
```

**File:** `src/app/(application)/leads/[id]/_components/profile-header.tsx`

Replace the static `cn("border-primary/30 bg-primary/5")` on the score circle with `stageRingClasses(lead.leadStage)`:

```tsx
<div
  className={cn(
    "flex size-20 flex-col items-center justify-center rounded-full border-2 text-center",
    stageRingClasses(lead.leadStage),
  )}
```

Also update the score number's text color from hardcoded `text-primary` to match the stage. Add a `stageTextColor()` helper or inline a simple mapping. Simplest: keep the number as `text-foreground` (neutral) so it's always readable regardless of stage ring color. This avoids contrast issues.

Change `text-primary` on the score number to `text-foreground`:
```tsx
<span className="font-bold text-2xl text-foreground tabular-nums">
```

#### 6. Add discard-changes confirmation on Cancel

**File:** `src/app/(application)/leads/[id]/_components/lead-edit-form.tsx`

Wrap the `onCancel` callback to check for dirty state before closing:

```tsx
const handleCancel = () => {
  if (form.formState.isDirty) {
    if (!window.confirm("You have unsaved changes. Discard them?")) {
      return;
    }
  }
  onCancel();
};
```

Update the Cancel button's `onClick` from `onCancel` to `handleCancel`.

#### 7. Add `aria-live` region for score updates

**File:** `src/app/(application)/leads/[id]/_components/profile-header.tsx`

Add `aria-live="polite"` to the `<div>` wrapping the score badge and stage badge (line 87):

```tsx
<div className="flex items-center gap-3" aria-live="polite">
```

This announces score and stage changes to screen readers after the edit form closes and the query refetch completes.

#### 8. Fix locale-dependent date formatting

**File:** `src/app/(application)/leads/[id]/_lib/display.ts`

Add a `formatDate` helper:

```ts
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
```

**File:** `src/app/(application)/leads/[id]/_components/lead-details.tsx`

Replace `new Date(lead.createdAt).toLocaleDateString()` with `formatDate(lead.createdAt)`.

#### 9. Fix icon sizing in not-found.tsx

**File:** `src/app/(application)/leads/[id]/not-found.tsx`

Change:
```tsx
<Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
```
to:
```tsx
<Users className="mx-auto mb-4 size-12 text-muted-foreground/50" />
```

#### 10. Remove duplicated `FactorKey` type

**File:** `src/app/(application)/leads/[id]/_lib/display.ts`

Export the `FactorKey` type:
```ts
export type FactorKey = ...
```

**File:** `src/app/(application)/leads/[id]/_components/qualification-gaps.tsx`

Remove the local `FactorKey` type definition and import it from `display.ts`:
```ts
import { factorLabel, impactTone, type FactorKey } from "../_lib/display";
```

#### 11. Tests

**File:** `src/app/(application)/leads/[id]/_lib/__tests__/display.test.ts`

Add tests for the two new display helpers:

```ts
describe("stageRingClasses", () => {
  test("returns distinct classes for each stage", () => {
    const classes = new Set([
      stageRingClasses("unqualified"),
      stageRingClasses("nurture"),
      stageRingClasses("warm"),
      stageRingClasses("hot"),
    ]);
    expect(classes.size).toBe(4);
  });
});

describe("formatDate", () => {
  test("formats a Date object in en-AU short format", () => {
    expect(formatDate(new Date("2026-04-10T00:00:00Z"))).toBe("10 Apr 2026");
  });

  test("formats a string date", () => {
    expect(formatDate("2026-01-15T12:00:00Z")).toBe("15 Jan 2026");
  });
});
```

### Success Criteria

#### Automated Verification:
- [x] `make check` passes (lint + typecheck) — only pre-existing e2e format issue remains
- [x] `make test` passes (unit tests including new display helper tests) — 158/158 pass
- [x] No new TypeScript errors from exported `FactorKey` type change

#### Manual Verification:
- [ ] Heading hierarchy: run VoiceOver rotor (Cmd+F5, then VO+U) on the profile page and confirm H1 -> H2 -> H3 sequence with no skips
- [ ] Focus management: Tab to Edit button, press Enter -> focus moves to first form input. Press Tab to Cancel, press Enter -> focus returns to Edit button
- [ ] Score circle color: navigate to an unqualified lead (score 0) and confirm muted circle, then a hot lead (score 85) and confirm coral-tinted circle
- [ ] Cancel confirmation: enter edit mode, change a field, click Cancel -> browser confirm dialog appears. Click "Cancel" on the dialog -> stays in edit mode. Click "OK" -> exits edit mode
- [ ] Phone/email links show underline on hover
- [ ] Conversation history card reads "No conversations yet." (no "Epic 3")
- [ ] Created date shows consistent format (e.g., "10 Apr 2026") regardless of browser locale
- [ ] Score update announced: with VoiceOver on, edit a lead, save -> score/stage change is announced

---

## References

- Design review: in-conversation (2026-04-10)
- Implementation plan: `thoughts/plans/2026-04-09-101-lead-profile-page.md`
- Card component: `src/components/ui/Card.tsx`
- Focus management pattern: `src/app/(application)/leads/new/_components/lead-form.tsx:51-57`
- Display helpers: `src/app/(application)/leads/[id]/_lib/display.ts`
