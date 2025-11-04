'use client'

import { Clock, DollarSign, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { formatCurrency } from '~/lib/utils'

const painPoints = [
  {
    icon: Clock,
    metric: '40%',
    label: 'of Time Wasted',
    description: 'Your reps spend 16+ hours weekly on CRM updates and data entry',
    accentColor: 'coral' // Urgent/attention
  },
  {
    icon: DollarSign,
    metric: formatCurrency(475000),
    label: 'Annual Cost',
    description: "That's the value of time spent on non-selling activities",
    accentColor: 'amber' // Warning/financial impact
  },
  {
    icon: TrendingDown,
    metric: '30%',
    label: 'Lost Deals',
    description: 'Prospects fall through cracks due to slow follow-up',
    accentColor: 'slate' // Neutral/subdued
  }
]

export default function Problem() {
  return (
    <section className="relative py-24 bg-white">
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Heading */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Your Sales Team Is Losing{' '}
              <span className="text-accent-coral">$250K+</span> Annually to Manual Work
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Here&apos;s exactly what it&apos;s costing you:
            </p>
          </div>
        </ScrollReveal>

        {/* Pain Point Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => {
            const Icon = point.icon
            const accentClasses = {
              coral: {
                bar: 'bg-accent-coral',
                iconBg: 'bg-accent-coral/10',
                iconColor: 'text-accent-coral',
                labelColor: 'text-accent-coral'
              },
              amber: {
                bar: 'bg-accent-amber',
                iconBg: 'bg-accent-amber/10',
                iconColor: 'text-accent-amber',
                labelColor: 'text-accent-amber'
              },
              slate: {
                bar: 'bg-slate-400',
                iconBg: 'bg-slate-100',
                iconColor: 'text-slate-600',
                labelColor: 'text-slate-700'
              }
            }
            const accent = accentClasses[point.accentColor as keyof typeof accentClasses]

            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <Card className="group relative h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-card-lg">
                  {/* Colored vertical bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar} rounded-l-xl`} />

                  <CardContent className="p-8">
                    {/* Icon */}
                    <div className="mb-6">
                      <div className={`inline-flex p-3 rounded-lg ${accent.iconBg}`}>
                        <Icon className={`w-8 h-8 ${accent.iconColor}`} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Metric */}
                    <div className="mb-2">
                      <div className="text-4xl md:text-5xl font-bold text-slate-900 font-mono tabular-nums">
                        {point.metric}
                      </div>
                      <div className={`text-lg font-semibold ${accent.labelColor} mt-1`}>
                        {point.label}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 leading-relaxed">
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
