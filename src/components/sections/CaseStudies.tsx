"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/Accordion"
import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react"
import { Card, CardContent } from "~/components/ui/Card"

import { Badge } from "~/components/ui/Badge"
import { Compare } from "~/components/ui/compare"
import { motion } from "framer-motion"

const caseStudy = {
  title: "How ABC Accounting Saved 25 Hours Weekly and Added $380K to Pipeline",
  company: {
    industry: "Professional Services",
    size: "35 employees",
    location: "Brisbane, QLD",
  },
  challenge: {
    icon: AlertTriangle,
    title: "The Challenge",
    points: [
      "40% of sales team time wasted on unqualified leads",
      "$250K in lost opportunity cost annually",
      "Manual CRM updates taking 8+ hours weekly",
      "Inconsistent follow-up leading to missed opportunities",
    ],
  },
  solution: {
    icon: Lightbulb,
    title: "The Solution",
    points: [
      "Implemented autonomous AI sales agents for lead qualification",
      "12 custom criteria aligned to their ideal client profile",
      "Multi-channel engagement (Email, LinkedIn, SMS)",
      "Real-time CRM updates with enriched lead data",
    ],
  },
  results: {
    icon: TrendingUp,
    title: "The Results",
    timeline: "6 weeks implementation, results visible by week 10",
    metrics: [
      { label: "Time Saved", value: "25 hrs/week" },
      { label: "Pipeline Added", value: "$380K" },
      { label: "Conversion Rate", value: "43% increase" },
      { label: "Payback Period", value: "6 weeks" },
    ],
    details: [
      "Lead qualification time reduced from 4 hours to 4 minutes",
      "MQL-to-SQL conversion rate increased by 43%",
      "Sales team now focuses entirely on high-value conversations",
      "ROI of 8.6x in the first year",
    ],
  },
}

export function CaseStudies() {
  const ChallengeIcon = caseStudy.challenge.icon
  const SolutionIcon = caseStudy.solution.icon
  const ResultsIcon = caseStudy.results.icon

  return (
    <section className="relative overflow-hidden bg-gray-50 py-20">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#071D33_1px,transparent_1px)] bg-size-[2rem_2rem]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Section header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Client Success Stories
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Real implementations, real results. See how our AI agents transform
            sales operations.
          </p>
        </motion.div>

        {/* Case study card */}
        <motion.div
          className="mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="overflow-hidden border-2 shadow-2xl">
            <CardContent className="p-8 sm:p-12">
              {/* Case study header */}
              <div className="mb-8">
                <h3 className="mb-4 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  {caseStudy.title}
                </h3>

                {/* Company details badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">{caseStudy.company.industry}</Badge>
                  <Badge variant="default">{caseStudy.company.size}</Badge>
                  <Badge variant="default">{caseStudy.company.location}</Badge>
                </div>
              </div>

              {/* Before/After Comparison Slider */}
              <div className="mb-8">
                <Compare
                  firstImage="/case-studies/before-manual-process.svg"
                  secondImage="/case-studies/after-ai-agent.svg"
                  firstImageClassName="object-contain"
                  secondImageClassname="object-contain"
                  className="h-[500px] w-full rounded-lg border-2 border-state-success/20 bg-gray-50"
                  slideMode="hover"
                  autoplay={true}
                  autoplayDuration={5000}
                />
                <div className="mt-4 flex justify-between px-4 text-sm text-gray-600">
                  <span className="font-mono">← Manual Process (40% time wasted)</span>
                  <span className="font-mono">AI Agent (20+ hrs saved) →</span>
                </div>
              </div>

              {/* Accordion sections */}
              <Accordion className="w-full">
                {/* Challenge */}
                <AccordionItem value="challenge">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-coral/10">
                        <ChallengeIcon className="h-5 w-5 text-accent-coral" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        {caseStudy.challenge.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="ml-13 space-y-3 border-l-4 border-accent-coral/20 pl-6">
                      {caseStudy.challenge.points.map((point, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-neutral-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-coral" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                {/* Solution */}
                <AccordionItem value="solution">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-amber/10">
                        <SolutionIcon className="h-5 w-5 text-accent-amber" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        {caseStudy.solution.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="ml-13 space-y-3 border-l-4 border-accent-amber/20 pl-6">
                      {caseStudy.solution.points.map((point, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-neutral-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-amber" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                {/* Results */}
                <AccordionItem value="results">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-state-success/10">
                        <ResultsIcon className="h-5 w-5 text-state-success" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        {caseStudy.results.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="ml-13 space-y-6 border-l-4 border-state-success/20 pl-6">
                      {/* Timeline */}
                      <p className="font-mono text-sm text-gray-600">
                        {caseStudy.results.timeline}
                      </p>

                      {/* Metrics grid */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {caseStudy.results.metrics.map((metric, index) => (
                          <div
                            key={index}
                            className="rounded-lg bg-state-success/5 p-4 text-center"
                          >
                            <div className="mb-1 font-mono text-2xl font-bold text-state-success">
                              {metric.value}
                            </div>
                            <div className="text-xs text-gray-600">
                              {metric.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Details */}
                      <ul className="space-y-3">
                        {caseStudy.results.details.map((detail, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-neutral-700"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-state-success" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        {/* Placeholder for future case studies carousel */}
        <motion.div
          className="mx-auto mt-16 max-w-4xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="mb-4 text-2xl font-bold text-primary">
            More Success Stories Coming Soon
          </h3>
          <p className="text-gray-600">
            We&apos;re collecting additional case studies from our clients. Check back soon for more transformative results.
          </p>
          {/* Future: AnimatedTestimonials carousel will be implemented here with multiple case studies */}
        </motion.div>
      </div>
    </section>
  )
}
