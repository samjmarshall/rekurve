"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Button } from "~/components/ui/Button";
import { analytics } from "~/lib/posthog";
import { cn } from "~/lib/utils";
import { BrandShimmer } from "../brand-shimmer";
import { ScrollReveal } from "../motion/ScrollReveal";

export function FinalCTA() {
  return (
    <section
      data-testid="final-cta-section"
      className="relative z-20 mx-auto my-20 grid w-full max-w-7xl grid-cols-1 justify-start overflow-hidden bg-linear-to-br from-gray-100 to-white md:my-40 md:w-[calc(100%-200px)] md:grid-cols-3 md:overflow-visible dark:from-neutral-900 dark:to-neutral-950"
    >
      <GridLineHorizontal className="top-0" offset="200px" />
      <GridLineHorizontal className="top-auto bottom-0" offset="200px" />
      <GridLineVertical className="left-0" offset="80px" />
      <GridLineVertical className="right-0 left-auto" offset="80px" />
      <div className="p-8 md:col-span-2 md:p-14">
        <ScrollReveal>
          <h2 className="text-left font-medium text-xl tracking-tight md:text-3xl">
            Sell your services with the{" "}
            <BrandShimmer className="font-bold" text="speed of light" />
          </h2>

          <p className="mt-4 max-w-lg text-left font-medium text-base text-neutral-600 tracking-tight dark:text-neutral-200">
            Get the best in class support for the most advanced sales software.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-col items-start sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="#booking-form"
              className="mt-8"
              onClick={() => analytics.cta.click("final_cta_primary")}
              data-testid="final-cta-primary"
            >
              <Button
                variant="primary"
                className="group flex items-center gap-1"
              >
                Book Your Call
                <ArrowRight className="h-4 w-4 stroke-1.25 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>

            <Link
              href="mailto:contact@rekurve.ai?cc=support@rekurve.ai&subject=Rekurve%20Online%20Inquiry&body=Hi,%0A%0AI%20would%20like%20to%20know%20more."
              className="mt-8"
              onClick={() => {
                analytics.cta.click("final_cta_email");
                analytics.link.emailClick("contact@rekurve.ai", "final_cta");
              }}
              data-testid="final-cta-email"
            >
              <Button variant="ghost" className="group flex items-center gap-1">
                Or email us: contact@rekurve.ai
                <Mail className="stroke-1 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={0.4}>
        <div className="h-full border-t border-dashed p-8 md:border-t-0 md:border-l md:p-14">
          <p className="text-base text-neutral-700 dark:text-neutral-200">
            &quot;The AI agent transformed our quote process. What used to take
            4 hours now happens in minutes. Our team can finally focus on
            closing deals instead of chasing leads.&quot;
          </p>
          <div className="mt-4 flex flex-col items-start gap-1 text-sm">
            <p className="font-bold text-neutral-800 dark:text-neutral-200">
              Service Business Owner
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              Brisbane, Australia
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
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
          "--offset": offset ?? "200px", //-100px if you want to keep the line inside
          "--color-dark": "rgba(255, 255, 255, 0.2)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "absolute left-[calc(var(--offset)/2*-1)] h-[var(--height)] w-[calc(100%+var(--offset))]",
        "bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "[background-size:var(--width)_var(--height)]",
        "[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
        "[mask-composite:exclude]",
        "z-30",
        "dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className,
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
          "--offset": offset ?? "150px", //-100px if you want to keep the line inside
          "--color-dark": "rgba(255, 255, 255, 0.2)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]",
        "bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "[background-size:var(--width)_var(--height)]",
        "[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
        "[mask-composite:exclude]",
        "z-30",
        "dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
        className,
      )}
    ></div>
  );
};
