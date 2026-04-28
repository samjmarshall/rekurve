import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-white text-black hover:bg-gray-50",
        amber:
          "border-transparent bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20",
        brand:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/10 dark:hover:bg-primary/20",
        coral:
          "border-transparent bg-accent-coral/10 text-accent-coral hover:bg-accent-coral/20",
        success:
          "border-transparent bg-state-success/10 text-state-success hover:bg-state-success/20",
        outline: "border-primary/20 text-primary/80 hover:bg-primary/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
