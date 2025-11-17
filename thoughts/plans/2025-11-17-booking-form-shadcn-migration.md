# BookingForm shadcn Component Migration Implementation Plan

## Overview

Replace plain HTML form elements in BookingForm.tsx with shadcn/ui Field, Input, Select, Checkbox, and Textarea components to improve consistency, accessibility, and maintainability. Use default shadcn styling (styling updates will be done separately).

## Current State Analysis

**File**: `src/components/sections/BookingForm.tsx`
- Uses plain HTML `<input>`, `<select>`, `<textarea>` elements
- Manual Tailwind styling for each form element
- Error display using `<p>` tags with manual styling
- Uses react-hook-form with `register()` for simple fields
- No consistent Field wrapper pattern for grouping label + input + error

### Key Discoveries:
- Form uses Zod validation with `zodResolver` (line 81)
- 5-step wizard with validation per step (lines 88-111)
- Challenges step uses checkbox array with `watch('challenges')` (line 86)
- Select fields currently use HTML `<select>` with `register()` (lines 400-411, 550-560, 573-583)

## Desired End State

After this plan is complete:
- All form fields use shadcn Field wrapper pattern
- Inputs use shadcn Input component
- Selects use Radix-based shadcn Select with Controller
- Checkboxes use shadcn Checkbox with Controller
- Textarea uses shadcn Textarea component
- Field errors use FieldError component
- Related fields grouped with FieldGroup
- Improved accessibility (aria-invalid, data-invalid states)
- Default shadcn styling applied

### Verification:
- Form validation works for all steps
- Step navigation functions correctly
- Error messages display properly
- Checkbox array selection works
- Form submission succeeds with all data
- Accessibility audit passes (proper labels, ARIA attributes)

## What We're NOT Doing

- Custom styling (will use default shadcn styles)
- Changing form logic or validation schema
- Modifying step navigation behavior
- Updating the success state UI
- Changing progress bar styling
- Adding new form fields

## Implementation Approach

1. Install required shadcn components
2. Update imports in BookingForm.tsx
3. Migrate each step's fields progressively
4. Use Controller for Radix-based components (Select, Checkbox)
5. Continue using register() for standard inputs where possible
6. Add FieldGroup for related field groupings

---

## Phase 1: Install Dependencies

### Overview
Install all required shadcn/ui form components.

### Changes Required:

#### 1. Add shadcn components
**Command**:
```bash
npx shadcn@latest add field input select checkbox textarea label
```

This will:
- Install @radix-ui/react-select
- Install @radix-ui/react-checkbox
- Install @radix-ui/react-label
- Create component files in src/components/ui/

### Success Criteria:

#### Automated Verification:
- [x] Components exist: `ls src/components/ui/field.tsx src/components/ui/input.tsx src/components/ui/select.tsx src/components/ui/checkbox.tsx src/components/ui/textarea.tsx src/components/ui/label.tsx`
- [x] No TypeScript errors: `yarn check`

#### Manual Verification:
- [x] New component files are created in src/components/ui/
- [x] package.json includes new Radix dependencies

---

## Phase 2: Update Imports and Add Controller

### Overview
Update imports in BookingForm.tsx to include new components and add Controller from react-hook-form.

### Changes Required:

#### 1. Update imports
**File**: `src/components/sections/BookingForm.tsx`
**Changes**: Add new imports at the top of the file

```tsx
import { useForm, Controller } from 'react-hook-form'

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
```

#### 2. Add control to useForm destructuring
**File**: `src/components/sections/BookingForm.tsx`
**Line**: 75-84
**Changes**: Add `control` to destructured values

```tsx
const {
  register,
  handleSubmit,
  watch,
  control,
  formState: { errors },
  trigger,
} = useForm<FormData>({
  resolver: zodResolver(formSchema),
  mode: 'onChange',
})
```

### Success Criteria:

#### Automated Verification:
- [x] No TypeScript errors: `yarn check`
- [x] No import errors

