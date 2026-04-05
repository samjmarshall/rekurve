import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center rounded-md font-bold text-sm transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-accent-blue border-b-3 bg-white text-black shadow focus-visible:ring-primary/50 dark:border-accent-blue dark:bg-neutral-800 dark:text-white",
        secondary:
          "border-neutral-500 border-b-3 bg-neutral-800 text-white shadow focus-visible:ring-secondary/50 dark:border-neutral-800 dark:bg-neutral-950",
        outline:
          "border-1 border-primary/30 border-b-3 text-primary hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-primary/30",
        ghost:
          "text-primary hover:bg-primary/10 hover:text-primary/90 focus-visible:ring-primary/30",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        xl: "px-8 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild: _asChild,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
}

export { Button, buttonVariants };
