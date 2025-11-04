"use client"

import { Clock, TrendingUp, DollarSign, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent } from "~/components/ui/Card"

const metrics = [
  {
    icon: Clock,
    value: "4 hrs → 4 min",
    description: "Lead qualification time",
    accent: "accent-cyan",
  },
  {
    icon: TrendingUp,
    value: "43%",
    suffix: " increase",
    description: "MQL-to-SQL conversion",
    accent: "state-success",
  },
  {
    icon: DollarSign,
    value: "$380K",
    suffix: " added",
    description: "Pipeline in 120 days",
    accent: "accent-amber",
  },
  {
    icon: Zap,
    value: "25",
    suffix: " hrs/week saved",
    description: "Team productivity",
    accent: "state-success",
  },
]

export function Results() {
  return (
    <section className="relative overflow-hidden bg-primary py-20">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem]" />
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
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Real Results from Real Clients
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            These aren&apos;t projections—they&apos;re actual outcomes from our autonomous
            AI sales agents.
          </p>
        </motion.div>

        {/* Metrics grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <Card className="group relative h-full overflow-hidden border-primary/20 bg-gradient-to-br from-primary/80 to-primary backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-accent-cyan/10">
                  <CardContent className="flex flex-col items-center p-8 text-center">
                    {/* Icon */}
                    <div
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${metric.accent}/10`}
                    >
                      <Icon className={`h-6 w-6 text-${metric.accent}`} />
                    </div>

                    {/* Metric value */}
                    <div className="mb-2 font-mono">
                      <span className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
                        {metric.value}
                      </span>
                      {metric.suffix && (
                        <span className="text-2xl font-semibold text-white">
                          {metric.suffix}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-300">{metric.description}</p>

                    {/* Accent line at bottom */}
                    <div
                      className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-${metric.accent} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Timeline and CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <p className="mb-6 font-mono text-sm text-slate-400">
            Implemented in 6 weeks, results visible by week 10
          </p>
        </motion.div>
      </div>
    </section>
  )
}
