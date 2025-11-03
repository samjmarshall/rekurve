/**
 * Rekurve Landing Page TypeScript Type Definitions
 */

/**
 * Pricing tier structure
 */
export interface PricingTier {
  id: string
  name: string
  tagline: string
  setupFee: number
  monthlyFee: number
  features: string[]
  highlighted?: boolean
  cta: string
  badge?: string
}

/**
 * Customer testimonial
 */
export interface Testimonial {
  id: string
  quote: string
  author: string
  role: string
  company: string
  companySize?: string
  industry?: string
  result?: string
  avatar?: string
}

/**
 * Case study structure
 */
export interface CaseStudy {
  id: string
  company: string
  industry: string
  companySize: string
  location: string
  challenge: string
  solution: string
  results: {
    metric: string
    value: string
    description?: string
  }[]
  testimonial?: Testimonial
  timeline?: string
}

/**
 * Form field configuration
 */
export interface FormField {
  name: string
  label: string
  type: "text" | "email" | "tel" | "textarea" | "select" | "radio" | "checkbox"
  placeholder?: string
  required?: boolean
  validation?: {
    pattern?: RegExp
    minLength?: number
    maxLength?: number
    message?: string
  }
  options?: { value: string; label: string }[]
}

/**
 * Multi-step form step
 */
export interface FormStep {
  id: string
  title: string
  description?: string
  fields: FormField[]
}

/**
 * Form submission data
 */
export interface FormSubmission {
  step: number
  data: Record<string, string | string[]>
  timestamp: Date
}

/**
 * FAQ item
 */
export interface FAQItem {
  id: string
  question: string
  answer: string
  category?: string
  tags?: string[]
}

/**
 * Stat/metric display
 */
export interface Metric {
  id: string
  value: string
  label: string
  description?: string
  icon?: string
}

/**
 * Feature item
 */
export interface Feature {
  id: string
  title: string
  description: string
  icon?: string
  benefits?: string[]
}

/**
 * Process step (How It Works)
 */
export interface ProcessStep {
  id: string
  step: number
  title: string
  description: string
  duration?: string
  icon?: string
}
