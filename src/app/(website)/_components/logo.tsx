import Link from "next/link";
import { NativeIcon } from "~/icons/bento-icons";
import { cn } from "~/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn(
        "relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 font-normal text-black text-sm",
        className,
      )}
    >
      <NativeIcon className="size-6 text-primary" />
      <span className="font-bold font-mono text-black dark:text-white">
        REKURVE
      </span>
    </Link>
  );
};
