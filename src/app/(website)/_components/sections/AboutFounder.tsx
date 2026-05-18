"use client";

import { motion } from "framer-motion";
import {
  Brain,
  CircleCheckBig,
  Database,
  Plug,
  Server,
  Workflow,
} from "lucide-react";
import Image from "next/image";

import { Badge } from "~/components/ui/Badge";
import { Card, CardContent } from "~/components/ui/Card";
import { BrandShimmer } from "../brand-shimmer";

const credentials = [
  "1st Engineering hire at V2 AI",
  "Leading Gen AI Prototyping Partner for Amazon Web Services - APAC",
  "10+ years scaling production systems",
];

const techStack = [
  {
    layer: "Intelligence Layer",
    icon: Brain,
    content: "Anthropic + Proprietary Models",
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
];

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
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neutral-800 to-black">
                  <Image
                    src="/sam.jpeg"
                    alt="Sam Marshall"
                    width={192}
                    height={192}
                    className="rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Bio section */}
            <div className="space-y-4">
              <h2 className="font-semibold text-2xl">
                Built by Sam Marshall
                <br />
                <BrandShimmer
                  text="Principal AI Engineer"
                  className="text-lg"
                />
              </h2>

              {/* Credentials */}
              <div className="space-y-3">
                {credentials.map((credential, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-600" />
                    <p className="font-mono text-gray-600 text-sm leading-relaxed">
                      {credential}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quote block */}
              <Card className="backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="flex max-w-prose text-gray-600 italic leading-relaxed">
                    <span className="mb-3 pr-2 text-5xl text-primary leading-none">
                      &ldquo;
                    </span>
                    I saw small to medium business struggling with problems
                    I&apos;d solved in Enterprise. Manual, repetitive work that
                    took sales reps and business owners away from growing their
                    businesses. Now I build AI agents with production-grade
                    reliability, not marketing hype.
                    <span className="mt-auto rotate-180 text-5xl text-primary leading-none">
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
              <h3 className="font-bold text-2xl">
                Enterprise-Grade Architecture
              </h3>
              <p className="max-w-prose">
                Built with the same reliability principles used at scale by
                leading tech companies like{" "}
                <span className="font-semibold">Google</span>,{" "}
                <span className="font-semibold">Amazon</span> and{" "}
                <span className="font-semibold">Netflix</span>. Production-grade
                monitoring, operations, and 99.9% uptime SLA.
              </p>
            </div>

            {/* Stack layers */}
            <div className="space-y-3">
              {techStack.map((layer, index) => {
                const Icon = layer.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  >
                    <Card className="border-l-4 backdrop-blur-sm transition-all duration-300 hover:border-primary">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 font-semibold text-sm">
                            {layer.layer}
                          </div>
                          <div className="font-mono text-gray-600 text-xs">
                            {layer.content}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 lg:justify-start">
              <Badge
                variant="default"
                className="border-gray-300 bg-white text-gray-600 dark:border-neutral-800 dark:bg-black"
              >
                <CircleCheckBig className="mr-1.5 h-3 w-3 text-state-success" />
                SOC 2 Compliant
              </Badge>
              <Badge
                variant="default"
                className="border-gray-300 bg-white text-gray-600 dark:border-neutral-800 dark:bg-black"
              >
                <CircleCheckBig className="mr-1.5 h-3 w-3 text-state-success" />
                AWS Partner
              </Badge>
              <Badge
                variant="default"
                className="border-gray-300 bg-white text-gray-600 dark:border-neutral-800 dark:bg-black"
              >
                <CircleCheckBig className="mr-1.5 h-3 w-3 text-state-success" />
                GDPR Compliant
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
