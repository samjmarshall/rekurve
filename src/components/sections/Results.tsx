"use client"

import { Card, CardContent } from "~/components/ui/Card"
import { Clock, DollarSign, TrendingUp, Zap } from "lucide-react"

import { motion } from "framer-motion"

const metrics = [
  {
    icon: Clock,
    value: "4 hrs → 4 min",
    description: "Lead qualification time",
  },
  {
    icon: TrendingUp,
    value: "43%",
    suffix: " increase",
    description: "Marketing Qualified Lead to Sales Qualified Lead conversion",
  },
  {
    icon: DollarSign,
    value: "$380K",
    suffix: " added",
    description: "Pipeline in 120 days",
  },
  {
    icon: Zap,
    value: "25",
    suffix: " hrs/week saved",
    description: "Team productivity",
  },
]

export function Results() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-black py-20">
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
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Real Results from Real Clients
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
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
                <Card className="group relative h-full overflow-hidden bg-gray-50 border-gray-50/20 dark:bg-neutral-800 dark:border-neutral-800/20 bg-gradient-to-br from-gray-50/80 dark:from-neutral-800/80 to-gray-50 dark:to-neutral-800 backdrop-blur-sm transition-all duration-300 hover:border-gray-50/40 dark:hover:border-neutral-800/40 hover:shadow-2xl hover:shadow-brand/10">
                  <CardContent className="flex flex-col p-8">
                    <Icon className="size-8 mb-4 text-brand" />

                    {/* Metric value */}
                    <div className="mb-2 font-mono">
                      <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                        {metric.value}
                      </span>
                      {metric.suffix && (
                        <span className="text-xl font-semibold text-white">
                          {metric.suffix}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600">{metric.description}</p>

                    {/* Accent line at bottom */}
                    <div
                      className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-brand to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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
          <p className="mb-6 font-mono text-sm text-gray-600">
            Implemented in 6 weeks, results visible by week 10
          </p>
        </motion.div>
      </div>
    </section>
  )
}
