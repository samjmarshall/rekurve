"use client"

import { motion, useInView } from "framer-motion"
import * as React from "react"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  /**
   * Only animate once (default: true)
   */
  once?: boolean
  /**
   * Amount of element that needs to be visible to trigger (0-1)
   */
  amount?: number
}

/**
 * Reveal content on scroll using Intersection Observer
 * Respects prefers-reduced-motion
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.3,
}: ScrollRevealProps) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once, amount })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface ScrollRevealStaggerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  once?: boolean
  amount?: number
}

/**
 * Stagger children reveal on scroll
 */
export function ScrollRevealStagger({
  children,
  className,
  staggerDelay = 0.1,
  once = true,
  amount = 0.3,
}: ScrollRevealStaggerProps) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once, amount })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
