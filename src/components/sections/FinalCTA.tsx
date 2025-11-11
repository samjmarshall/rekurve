"use client"

import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { ScrollReveal } from '~/components/motion/ScrollReveal'

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-linear-to-br dar:from-black dark:via-neutral-900 dark:to-black py-24">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(112,179,219,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.08),transparent_50%)] animate-pulse-slow" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

      <div className="container relative mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <div className="mb-8">
            <h2 className="mb-4 font-sans text-5xl font-bold tracking-tight">
              Ready to Recover 20+ Hours Weekly?
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-gray-500">
              Join professional services firms across Brisbane and Melbourne deploying autonomous AI sales agents.
              Your 24/7 virtual Sales Rep is one call away.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            {/* Primary CTA */}
            <Button
              size="xl"
              variant="primary"
              className="group relative bg-accent-amber shadow-2xl shadow-accent-amber/30 hover:scale-110 hover:shadow-accent-amber/50 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                Book Your Free Strategy Session
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              {/* Pulsing glow effect */}
              <span className="absolute inset-0 rounded-lg bg-accent-amber opacity-30 blur-xl animate-pulse" />
            </Button>

            {/* Secondary link */}
            <a
              href="mailto:contact@rekurve.ai"
              className="font-mono text-white underline underline-offset-4 transition-colors hover:text-brand"
            >
              Or email us: contact@rekurve.ai
            </a>
          </div>
        </ScrollReveal>

        {/* Value props recap */}
        <ScrollReveal delay={0.3}>
          <div className="mb-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border border-brand bg-gray-50 dark:bg-neutral-800 p-6 backdrop-blur-sm">
              <div className="mb-2 font-mono text-3xl font-bold">
                20+ hrs
              </div>
              <div className="text-sm text-gray-600">
                Saved every week
              </div>
            </div>
            <div className="rounded-lg border border-brand bg-gray-50 dark:bg-neutral-800 p-6 backdrop-blur-sm">
              <div className="mb-2 font-mono text-3xl font-bold">
                $100K+
              </div>
              <div className="text-sm text-gray-600">
                Pipeline growth in 90 days
              </div>
            </div>
            <div className="rounded-lg border border-brand bg-gray-50 dark:bg-neutral-800 p-6 backdrop-blur-sm">
              <div className="mb-2 font-mono text-3xl font-bold">
                8.6x ROI
              </div>
              <div className="text-sm text-gray-600">
                Average in Year 1
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Trust elements */}
        <ScrollReveal delay={0.4}>
          <div className="font-mono text-sm text-white/60">
            30-minute call • No obligation • 5× ROI guarantee
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
