'use client'

import { CheckCircle, Clock, Shield, TrendingUp } from 'lucide-react'

import { Card } from '~/components/ui/Card'
import { motion } from 'framer-motion'

const guaranteeFeatures = [
  {
    icon: TrendingUp,
    title: '5x ROI Minimum',
    description:
      'We guarantee you\'ll see at least 5x return on your investment within 120 days, or we\'ll work for free until you do.',
  },
  {
    icon: Clock,
    title: '120-Day Timeline',
    description:
      'Clear measurement window. We track pipeline value, time saved, and conversion rates from day one.',
  },
  {
    icon: CheckCircle,
    title: 'Zero Risk',
    description:
      'If we don\'t deliver the promised results, you don\'t pay. Simple as that.',
  },
]

export function Guarantee() {
  return (
    <section
      id="guarantee"
      className="relative overflow-hidden bg-background py-24"
    >
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl"
        >
          {/* Shield Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-8 flex justify-center"
          >
            <Shield className="h-16 w-16 text-accent-coral" strokeWidth={1.5} />
          </motion.div>

          {/* Heading */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Our 5x ROI Guarantee
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              We&apos;re so confident in our AI sales agents that we guarantee a
              minimum 5x return on your investment within 120 days. If we don&apos;t
              deliver, we work for free until we do.
            </p>
          </div>

          {/* Guarantee Cards */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.3,
                },
              },
            }}
            className="grid gap-6 md:grid-cols-3"
          >
            {guaranteeFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}
                >
                  <Card className="group h-full p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary">
                    <Icon
                      className="h-6 w-6 mb-2 text-primary"
                      strokeWidth={2}
                    />
                    <h3 className="mb-2 text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          {/* How We Measure */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md p-8"
          >
            <h3 className="mb-4 text-xl font-semibold">
              How We Measure ROI
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  strokeWidth={2}
                />
                <p className="text-sm">
                  <span className="font-medium">
                    Pipeline Value:
                  </span>{' '}
                  <span className='text-gray-600'>
                    Total value of qualified opportunities generated by the AI agent
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  strokeWidth={2}
                />
                <p className="text-sm">
                  <span className="font-medium">Time Saved:</span>{' '}
                  <span className='text-gray-600'>
                    Hours recovered x your team&apos;s hourly rate (typically $150-200/hour for senior sales professionals)
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  strokeWidth={2}
                />
                <p className="text-sm">
                  <span className="font-medium">
                    Conversion Improvement:
                  </span>{' '}
                  <span className='text-gray-600'>
                    Increased close rates from better qualified leads and consistent follow-up
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-gray-300 dark:border-neutral-900 pt-6">
              <p className="text-sm font-medium">
                Example: $20,000 investment → $100,000+ in pipeline value +
                20hrs/week saved = 5x ROI minimum
              </p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 text-center"
          >
            <p className="text-gray-600">
              Ready to see results?{' '}
              <a
                href="#booking-form"
                className="font-semibold text-accent-blue underline decoration-primary/30 transition-colors hover:text-accent-blue/90 hover:decoration-accent-blue"
              >
                Book a call
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
