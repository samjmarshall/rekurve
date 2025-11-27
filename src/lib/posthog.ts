/**
 * PostHog Analytics Library for Rekurve Landing Page
 *
 * This module provides comprehensive analytics tracking including:
 * - CTA click tracking with position context
 * - Multi-step form funnel tracking with field-level detail
 * - FAQ interaction tracking
 * - Section visibility tracking
 * - Lead scoring via person properties
 * - UTM parameter capture for paid campaigns
 * - Session recording triggers
 */

import posthog from 'posthog-js'

// ============================================================================
// Types
// ============================================================================

export type CTALocation =
  | 'header'
  | 'hero_primary'
  | 'hero_secondary'
  | 'pricing_foundation'
  | 'pricing_growth'
  | 'pricing_enterprise'
  | 'final_cta_primary'
  | 'final_cta_email'
  | 'faq_bottom'
  | 'guarantee'
  | 'mobile_nav'

export type FormStep = 1 | 2 | 3 | 4 | 5

export type FormStepName =
  | 'basic_info'
  | 'company_details'
  | 'challenges'
  | 'goals'
  | 'booking_preference'

export type FAQCategory =
  | 'ROI & Results'
  | 'Pricing'
  | 'Technical'
  | 'Security & Compliance'
  | 'Support & Training'

export type PricingTier = 'foundation' | 'growth' | 'enterprise'

export type SectionName =
  | 'hero'
  | 'stats_marquee'
  | 'native_integration'
  | 'problem'
  | 'features'
  | 'results'
  | 'timeline'
  | 'founder'
  | 'pricing'
  | 'guarantee'
  | 'booking_form'
  | 'faq'
  | 'final_cta'

export interface FormFieldInteraction {
  field: string
  step: FormStep
  action: 'focus' | 'blur' | 'change' | 'error'
  value_length?: number
  has_error?: boolean
  error_message?: string
  time_spent_ms?: number
}

export interface FormStepData {
  step: FormStep
  step_name: FormStepName
  fields_completed: string[]
  fields_with_errors: string[]
  time_spent_ms: number
}

export interface LeadScoreFactors {
  company_size?: string
  industry?: string
  timeline?: string
  current_mrr?: string
  challenges_count?: number
  engagement_score?: number
  traffic_source?: string
  pricing_tier_viewed?: PricingTier
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if PostHog is initialized and available
 */
function isPostHogReady(): boolean {
  return typeof window !== 'undefined' && posthog.__loaded
}

/**
 * Safely capture an event with error handling
 */
function safeCapture(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) {
    console.log('[PostHog] Not ready, event queued:', eventName, properties)
    return
  }

  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[PostHog] Error capturing event:', eventName, error)
  }
}

/**
 * Parse UTM parameters from URL
 */
export function getUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const utmParams: Record<string, string> = {}

  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ]

  utmKeys.forEach((key) => {
    const value = params.get(key)
    if (value) {
      utmParams[key] = value
    }
  })

  return utmParams
}

/**
 * Get referrer information
 */
export function getReferrerInfo(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  return {
    referrer: document.referrer || 'direct',
    landing_page: window.location.pathname,
    landing_url: window.location.href,
  }
}

// ============================================================================
// CTA Tracking
// ============================================================================

export const ctaTracking = {
  /**
   * Track a CTA button click with full context
   */
  click: (location: CTALocation, additionalProps?: Record<string, unknown>) => {
    safeCapture('cta_clicked', {
      location,
      cta_text: getCTAText(location),
      page_section: getSectionFromLocation(location),
      ...additionalProps,
    })

    // Update person properties for lead scoring
    posthog.setPersonPropertiesForFlags({
      last_cta_clicked: location,
      cta_click_count: 1, // PostHog will increment this
    })
  },

  /**
   * Track when a CTA becomes visible (for heatmap correlation)
   */
  viewed: (location: CTALocation) => {
    safeCapture('cta_viewed', {
      location,
    })
  },
}

