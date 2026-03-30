"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useInView } from "motion/react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { RoughNotation, RoughNotationGroup } from "react-rough-notation";
import { StatsMarquee } from "~/components/stats";
import { useMediaQuery } from "~/hooks";
import { NativeIcon } from "~/icons/bento-icons";
import { analytics } from "~/lib/posthog";
import { cn } from "~/lib/utils";
import { Card, CardDescription, CardTitle } from "../agentic-intelligence/card";
import { NativeIntegrationSkeleton } from "../agentic-intelligence/skeletons";
import { Button } from "../ui/Button";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const isHeadlineInView = useInView(headlineRef, { once: true });
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );
  return (
    <section
      id="hero"
      data-testid="hero-section"
      ref={parentRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-20 md:px-8 md:py-40"
    >
      <BackgroundGrids />
      <CollisionMechanism
        beamOptions={{
          initialX: -400,
          translateX: 600,
          duration: 7,
          repeatDelay: 3,
        }}
        containerRef={containerRef}
        parentRef={parentRef}
      />
      <CollisionMechanism
        beamOptions={{
          initialX: -200,
          translateX: 800,
          duration: 4,
          repeatDelay: 3,
        }}
        containerRef={containerRef}
        parentRef={parentRef}
      />
      <CollisionMechanism
        beamOptions={{
          initialX: 200,
          translateX: 1200,
          duration: 5,
          repeatDelay: 3,
        }}
        containerRef={containerRef}
        parentRef={parentRef}
      />
      <CollisionMechanism
        containerRef={containerRef}
        parentRef={parentRef}
        beamOptions={{
          initialX: 400,
          translateX: 1400,
          duration: 6,
          repeatDelay: 3,
        }}
      />

      <div className="relative z-20 mx-auto mt-4 mb-4 max-w-4xl text-balance text-center">
        <h1
          ref={headlineRef}
          className="font-semibold text-3xl tracking-tight md:text-7xl"
        >
          <RoughNotationGroup show={prefersReducedMotion || isHeadlineInView}>
            Save 10+ Hours Weekly and{" "}
            <RoughNotation
              type="highlight"
              color="#d9785740"
              animationDuration={1500}
              iterations={2}
              multiline
            >
              Close 40% More Deals
            </RoughNotation>{" "}
            in{" "}
            <RoughNotation
              type="underline"
              color="#d97857"
              strokeWidth={3}
              animationDuration={2000}
              iterations={2}
            >
              90 Days
            </RoughNotation>
          </RoughNotationGroup>
        </h1>
      </div>
      <p className="relative z-20 mx-auto mt-4 px-4 text-center font-medium font-mono text-base/6">
        Customer Enquiry <span className="text-primary">&rarr;</span> AI
        Generated Quote <span className="text-primary">&rarr;</span> Reviewed &
        Approved by Staff <span className="text-primary">&rarr;</span> Job
        Booked.
      </p>
      <div className="mt-8 mb-8 flex w-full flex-col items-center justify-center gap-4 px-8 sm:flex-row md:mb-14">
        <Link
          href="#how-it-works"
          className="w-full sm:w-40"
          onClick={() => analytics.cta.click("hero_secondary")}
          data-testid="hero-cta-secondary"
        >
          <Button asChild variant="secondary" className="w-full text-center">
            How it Works
          </Button>
        </Link>
        <Link
          href="#booking-form"
          className="w-full sm:w-40"
          onClick={() => analytics.cta.click("hero_primary")}
          data-testid="hero-cta-primary"
        >
          <Button asChild variant="primary" className="w-full text-center">
            Book a call
          </Button>
        </Link>
      </div>

      <div className="relative mx-auto mb-20 h-full w-full max-w-7xl overflow-hidden px-4 md:mb-30 md:px-8">
        <p className="relative z-20 mx-auto mb-2 max-w-2xl p-4 text-center text-base/6 md:mb-4">
          AI service business quoting solution to help respond to customer quote
          requests faster (i.e. Speed to Lead). For service businesses spending
          20+ hours a week quoting or simply taking too long to respond to
          leads, possibly missing leads entirely.
        </p>

        <div
          aria-label="Speed to lead statistics"
          ref={containerRef}
          className="relative w-full overflow-hidden"
        >
          <StatsMarquee />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl rounded-4xl border border-border bg-neutral-100 p-2 backdrop-blur-lg md:p-4 dark:border-charcoal-700 dark:bg-charcoal-800/50">
        <div className="rounded-3xl border border-border bg-card p-2 dark:border-charcoal-700">
          <div className="w-full">
            <Card className="relative w-full max-w-none overflow-hidden">
              <div className="flex items-center gap-2">
                <NativeIcon />
                <CardTitle>Native Integration</CardTitle>
              </div>
              <CardDescription>
                24/7 real-time sales activity with detailed records of actions,
                integrations used and outcomes.
              </CardDescription>
              <NativeIntegrationSkeleton />
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

const BackgroundGrids = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 grid h-full w-full -rotate-45 transform select-none grid-cols-2 gap-10 md:grid-cols-4">
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="right-0 left-auto" />
      </div>
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="right-0 left-auto" />
      </div>
      <div className="relative h-full w-full bg-linear-to-b from-transparent via-neutral-100 to-transparent dark:via-neutral-800">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="right-0 left-auto" />
      </div>
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="right-0 left-auto" />
      </div>
    </div>
  );
};

