'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle,
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
import { useEffect, useState } from 'react'

import { Button } from '~/components/ui/Button'
import { CONSTANTS } from '~/constants/links'
import { Card } from '~/components/ui/Card'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'
import { useCalEmbed } from '~/hooks/useCalEmbed'
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
  currentMRR: z.enum(['0-50k', '50k-200k', '200k-500k', '500k+']).optional(),

  // Step 5: Booking Preference
  bookingMethod: z.enum(['calendly', 'hubspot']),
})

type FormData = z.infer<typeof formSchema>

const steps = [
  { id: 1, title: 'Basic Info', icon: User },
  { id: 2, title: 'Company', icon: Building },
  { id: 3, title: 'Challenges', icon: Target },
  { id: 4, title: 'Goals', icon: Target },
  { id: 5, title: 'Book a Call', icon: Calendar },
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
  const [isSubmitted, setIsSubmitted] = useState(false)
  const calOptions = useCalEmbed({
      namespace: CONSTANTS.CALCOM_NAMESPACE,
      styles: {
        branding: {
          brandColor: CONSTANTS.CALCOM_BRAND_COLOR,
        },
      },
      hideEventTypeDetails: CONSTANTS.CALCOM_HIDE_EVENT_TYPE_DETAILS,
      layout: CONSTANTS.CALCOM_LAYOUT,
    });

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
    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data)
    setIsSubmitted(true)

    // In production, this would:
    // 1. Send data to your backend
    // 2. Redirect to Calendly or HubSpot booking page
    // 3. Track conversion in analytics

    // Simulated redirect based on booking method
    setTimeout(() => {
      if (data.bookingMethod === 'calendly') {
        console.log('Redirect to Calendly: https://calendly.com/rekurve-ai')
      } else {
        console.log(
          'Redirect to HubSpot: https://meetings.hubspot.com/rekurve-ai',
        )
      }
    }, 2000)
  }

  // Success state
  if (isSubmitted) {
    return (
      <section
        id="booking-form"
        className="relative overflow-hidden bg-background py-24"
      >
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-state-success/10 p-6">
                <CheckCircle
                  className="h-16 w-16 text-state-success"
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <h2 className="mb-4 text-3xl font-bold">
              Thank You! We&apos;ll Be In Touch Soon
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              Your information has been received. You&apos;ll be redirected to book a
              time that works for you...
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
            </div>
          </motion.div>
        </div>
      </section>
    )
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
              Book Your Call
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Let&apos;s discuss how an AI sales agent can transform your sales
              process. Takes less than 2 minutes to complete.
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
                                : 'border-neutral-200 bg-neutral-100 dark:dark:border-neutral-700 dark:bg-neutral-800 text-gray-600'
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
            <div className="text-center text-sm text-gray-600">
              Step {currentStep} of {steps.length}
            </div>
          </div>

          {/* Form */}
          <Card className="p-8 backdrop-blur-sm">
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {/* Step 1: Basic Info */}
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
                        />
                        {errors.email && (
                          <FieldError>{errors.email.message}</FieldError>
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
                              Company Size{' '}
                              <span className="text-accent-coral">*</span>
                            </FieldLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger aria-invalid={fieldState.invalid}>
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
                    </FieldGroup>
                  </motion.div>
                )}

                {/* Step 3: Challenges */}
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
                    <p className="text-sm text-gray-600">
                      Select all that apply
                    </p>

                    <Controller
                      name="challenges"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
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
                      />
                      {errors.goals && (
                        <FieldError>{errors.goals.message}</FieldError>
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
                              <SelectTrigger aria-invalid={fieldState.invalid}>
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
                              <SelectTrigger>
                                <SelectValue placeholder="Prefer not to say" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0-50k">$0 - $50K</SelectItem>
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
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="gap-2 group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-all duration-300" />
                  Back
                </Button>

                {currentStep === 4 ? (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                  >
                    Book Your Call
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    className="gap-2 group"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-all duration-300" />
                  </Button>
                )}
              </div>
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
            <ShieldCheck className="w-4 h-4 text-accent-coral" /> Your information is secure and will never be shared. Average response time: 2 hours
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
