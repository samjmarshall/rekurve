import React from "react";
import { ShimmerText } from "./shimmer-text";
import { cn } from "~/lib/utils";

export const BrandShimmer = ({ text, className }: { text: string, className?: string }) => {
  return (
    <ShimmerText
      duration={1.2}
      className={cn("font-normal [--base-color:var(--color-primary)] [--base-gradient-color:var(--color-white)] dark:[--base-color:var(--color-primary)] dark:[--base-gradient-color:var(--color-white)]", className)}
    >
      {text}
    </ShimmerText>
  );
};
