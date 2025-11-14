"use client";

import Image from "next/image";
import Link from "next/link";
import { NativeIcon } from "~/icons/bento-icons";
import { cn } from "~/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn("font-normal flex space-x-2 items-center text-sm mr-4  text-black px-2 py-1  relative z-20", )}
    >
      <NativeIcon className="size-6 text-primary" />
      <span className="font-medium text-black dark:text-white">Rekurve.ai</span>
    </Link>
  );
};
