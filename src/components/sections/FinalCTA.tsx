"use client"

import { ArrowRight, Mail } from 'lucide-react'

import { BrandShimmer } from '../brand-shimmer';
import { Button } from '../ui/Button';
import React from "react";
import { ScrollReveal } from '~/components/motion/ScrollReveal'
import { cn } from "~/lib/utils";

export function FinalCTA() {
  return (
    <section className="w-full grid grid-cols-1 md:grid-cols-3 my-20 md:my-40 justify-start relative z-20 max-w-7xl mx-auto bg-linear-to-br from-gray-100 to-white dark:from-neutral-900 dark:to-neutral-950">
        <GridLineHorizontal className="top-0" offset="200px" />
        <GridLineHorizontal className="bottom-0 top-auto" offset="200px" />
        <GridLineVertical className="left-0" offset="80px" />
        <GridLineVertical className="left-auto right-0" offset="80px" />
        <div className="md:col-span-2 p-8 md:p-14">
          <ScrollReveal>
            <h2 className="text-left text-xl md:text-3xl tracking-tight font-medium">
              Sell your services with the{" "}
              <BrandShimmer className="font-bold" text="speed of light" />
            </h2>

            <p className="text-left text-neutral-600 mt-4 max-w-lg dark:text-neutral-200 text-base tracking-tight font-medium">
              Get the best in class support for the most advanced sales software.
            </p>
          </ScrollReveal>
  
          <ScrollReveal delay={0.2}>
            <div className="flex items-start sm:items-center flex-col sm:flex-row sm:gap-4">
              <Button variant="primary" className="mt-8 flex items-center space-x-2">
                Book Your Call
                <ArrowRight className="group-hover:translate-x-1 h-5 w-5 stroke-1 transition-transform duration-200" />
              </Button>
              <Button variant="ghost" className="mt-8 flex items-center">
                Or email us: contact@rekurve.ai
                <Mail className="group-hover:translate-x-1 stroke-1 transition-transform duration-200" />
              </Button>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.4}>
          <div className="border-t h-full md:border-t-0 md:border-l border-dashed p-8 md:p-14">
            <p className="text-base text-neutral-700 dark:text-neutral-200">
              &quot;This is the best product & service ever when it comes to sales automation. 10/10 recommended.
              I can&apos;t wait to see what happens with this
              product.&quot;
            </p>
            <div className="flex flex-col text-sm items-start mt-4 gap-1">
              <p className="font-bold text-neutral-800 dark:text-neutral-200">
                Michael Scarn
              </p>
              <p className="text-gray-600 dark:text-neutral-400">
                Side projects builder
              </p>
            </div>
          </div>
        </ScrollReveal>
    </section>
  )
}

const GridLineHorizontal = ({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) => {
  return (
    <div
      style={
        {
          "--background": "#ffffff",
          "--color": "rgba(0, 0, 0, 0.2)",
          "--height": "1px",
          "--width": "5px",
          "--fade-stop": "90%",
          "--offset": offset || "200px", //-100px if you want to keep the line inside
          "--color-dark": "rgba(255, 255, 255, 0.2)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "absolute w-[calc(100%+var(--offset))] h-[var(--height)] left-[calc(var(--offset)/2*-1)]",
        "bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "[background-size:var(--width)_var(--height)]",
        "[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
        "[mask-composite:exclude]",
        "z-30",
        "dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className
      )}
    ></div>
  );
};

const GridLineVertical = ({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) => {
  return (
    <div
      style={
        {
          "--background": "#ffffff",
          "--color": "rgba(0, 0, 0, 0.2)",
          "--height": "5px",
          "--width": "1px",
          "--fade-stop": "90%",
          "--offset": offset || "150px", //-100px if you want to keep the line inside
          "--color-dark": "rgba(255, 255, 255, 0.2)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "absolute h-[calc(100%+var(--offset))] w-[var(--width)] top-[calc(var(--offset)/2*-1)]",
        "bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "[background-size:var(--width)_var(--height)]",
        "[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
        "[mask-composite:exclude]",
        "z-30",
        "dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className
      )}
    ></div>
  );
};
