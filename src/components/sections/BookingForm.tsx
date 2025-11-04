'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Calendar,
  User,
  Building,
  Target,
} from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'

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
  { id: 2, title: 'Company Details', icon: Building },
  { id: 3, title: 'Challenges', icon: Target },
  { id: 4, title: 'Goals', icon: Target },
  { id: 5, title: 'Book a Call', icon: Calendar },
]

const challengeOptions = [
  'Lead generation is too manual and time-consuming',
  'Sales team spends 40%+ time on admin work',
  'Inconsistent follow-up with prospects',
  'Difficulty qualifying leads at scale',
  'Low response rates to cold outreach',
  'Can\'t personalize at scale',
  'Poor visibility into sales pipeline',
]

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  })

  const challenges = watch('challenges') || []

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
        className="relative overflow-hidden bg-slate-950 py-24"
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
            <h2 className="mb-4 text-3xl font-bold text-white">
              Thank You! We&apos;ll Be In Touch Soon
            </h2>
            <p className="mb-8 text-lg text-slate-400">
              Your information has been received. You&apos;ll be redirected to book a
              time that works for you...
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-accent-cyan [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-accent-cyan [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-accent-cyan" />
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="booking-form"
      className="relative overflow-hidden bg-slate-950 py-24"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />

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
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Book Your Strategy Call
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Let&apos;s discuss how an AI sales agent can transform your sales
              process. Takes less than 2 minutes to complete.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id

                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                          ${
                            isCompleted
                              ? 'border-state-success bg-state-success text-white'
                              : isActive
                                ? 'border-accent-cyan bg-accent-cyan text-white ring-2 ring-accent-cyan/30 ring-offset-2 ring-offset-slate-950'
                                : 'border-slate-700 bg-slate-900 text-slate-500'
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
                          mt-2 hidden text-xs font-medium md:block
                          ${isActive || isCompleted ? 'text-white' : 'text-slate-500'}
                        `}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`
                          mx-2 h-0.5 flex-1 transition-colors duration-300
                          ${isCompleted ? 'bg-state-success' : 'bg-slate-800'}
                        `}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="text-center text-sm text-slate-400">
              Step {currentStep} of {steps.length}
            </div>
          </div>

          {/* Form */}
          <Card className="border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
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
                    <h3 className="text-xl font-semibold text-white">
                      Let&apos;s start with your information
                    </h3>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="mb-2 block text-sm font-medium text-slate-300"
                        >
                          First Name <span className="text-accent-coral">*</span>
                        </label>
                        <input
                          {...register('firstName')}
                          type="text"
                          id="firstName"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                          placeholder="John"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-accent-coral">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="lastName"
                          className="mb-2 block text-sm font-medium text-slate-300"
                        >
                          Last Name <span className="text-accent-coral">*</span>
                        </label>
                        <input
                          {...register('lastName')}
                          type="text"
                          id="lastName"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                          placeholder="Smith"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-accent-coral">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Email <span className="text-accent-coral">*</span>
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        id="email"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                        placeholder="john.smith@company.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Phone (Optional)
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        id="phone"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                        placeholder="+61 4XX XXX XXX"
                      />
                    </div>
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
                    <h3 className="text-xl font-semibold text-white">
                      Tell us about your company
                    </h3>

                    <div>
                      <label
                        htmlFor="company"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Company Name <span className="text-accent-coral">*</span>
                      </label>
                      <input
                        {...register('company')}
                        type="text"
                        id="company"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                        placeholder="Acme Professional Services"
                      />
                      {errors.company && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.company.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="companySize"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Company Size <span className="text-accent-coral">*</span>
                      </label>
                      <select
                        {...register('companySize')}
                        id="companySize"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                      >
                        <option value="">Select company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-20">11-20 employees</option>
                        <option value="21-50">21-50 employees</option>
                        <option value="51-100">51-100 employees</option>
                        <option value="100+">100+ employees</option>
                      </select>
                      {errors.companySize && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.companySize.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="industry"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Industry <span className="text-accent-coral">*</span>
                      </label>
                      <input
                        {...register('industry')}
                        type="text"
                        id="industry"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                        placeholder="e.g., Consulting, Accounting, Marketing"
                      />
                      {errors.industry && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.industry.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="location"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Location <span className="text-accent-coral">*</span>
                      </label>
                      <input
                        {...register('location')}
                        type="text"
                        id="location"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                        placeholder="Brisbane, Australia"
                      />
                      {errors.location && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.location.message}
                        </p>
                      )}
                    </div>
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
                    <h3 className="text-xl font-semibold text-white">
                      What are your biggest challenges?
                    </h3>
                    <p className="text-sm text-slate-400">
                      Select all that apply
                    </p>

                    <div className="space-y-3">
                      {challengeOptions.map((challenge, index) => {
                        const isSelected = challenges.includes(challenge)
                        return (
                          <label
                            key={index}
                            className={`
                              flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-200
                              ${
                                isSelected
                                  ? 'border-accent-cyan bg-accent-cyan/10'
                                  : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                              }
                            `}
                          >
                            <input
                              {...register('challenges')}
                              type="checkbox"
                              value={challenge}
                              className="mt-0.5 h-5 w-5 rounded border-slate-600 bg-slate-900 text-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-300">
                              {challenge}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {errors.challenges && (
                      <p className="text-sm text-accent-coral">
                        {errors.challenges.message}
                      </p>
                    )}
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
                    <h3 className="text-xl font-semibold text-white">
                      What are your goals?
                    </h3>

                    <div>
                      <label
                        htmlFor="goals"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Describe your sales goals{' '}
                        <span className="text-accent-coral">*</span>
                      </label>
                      <textarea
                        {...register('goals')}
                        id="goals"
                        rows={4}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                        placeholder="e.g., Generate 50+ qualified leads per month, reduce manual prospecting time, improve conversion rates..."
                      />
                      {errors.goals && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.goals.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="timeline"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        When do you want to start?{' '}
                        <span className="text-accent-coral">*</span>
                      </label>
                      <select
                        {...register('timeline')}
                        id="timeline"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                      >
                        <option value="">Select timeline</option>
                        <option value="immediate">Immediately</option>
                        <option value="1-3-months">In 1-3 months</option>
                        <option value="3-6-months">In 3-6 months</option>
                        <option value="6-12-months">In 6-12 months</option>
                      </select>
                      {errors.timeline && (
                        <p className="mt-1 text-sm text-accent-coral">
                          {errors.timeline.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="currentMRR"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Current Monthly Revenue (Optional)
                      </label>
                      <select
                        {...register('currentMRR')}
                        id="currentMRR"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white transition-colors focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/20"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="0-50k">$0 - $50K</option>
                        <option value="50k-200k">$50K - $200K</option>
                        <option value="200k-500k">$200K - $500K</option>
                        <option value="500k+">$500K+</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Booking Method */}
                {currentStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-semibold text-white">
                      Choose your booking method
                    </h3>
                    <p className="text-sm text-slate-400">
                      Select how you&apos;d like to schedule your strategy call
                    </p>

                    <div className="space-y-4">
                      <label
                        className={`
                          flex cursor-pointer items-start gap-4 rounded-lg border p-6 transition-all duration-200
                          ${
                            watch('bookingMethod') === 'calendly'
                              ? 'border-accent-cyan bg-accent-cyan/10'
                              : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                          }
                        `}
                      >
                        <input
                          {...register('bookingMethod')}
                          type="radio"
                          value="calendly"
                          className="mt-1 h-5 w-5 border-slate-600 bg-slate-900 text-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 focus:ring-offset-0"
                        />
                        <div>
                          <div className="mb-1 font-semibold text-white">
                            Calendly
                          </div>
                          <p className="text-sm text-slate-400">
                            Quick and easy self-scheduling. Pick a time that
                            works for you from available slots.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`
                          flex cursor-pointer items-start gap-4 rounded-lg border p-6 transition-all duration-200
                          ${
                            watch('bookingMethod') === 'hubspot'
                              ? 'border-accent-cyan bg-accent-cyan/10'
                              : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                          }
                        `}
                      >
                        <input
                          {...register('bookingMethod')}
                          type="radio"
                          value="hubspot"
                          className="mt-1 h-5 w-5 border-slate-600 bg-slate-900 text-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 focus:ring-offset-0"
                        />
                        <div>
                          <div className="mb-1 font-semibold text-white">
                            HubSpot Meetings
                          </div>
                          <p className="text-sm text-slate-400">
                            Integrated scheduling with automatic CRM sync. Best
                            for enterprise clients.
                          </p>
                        </div>
                      </label>
                    </div>
                    {errors.bookingMethod && (
                      <p className="text-sm text-accent-coral">
                        {errors.bookingMethod.message}
                      </p>
                    )}
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
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {currentStep < 5 ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    className="gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" size="lg">
                    Book Your Call
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
            className="mt-8 text-center text-sm text-slate-500"
          >
            🔒 Your information is secure and will never be shared. Average
            response time: 2 hours
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
