'use client'

import { Card, CardContent } from '~/components/ui/Card'
import { Clock, DollarSign, TrendingDown } from 'lucide-react'

import { Badge } from '../badge'
import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { formatCurrency } from '~/lib/utils'

const painPoints = [
  {
    icon: Clock,
    metric: '40%',
    label: 'of Time Wasted',
    description: 'Your reps spend 16+ hours weekly on CRM updates and data entry',
  },
  {
    icon: DollarSign,
    metric: formatCurrency(475000),
    label: 'Annual Cost',
    description: "That's the value of time spent on non-selling activities",
  },
  {
    icon: TrendingDown,
    metric: '30%',
    label: 'Lost Deals',
    description: 'Prospects fall through cracks due to slow follow-up',
  }
]

export default function Problem() {
  return (
    <section className="relative py-24 bg-white dark:bg-black">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Heading */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Your Sales Team Is Losing{' '}
              <span className="text-accent-coral">$250K+</span> Annually to Manual Work
            </h2>
            {/* <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Here&apos;s exactly what it&apos;s costing you:
            </p> */}
            <Badge text="Here&apos;s exactly what it&apos;s costing you:" />
          </div>
        </ScrollReveal>

        {/* Pain Point Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => {
            const Icon = point.icon

            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <Card className="group relative rounded-lg h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-card-lg bg-gray-50 dark:bg-neutral-800">
                  <CardContent className="p-6">
                    {/* Icon */}
                    <Icon className="size-8 mb-4 text-brand" strokeWidth={1.5} />

                    {/* Metric */}
                    <div className="mb-2">
                      <div className="text-lg md:text-5xl font-bold font-mono tabular-nums">
                        {point.metric}
                      </div>
                      <div className="font-semibold mt-1">
                        {point.label}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 leading-relaxed">
                      {point.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
