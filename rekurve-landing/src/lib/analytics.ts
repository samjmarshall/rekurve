// Google Analytics event tracking helpers

declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void
  }
}

export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  } else {
    // In development, log to console
    console.log('[Analytics Event]', eventName, params)
  }
}

// Predefined events for the landing page
export const analytics = {
  // CTA button clicks
  clickBookingCTA: (location: string) => {
    trackEvent('click_booking_cta', {
      location, // e.g., 'hero', 'sticky_bar', 'final_cta'
    })
  },

  // Form interactions
  startBookingForm: () => {
    trackEvent('start_booking_form', {})
  },

  completeBookingForm: (formData: { name: string; email: string }) => {
    trackEvent('complete_booking_form', {
      name: formData.name,
      email: formData.email,
    })
  },

  progressBookingForm: (step: number) => {
    trackEvent('progress_booking_form', {
      step,
    })
  },

  // Pricing interactions
  viewPricingTier: (tier: string) => {
    trackEvent('view_pricing_tier', {
      tier, // e.g., 'foundation', 'growth', 'enterprise'
    })
  },

  clickPricingCTA: (tier: string) => {
    trackEvent('click_pricing_cta', {
      tier,
    })
  },

  // Content engagement
  expandFAQ: (question: string) => {
    trackEvent('expand_faq', {
      question,
    })
  },

  searchFAQ: (query: string) => {
    trackEvent('search_faq', {
      query,
    })
  },

  viewCaseStudy: (caseStudyId: string) => {
    trackEvent('view_case_study', {
      case_study_id: caseStudyId,
    })
  },

  // Navigation
  scrollToSection: (section: string) => {
    trackEvent('scroll_to_section', {
      section,
    })
  },

  // Email clicks
  clickEmailLink: () => {
    trackEvent('click_email_link', {})
  },

  // Sticky bar interactions
  dismissStickyBar: () => {
    trackEvent('dismiss_sticky_bar', {})
  },
}
