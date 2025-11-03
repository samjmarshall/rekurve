'use client'

import { motion } from 'framer-motion'
import { Shield, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { Card } from '~/components/ui/Card'

const guaranteeFeatures = [
  {
    icon: TrendingUp,
    title: '5× ROI Minimum',
    description:
      'We guarantee you\'ll see at least 5× return on your investment within 120 days, or we\'ll work for free until you do.',
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
      className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24"
    >
      {/* Ambient glow */}
      <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent-amber/5 blur-3xl" />

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
            <div className="rounded-full bg-accent-amber/10 p-6">
              <Shield className="h-16 w-16 text-accent-amber" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Heading */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Our 5× ROI Guarantee
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              We&apos;re so confident in our AI sales agents that we guarantee a
              minimum 5× return on your investment within 120 days. If we don&apos;t
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
                  <Card className="group h-full border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-accent-amber/50 hover:bg-slate-900/80">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-amber/10 transition-colors group-hover:bg-accent-amber/20">
                      <Icon
                        className="h-6 w-6 text-accent-amber"
                        strokeWidth={2}
                      />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400">
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
            className="mt-12 rounded-xl border border-slate-800 bg-slate-900/30 p-8 backdrop-blur-sm"
          >
            <h3 className="mb-4 text-xl font-semibold text-white">
              How We Measure ROI
            </h3>
            <div className="space-y-3 text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-state-success"
                  strokeWidth={2}
                />
                <p className="text-sm">
                  <span className="font-medium text-white">
                    Pipeline Value:
                  </span>{' '}
                  Total value of qualified opportunities generated by the AI
                  agent
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-state-success"
                  strokeWidth={2}
                />
                <p className="text-sm">
                  <span className="font-medium text-white">Time Saved:</span>{' '}
                  Hours recovered × your team&apos;s hourly rate (typically
                  $150-200/hour for senior sales professionals)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-state-success"
                  strokeWidth={2}
                />
                <p className="text-sm">
                  <span className="font-medium text-white">
                    Conversion Improvement:
                  </span>{' '}
                  Increased close rates from better qualified leads and
                  consistent follow-up
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-800 pt-6">
              <p className="text-sm font-medium text-accent-amber">
                Example: $20,000 investment → $100,000+ in pipeline value +
                20hrs/week saved = 5× ROI minimum
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
            <p className="text-slate-400">
              Ready to see results?{' '}
              <a
                href="#booking-form"
                className="font-semibold text-accent-amber underline decoration-accent-amber/30 transition-colors hover:text-accent-amber/90 hover:decoration-accent-amber"
              >
                Book a strategy call
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
