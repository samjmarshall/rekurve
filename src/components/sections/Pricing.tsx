'use client'

import { cn, formatCurrency } from '~/lib/utils'

import { Badge } from '~/components/ui/Badge'
import { BrandShimmer } from '../brand-shimmer'
import { Button } from '~/components/ui/Button'
import { Check } from 'lucide-react'
import type { PricingTier } from '~/types'
import { motion } from 'framer-motion'
import { analytics } from '~/lib/posthog'

const pricingTiers: PricingTier[] = [
  {
    id: 'foundation',
    name: 'AI-Assisted Sales System',
    tagline: 'For small teams testing AI sales',
    setupFee: 9500,
    monthlyFee: 1500,
    features: [
      'Single Channel Quote Generation (e.g. Email)',
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
      'Multi-channel integration (Email + Social Media + SMS)',
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
      'Advanced CRM integrations (Salesforce, HubSpot, Pipedrive)',
      'Dedicated account manager',
      'Custom training & onboarding',
      '6-months active service management',
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
  // Generate Service schema for SEO
  const servicesSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": pricingTiers.map((tier, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Service",
        "name": tier.name,
        "description": tier.tagline,
        "provider": {
          "@type": "Organization",
          "name": "Rekurve AI",
          "url": "https://rekurve.ai"
        },
        "areaServed": ["Brisbane", "Melbourne"],
        "serviceType": "AI Sales Automation",
        ...(tier.setupFee > 0 && tier.monthlyFee > 0 ? {
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "AUD",
            "lowPrice": tier.monthlyFee,
            "highPrice": tier.setupFee + tier.monthlyFee,
            "offerCount": 2,
            "offers": [
              {
                "@type": "Offer",
                "name": "Setup Fee",
                "price": tier.setupFee,
                "priceCurrency": "AUD"
              },
              {
                "@type": "Offer",
                "name": "Monthly Fee",
                "price": tier.monthlyFee,
                "priceCurrency": "AUD",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": tier.monthlyFee,
                  "priceCurrency": "AUD",
                  "unitCode": "MON",
                  "billingIncrement": 1
                }
              }
            ]
          }
        } : {
          "offers": {
            "@type": "Offer",
            "price": "Contact for pricing",
            "priceCurrency": "AUD"
          }
        })
      }
    }))
  }

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-background py-24"
    >
      {/* Service Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />
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
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            All plans include our 5x ROI guarantee. If you don&apos;t see
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
              ? 'border-primary'
              : tier.id === 'enterprise'
                ? 'border-primary/80'
                : 'border-primary/60'

            return (
              <motion.div
                key={tier.id}
                variants={cardVariants}
                className={`
                  group relative flex flex-col rounded-xl border-2 p-8 backdrop-blur-sm
                  transition-all duration-300
                  hover:-translate-y-2 hover:shadow-2xl
                  ${borderColor}
                  ${tier.highlighted ? 'lg:scale-105 lg:shadow-lg shadow-primary/15 relative bg-card shadow-xl' : 'bg-card/50'}
                `}
              >
                {/* Badge (Most Popular) */}
                {tier.badge && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2">
                    <Badge variant="brand" className="scale-110 px-2 py-1">
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
                        <BrandShimmer text={tier.badge} />
                      </motion.span>
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-gray-600"><span className="text-primary front-bold">{tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}</span> - {tier.tagline}</p>
                </div>

                {/* Pricing */}
                <div className="mb-8">
                  {isCustomPricing ? (
                    <div>
                      <div className="mb-1 text-4xl font-bold">
                        Custom
                      </div>
                      <p className="text-sm text-gray-600">
                        Tailored to your needs
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-4xl font-bold">
                          {formatCurrency(tier.setupFee)}
                        </span>
                        <span className="text-gray-600">setup</span>
                      </div>
                      <div className="flex items-baseline gap-2 text-lg">
                        <span className="font-semibold text-primary">
                          {formatCurrency(tier.monthlyFee)}
                        </span>
                        <span className="text-gray-600">per month</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 grow space-y-3">
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
                          !tier.highlighted &&'text-gray-600'
                        }`}
                        strokeWidth={2.5}
                      />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={tier.highlighted ? 'primary' : 'outline'}
                  size="lg"
                  className={cn('w-full', tier.highlighted && 'border-accent-green')}
                  asChild
                  onClick={() => analytics.cta.click(`pricing_${tier.id}` as 'pricing_foundation' | 'pricing_growth' | 'pricing_enterprise')}
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
          <p className="text-gray-600">
            All plans backed by our{' '}
            <a
              href="#guarantee"
              className="font-semibold text-accent-coral underline decoration-accent-coral/30 transition-colors hover:text-accent-coral/90 hover:decoration-accent-coral"
            >
              5x ROI Guarantee
            </a>
            . Questions?{' '}
            <a
              href="#faq"
              className="font-semibold underline decoration-stone-400/30 transition-colors hover:text-stone-300 hover:decoration-stone-400"
            >
              View FAQ
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
