"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-amber text-navy hover:scale-105 active:scale-100 focus-visible:ring-accent-amber/50 shadow-md hover:shadow-lg",
        secondary:
          "border-2 border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10 hover:border-accent-cyan/80 focus-visible:ring-accent-cyan/50",
        outline:
          "border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-primary/30",
        ghost:
          "text-primary hover:bg-primary/10 hover:text-primary/90 focus-visible:ring-primary/30",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-13 px-8 text-lg",
        xl: "h-16 px-10 text-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