function getCTAText(location: CTALocation): string {
  const ctaTextMap: Record<CTALocation, string> = {
    header: 'Book a call',
    hero_primary: 'Book a call',
    hero_secondary: 'How it Works',
    pricing_foundation: 'Get Started',
    pricing_growth: 'Start Growing',
    pricing_enterprise: 'Contact Sales',
    final_cta_primary: 'Book Your Call',
    final_cta_email: 'Email us',
    faq_bottom: 'Book a free 30-minute call',
    guarantee: 'Book a call',
    mobile_nav: 'Book a call',
  }
  return ctaTextMap[location]
}

function getSectionFromLocation(location: CTALocation): SectionName {
  const sectionMap: Record<CTALocation, SectionName> = {
    header: 'hero',
    hero_primary: 'hero',
    hero_secondary: 'hero',
    pricing_foundation: 'pricing',
    pricing_growth: 'pricing',
    pricing_enterprise: 'pricing',
    final_cta_primary: 'final_cta',
    final_cta_email: 'final_cta',
    faq_bottom: 'faq',
    guarantee: 'guarantee',
    mobile_nav: 'hero',
  }
  return sectionMap[location]
}

// ============================================================================
// Form Tracking
// ============================================================================

// Store field focus times for calculating time spent
const fieldFocusTimes: Record<string, number> = {}
const stepStartTimes: Record<number, number> = {}