#### Manual Verification:
- [x] All imports resolve correctly
- [x] Form still renders without runtime errors

---

## Phase 3: Migrate Step 1 (Basic Info)

### Overview
Replace firstName, lastName, email, and phone fields with Field + Input pattern.

### Changes Required:

#### 1. Replace Step 1 form fields
**File**: `src/components/sections/BookingForm.tsx`
**Lines**: 278-357
**Changes**: Replace the entire grid and fields section

```tsx
{currentStep === 1 && (
  <motion.div
    key="step1"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <h3 className="text-xl font-semibold">
      Let&apos;s start with your information
    </h3>

    <FieldGroup className="grid gap-6 md:grid-cols-2">
      <Field data-invalid={!!errors.firstName}>
        <FieldLabel htmlFor="firstName">
          First Name <span className="text-accent-coral">*</span>
        </FieldLabel>
        <Input
          {...register('firstName')}
          type="text"
          id="firstName"
          placeholder="John"
          aria-invalid={!!errors.firstName}
        />
        {errors.firstName && (
          <FieldError>{errors.firstName.message}</FieldError>
        )}
      </Field>

      <Field data-invalid={!!errors.lastName}>
        <FieldLabel htmlFor="lastName">
          Last Name <span className="text-accent-coral">*</span>
        </FieldLabel>
        <Input
          {...register('lastName')}
          type="text"
          id="lastName"
          placeholder="Smith"
          aria-invalid={!!errors.lastName}
        />
        {errors.lastName && (
          <FieldError>{errors.lastName.message}</FieldError>
        )}
      </Field>
    </FieldGroup>

    <Field data-invalid={!!errors.email}>
      <FieldLabel htmlFor="email">
        Email <span className="text-accent-coral">*</span>
      </FieldLabel>
      <Input
        {...register('email')}
        type="email"
        id="email"
        placeholder="john.smith@company.com"
        aria-invalid={!!errors.email}
      />
      {errors.email && <FieldError>{errors.email.message}</FieldError>}
    </Field>

    <Field>
      <FieldLabel htmlFor="phone">Phone (Optional)</FieldLabel>
      <Input
        {...register('phone')}
        type="tel"
        id="phone"
        placeholder="+61 4XX XXX XXX"
      />
    </Field>
  </motion.div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] No TypeScript errors: `yarn check`

#### Manual Verification:
- [x] Step 1 renders correctly
- [x] Validation errors display for firstName, lastName, email when invalid
- [x] "Next" button validates fields correctly
- [x] Phone field accepts input without validation errors

---

## Phase 4: Migrate Step 2 (Company Details)

### Overview
Replace company, industry, location inputs and companySize select with Field pattern. Select requires Controller.

### Changes Required:

#### 1. Replace Step 2 form fields
**File**: `src/components/sections/BookingForm.tsx`
**Lines**: 360-455
**Changes**: Replace the entire motion.div content

```tsx
{currentStep === 2 && (
  <motion.div
    key="step2"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <h3 className="text-xl font-semibold">
      Tell us about your company
    </h3>

    <Field data-invalid={!!errors.company}>
      <FieldLabel htmlFor="company">
        Company Name <span className="text-accent-coral">*</span>
      </FieldLabel>
      <Input
        {...register('company')}
        type="text"
        id="company"
        placeholder="Acme Professional Services"
        aria-invalid={!!errors.company}
      />
      {errors.company && (
        <FieldError>{errors.company.message}</FieldError>
      )}
    </Field>

    <Controller
      name="companySize"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>
            Company Size <span className="text-accent-coral">*</span>
          </FieldLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
          >
            <SelectTrigger aria-invalid={fieldState.invalid}>
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-20">11-20 employees</SelectItem>
              <SelectItem value="21-50">21-50 employees</SelectItem>
              <SelectItem value="51-100">51-100 employees</SelectItem>
              <SelectItem value="100+">100+ employees</SelectItem>
            </SelectContent>
          </Select>
          {fieldState.error && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />

    <Field data-invalid={!!errors.industry}>
      <FieldLabel htmlFor="industry">
        Industry <span className="text-accent-coral">*</span>
      </FieldLabel>
      <Input
        {...register('industry')}
        type="text"
        id="industry"
        placeholder="e.g., Consulting, Accounting, Marketing"
        aria-invalid={!!errors.industry}
      />
      {errors.industry && (
        <FieldError>{errors.industry.message}</FieldError>
      )}
    </Field>

    <Field data-invalid={!!errors.location}>
      <FieldLabel htmlFor="location">
        Location <span className="text-accent-coral">*</span>
      </FieldLabel>
      <Input
        {...register('location')}
        type="text"
        id="location"
        placeholder="Brisbane, Australia"
        aria-invalid={!!errors.location}
      />
      {errors.location && (
        <FieldError>{errors.location.message}</FieldError>
      )}
    </Field>
  </motion.div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] No TypeScript errors: `yarn check`

#### Manual Verification:
- [x] Step 2 renders correctly
- [x] Company size Select opens and shows all options
- [x] Selecting a company size updates the form state
- [x] Validation errors display for all required fields
- [x] "Next" button validates step 2 fields correctly

---

## Phase 5: Migrate Step 3 (Challenges)

### Overview
Replace checkbox array with Field + Checkbox using Controller. This is the most complex migration as it requires manual array management.

### Changes Required:

#### 1. Replace Step 3 checkbox array
**File**: `src/components/sections/BookingForm.tsx`
**Lines**: 457-506
**Changes**: Replace the entire motion.div content

```tsx
{currentStep === 3 && (
  <motion.div
    key="step3"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <h3 className="text-xl font-semibold">
      What are your biggest challenges?
    </h3>
    <p className="text-sm text-gray-600">Select all that apply</p>

    <Controller
      name="challenges"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldGroup className="space-y-3">
            {challengeOptions.map((challenge, index) => {
              const isSelected = field.value?.includes(challenge) || false
              return (
                <label
                  key={index}
                  className={`
                    flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-200
                    ${
                      isSelected
                        ? 'border-accent-amber bg-accent-amber/10'
                        : 'dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:dark:border-neutral-700'
                    }
                  `}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        field.onChange([...(field.value || []), challenge])
                      } else {
                        field.onChange(
                          (field.value || []).filter(
                            (v: string) => v !== challenge,
                          ),
                        )
                      }
                    }}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{challenge}</span>
                </label>
              )
            })}
          </FieldGroup>
          {fieldState.error && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  </motion.div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] No TypeScript errors: `yarn check`

#### Manual Verification:
- [x] Step 3 renders correctly
- [x] Clicking a challenge toggles its selection
- [x] Multiple challenges can be selected
- [x] Selected challenges show visual feedback (border/background color)
- [x] Validation error shows if no challenges selected
- [x] "Next" button validates at least one challenge is selected

---

## Phase 6: Migrate Step 4 (Goals & Timeline)

### Overview
Replace goals textarea and timeline/currentMRR selects with Field pattern.

### Changes Required:

#### 1. Replace Step 4 form fields
**File**: `src/components/sections/BookingForm.tsx`
**Lines**: 508-586
**Changes**: Replace the entire motion.div content

```tsx
{currentStep === 4 && (
  <motion.div
    key="step4"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    <h3 className="text-xl font-semibold">What are your goals?</h3>

    <Field data-invalid={!!errors.goals}>
      <FieldLabel htmlFor="goals">
        Describe your sales goals{' '}
        <span className="text-accent-coral">*</span>
      </FieldLabel>
      <Textarea
        {...register('goals')}
        id="goals"
        rows={4}
        placeholder="e.g., Generate 50+ qualified leads per month, reduce manual prospecting time, improve conversion rates..."
        aria-invalid={!!errors.goals}
      />
      {errors.goals && <FieldError>{errors.goals.message}</FieldError>}
    </Field>

    <Controller
      name="timeline"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>
            When do you want to start?{' '}
            <span className="text-accent-coral">*</span>
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger aria-invalid={fieldState.invalid}>
              <SelectValue placeholder="Select timeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediately</SelectItem>
              <SelectItem value="1-3-months">In 1-3 months</SelectItem>
              <SelectItem value="3-6-months">In 3-6 months</SelectItem>
              <SelectItem value="6-12-months">In 6-12 months</SelectItem>
            </SelectContent>
          </Select>
          {fieldState.error && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />

    <Controller
      name="currentMRR"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel>Current Monthly Revenue (Optional)</FieldLabel>
          <Select
            value={field.value || ''}
            onValueChange={field.onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Prefer not to say" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-50k">$0 - $50K</SelectItem>
              <SelectItem value="50k-200k">$50K - $200K</SelectItem>
              <SelectItem value="200k-500k">$200K - $500K</SelectItem>
              <SelectItem value="500k+">$500K+</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  </motion.div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] No TypeScript errors: `yarn check`

#### Manual Verification:
- [x] Step 4 renders correctly
- [x] Goals textarea accepts multi-line input
- [x] Timeline Select shows all options and updates form state
- [x] Current MRR Select works as optional field
- [x] Validation errors display for required fields
- [x] Form submission works on step 4

---

## Phase 7: Final Cleanup and Testing

### Overview
Remove unused code, verify all functionality, and ensure build passes.

### Changes Required:

#### 1. Remove the watch call if no longer needed
**File**: `src/components/sections/BookingForm.tsx`
**Line**: 86
**Changes**: Remove or keep based on usage

Since we're now using Controller for challenges, the watch call is no longer needed:

```tsx
// Remove this line:
// const challenges = watch('challenges') || []
```

### Success Criteria:

#### Automated Verification:
- [x] All checks pass: `yarn check`
- [x] Build succeeds: `yarn build`
- [x] No console warnings or errors

#### Manual Verification:
- [x] Complete form flow works (all 5 steps)
- [x] Validation triggers correctly on "Next" button
- [x] Error messages display with proper styling
- [x] All Select components open and close properly
- [x] Checkbox selections persist across step navigation
- [x] Form submits successfully with all data
- [x] Success state displays after submission
- [x] Keyboard navigation works for all form elements
- [x] Focus states are visible for all interactive elements

---

## Testing Strategy

### Unit Tests:
- Not applicable (no existing tests for BookingForm)

### Integration Tests:
- Not applicable (no existing test infrastructure)

### Manual Testing Steps:
1. Navigate to the booking form section
2. Test Step 1:
   - Leave fields empty and click "Next" - errors should appear
   - Fill in valid data - errors should clear
   - Verify phone field is optional
3. Test Step 2:
   - Verify all Input fields work
   - Click company size Select - verify dropdown opens
   - Select an option - verify it displays correctly
   - Verify validation on "Next"
4. Test Step 3:
   - Click various challenges - verify selection toggles
   - Verify visual feedback on selected items
   - Try to proceed without selections - error should appear
5. Test Step 4:
   - Type in goals textarea - verify multi-line works
   - Select timeline - verify dropdown works
   - Leave currentMRR empty - should be valid
6. Submit form:
   - Click "Book Your Call" on step 4
   - Verify success state appears
7. Test keyboard navigation:
   - Tab through all fields
   - Use arrow keys in Select components
   - Use Space/Enter for Checkboxes

---

## Performance Considerations

- Radix UI components add minimal bundle size overhead
- Select portals to body, avoiding layout shifts
- Controller pattern may cause slightly more re-renders than register(), but negligible for this form size
- No significant performance impact expected

## Migration Notes

- No data migration needed
- No backend changes required
- Form schema and validation logic unchanged
- Step navigation logic unchanged

## References

- shadcn Field docs: https://ui.shadcn.com/docs/components/field
- shadcn React Hook Form docs: https://ui.shadcn.com/docs/forms/react-hook-form
- Current implementation: `src/components/sections/BookingForm.tsx`
- shadcn components: `src/components/ui/`
