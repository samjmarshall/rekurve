"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { analytics } from "~/lib/posthog";
import { cn } from "~/lib/utils";
import { Logo } from "./logo";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/Button";

interface NavbarProps {
  navItems: {
    name: string;
    link: string;
  }[];
  visible: boolean;
}

export const Navbar = () => {
  const navItems = [
    {
      name: "Features",
      link: "/#features",
    },
    {
      name: "Pricing",
      link: "/#pricing",
    },
    {
      name: "Contact",
      link: "/#booking-form",
    },
  ];

  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div ref={ref} className="fixed inset-x-0 top-0 z-50 w-full">
      <DesktopNav visible={visible} navItems={navItems} />
      <MobileNav visible={visible} navItems={navItems} />
    </motion.div>
  );
};

const DesktopNav = ({ navItems, visible }: NavbarProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => {
        setHovered(null);
      }}
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "40%" : "100%",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      style={{
        minWidth: "800px",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-transparent px-4 py-2 lg:flex dark:bg-transparent",
        visible && "bg-white/80 dark:bg-neutral-950/80",
      )}
    >
      <Logo />
      <motion.div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 font-medium text-sm text-zinc-600 transition duration-200 hover:text-zinc-800 lg:flex lg:space-x-2">
        {navItems.map(
          (navItem: NavbarProps["navItems"][number], idx: number) => (
            <Link
              onMouseEnter={() => setHovered(idx)}
              className="relative px-4 py-2 text-neutral-600 dark:text-neutral-300"
              key={`link=${idx}`}
              href={navItem.link}
            >
              {hovered === idx && (
                <motion.div
                  layoutId="hovered"
                  className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
                />
              )}
              <span className="relative z-20">{navItem.name}</span>
            </Link>
          ),
        )}
      </motion.div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <Link
          href="#booking-form"
          onClick={() => analytics.cta.click("header")}
          data-testid="navbar-cta-desktop"
        >
          <Button variant="primary">Book a call</Button>
        </Link>
      </div>
    </motion.div>
  );
};

const MobileNav = ({ navItems, visible }: NavbarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "90%" : "100%",
        y: visible ? 20 : 0,
        borderRadius: open ? "4px" : "2rem",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-2 lg:hidden",
        visible && "bg-white/80 dark:bg-neutral-950/80",
      )}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <Logo />
        <button
          data-testid="navbar-mobile-menu-btn"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            <X className="text-black dark:text-white" />
          ) : (
            <Menu className="text-black dark:text-white" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="navbar-mobile-menu"
            initial={{
              opacity: 0,
            }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] dark:bg-neutral-950"
          >
            {navItems.map(
              (navItem: NavbarProps["navItems"][number], idx: number) => (
                <Link
                  key={`link=${idx}`}
                  href={navItem.link}
                  onClick={() => setOpen(false)}
                  className="relative text-neutral-600 dark:text-neutral-300"
                >
                  <motion.span className="block">{navItem.name} </motion.span>
                </Link>
              ),
            )}
            <Link
              href="#booking-form"
              onClick={() => {
                analytics.cta.click("mobile_nav");
                setOpen(false);
              }}
              data-testid="navbar-cta-mobile"
              className="relative text-neutral-600 dark:text-neutral-300"
            >
              Book a call
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
