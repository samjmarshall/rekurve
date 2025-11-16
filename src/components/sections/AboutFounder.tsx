"use client"

import { Brain, CircleCheckBig, Database, Plug, Server, Workflow } from "lucide-react"
import { Card, CardContent } from "~/components/ui/Card"

import { Badge } from "~/components/ui/Badge"
import { BrandShimmer } from "../brand-shimmer"
import { motion } from "framer-motion"

const credentials = [
  "Member of the founding team at V2 AI",
  "Leading Gen AI Prototyping Partner for Amazon Web Service - APAC",
  "10+ years scaling production systems"
]

const techStack = [
  {
    layer: "Intelligence Layer",
    icon: Brain,
    content: "Gemini, Anthropic + Proprietary Models",
  },
  {
    layer: "Orchestration Layer",
    icon: Workflow,
    content: "Proprietary AI Agent Orchestration Engine",
  },
  {
    layer: "Data Layer",
    icon: Database,
    content: "Real-time enrichment (Clay, Clearbit, Apollo)",
  },
  {
    layer: "Integration Layer",
    icon: Plug,
    content: "HubSpot, Salesforce, Pipedrive APIs",
  },
  {
    layer: "Infrastructure",
    icon: Server,
    color: "primary",
    content: "Amazon Web Services with 99.9% uptime SLA",
  },
]

export function AboutFounder() {
  return (
    <section className="relative overflow-hidden bg-background py-20">
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[40%_60%]">
          {/* Left side - Founder positioning */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Founder photo placeholder */}
            <div className="relative mx-auto w-fit lg:mx-0">
              <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-transparent bg-linear-to-br from-accent-blue via-primary to-primary p-1 shadow-2xl">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-black">
                  <div className="text-center text-white">
                    <div className="text-5xl font-bold">SM</div>
                    <div className="mt-2 text-xs">
                      Photo here
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">
                Built by Sam Marshall
                <br />
                <BrandShimmer text="Principal AI Engineer" className="text-lg" />
              </h3>

              {/* Credentials */}
              <div className="space-y-3">
                {credentials.map((credential, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-600" />
                    <p className="text-sm font-mono leading-relaxed text-gray-600">
                      {credential}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quote block */}
              <Card className="backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="italic flex leading-relaxed text-gray-600 max-w-prose">
                    <span className="mb-3 pr-2 text-5xl leading-none text-primary">
                      &ldquo;
                    </span>
                    I saw small to medium business struggling with problems I&apos;d
                    solved in Enterprise. Manual, repetitive work that took sales reps and business owners away from growing their businesses. Now I build AI agents with production-grade
                    reliability, not marketing hype.
                    <span className="mt-auto rotate-180 text-5xl leading-none text-primary">
                      &ldquo;
                    </span>
                  </p>
                  
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Right side - Technical stack */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">
                Enterprise-Grade Architecture
              </h3>
              <p className="max-w-prose">
                Built with the same reliability principles used at scale by
                leading tech companies like <span className="font-semibold">Google</span>, <span className="font-semibold">Amazon</span> and <span className="font-semibold">Netflix</span>. Production-grade monitoring,
                operations, and 99.9% uptime SLA.
              </p>
            </div>

            {/* Stack layers */}
            <div className="space-y-3">
              {techStack.map((layer, index) => {
                const Icon = layer.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  >
                    <Card
                      className="border-l-4 backdrop-blur-sm transition-all duration-300 hover:border-primary"
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                        >
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 text-sm font-semibold">
                            {layer.layer}
                          </div>
                          <div className="font-mono text-xs text-gray-600">
                            {layer.content}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 lg:justify-start">
              <Badge variant="default" className="text-gray-600 border-gray-300 bg-white dark:bg-black dark:border-neutral-800">
                <CircleCheckBig className="h-3 w-3 mr-1.5 text-state-success" />
                SOC 2 Compliant
              </Badge>
              <Badge variant="default" className="text-gray-600 border-gray-300 bg-white dark:bg-black dark:border-neutral-800">
                <CircleCheckBig className="h-3 w-3 mr-1.5 text-state-success" />
                AWS Partner
              </Badge>
              <Badge variant="default" className="text-gray-600 border-gray-300 bg-white dark:bg-black dark:border-neutral-800">
                <CircleCheckBig className="h-3 w-3 mr-1.5 text-state-success" />
                GDPR Compliant
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
