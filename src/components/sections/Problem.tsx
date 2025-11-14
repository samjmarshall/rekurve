'use client'

import { Clock, DollarSign, TrendingDown } from 'lucide-react'
import React, { useEffect, useState } from "react";

import { BrandShimmer } from '../brand-shimmer'
import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { cn } from "~/lib/utils";
import { formatCurrency } from '~/lib/utils'
import { useId } from "react";

const painPoints = [
  {
    icon: Clock,
    metric: '40%',
    label: 'of Time Wasted',
    description: 'Your reps spend 16+ hours weekly on CRM updates and data entry',
  },
  {
    icon: DollarSign,
    metric: formatCurrency(475000),
    label: 'Annual Cost',
    description: "That's the value of time spent on non-selling activities",
  },
  {
    icon: TrendingDown,
    metric: '30%',
    label: 'Lost Deals',
    description: 'Prospects fall through cracks due to slow follow-up',
  }
]

export default function Problem() {
  return (
    <section className="relative py-24 bg-white dark:bg-black">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Heading */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              Your Sales Team Is Losing{' '}
              <span className="text-primary">$250K+</span> Annually to Manual Work
            </h2>
            {/* <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Here&apos;s exactly what it&apos;s costing you:
            </p> */}
            <BrandShimmer text="Here&apos;s exactly what it&apos;s costing you:" />
          </div>
        </ScrollReveal>

        {/* Pain Point Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl">
          {painPoints.map((item, index) => {
            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div
                  key={"card" + index}
                  className="group/card relative overflow-hidden p-10 shadow-md rounded-md dark:border dark:border-neutral-900"
                >
                  <Grid size={20} />
                  <EdgeElement />

                  <div className="flex items-center gap-2">
                    <IconContainer>
                      <item.icon className="text-primary" />
                    </IconContainer>
                    <div className="flex flex-col text-3xl font-bold text-neutral-700 dark:text-neutral-200">
                      {item.metric}
                      <span className='text-lg'>{item.label}</span>
                    </div>
                  </div>
                  <p className="text-balance mt-4 text-base text-neutral-600 dark:text-neutral-300">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function StatsWithGridBackground() {
  const items = [
    {
      title: "of Time Wasted",
      description: "Your reps spend 16+ hours weekly on CRM updates and data entry",
      icon: Clock,
      value: "40%",
    },
    {
      title: "Annual Cost",
      description: "That's the value of time spent on non-selling activities",
      icon: DollarSign,
      value: formatCurrency(475000),
    },
    {
      title: "Lost Deals",
      description: "Prospects fall through cracks due to slow follow-up",
      icon: TrendingDown,
      value: "30%",
    },
  ];
  return (
    <div className="py-20">
      <div className="mx-auto max-w-7xl border border-neutral-200 dark:border-neutral-800">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={"card" + index}
              className={cn(
                "group/card relative overflow-hidden p-10",
                index !== items.length - 1 &&
                  "border-b border-neutral-200 dark:border-neutral-800 md:border-b-0 md:border-r",
              )}
            >
              <Grid size={20} />
              <EdgeElement />

              <div className="flex items-center gap-2">
                <IconContainer>
                  <item.icon className="text-white" />
                </IconContainer>
                <p className="text-3xl font-bold text-neutral-700 dark:text-neutral-200">
                  {item.value}
                </p>
              </div>
              <p className="text-balance mt-4 text-base text-neutral-600 dark:text-neutral-300">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EdgeElement = () => {
  return (
    <div className="absolute right-0 top-0 h-10 w-10 overflow-hidden border-b border-l bg-white shadow-[-3px_4px_9px_0px_rgba(0,0,0,0.14)] transition duration-200 group-hover/card:-translate-y-14 group-hover/card:translate-x-14 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[-3px_4px_9px_0px_rgba(255,255,255,0.2)]">
      <div className="absolute left-0 top-0 h-px w-[141%] origin-top-left rotate-45 bg-neutral-100 dark:bg-neutral-800" />
    </div>
  );
};
const IconContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-linear-to-b from-neutral-200 to-gray-50 to-50% p-1 dark:from-neutral-800 dark:to-neutral-950 shadow-md dark:shadow-neutral-900">
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-white dark:bg-black ">
        {children}
      </div>
    </div>
  );
};

export const Grid = ({
  pattern,
  size,
}: {
  pattern?: [number, number][];
  size: number;
}) => {
  // Static fallback pattern for SSR and initial client render (prevents hydration mismatch)
  const fallbackPattern: [number, number][] = [
    [9, 4],
    [10, 2],
    [8, 5],
    [11, 3],
    [9, 1],
  ];

  // Use static pattern initially, then switch to random on client after mount
  const [clientPattern, setClientPattern] = useState<[number, number][]>(fallbackPattern);

  useEffect(() => {
    // Only generate random pattern on client-side after hydration
    if (!pattern) {
      const randomPattern: [number, number][] = Array.from({ length: 5 }, () => [
        Math.floor(Math.random() * 4) + 7,
        Math.floor(Math.random() * 6) + 1,
      ]);
      setClientPattern(randomPattern);
    }
  }, [pattern]);

  const p = pattern ?? clientPattern;

  return (
    <div className="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-100/30 to-zinc-300/30 opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 dark:to-zinc-900/30">
        <GridPattern
          width={size ?? 20}
          height={size ?? 20}
          x="-12"
          y="4"
          squares={p}
          className="absolute inset-0 h-full w-full fill-black/10 stroke-black/10 mix-blend-overlay dark:fill-white/10 dark:stroke-white/10"
        />
      </div>
    </div>
  );
};

export function GridPattern({
  width,
  height,
  x,
  y,
  squares,
  ...props
}: {
  width: number;
  height: number;
  x: number | string;
  y: number | string;
  squares: [number, number][];
} & React.SVGProps<SVGSVGElement>) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        strokeWidth={0}
        fill={`url(#${patternId})`}
      />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([squareX, squareY], index) => (
            <rect
              strokeWidth="0"
              key={index}
              width={width + 1}
              height={height + 1}
              x={squareX * width}
              y={squareY * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
