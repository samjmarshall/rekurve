'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle,
  ListTodo,
  ShieldAlert,
  ShieldCheck,
  Target,
  User,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { analytics } from '~/lib/posthog'
import { cn } from '~/lib/utils'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// Form validation schema
const formSchema = z.object({
  // Step 1: Basic Info
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),

  // Step 2: Company Details
  company: z.string().min(2, 'Company name is required'),
  companySize: z.enum(['1-10', '11-20', '21-50', '51-100', '100+']),
  industry: z.string().min(2, 'Industry is required'),
  location: z.string().min(2, 'Location is required'),

  // Step 3: Current Challenges
  challenges: z
    .array(z.string())
    .min(1, 'Please select at least one challenge'),

  // Step 4: Goals & Timeline
  goals: z.string().min(10, 'Please describe your goals (at least 10 characters)'),
  timeline: z.enum(['immediate', '1-3-months', '3-6-months', '6-12-months']),
  currentMRR: z.enum(['10k-50k', '50k-200k', '200k-500k', '500k+']).optional(),
})

type FormData = z.infer<typeof formSchema>

const steps = [
  { id: 1, title: 'Basic Info', icon: User },
  { id: 2, title: 'Company', icon: Building },
  { id: 3, title: 'Challenges', icon: ShieldAlert },
  { id: 4, title: 'Goals', icon: Target },
  { id: 5, title: 'Application Review', icon: ListTodo },
]

