"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";

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
  }, [ref]);

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
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            From Onboarding to Results in 8 Weeks
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Our proven process takes you from discovery to deployed AI agents,
            with results visible within 10 weeks.
          </p>
        </motion.div>

        {/* Timeline */}
        <div ref={ref} className="relative mx-auto max-w-5xl pb-20" role="list" aria-label="Implementation timeline with 4 phases">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex justify-start gap-10 pt-10 md:pt-40"
              role="listitem"
            >
              <div className="sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
                <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-background md:left-3">
                  <div className="h-4 w-4 relative left-px rounded-full border-2 border-border shadow bg-card p-2" />
                </div>
                <h3 className="hidden pl-20 text-xl font-bold md:block md:text-4xl">
                  {item.title}
                </h3>
              </div>

              <div className="relative w-full pl-20 pr-4 md:pl-4">
                <h3 className="mb-4 block text-left text-2xl font-bold md:hidden">
                  {item.title}
                </h3>
                {item.content}
              </div>
            </div>
          ))}

          {/* Animated progress line */}
          <div
            style={{
              height: height + "px",
            }}
            className="absolute left-8 top-0 w-0.5 overflow-hidden bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-0% via-stone-200 to-transparent to-99% [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] md:left-8"
          >
            <motion.div
              style={{
                height: heightTransform,
                opacity: opacityTransform,
              }}
              className="absolute inset-x-0 top-0 w-0.5 rounded-full bg-linear-to-b from-accent-blue via-accent-green to-primary from-0% via-66%"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