export const formTracking = {
  /**
   * Track when user starts the form (first interaction)
   */
  started: () => {
    safeCapture('booking_form_started', {
      entry_point: 'form_section',
    })

    // Start session recording when form is started
    if (isPostHogReady()) {
      posthog.startSessionRecording()
    }

    // Set person property
    posthog.setPersonPropertiesForFlags({
      form_started: true,
      form_started_at: new Date().toISOString(),
    })

    stepStartTimes[1] = Date.now()
  },

  /**
   * Track field-level interactions
   */
  fieldInteraction: (interaction: FormFieldInteraction) => {
    const { field, step, action, value_length, has_error, error_message } =
      interaction

    // Track focus time
    if (action === 'focus') {
      fieldFocusTimes[field] = Date.now()
    }

    let timeSpentMs: number | undefined
    if (action === 'blur' && fieldFocusTimes[field]) {
      timeSpentMs = Date.now() - fieldFocusTimes[field]
      delete fieldFocusTimes[field]
    }

    safeCapture('form_field_interaction', {
      field,
      step,
      action,
      value_length,
      has_error,
      error_message,
      time_spent_ms: timeSpentMs,
    })

    // Track validation errors specifically
    if (action === 'error' && has_error) {
      safeCapture('form_field_error', {
        field,
        step,
        error_message,
      })
    }
  },

  /**
   * Track form step completion
   */
  stepCompleted: (data: FormStepData) => {
    const { step, step_name, fields_completed, fields_with_errors } = data

    // Calculate time spent on step
    const timeSpentMs = stepStartTimes[step]
      ? Date.now() - stepStartTimes[step]
      : undefined

    safeCapture('form_step_completed', {
      step,
      step_name,
      fields_completed,
      fields_with_errors,
      fields_completed_count: fields_completed.length,
      has_errors: fields_with_errors.length > 0,
      time_spent_ms: timeSpentMs,
    })

    // Start timer for next step
    if (step < 5) {
      stepStartTimes[step + 1] = Date.now()
    }

    // Update person properties
    posthog.setPersonProperties({
      form_last_step_completed: step,
      form_last_step_name: step_name,
    })
  },

  /**
   * Track form step viewed (for funnel analysis)
   */
  stepViewed: (step: FormStep, stepName: FormStepName) => {
    safeCapture('form_step_viewed', {
      step,
      step_name: stepName,
    })

    // Initialize step timer
    stepStartTimes[step] = Date.now()
  },

  /**
   * Identify user early when email is captured (Step 1 complete)
   * This links all subsequent events to this person
   */
  identifyLead: (leadData: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }) => {
    if (!isPostHogReady()) return

    const { email, firstName, lastName, phone } = leadData

    // Check if we're already identified with this email
    const currentId = posthog.get_distinct_id()
    if (currentId === email) {
      return // Already identified with this email
    }

    posthog.identify(email, {
      // Properties that can be updated
      $set: {
        email: email,
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      },
      // Properties that should only be set once (first-touch attribution)
      $set_once: {
        first_seen: new Date().toISOString(),
        initial_referrer: document.referrer || 'direct',
        initial_landing_page: window.location.pathname,
        initial_utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        initial_utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
        initial_utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
      },
    })

    safeCapture('lead_identified', {
      identification_point: 'step_1_complete',
    })
  },

  /**
   * Reset identification when user changes email
   * Call this before re-identifying with a new email
   */
  resetIdentity: () => {
    if (!isPostHogReady()) return

    posthog.reset()

    safeCapture('identity_reset', {
      reason: 'email_changed',
    })
  },

  /**
   * Track form abandonment (when user leaves without completing)
   */
  abandoned: (
    lastStep: FormStep,
    lastField?: string,
    reason?: string
  ) => {
    const timeSpentMs = stepStartTimes[lastStep]
      ? Date.now() - stepStartTimes[lastStep]
      : undefined

    safeCapture('booking_form_abandoned', {
      last_step: lastStep,
      last_field: lastField,
      reason,
      time_spent_on_step_ms: timeSpentMs,
      total_steps_completed: lastStep - 1,
    })

    // Update person properties
    posthog.setPersonProperties({
      form_abandoned: true,
      form_abandoned_at_step: lastStep,
    })
  },

  /**
   * Track successful form submission with full lead details
   */
  submitted: (formData: {
    // Contact info
    first_name: string
    last_name: string
    email: string
    phone?: string

    // Company info
    company: string
    company_size: string
    industry: string
    location: string

    // Qualification
    challenges: string[]
    goals: string
    timeline: string
    current_mrr?: string
    booking_method: string
  }) => {
    const leadScore = calculateLeadScore({
      company_size: formData.company_size,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
    })

    // Capture event with full lead details for workflow email template
    safeCapture('booking_form_submitted', {
      // Contact info (prefixed with lead_ for workflow template)
      lead_name: `${formData.first_name} ${formData.last_name}`,
      lead_email: formData.email,
      lead_phone: formData.phone,

      // Company info
      lead_company: formData.company,
      lead_company_size: formData.company_size,
      lead_industry: formData.industry,
      lead_location: formData.location,

      // Qualification
      lead_challenges: formData.challenges.join(', '),
      lead_goals: formData.goals,
      lead_timeline: formData.timeline,
      lead_mrr: formData.current_mrr,
      lead_score: leadScore,

      // Booking preference
      booking_method: formData.booking_method,

      // Legacy properties for existing dashboards
      company_size: formData.company_size,
      industry: formData.industry,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
    })

    // Identify the person with proper property handling
    posthog.identify(formData.email, {
      // Properties that should update on each submission
      $set: {
        email: formData.email,
        name: `${formData.first_name} ${formData.last_name}`,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        company: formData.company,
        company_size: formData.company_size,
        industry: formData.industry,
        location: formData.location,
        timeline: formData.timeline,
        current_mrr: formData.current_mrr,
        challenges_count: formData.challenges.length,
        lead_score: leadScore,
        last_form_submission: new Date().toISOString(),
      },
      // Properties that should only be set once (first conversion)
      $set_once: {
        first_form_submission: new Date().toISOString(),
        first_challenges: formData.challenges.join(', '),
        first_goals: formData.goals,
        first_timeline: formData.timeline,
        first_company_size: formData.company_size,
        first_lead_score: leadScore,
        conversion_source: document.referrer || 'direct',
      },
    })

    // Set comprehensive person properties for lead scoring
    posthog.setPersonProperties({
      form_completed: true,
      form_completed_at: new Date().toISOString(),
      company_size: formData.company_size,
      industry: formData.industry,
      timeline: formData.timeline,
      current_mrr: formData.current_mrr,
      challenges_count: formData.challenges.length,
      lead_score: leadScore,
    })

    // Identify as a converted lead
    posthog.setPersonPropertiesForFlags({
      is_lead: true,
      conversion_date: new Date().toISOString(),
    })
  },
}

