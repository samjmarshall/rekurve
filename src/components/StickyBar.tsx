"use client"

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { cn } from '~/lib/utils'

export function StickyBar() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem('stickyBarDismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const heroHeight = 600 // Approximate hero section height

      // Show bar when scrolling down past hero
      // Hide when scrolling up or at top
      if (currentScrollY > heroHeight && currentScrollY > lastScrollY) {
        setIsVisible(true)
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(false)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('stickyBarDismissed', 'true')
  }

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-form')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (isDismissed) return null

  return (
    <>
      {/* Desktop sticky bar (top) */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-50 hidden border-b border-accent-cyan/20 bg-slate-900/80 shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:block",
          isVisible ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex-1 truncate">
            <p className="font-semibold text-white">
              Get 20+ Hours Back Every Week
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="md"
              variant="primary"
              onClick={scrollToBooking}
              className="bg-accent-amber text-slate-900 hover:scale-105 transition-transform"
            >
              Book Strategy Session
            </Button>

            <button
              onClick={handleDismiss}
              className="text-white/60 transition-all hover:text-white hover:opacity-70"
              aria-label="Dismiss sticky bar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar (bottom) */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t border-accent-cyan/20 bg-slate-900/80 shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:hidden",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1 pr-2">
            <p className="text-sm font-semibold text-white leading-tight">
              Save 20+ hrs/week
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={scrollToBooking}
              className="bg-accent-amber text-slate-900 hover:scale-105 transition-transform"
            >
              Book Now
            </Button>

            <button
              onClick={handleDismiss}
              className="text-white/60 transition-all hover:text-white hover:opacity-70"
              aria-label="Dismiss sticky bar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
