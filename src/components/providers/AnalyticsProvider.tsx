'use client'

import { useEffect } from 'react'
import { analytics } from '~/lib/posthog'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.session.initialize()
  }, [])

  return <>{children}</>
}