// ============================================================================
// FAQ Tracking
// ============================================================================

export const faqTracking = {
  /**
   * Track FAQ item expansion
   */
  expanded: (questionId: string, question: string, category: FAQCategory) => {
    safeCapture('faq_expanded', {
      question_id: questionId,
      question,
      category,
    })

    // Update person properties for buyer intent signals
    posthog.setPersonPropertiesForFlags({
      faq_interactions: 1, // Will be incremented
      [`faq_category_${category.toLowerCase().replace(/[^a-z]/g, '_')}`]: true,
    })
  },

  /**
   * Track FAQ search
   */
  searched: (query: string, resultsCount: number) => {
    safeCapture('faq_searched', {
      query,
      results_count: resultsCount,
      has_results: resultsCount > 0,
    })
  },

  /**
   * Track FAQ item collapse
   */
  collapsed: (questionId: string) => {
    safeCapture('faq_collapsed', {
      question_id: questionId,
    })
  },
}

// ============================================================================
// Section Visibility Tracking
// ============================================================================

export const sectionTracking = {
  /**
   * Track when a section becomes visible
   */
  viewed: (section: SectionName, visibilityPercent?: number) => {
    safeCapture('section_viewed', {
      section,
      visibility_percent: visibilityPercent,
    })
  },

  /**
   * Track scroll depth milestones
   */
  scrollDepth: (depth: 25 | 50 | 75 | 100) => {
    safeCapture('scroll_depth_reached', {
      depth_percent: depth,
    })
  },

  /**
   * Track time spent on section (call when leaving)
   */
  timeSpent: (section: SectionName, timeMs: number) => {
    safeCapture('section_time_spent', {
      section,
      time_ms: timeMs,
      time_seconds: Math.round(timeMs / 1000),
    })
  },
}

// ============================================================================
// Pricing Tracking
// ============================================================================

export const pricingTracking = {
  /**
   * Track pricing tier view/hover
   */
  tierViewed: (tier: PricingTier, isHover = false) => {
    safeCapture('pricing_tier_viewed', {
      tier,
      interaction_type: isHover ? 'hover' : 'scroll_into_view',
    })

    // Update person properties
    posthog.setPersonPropertiesForFlags({
      pricing_tier_interest: tier,
    })
  },

  /**
   * Track pricing tier CTA click
   */
  tierCTAClicked: (tier: PricingTier) => {
    safeCapture('pricing_cta_clicked', {
      tier,
    })
  },

  /**
   * Track comparison behavior (viewing multiple tiers)
   */
  comparisonBehavior: (tiersViewed: PricingTier[]) => {
    safeCapture('pricing_comparison', {
      tiers_viewed: tiersViewed,
      tiers_count: tiersViewed.length,
    })
  },
}

// ============================================================================
// External Link Tracking
// ============================================================================

export const linkTracking = {
  /**
   * Track external link clicks (citations, sources)
   */
  externalClick: (url: string, source: string, context?: string) => {
    safeCapture('external_link_clicked', {
      url,
      source,
      context,
    })
  },

  /**
   * Track email link clicks
   */
  emailClick: (email: string, location: string) => {
    safeCapture('email_link_clicked', {
      email,
      location,
    })
  },

  /**
   * Track navigation link clicks
   */
  navClick: (destination: string, fromMobile: boolean) => {
    safeCapture('nav_link_clicked', {
      destination,
      from_mobile: fromMobile,
    })
  },
}

// ============================================================================
// Lead Scoring
// ============================================================================

/**
 * Calculate lead score based on engagement and form data
 * Score range: 0-100
 */
