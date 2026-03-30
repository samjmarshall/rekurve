"use client";

import { motion, useScroll, useTransform } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <section
      id="how-it-works"
      className="relative w-full overflow-hidden bg-background py-20"
      ref={containerRef}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 md:px-8 lg:px-10">
        {/* Section header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 font-bold text-3xl tracking-tight sm:text-4xl">
            From Onboarding to Results in 8 Weeks
          </h2>
          <p className="mx-auto max-w-2xl text-gray-600 text-lg">
            Our proven process takes you from discovery to deployed AI agents,
            with results visible within 10 weeks.
          </p>
        </motion.div>

        {/* Timeline */}
        <div
          ref={ref}
          className="relative mx-auto max-w-5xl pb-20"
          role="list"
          aria-label="Implementation timeline with 4 phases"
        >
          {data.map((item, index) => (
            <div
              key={index}
              className="flex justify-start gap-10 pt-10 md:pt-40"
              role="listitem"
            >
              <div className="sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
                <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-background md:left-3">
                  <div className="relative left-px h-4 w-4 rounded-full border-2 border-border bg-card p-2 shadow" />
                </div>
                <h3 className="hidden pl-20 font-bold text-xl md:block md:text-4xl">
                  {item.title}
                </h3>
              </div>

              <div className="relative w-full pr-4 pl-20 md:pl-4">
                <h3 className="mb-4 block text-left font-bold text-2xl md:hidden">
                  {item.title}
                </h3>
                {item.content}
              </div>
            </div>
          ))}

          {/* Animated progress line */}
          <div
            style={{
              height: `${height}px`,
            }}
            className="absolute top-0 left-8 w-0.5 overflow-hidden bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-0% from-transparent via-stone-200 to-99% to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] md:left-8"
          >
            <motion.div
              style={{
                height: heightTransform,
                opacity: opacityTransform,
              }}
              className="absolute inset-x-0 top-0 w-0.5 rounded-full bg-linear-to-b from-0% from-accent-blue via-66% via-accent-green to-primary"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
