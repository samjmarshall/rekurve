'use client'

import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Check } from 'lucide-react'
import type { PricingTier } from '~/types'
import { formatCurrency } from '~/lib/utils'
import { motion } from 'framer-motion'

const pricingTiers: PricingTier[] = [
  {
    id: 'foundation',
    name: 'AI-Assisted Sales System',
    tagline: 'Foundation for small teams testing AI sales',
    setupFee: 9500,
    monthlyFee: 2500,
    features: [
      'CRM setup & integration',
      'Basic lead research automation',
      'Email sequence automation (3-5 sequences)',
      'Basic lead scoring',
      'Performance dashboard',
      '30-day optimization support',
      'Email support',
    ],
    cta: 'Get Started',
    badge: undefined,
  },
  {
    id: 'growth',
    name: 'Intelligent Sales Agent',
    tagline: 'Autonomous agent for scaling outbound',
    setupFee: 20000,
    monthlyFee: 4500,
    features: [
      'Everything in Foundation',
      'Multi-channel outreach (Email + LinkedIn + SMS)',
      'AI-powered lead qualification',
      'Adaptive messaging based on engagement',
      'Real-time lead enrichment (Clay, Clearbit)',
      'Custom workflow automation',
      'Advanced analytics dashboard',
      '90-day optimization support',
      'Priority email + Slack support',
    ],
    highlighted: true,
    cta: 'Start Growing',
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Autonomous AI Sales Agent',
    tagline: 'Enterprise-grade autonomous sales system',
    setupFee: 0, // Custom pricing
    monthlyFee: 0, // Custom pricing
    features: [
      'Everything in Growth',
      'Custom AI decision logic',
      'Multi-language support',
      'Advanced CRM integrations (Salesforce, HubSpot, Pipedrive)',
      'Dedicated account manager',
      'Custom training & onboarding',
      '6-month managed service',
      '99.9% uptime SLA',
      'White-glove support (phone + video)',
    ],
    cta: 'Contact Sales',
    badge: undefined,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-white dark:bg-black py-24"
    >
      <div className="container relative mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            All plans include our 5× ROI guarantee. If you don&apos;t see
            results, you don&apos;t pay.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid gap-8 lg:grid-cols-3"
        >
          {pricingTiers.map((tier) => {
            const isCustomPricing = tier.setupFee === 0 && tier.monthlyFee === 0
            const borderColor = tier.highlighted
              ? 'border-accent-cyan'
              : tier.id === 'enterprise'
                ? 'border-state-success'
                : 'border-accent-coral'

            return (
              <motion.div
                key={tier.id}
                variants={cardVariants}
                className={`
                  group relative flex flex-col rounded-xl border-2 bg-slate-900/50 p-8 backdrop-blur-sm
                  transition-all duration-300
                  hover:-translate-y-2 hover:shadow-2xl
                  ${borderColor}
                  ${tier.highlighted ? 'lg:scale-105 lg:shadow-xl' : ''}
                `}
              >
                {/* Badge (Most Popular) */}
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="amber" className="shadow-xl scale-110 px-4 py-2">
                      <motion.span
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="font-semibold"
                      >
                        {tier.badge}
                      </motion.span>
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold text-white">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-slate-400">{tier.tagline}</p>
                </div>

                {/* Pricing */}
                <div className="mb-8">
                  {isCustomPricing ? (
                    <div>
                      <div className="mb-1 text-4xl font-bold text-white">
                        Custom
                      </div>
                      <p className="text-sm text-slate-400">
                        Tailored to your needs
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white">
                          {formatCurrency(tier.setupFee)}
                        </span>
                        <span className="text-slate-400">setup</span>
                      </div>
                      <div className="flex items-baseline gap-2 text-lg">
                        <span className="font-semibold text-accent-cyan">
                          {formatCurrency(tier.monthlyFee)}
                        </span>
                        <span className="text-slate-400">per month</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 flex-grow space-y-3">
                  {tier.features.map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.05,
                      }}
                      className="flex items-start gap-3"
                    >
                      <Check
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          tier.highlighted
                            ? 'text-accent-cyan'
                            : 'text-slate-400'
                        }`}
                        strokeWidth={2.5}
                      />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={tier.highlighted ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <a href="#booking-form">{tier.cta}</a>
                </Button>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Guarantee Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 text-center"
        >
          <p className="text-slate-400">
            All plans backed by our{' '}
            <a
              href="#guarantee"
              className="font-semibold text-accent-amber underline decoration-accent-amber/30 transition-colors hover:text-accent-amber/90 hover:decoration-accent-amber"
            >
              5× ROI Guarantee
            </a>
            . Questions?{' '}
            <a
              href="#faq"
              className="font-semibold text-slate-200 underline decoration-slate-400/30 transition-colors hover:text-white hover:decoration-slate-400"
            >
              View FAQ
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