const challengeOptions = [
  'Quote generation is too manual and time-consuming',
  'Unable to respond to leads quickly',
  'Team spends 40%+ time on sales admin work',
  'Inconsistent follow-up with prospects',
  'Difficulty researching & qualifying leads at scale',
  'Low customer response rates',
  'Poor visibility into sales pipeline',
]

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formStarted, setFormStarted] = useState(false)
  const stepStartTimeRef = useRef<number>(Date.now())
  const lastIdentifiedEmailRef = useRef<string | null>(null)

  // Calculate the intake month (1 month from today)
  const intakeMonth = (() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toLocaleString('en-US', { month: 'long' })
  })()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    trigger,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      challenges: [],
    },
  })

  // Watch all form values to re-validate fields with errors on change
  const watchedValues = watch()
  const watchedValuesString = JSON.stringify(watchedValues)

  // Re-validate fields that have errors when their values change
  useEffect(() => {
    const fieldsWithErrors = Object.keys(errors) as (keyof FormData)[]
    if (fieldsWithErrors.length > 0) {
      // Re-trigger validation for fields that have errors
      void trigger(fieldsWithErrors)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValuesString, trigger])

  // Track form start on first interaction
  const handleFormStart = useCallback(() => {
    if (!formStarted) {
      analytics.form.started()
      setFormStarted(true)
    }
  }, [formStarted])

  // Get step name for analytics
  const getStepName = (step: number): 'basic_info' | 'company_details' | 'challenges' | 'goals' => {
    const names: Record<number, 'basic_info' | 'company_details' | 'challenges' | 'goals'> = {
      1: 'basic_info',
      2: 'company_details',
      3: 'challenges',
      4: 'goals',
    }
    return names[step] ?? 'basic_info'
  }

  // Track form abandonment on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (formStarted && currentStep !== 5) {
        analytics.form.abandoned(currentStep as 1 | 2 | 3 | 4, undefined, 'page_leave')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [formStarted, currentStep])

  // Handle email changes when user goes back to step 1
  useEffect(() => {
    // Only check if we're on step 1 and have previously identified
    if (currentStep === 1 && lastIdentifiedEmailRef.current) {
      const currentEmail = watch('email')
      if (currentEmail && currentEmail !== lastIdentifiedEmailRef.current) {
        // User changed their email, reset identity
        analytics.form.resetIdentity()
        lastIdentifiedEmailRef.current = null
      }
    }
  }, [currentStep, watch])

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []

    // Determine which fields to validate based on current step
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['firstName', 'lastName', 'email']
        break
      case 2:
        fieldsToValidate = ['company', 'companySize', 'industry', 'location']
        break
      case 3:
        fieldsToValidate = ['challenges']
        break
      case 4:
        fieldsToValidate = ['goals', 'timeline']
        break
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid && currentStep < steps.length) {
      // Track step completion
      const timeSpentMs = Date.now() - stepStartTimeRef.current
      analytics.form.stepCompleted({
        step: currentStep as 1 | 2 | 3 | 4,
        step_name: getStepName(currentStep),
        fields_completed: fieldsToValidate,
        fields_with_errors: [],
        time_spent_ms: timeSpentMs,
      })

      // Early identification after Step 1 (when we have email)
      if (currentStep === 1) {
        const formValues = watch()
        analytics.form.identifyLead({
          email: formValues.email,
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          phone: formValues.phone,
        })
        lastIdentifiedEmailRef.current = formValues.email
      }

      // Reset timer for next step
      stepStartTimeRef.current = Date.now()
      setCurrentStep(currentStep + 1)
    } else if (!isValid) {
      // Track validation errors
      const errorFields = Object.keys(errors) as (keyof FormData)[]
      errorFields.forEach(field => {
        const errorMessage = errors[field]?.message
        if (errorMessage) {
          analytics.form.fieldInteraction({
            field,
            step: currentStep as 1 | 2 | 3 | 4,
            action: 'error',
            has_error: true,
            error_message: errorMessage,
          })
        }
      })
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = (data: FormData) => {
    // Track form submission with full lead data
    analytics.form.submitted({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      company_size: data.companySize,
      industry: data.industry,
      location: data.location,
      challenges: data.challenges,
      goals: data.goals,
      timeline: data.timeline,
      current_mrr: data.currentMRR,
    })

    console.log('Form submitted:', data)
    setCurrentStep(5)
  }

return (
    <section
      id="booking-form"
      className="relative overflow-hidden bg-background py-24"
    >
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl"
        >
          {/* Heading */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Apply for {intakeMonth} Intake
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              We can only accept a limited number of new clients each month.
              The application below takes less than 2 minutes to complete.
              We&apos;ll reach out as soon as possible to discuss next steps.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="mb-4 grid grid-cols-5 items-center">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn("mr-2 mb-6 h-0.5 w-full transition-colors duration-300",
                        currentStep > step.id || currentStep === step.id ? 'bg-accent-green' : 'bg-neutral-800',
                        index === 0 ? 'h-0' : 'h-0.5'
                      )}
                    />
                    <div className="flex min-w-16 flex-col items-center">
                      <div
                        className={`
                          flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                          ${
                            isCompleted
                              ? 'border-accent-green bg-accent-green'
                              : isActive
                                ? 'border-accent-blue bg-accent-blue ring-2 ring-accent-blue/30 ring-offset-2 ring-offset-neutral-100 dark:ring-offset-neutral-900'
                                : 'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 text-gray-600'
                          }
                        `}
                        aria-current={isActive ? 'step' : undefined}
                        aria-label={`Step ${step.id}: ${step.title}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" strokeWidth={2.5} />
                        ) : (
                          <Icon className="h-5 w-5" strokeWidth={2} />
                        )}
                      </div>
                      <span
                        className={`
                          mt-2 hidden text-nowrap text-xs font-medium md:block
                          ${!(isActive || isCompleted) && 'text-gray-600'}
                        `}
                      >
                        {step.title}
                      </span>
                    </div>
                    <div
                      className={cn("ml-2 mb-6 w-full transition-colors duration-300",
                        isCompleted ? 'bg-accent-green' : 'bg-neutral-800',
                        index === steps.length - 1 ? 'h-0' : 'h-0.5'
                      )}
                    />
                  </div>
                )
              })}
            </div>
            <div className="text-center text-sm text-gray-600" data-testid="booking-form-step-indicator">
              {currentStep === 5 ? (
                'Pending Review'
              ) : (
                <>Step {currentStep} of 5</>
              )}
            </div>
          </div>

          {/* Form */}
          <Card className="p-8 backdrop-blur-sm">
            <form onSubmit={handleSubmit(onSubmit)} data-testid="booking-form-container">
              <AnimatePresence mode="wait">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    data-testid="booking-form-step-1"
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
                          aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                          onFocus={handleFormStart}
                        />
                        {errors.firstName && (
                          <FieldError id="firstName-error">{errors.firstName.message}</FieldError>
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
                          aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                        />
                        {errors.lastName && (
                          <FieldError id="lastName-error">{errors.lastName.message}</FieldError>
                        )}
                      </Field>
                    </FieldGroup>

                    <FieldGroup className="grid gap-6 md:grid-cols-2">
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
                          aria-describedby={errors.email ? 'email-error' : undefined}
                        />
                        {errors.email && (
                          <FieldError id="email-error">{errors.email.message}</FieldError>
                        )}
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
                    </FieldGroup>
                  </motion.div>
                )}

                {/* Step 2: Company Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    data-testid="booking-form-step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-semibold">
                      Tell us about your company
                    </h3>

                    <FieldGroup className="grid gap-6 md:grid-cols-2">
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
                          aria-describedby={errors.company ? 'company-error' : undefined}
                        />
                        {errors.company && (
                          <FieldError id="company-error">{errors.company.message}</FieldError>
                        )}
                      </Field>

                      <Controller
                        name="companySize"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>
                              Company Size{' '}
                              <span className="text-accent-coral">*</span>
                            </FieldLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger aria-invalid={fieldState.invalid} data-testid="select-company-size">
                                <SelectValue placeholder="Select company size" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-10">
                                  1-10 employees
                                </SelectItem>
                                <SelectItem value="11-20">
                                  11-20 employees
                                </SelectItem>
                                <SelectItem value="21-50">
                                  21-50 employees
                                </SelectItem>
                                <SelectItem value="51-100">
                                  51-100 employees
                                </SelectItem>
                                <SelectItem value="100+">
                                  100+ employees
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {fieldState.error && (
                              <FieldError>{fieldState.error.message}</FieldError>
                            )}
                          </Field>
                        )}
                      />
                    </FieldGroup>

                    <FieldGroup className="grid gap-6 md:grid-cols-2">
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
                          aria-describedby={errors.industry ? 'industry-error' : undefined}
                        />
                        {errors.industry && (
                          <FieldError id="industry-error">{errors.industry.message}</FieldError>
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
                          aria-describedby={errors.location ? 'location-error' : undefined}
                        />
                        {errors.location && (
                          <FieldError id="location-error">{errors.location.message}</FieldError>
                        )}
                      </Field>
                    </FieldGroup>
                  </motion.div>
                )}

                {/* Step 3: Challenges */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    data-testid="booking-form-step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-semibold">
                      What are your biggest challenges?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Select all that apply
                    </p>

                    <Controller
                      name="challenges"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} data-testid="booking-form-challenges">
                          {challengeOptions.map((challenge, index) => {
                            const isSelected =
                              field.value?.includes(challenge) || false
                            return (
                              <label
                                key={index}
                                className={`
                                  flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all duration-200
                                  ${
                                    isSelected
                                      ? 'border-primary bg-primary/10'
                                      : 'dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 hover:dark:border-neutral-700'
                                  }
                                `}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([
                                        ...(field.value || []),
                                        challenge,
                                      ])
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
                          {fieldState.error && (
                            <FieldError>{fieldState.error.message}</FieldError>
                          )}
                        </Field>
                      )}
                    />
                  </motion.div>
                )}

                {/* Step 4: Goals & Timeline */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    data-testid="booking-form-step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-semibold">
                      What are your goals?
                    </h3>

                    <Field data-invalid={!!errors.goals}>
                      <FieldLabel htmlFor="goals">
                        Describe your sales goals{' '}
                        <span className="text-accent-coral">*</span>
                      </FieldLabel>
                      <Textarea
                        {...register('goals')}
                        id="goals"
                        rows={4}
                        placeholder="e.g., Reduce manual quoting time, improve conversion rates, respond to all my customers within minutes..."
                        aria-invalid={!!errors.goals}
                        aria-describedby={errors.goals ? 'goals-error' : undefined}
                      />
                      {errors.goals && (
                        <FieldError id="goals-error">{errors.goals.message}</FieldError>
                      )}
                    </Field>

                    <FieldGroup className="grid gap-6 md:grid-cols-2">
                      <Controller
                        name="timeline"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>
                              When do you want to start?{' '}
                              <span className="text-accent-coral">*</span>
                            </FieldLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger aria-invalid={fieldState.invalid} data-testid="select-timeline">
                                <SelectValue placeholder="Select timeline" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="immediate">
                                  Immediately
                                </SelectItem>
                                <SelectItem value="1-3-months">
                                  In 1-3 months
                                </SelectItem>
                                <SelectItem value="3-6-months">
                                  In 3-6 months
                                </SelectItem>
                                <SelectItem value="6-12-months">
                                  In 6-12 months
                                </SelectItem>
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
                            <FieldLabel>
                              Current Monthly Revenue (Optional)
                            </FieldLabel>
                            <Select
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger data-testid="select-current-mrr">
                                <SelectValue placeholder="Prefer not to say" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10k-50k">$10K - $50K</SelectItem>
                                <SelectItem value="50k-200k">
                                  $50K - $200K
                                </SelectItem>
                                <SelectItem value="200k-500k">
                                  $200K - $500K
                                </SelectItem>
                                <SelectItem value="500k+">$500K+</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />
                    </FieldGroup>
                  </motion.div>
                )}

                {/* Step 5: Application Review (Success) */}
                {currentStep === 5 && (
                  <motion.div
                    key="step5"
                    data-testid="booking-form-step-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 text-center py-8"
                  >
                    <div className="flex justify-center">
                      <div className="rounded-full bg-state-success/10 p-6">
                        <CheckCircle
                          className="h-16 w-16 text-state-success"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold">
                        Application Submitted
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Your application has been submitted. Once we&apos;ve reviewed your
                        application, we&apos;ll reach out to book an initial discovery call
                        to confirm if we can actually help you.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              {currentStep !== 5 && (
                <div className="mt-8 flex items-center justify-between gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1}
                    className="gap-2 group"
                    data-testid="booking-form-back-btn"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-all duration-300" />
                    Back
                  </Button>

                  {currentStep === 4 ? (
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      data-testid="booking-form-submit-btn"
                    >
                      Submit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={handleNextStep}
                      className="gap-2 group"
                      data-testid="booking-form-next-btn"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-all duration-300" />
                    </Button>
                  )}
                </div>
              )}
            </form>
          </Card>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8 flex items-center justify-center gap-1 text-center text-sm text-gray-600"
          >
            <ShieldCheck className="w-4 h-4 text-accent-coral" />
            Your information is secure and will never be shared.
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
