'use client'

import { Mail, MessageSquare, Search } from 'lucide-react'

import { GlowingEffect } from "~/components/ui/glowing-effect";
import type React from 'react';
import { ScrollReveal } from '~/components/motion/ScrollReveal'

export default function Solution() {
  return (
    <section id="features" className="relative py-24 bg-background">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Heading */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Meet Your <span className="text-primary">24/7 Sales Rep</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Not n8n automation. Not chatbots. Intelligent agents that research, qualify, and engage autonomously.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid Layout */}
        <ScrollReveal delay={0.1}>
          <GlowingBento />
        </ScrollReveal>
      </div>
    </section>
  )
}

export function GlowingBento() {
  return (
    // <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-5 lg:gap-4 xl:grid-rows-3">
    <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-5 lg:gap-4 xl:grid-rows-2">
      {/* Benefits */}
      {/* <GridItem
        area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/1/5]"
        icon={<Clock className="h-4 w-4 text-primary" />}
        title="Recover 20+ Hours Weekly"
        description="AI agents handle lead research, qualification, CRM updates, follow-up sequencing, meeting scheduling and quote generation. Freeing your team to focus on high-value conversations."
      />

      <GridItem
        area="md:[grid-area:1/1/3/7] xl:[grid-area:1/5/1/9]"
        icon={<Target className="h-4 w-4 text-primary" />}
        title="5-10x ROI in 120 Days"
        description="Typical clients see full payback in 2 months, then continuous compounding value. Average ROI: 8.6x in Year 1"
      />

      <GridItem
        area="md:[grid-area:1/7/3/13] xl:[grid-area:1/9/1/13]"
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        title="Add $100K+ to Pipeline"
        description="Never miss a lead. Instant 24/7 response. Personalized multi-channel integration."
      /> */}

      {/* Workflow */}
      {/* <GridItem area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/2/13]"> */}
      <GridItem area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/1/13]">
        {/* Enhanced workflow visualization */}
        <ScrollReveal delay={0.2} className="flex h-full w-full px-10 items-center justify-center">
          <div className="flex w-full items-center gap-3 text-sm font-mono">
            {/* Step 1: Lead Research */}
            <div className="flex items-center gap-2 opacity-100">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-stone-300">Lead Research</span>
            </div>

            {/* Connector 1 */}
            <div className="flex-1 h-px bg-linear-to-r from-accent-blue/60 to-accent-blue/30 min-w-5" />

            {/* Step 2: Qualification */}
            <div className="flex items-center gap-2 opacity-70">
              <div
                className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse"
                style={{ animationDelay: '0.3s' }}
              />
              <span className="text-stone-400">Qualification</span>
            </div>

            {/* Connector 2 */}
            <div className="flex-1 h-px bg-linear-to-r from-accent-blue/30 to-accent-blue/20 min-w-5" />

            {/* Step 3: Follow-up */}
            <div className="flex items-center gap-2 opacity-50">
              <div
                className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse"
                style={{ animationDelay: '0.6s' }}
              />
              <span className="text-stone-500">Follow-up</span>
            </div>

            {/* Connector 3 */}
            <div className="flex-1">
              <div className="relative left-24 w-20 h-px bg-linear-to-r from-accent-blue/20 to-accent-green/60 min-w-5" />
              <div className="relative left-24 h-5 w-px bg-accent-green/30" />
              <div className="h-px w-24.25 bg-linear-to-r from-accent-blue/20 to-accent-green/30 min-w-5" />
              <div className="relative left-24 h-5 w-px bg-accent-green/30" />
              <div className="relative left-24 w-20 h-px bg-linear-to-r bg-accent-green/30 to-accent-green/60 min-w-5" />
            </div>
            

            {/* Step 4: (Success) */}
            <div className="flex flex-col gap-5.5">
              <div className="flex items-center space-x-2 opacity-100">
                <div
                  className="w-3 h-3 rounded-full bg-accent-green animate-pulse shadow-lg shadow-accent-green/50"
                  style={{ animationDelay: '0.9s' }}
                />
                <span className="text-accent-green font-semibold">Job Booked</span>
              </div>
              <div className="flex items-center space-x-2 opacity-100">
                <div
                  className="w-3 h-3 rounded-full bg-accent-green animate-pulse shadow-lg shadow-accent-green/50"
                  style={{ animationDelay: '0.9s' }}
                />
                <span className="text-accent-green font-semibold">Quote Sent</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </GridItem>

      {/* How it works */}
      <GridItem
        // area="md:[grid-area:1/1/2/7] xl:[grid-area:3/1/3/5]"
        area="md:[grid-area:1/1/2/7] xl:[grid-area:2/1/2/5]"
        icon={<Search className="h-4 w-4 text-primary" />}
        title="Research"
        description="AI agents handle lead research. Analyzing prospects across multiple data sources. Enriching profiles with buying signals and data in real-time"
      />

      <GridItem
        // area="md:[grid-area:2/1/3/7] xl:[grid-area:3/5/3/9]"
        area="md:[grid-area:2/1/3/7] xl:[grid-area:2/5/2/9]"
        icon={<Mail className="h-4 w-4 text-primary" />}
        title="Qualification"
        description="Coordinated engagement across Email, Social Media, and SMS with adaptive messaging that responds to prospect behavior with proven follow-up sequencing based on your unique sales process."
      />

      <GridItem
        // area="md:[grid-area:2/7/3/13] xl:[grid-area:3/9/3/13]"
        area="md:[grid-area:2/7/3/13] xl:[grid-area:2/9/2/13]"
        icon={<MessageSquare className="h-4 w-4 text-primary" />}
        title="Book & Quote"
        description="Dynamic lead progression with meeting scheduling and quote generation based on your product and service offerings."
      />
    </ul>
  );
}

interface GridItemProps {
  area: string;
  icon?: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
}

const GridItem = ({ area, icon, title, description, children }: React.PropsWithChildren<GridItemProps>) => {
  return (
    <li className={`min-h-56 list-none ${area}`}>
      <div className="relative h-full rounded-2xl shadow-md border bg-card border-border p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            {icon && (
              <div className="w-fit rounded-lg border border-border p-2">
                {icon}
              </div>
            )}
            <div className="space-y-3 mb-auto h-full">
              {title && (
                <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance md:text-2xl/[1.875rem]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="font-sans text-sm/[1.125rem] md:text-base/[1.375rem] text-gray-600 dark:text-neutral-400 [&_b]:md:font-semibold [&_strong]:md:font-semibold">
                  {description}
                </p>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
