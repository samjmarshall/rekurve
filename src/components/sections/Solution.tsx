'use client'

import { Zap, TrendingUp, Target, Mail, Search, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { Badge } from '~/components/ui/Badge'
import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { formatNumber } from '~/lib/utils'

const keyCapabilities = [
  {
    icon: Search,
    title: 'Intelligent Lead Research',
    description: 'AI agents analyze prospects across multiple data sources, enriching profiles with buying signals and firmographic data in real-time.'
  },
  {
    icon: Mail,
    title: 'Multi-Channel Outreach',
    description: 'Coordinated engagement across Email, LinkedIn, and SMS with adaptive messaging that responds to prospect behavior.'
  },
  {
    icon: MessageSquare,
    title: 'Adaptive Messaging',
    description: 'Dynamic content generation that personalizes based on industry, role, company size, and engagement patterns.'
  }
]

export default function Solution() {
  return (
    <section className="relative py-24 bg-slate-50">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
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
              Meet Your <span className="text-accent-cyan">24/7 Virtual SDR</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Not automation. Not chatbots. Intelligent agents that research, qualify, and engage autonomously.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid Layout */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Large Card - Main Value Prop */}
          <ScrollReveal delay={0.1}>
            <Card className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-accent-cyan/20 hover:border-accent-cyan/40 transition-all duration-300">
              <CardContent className="p-10">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, oklch(0.70 0.15 195), oklch(0.75 0.15 75))'
                      }}
                    >
                      <Zap className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-white mb-4">
                      Recover <span className="text-accent-amber">20+ Hours Weekly</span>
                    </h3>
                    <p className="text-lg text-slate-300 leading-relaxed mb-6">
                      AI agents handle lead research, CRM updates, follow-up sequencing, and meeting scheduling automatically—freeing your team to focus on high-value conversations.
                    </p>

                    {/* Enhanced workflow visualization */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                      <div className="flex items-center gap-3 text-sm font-mono">
                        {/* Step 1: Lead Research */}
                        <div className="flex items-center gap-2 opacity-100">
                          <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse" />
                          <span className="text-slate-300">Lead Research</span>
                        </div>

                        {/* Connector 1 */}
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-accent-cyan/60 to-accent-cyan/30 min-w-[20px]" />

                        {/* Step 2: Qualification */}
                        <div className="flex items-center gap-2 opacity-70">
                          <div
                            className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse"
                            style={{ animationDelay: '0.3s' }}
                          />
                          <span className="text-slate-400">Qualification</span>
                        </div>

                        {/* Connector 2 */}
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-accent-cyan/30 to-accent-cyan/20 min-w-[20px]" />

                        {/* Step 3: Outreach */}
                        <div className="flex items-center gap-2 opacity-50">
                          <div
                            className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse"
                            style={{ animationDelay: '0.6s' }}
                          />
                          <span className="text-slate-500">Outreach</span>
                        </div>

                        {/* Connector 3 */}
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-accent-cyan/20 to-state-success/60 min-w-[20px]" />

                        {/* Step 4: Meeting Booked (Success) */}
                        <div className="flex items-center gap-2 opacity-100">
                          <div
                            className="w-3 h-3 rounded-full bg-state-success animate-pulse shadow-lg shadow-state-success/50"
                            style={{ animationDelay: '0.9s' }}
                          />
                          <span className="text-state-success font-semibold">Meeting Booked</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Medium Card 1 - Pipeline Growth */}
          <ScrollReveal delay={0.2}>
            <Card className="bg-white hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.70 0.15 195), oklch(0.70 0.18 145))'
                  }}
                >
                  <TrendingUp className="w-6 h-6 text-white" strokeWidth={2} />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Add <span className="text-accent-cyan">$100K+</span> to Pipeline
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Never miss a lead. Instant 24/7 response. Personalized multi-channel outreach.
                </p>

                <Badge variant="cyan" className="text-sm font-mono">
                  {formatNumber(3)}-{formatNumber(5)}× more qualified meetings
                </Badge>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Medium Card 2 - ROI */}
          <ScrollReveal delay={0.3}>
            <Card className="bg-white hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.70 0.18 145), oklch(0.75 0.15 75))'
                  }}
                >
                  <Target className="w-6 h-6 text-white" strokeWidth={2} />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  <span className="text-state-success">{formatNumber(5)}-{formatNumber(10)}× ROI</span> in 120 Days
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Typical clients see full payback in 2 months, then continuous compounding value.
                </p>

                <Badge variant="success" className="text-sm font-mono">
                  Average ROI: {formatNumber(8.6)}× in Year 1
                </Badge>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        {/* Key Capabilities Grid */}
        <ScrollReveal delay={0.4}>
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              How Your AI Sales Agent Works
            </h3>

            <div className="grid md:grid-cols-3 gap-8">
              {keyCapabilities.map((capability, index) => {
                const Icon = capability.icon
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex p-3 rounded-lg bg-accent-cyan/10 mb-4">
                      <Icon className="w-6 h-6 text-accent-cyan" strokeWidth={2} />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">
                      {capability.title}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
