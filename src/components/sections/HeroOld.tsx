'use client'

import { ArrowRight, Play } from 'lucide-react'

import { Button } from '~/components/ui/Button'
import { FadeInUp } from '~/components/motion/FadeInUp'

export default function Hero() {
  const handlePrimaryCTA = () => {
    const bookingSection = document.getElementById('booking')
    bookingSection?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSecondaryCTA = () => {
    // In a real implementation, this would open a video modal
    console.log('Open demo video')
  }

  return (
    <section className="relative min-h-[80vh] md:min-h-screen flex items-start md:items-center justify-center overflow-hidden pt-24 md:pt-0">
      {/* Background with atmospheric depth */}
      <div className="absolute inset-0 bg-[oklch(0.15_0_0)]">
        {/* Radial gradients for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 10%, oklch(0.18 0.02 250) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, oklch(0.16 0.02 230) 0%, transparent 50%)
            `
          }}
        />
        {/* Subtle geometric pattern overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              oklch(0.25 0.08 195) 40px,
              oklch(0.25 0.08 195) 41px
            )`
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <FadeInUp delay={0.2}>
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight text-white mb-6"
              style={{ letterSpacing: '-0.02em' }}
            >
              Recover 20+ Hours Weekly and Add{' '}
              <span className="text-accent-cyan">$100K</span> to Your Pipeline in{' '}
              <span className="text-accent-amber">90 Days</span>
            </h1>          </FadeInUp>

          {/* Subheadline */}
          <FadeInUp delay={0.4}>
            <p className="text-xl md:text-2xl text-slate-300 leading-relaxed mb-12 max-w-3xl mx-auto">
              Autonomous AI sales agents for Brisbane professional services firms—built by a former AWS SRE who understands both the code and the business outcomes.
            </p>
          </FadeInUp>

          {/* CTA Buttons */}
          <FadeInUp delay={0.6}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                size="lg"
                variant="primary"
                onClick={handlePrimaryCTA}
                className="group"
              >
                Book Your Free Strategy Session
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleSecondaryCTA}
                className="group"
              >
                <Play className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" />
                Watch 3-Minute Demo
              </Button>
            </div>
          </FadeInUp>

          {/* Micro-copy */}
          <FadeInUp delay={0.8}>
            <p className="text-sm text-slate-500 font-mono mb-12">
              30-minute call, no obligation • See if we&apos;re a fit
            </p>
          </FadeInUp>

          {/* Social Proof */}
          <FadeInUp delay={1.0}>
            <div className="border-t border-slate-700 pt-8">
              <p className="text-sm text-slate-400">
                Trusted by professional services firms across Brisbane and Melbourne
              </p>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  )
}
