"use client"

import { Search, Lightbulb, Code2, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

const phases = [
  {
    number: 1,
    title: "Discovery & Audit",
    duration: "2 weeks",
    icon: Search,
    color: "accent-coral",
    description:
      "We analyze your sales processes, identify bottlenecks, and map automation opportunities",
    deliverables: [
      "Process flowcharts",
      "Opportunity assessment",
      "Custom roadmap",
    ],
  },
  {
    number: 2,
    title: "Strategy & Design",
    duration: "1 week",
    icon: Lightbulb,
    color: "accent-amber",
    description:
      "Design your autonomous AI agents tailored to your ICP, scoring criteria, and workflows",
    deliverables: ["System architecture", "Workflow designs", "Integration plan"],
  },
  {
    number: 3,
    title: "Implementation & Training",
    duration: "4 weeks",
    icon: Code2,
    color: "accent-cyan",
    description:
      "Build, test, and deploy your AI agents. Train your team on oversight and optimization",
    deliverables: [
      "Production system",
      "CRM integration",
      "Team training",
      "Documentation",
    ],
  },
  {
    number: 4,
    title: "Ongoing Optimization",
    duration: "Monthly",
    icon: RefreshCw,
    color: "state-success",
    description:
      "Continuous improvement based on real results, A/B testing, and evolving needs",
    deliverables: [
      "Monthly reports",
      "Optimization cycles",
      "Priority support",
    ],
  },
]

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white py-20">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23071D33' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Section header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            From Strategy to Results in 8 Weeks
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Our proven process takes you from discovery to deployed AI agents,
            with results visible within 10 weeks.
          </p>
        </motion.div>

        {/* Timeline - Desktop horizontal */}
        <div className="hidden lg:block">
          <div className="relative mx-auto max-w-6xl">
            {/* Connecting line */}
            <motion.div
              className="absolute left-0 top-[60px] h-1 w-full bg-gradient-to-r from-accent-coral via-accent-amber via-accent-cyan to-state-success"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
            />

            {/* Phases */}
            <div className="relative grid grid-cols-4 gap-8">
              {phases.map((phase, index) => {
                const Icon = phase.icon
                return (
                  <motion.div
                    key={phase.number}
                    className="relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                  >
                    {/* Phase circle */}
                    <div className="relative z-10 mx-auto mb-8 flex h-[120px] w-[120px] items-center justify-center">
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-${phase.color} to-${phase.color}/60 shadow-lg`}
                      >
                        <div className="relative">
                          <Icon className="h-12 w-12 text-white" />
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-sm font-bold text-white">
                            {phase.number}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3 text-center">
                      <h3 className="text-lg font-bold text-primary">
                        {phase.title}
                      </h3>
                      <div className="font-mono text-sm text-slate-500">
                        {phase.duration}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {phase.description}
                      </p>

                      {/* Deliverables */}
                      <div className="space-y-1 pt-2">
                        {phase.deliverables.map((deliverable, idx) => (
                          <div
                            key={idx}
                            className="font-mono text-xs text-slate-500"
                          >
                            &gt; {deliverable}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Timeline - Mobile/Tablet vertical */}
        <div className="lg:hidden">
          <div className="relative mx-auto max-w-lg">
            {/* Connecting line */}
            <motion.div
              className="absolute left-[60px] top-0 h-full w-1 bg-gradient-to-b from-accent-coral via-accent-amber via-accent-cyan to-state-success"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
            />

            {/* Phases */}
            <div className="space-y-12">
              {phases.map((phase, index) => {
                const Icon = phase.icon
                return (
                  <motion.div
                    key={phase.number}
                    className="relative flex gap-6"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                  >
                    {/* Phase circle */}
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className={`flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gradient-to-br from-${phase.color} to-${phase.color}/60 shadow-lg`}
                      >
                        <div className="relative">
                          <Icon className="h-10 w-10 text-white" />
                          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 font-mono text-sm font-bold text-white">
                            {phase.number}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 pt-2">
                      <h3 className="text-xl font-bold text-primary">
                        {phase.title}
                      </h3>
                      <div className="font-mono text-sm text-slate-500">
                        {phase.duration}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {phase.description}
                      </p>

                      {/* Deliverables */}
                      <div className="space-y-1 pt-2">
                        {phase.deliverables.map((deliverable, idx) => (
                          <div
                            key={idx}
                            className="font-mono text-xs text-slate-500"
                          >
                            &gt; {deliverable}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