const CollisionMechanism = React.forwardRef<
  HTMLDivElement,
  {
    containerRef: React.RefObject<HTMLDivElement | null>;
    parentRef: React.RefObject<HTMLDivElement | null>;
    beamOptions?: {
      initialX?: number;
      translateX?: number;
      initialY?: number;
      translateY?: number;
      rotate?: number;
      className?: string;
      duration?: number;
      delay?: number;
      repeatDelay?: number;
    };
  }
>(({ parentRef, containerRef, beamOptions = {} }, _ref) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({
    detected: false,
    coordinates: null,
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top) {
          const relativeX =
            beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: {
              x: relativeX,
              y: relativeY,
            },
          });
          setCycleCollisionDetected(true);
          if (beamRef.current) {
            beamRef.current.style.opacity = "0";
          }
        }
      }
    };

    const animationInterval = setInterval(checkCollision, 50);

    return () => clearInterval(animationInterval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  useEffect(() => {
    if (collision.detected && collision.coordinates) {
      setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
        // Set beam opacity to 0
        if (beamRef.current) {
          beamRef.current.style.opacity = "1";
        }
      }, 2000);

      // Reset the beam animation after a delay
      setTimeout(() => {
        setBeamKey((prevKey) => prevKey + 1);
      }, 2000);
    }
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{
          translateY: beamOptions.initialY ?? "-200px",
          translateX: beamOptions.initialX ?? "0px",
          rotate: beamOptions.rotate ?? -45,
        }}
        variants={{
          animate: {
            translateY: beamOptions.translateY ?? "800px",
            translateX: beamOptions.translateX ?? "700px",
            rotate: beamOptions.rotate ?? -45,
          },
        }}
        transition={{
          duration: beamOptions.duration ?? 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay ?? 0,
          repeatDelay: beamOptions.repeatDelay ?? 0,
        }}
        className={cn(
          "absolute top-20 left-96 m-auto h-14 w-px rounded-full bg-linear-to-t from-orange-500 via-yellow-500 to-transparent",
          beamOptions.className,
        )}
      />
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            className=""
            style={{
              left: `${collision.coordinates.x + 20}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
});

CollisionMechanism.displayName = "CollisionMechanism";

const Explosion = ({ ...props }: React.HTMLProps<HTMLDivElement>) => {
  const spans = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    initialX: 0,
    initialY: 0,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -50 - 10),
  }));

  return (
    <div {...props} className={cn("absolute z-50 h-2 w-2", props.className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 m-auto h-1 w-10 rounded-full bg-linear-to-r from-transparent via-orange-500 to-transparent blur-sm"
      ></motion.div>
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: span.initialX, y: span.initialY, opacity: 1 }}
          animate={{
            x: span.directionX,
            y: span.directionY,
            opacity: 0,
          }}
          transition={{ duration: Math.random() * 1.5 + 0.5, ease: "easeOut" }}
          className="absolute h-1 w-1 rounded-full bg-linear-to-b from-orange-500 to-yellow-500"
        />
      ))}
    </div>
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
          "--color-dark": "rgba(255, 255, 255, 0.3)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-(--width)",
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
