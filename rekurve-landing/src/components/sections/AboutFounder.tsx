"use client"

import { Brain, Database, Plug, Server, Workflow } from "lucide-react"
import { Card, CardContent } from "~/components/ui/Card"

import { Badge } from "~/components/ui/Badge"
import { motion } from "framer-motion"

const credentials = [
  "Member of the founding team at V2 AI",
  "Leading Gen AI Prototyping Partner for Amazon Web Service APAC",
  "10+ years scaling production systems"
]

const techStack = [
  {
    layer: "Intelligence Layer",
    icon: Brain,
    color: "accent-amber",
    content: "GPT-4 + Proprietary Models",
  },
  {
    layer: "Orchestration Layer",
    icon: Workflow,
    color: "accent-cyan",
    content: "n8n + TypeScript + AWS Lambda",
  },
  {
    layer: "Data Layer",
    icon: Database,
    color: "accent-cyan",
    content: "Real-time enrichment (Clay, Clearbit, Apollo)",
  },
  {
    layer: "Integration Layer",
    icon: Plug,
    color: "state-success",
    content: "HubSpot, Salesforce, Pipedrive APIs",
  },
  {
    layer: "Infrastructure",
    icon: Server,
    color: "primary",
    content: "AWS with 99.9% uptime SLA",
  },
]

export function AboutFounder() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-20">
      {/* Background pattern - subtle code/terminal aesthetic */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='20' font-family='monospace' font-size='12' fill='%23ffffff'%3E{'%3E'}%3C/text%3E%3Ctext x='10' y='40' font-family='monospace' font-size='12' fill='%23ffffff'%3E  code()%3C/text%3E%3Ctext x='10' y='60' font-family='monospace' font-size='12' fill='%23ffffff'%3E{'}'}%3C/text%3E%3C/svg%3E")`,
          }}
        />
      </div>

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
              <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-transparent bg-gradient-to-br from-accent-cyan via-accent-amber to-state-success p-1 shadow-2xl">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white">SK</div>
                    <div className="mt-2 text-xs text-slate-400">
                      Founder Photo
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white">
                Built by Sam Marshall
                <br />
                <span className="text-accent-cyan">Principal AI Engineer</span>
              </h3>

              {/* Credentials */}
              <div className="space-y-3">
                {credentials.map((credential, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-cyan" />
                    <p className="text-sm leading-relaxed text-slate-300">
                      <span
                        className="font-mono text-accent-cyan"
                        dangerouslySetInnerHTML={{
                          __html: credential.replace(
                            /(TypeScript|AWS|SRE)/g,
                            '<span class="font-semibold">$1</span>'
                          ),
                        }}
                      />
                    </p>
                  </div>
                ))}
              </div>

              {/* Quote block */}
              <Card className="border-l-4 border-accent-cyan bg-slate-800/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="mb-3 text-5xl leading-none text-accent-amber">
                    &ldquo;
                  </div>
                  <p className="italic leading-relaxed text-slate-200">
                    I saw professional services firms struggling with problems I
                    solved in engineering—manual, repetitive work that should be
                    automated. Now I build AI agents with production-grade
                    reliability, not marketing hype.
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
              <h3 className="text-2xl font-bold text-white">
                Enterprise-Grade Architecture
              </h3>
              <p className="text-slate-300">
                Built with the same reliability principles used at scale by
                leading tech companies. Production-grade monitoring,
                idempotent operations, and 99.9% uptime SLA.
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
                      className={`border-l-4 border-${layer.color} bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/70`}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-${layer.color}/10`}
                        >
                          <Icon className={`h-6 w-6 text-${layer.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 text-sm font-semibold text-white">
                            {layer.layer}
                          </div>
                          <div className="font-mono text-xs text-slate-400">
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
              <Badge variant="default" className="bg-slate-800 text-slate-300">
                SOC 2 Compliant
              </Badge>
              <Badge variant="default" className="bg-slate-800 text-slate-300">
                AWS Partner
              </Badge>
              <Badge variant="default" className="bg-slate-800 text-slate-300">
                GDPR Compliant
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