export function calculateLeadScore(factors: LeadScoreFactors): number {
  let score = 0

  // Company size scoring (larger = higher score for B2B)
  const companySizeScores: Record<string, number> = {
    '1-10': 10,
    '11-20': 15,
    '21-50': 20,
    '51-100': 25,
    '100+': 30,
  }
  if (factors.company_size) {
    score += companySizeScores[factors.company_size] ?? 10
  }

  // Timeline scoring (more urgent = higher score)
  const timelineScores: Record<string, number> = {
    immediate: 25,
    '1-3-months': 20,
    '3-6-months': 10,
    '6-12-months': 5,
  }
  if (factors.timeline) {
    score += timelineScores[factors.timeline] ?? 5
  }

  // MRR scoring (higher revenue = higher score)
  const mrrScores: Record<string, number> = {
    '0-50k': 5,
    '50k-200k': 15,
    '200k-500k': 25,
    '500k+': 30,
  }
  if (factors.current_mrr) {
    score += mrrScores[factors.current_mrr] ?? 0
  }

  // Challenges count (more challenges = more pain = higher score)
  if (factors.challenges_count) {
    score += Math.min(factors.challenges_count * 3, 15)
  }

  // Pricing tier interest
  const tierScores: Record<PricingTier, number> = {
    foundation: 5,
    growth: 10,
    enterprise: 15,
  }
  if (factors.pricing_tier_viewed) {
    score += tierScores[factors.pricing_tier_viewed]
  }

  return Math.min(score, 100)
}

/**
 * Update lead score based on engagement
 */
export function updateEngagementScore(action: string): void {
  const actionScores: Record<string, number> = {
    cta_clicked: 5,
    form_started: 10,
    form_step_completed: 5,
    faq_expanded: 2,
    pricing_viewed: 3,
    section_viewed: 1,
  }

  const scoreIncrement = actionScores[action] ?? 1

  // PostHog will handle incrementing
  posthog.setPersonPropertiesForFlags({
    engagement_score: scoreIncrement,
  })
}

// ============================================================================
// Session & Page Tracking
// ============================================================================

export const sessionTracking = {
  /**
   * Initialize tracking on page load
   * Call this in your root layout or _app
   */
  initialize: () => {
    if (!isPostHogReady()) return

    // Capture UTM params
    const utmParams = getUTMParams()
    if (Object.keys(utmParams).length > 0) {
      posthog.setPersonPropertiesForFlags(utmParams)

      // Also capture as event
      safeCapture('utm_captured', utmParams)
    }

    // Capture referrer info
    const referrerInfo = getReferrerInfo()
    posthog.setPersonPropertiesForFlags({
      first_referrer: referrerInfo.referrer,
      first_landing_page: referrerInfo.landing_page,
    })

    // Track page view with enhanced data
    safeCapture('page_viewed', {
      ...referrerInfo,
      ...utmParams,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_type: getDeviceType(),
    })
  },

  /**
   * Track page visibility changes (for engagement time)
   */
  visibilityChange: (isVisible: boolean, timeHiddenMs?: number) => {
    if (!isVisible && timeHiddenMs) {
      safeCapture('page_hidden', {
        time_hidden_ms: timeHiddenMs,
      })
    }
  },
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// ============================================================================
// Session Recording Control
// ============================================================================

export const recordingControl = {
  /**
   * Start session recording (triggered by high-intent actions)
   */
  start: (reason: string) => {
    if (isPostHogReady()) {
      posthog.startSessionRecording()
      safeCapture('session_recording_started', { reason })
    }
  },

  /**
   * Stop session recording
   */
  stop: () => {
    if (isPostHogReady()) {
      posthog.stopSessionRecording()
    }
  },
}

// ============================================================================
// Export consolidated analytics object
// ============================================================================

export const analytics = {
  cta: ctaTracking,
  form: formTracking,
  faq: faqTracking,
  section: sectionTracking,
  pricing: pricingTracking,
  link: linkTracking,
  session: sessionTracking,
  recording: recordingControl,
  utils: {
    getUTMParams,
    getReferrerInfo,
    calculateLeadScore,
    updateEngagementScore,
    isPostHogReady,
  },
}

export default analytics
