"use client";

import Marquee from "react-fast-marquee";
import { useMediaQuery } from "~/hooks";
import { StatCard } from "./StatCard";
import { firstRowStats, secondRowStats } from "./stats-data";

export function StatsMarquee() {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)"
  );

  return (
    <div
      aria-label="Speed to lead statistics"
      className="relative w-full overflow-hidden"
    >
      <div className="[mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)]">
        <Marquee
          direction="right"
          pauseOnHover
          speed={50}
          play={!prefersReducedMotion}
        >
          {firstRowStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </Marquee>
        <Marquee
          className="mt-4 md:mt-6"
          direction="right"
          pauseOnHover
          speed={70}
          play={!prefersReducedMotion}
        >
          {secondRowStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </Marquee>
      </div>
    </div>
  );
}
