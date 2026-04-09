"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NativeIcon } from "~/icons/bento-icons";
import { cn } from "~/lib/utils";
import { signOutAction } from "../settings/_components/sign-out-action";
import { navItems } from "./nav-config";

interface AppSidebarProps {
  user: { name: string; email: string };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      data-testid="app-sidebar"
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-border border-r bg-background md:flex"
    >
      {/* Header — Logo */}
      <div className="flex h-14 items-center border-border border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 px-2 py-1"
        >
          <NativeIcon className="size-6 text-primary" />
          <span className="font-bold font-mono text-foreground">REKURVE</span>
        </Link>
      </div>

      {/* Content — Nav Links */}
      <nav
        className="flex flex-1 flex-col gap-1 p-3"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`sidebar-link-${item.href.slice(1)}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — User Info + Sign Out */}
      <div className="border-border border-t p-3">
        <div className="mb-2 px-3">
          <p className="truncate font-medium text-foreground text-sm">
            {user.name || "User"}
          </p>
          <p className="truncate text-muted-foreground text-xs">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            data-testid="sidebar-sign-out"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-secondary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
