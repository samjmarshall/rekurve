"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { navItems } from "./nav-config";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 flex border-border border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Tab navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`bottom-nav-link-${item.href.slice(1)}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "relative text-foreground before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary"
                : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
