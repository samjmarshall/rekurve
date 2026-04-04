"use client";

import { useRef } from "react";
import { cn } from "~/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  invalid?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  columns = options.length <= 3 ? (options.length as 2 | 3) : 2,
  invalid,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const focusableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (index - 1 + options.length) % options.length;
    }

    if (nextIndex !== null) {
      buttonRefs.current[nextIndex]?.focus();
      onChange(options[nextIndex]!.value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
      )}
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={index === focusableIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "rounded-md border px-3 py-2.5 font-medium text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : invalid
                  ? "border-destructive bg-transparent text-foreground/60"
                  : "border-input bg-transparent text-foreground/60 hover:border-primary/30 hover:text-foreground dark:border-neutral-600",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
