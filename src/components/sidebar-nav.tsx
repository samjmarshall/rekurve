"use client";

import Link from "next/link";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { usePathname } from "next/navigation";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href?: string;
    title: string;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex space-x-2 overflow-x-scroll lg:flex-col lg:space-x-0 lg:space-y-1",
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href ?? ""}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            item.href
              ? "cursor-pointer"
              : "cursor-default text-gray-400 hover:text-gray-400 hover:no-underline",
            "justify-start",
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
