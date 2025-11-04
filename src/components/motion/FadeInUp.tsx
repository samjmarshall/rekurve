"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import * as React from "react"

interface FadeInUpProps extends HTMLMotionProps<"div"> {
  delay?: number
  duration?: number
  children: React.ReactNode
}

/**
 * Fade in from below animation wrapper
 * Respects prefers-reduced-motion
 */
export function FadeInUp({
  delay = 0,
  duration = 0.6,
  children,
  ...props
}: FadeInUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1], // cubic-bezier easing
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface FadeInUpStaggerProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

/**
 * Stagger children with FadeInUp animation
 */
export function FadeInUpStagger({
  children,
  staggerDelay = 0.1,
  className,
}: FadeInUpStaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
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
