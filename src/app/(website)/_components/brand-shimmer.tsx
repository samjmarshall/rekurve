import { cn } from "~/lib/utils";
import { ShimmerText } from "./shimmer-text";

export const BrandShimmer = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  return (
    <ShimmerText
      duration={1.2}
      className={cn(
        "font-normal [--base-color:var(--color-primary)] [--base-gradient-color:var(--color-white)] dark:[--base-color:var(--color-primary)] dark:[--base-gradient-color:var(--color-white)]",
        className,
      )}
    >
      {text}
    </ShimmerText>
  );
};
