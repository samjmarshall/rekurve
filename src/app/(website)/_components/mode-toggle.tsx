"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const systemThemeRef = useRef<"light" | "dark">("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemThemeRef.current = mediaQuery.matches ? "dark" : "light";

    const handleChange = (e: MediaQueryListEvent) => {
      systemThemeRef.current = e.matches ? "dark" : "light";
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const SWITCH = () => {
    switch (theme) {
      case "light":
        setTheme("dark");
        break;
      case "dark":
        setTheme("light");
        break;
      case "system":
        setTheme(systemThemeRef.current === "light" ? "dark" : "light");
        break;
      default:
        break;
    }
  };

  return (
    <button
      type="button"
      onClick={SWITCH}
      className="relative flex cursor-pointer items-center justify-center rounded-xl p-2 text-neutral-500 hover:shadow-input dark:text-neutral-500"
    >
      <SunIcon
        size={16}
        className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
      />
      <MoonIcon
        size={16}
        className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
