# StatsMarquee Implementation Plan

## Overview

Replace the static stats block in Hero.tsx (lines 89-112) with a two-row scrolling marquee displaying 11 verified speed-to-lead statistics with clickable citation links.

## Current State Analysis

**What exists:**
- `react-fast-marquee` v1.6.5 installed
- `MarqueeGrid.tsx` provides pattern for two-row marquee with edge fade
- `cn` utility at `src/lib/utils.ts`
- Hero.tsx contains static stats as plain text (lines 89-112)

**What's missing:**
- `useMediaQuery` hook for reduced motion detection
- `src/hooks/` directory
- Stats data file with citations
- StatCard and StatsMarquee components

## Desired End State

A continuously scrolling two-row marquee in the Hero section that:
- Displays 11 stats with icons, headlines, subtext, and citation links
- Pauses on hover/touch
- Respects `prefers-reduced-motion` (stops animation)
- Uses edge fade mask for smooth appearance

**Verification:**
- `yarn check` passes
- Marquee scrolls at two speeds (50, 70)
- Pause on hover works
- All 11 citation links open correct URLs
- Reduced motion stops animation completely

## What We're NOT Doing

- No carousel navigation (arrows, dots, progress bar)
- No autoplay state management
- No number count-up animations
- No new dependencies (using existing react-fast-marquee)

## Implementation Approach

Follow the existing `MarqueeGrid.tsx` pattern closely, adapting it for stats display instead of testimonials. Create a minimal `useMediaQuery` hook for accessibility.

---

## Phase 1: Data Layer

### Overview
Create the stats data file with all 11 verified statistics.

### Changes Required:

#### 1. Create stats data file
**File**: `src/components/stats/stats-data.ts`

```typescript
import {
  Zap,
  Trophy,
  Clock,
  TrendingDown,
  Calendar,
  MessageCircle,
  Medal,
  Target,
  Bot,
  Rocket,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

export interface Stat {
  id: string;
  headline: string;
  subtext: string;
  citation: {
    name: string;
    year: string;
    url: string;
  };
  icon: LucideIcon;
}

export const stats: Stat[] = [
  {
    id: "immediate-response",
    headline: "391% higher conversion",
    subtext: "Responding within one minute increases conversion rates dramatically",
    citation: {
      name: "Velocify",
      year: "2016",
      url: "https://www.prnewswire.com/news-releases/velocify-research-shows-time-of-day-has-minimal-impact-on-sales-effectiveness-consider-quick-and-strategic-follow-up-instead-300275320.html",
    },
    icon: Zap,
  },
  {
    id: "one-hour-window",
    headline: "7x more likely to qualify",
    subtext: "Companies responding within one hour qualify leads 7x more often",
    citation: {
      name: "HBR",
      year: "2011",
      url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads",
    },
    icon: Trophy,
  },
  {
    id: "five-minute-urgency",
    headline: "80% drop after 5 minutes",
    subtext: "Lead qualification odds drop 80% after just 5 minutes",
    citation: {
      name: "MIT/InsideSales.com",
      year: "",
      url: "https://www.leadresponsemanagement.org/lrm_study/",
    },
    icon: Clock,
  },
  {
    id: "ten-minute-threshold",
    headline: "400% decrease in 10 min",
    subtext: "Qualification odds plummet 400% at 10 minutes vs 5 minutes",
    citation: {
      name: "MIT/InsideSales.com",
      year: "",
      url: "https://www.leadresponsemanagement.org/lrm_study/",
    },
    icon: TrendingDown,
  },
  {
    id: "24-hour-penalty",
    headline: "60x less likely after 24h",
    subtext: "Responding in 1 hour vs 24+ hours: 60x qualification difference",
    citation: {
      name: "HBR",
      year: "2011",
      url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads",
    },
    icon: Calendar,
  },
  {
    id: "consumer-expectations",
    headline: "82% expect 10-min response",
    subtext: "Immediate response is important or very important to 82% of buyers",
    citation: {
      name: "HubSpot",
      year: "2018",
      url: "https://blog.hubspot.com/sales/live-chat-go-to-market-flaw",
    },
    icon: MessageCircle,
  },
  {
    id: "first-responder",
    headline: "35-50% win rate for first",
    subtext: "35-50% of sales go to the vendor that responds first",
    citation: {
      name: "Google/CEB",
      year: "2012",
      url: "https://www.thinkwithgoogle.com/_qs/documents/677/the-digital-evolution-in-b2b-marketing_research-studies.pdf",
    },
    icon: Medal,
  },
  {
    id: "speed-wins",
    headline: "78% buy from first responder",
    subtext: "Most customers buy from whoever responds to their inquiry first",
    citation: {
      name: "Lead Connect",
      year: "",
      url: "https://www.vendasta.com/blog/lead-response-time/",
    },
    icon: Target,
  },
  {
    id: "ai-impact",
    headline: "20-30% conversion boost",
    subtext: "AI and automation boost conversion rates by 20-30% on average",
    citation: {
      name: "Gartner/McKinsey",
      year: "2024",
      url: "https://superagi.com/how-ai-powered-speed-to-lead-automation-boosts-conversion-rates-by-21-a-step-by-step-guide/",
    },
    icon: Bot,
  },
  {
    id: "response-time-reduction",
    headline: "82% faster with AI",
    subtext: "AI-powered automation reduces lead response times by up to 82%",
    citation: {
      name: "Industry Studies",
      year: "2024",
      url: "https://superagi.com/how-ai-powered-speed-to-lead-automation-boosts-conversion-rates-by-21-a-step-by-step-guide/",
    },
    icon: Rocket,
  },
  {
    id: "cost-reduction",
    headline: "50% lower acquisition costs",
    subtext: "AI speed-to-lead optimization can halve customer acquisition costs",
    citation: {
      name: "Forrester/McKinsey",
      year: "",
      url: "https://www.forrester.com/",
    },
    icon: DollarSign,
  },
];

// Row distribution: Row 1 gets stats 1-6, Row 2 gets stats 6-11 (stat 6 overlaps)
export const firstRowStats = stats.slice(0, 6);
export const secondRowStats = stats.slice(5, 11);
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes (no TypeScript errors)

#### Manual Verification:
- [x] All 11 stats have complete data (headline, subtext, citation, icon)

---

## Phase 2: useMediaQuery Hook

### Overview
Create a minimal hook for detecting `prefers-reduced-motion` preference.

### Changes Required:

#### 1. Create hooks directory and useMediaQuery hook
**File**: `src/hooks/useMediaQuery.ts`

```typescript
"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

#### 2. Create barrel export
**File**: `src/hooks/index.ts`

```typescript
export { useMediaQuery } from "./useMediaQuery";
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes

#### Manual Verification:
- [ ] Hook returns `true` when reduced motion is enabled in OS settings

---

## Phase 3: StatCard Component

### Overview
Create the individual stat card component.

### Changes Required:

#### 1. Create StatCard component
**File**: `src/components/stats/StatCard.tsx`

```typescript
"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Stat } from "./stats-data";

interface StatCardProps {
  stat: Stat;
  className?: string;
}

export function StatCard({ stat, className }: StatCardProps) {
  const Icon = stat.icon;
  const citationText = stat.citation.year
    ? `${stat.citation.name}, ${stat.citation.year}`
    : stat.citation.name;

  return (
    <div
      className={cn(
        "mx-4 min-h-[140px] max-w-sm rounded-xl bg-neutral-900 p-4 md:max-w-sm md:p-6",
        "max-md:max-w-[280px]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-lg font-bold text-white md:text-xl">
            {stat.headline}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-neutral-400 md:text-sm">
            {stat.subtext}
          </p>
          <a
            href={stat.citation.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View source: ${citationText} (opens in new tab)`}
            className="mt-2 inline-flex items-center gap-1 text-[10px] text-neutral-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 md:text-xs"
          >
            — {citationText}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes

#### Manual Verification:
- [ ] Card displays icon, headline, subtext, and citation link
- [ ] Citation link has visible focus state

---

## Phase 4: StatsMarquee Component

### Overview
Create the main marquee wrapper component with two rows.

### Changes Required:

#### 1. Create StatsMarquee component
**File**: `src/components/stats/StatsMarquee.tsx`

```typescript
"use client";

import Marquee from "react-fast-marquee";
import { useMediaQuery } from "~/hooks";
import { StatCard } from "./StatCard";
import { firstRowStats, secondRowStats } from "./stats-data";

export function StatsMarquee() {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)"
  );

  return (
    <div
      aria-label="Speed to lead statistics"
      className="relative w-full overflow-hidden"
    >
      <div className="mask-[linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)]">
        <Marquee
          direction="right"
          pauseOnHover
          speed={50}
          play={!prefersReducedMotion}
        >
          {firstRowStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </Marquee>
        <Marquee
          className="mt-4 md:mt-6"
          direction="right"
          pauseOnHover
          speed={70}
          play={!prefersReducedMotion}
        >
          {secondRowStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </Marquee>
      </div>
    </div>
  );
}
```

#### 2. Create barrel export
**File**: `src/components/stats/index.ts`

```typescript
export { StatsMarquee } from "./StatsMarquee";
export { StatCard } from "./StatCard";
export { stats, firstRowStats, secondRowStats, type Stat } from "./stats-data";
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes

#### Manual Verification:
- [ ] Two rows scroll at different speeds
- [ ] Pause on hover works
- [ ] Edge fade mask visible on both sides

---

## Phase 5: Hero Integration

### Overview
Replace the static stats section in Hero.tsx with the StatsMarquee component.

### Changes Required:

#### 1. Update Hero.tsx
**File**: `src/components/sections/Hero.tsx`

**Import to add** (near top of file):
```typescript
import { StatsMarquee } from "~/components/stats";
```

**Replace lines 86-113** (the `<p>` tag containing static stats):

Delete:
```tsx
<p className="relative z-20 mx-auto mt-4 px-4 text-center text-base/6">
  For service businesses spending 20+ hours a week quoting or simply taking too long to respond to leads, possibly missing leads entirely.
  <br />
  <div>
    <h2>Stats</h2>
    {/* ... all the static stats ... */}
  </div>
</p>
```

Replace with:
```tsx
<p className="relative z-20 mx-auto mt-4 max-w-2xl px-4 text-center text-base/6">
  For service businesses spending 20+ hours a week quoting or simply taking too long to respond to leads, possibly missing leads entirely.
</p>

<div className="relative z-20 mx-auto mt-8 w-full">
  <StatsMarquee />
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes
- [x] `yarn build` succeeds

#### Manual Verification:
- [ ] Hero section displays the scrolling stats marquee
- [ ] Static stats text is gone
- [ ] Introductory paragraph still visible above marquee

---

## Phase 6: Verification & Design Review

### Overview
Run all checks and perform design review.

### Steps:

1. Run automated checks:
   ```bash
   yarn check
   yarn build
   ```

2. Manual testing:
   - [ ] Both rows scroll continuously at different speeds
   - [ ] Pauses on hover (desktop) / touch-hold (mobile)
   - [ ] Resumes when pointer/touch leaves
   - [ ] All 11 citation links open correct URLs in new tabs
   - [ ] Edge fade mask visible on all breakpoints
   - [ ] No horizontal overflow on page

3. Accessibility testing:
   - [ ] Enable reduced motion in OS → marquee stops
   - [ ] Tab through citation links → visible focus rings
   - [ ] Screen reader announces "Speed to lead statistics" region

4. Responsive testing:
   - [ ] Desktop: Cards at max-w-sm, text-xl headlines
   - [ ] Mobile: Cards at max-w-[280px], text-lg headlines

5. Run design review:
   ```bash
   yarn dev
   # Then use /design_review command
   ```

### Success Criteria:

#### Automated Verification:
- [x] `yarn check` passes
- [x] `yarn build` succeeds
- [ ] No console errors in browser

#### Manual Verification:
- [ ] All functionality tests pass
- [ ] All accessibility tests pass
- [ ] Design review completed with no blockers

---

## Testing Strategy

### Unit Tests
Not required for this implementation (presentational components with no complex logic).

### Integration Tests
Not required (no API calls or complex state management).

### Manual Testing Steps

1. **Scroll behavior**: Load page, verify both rows scroll right at different speeds
2. **Pause on hover**: Hover over a card, verify scrolling stops
3. **Citation links**: Click each of the 11 citations, verify correct URL opens
4. **Reduced motion**: Enable "Reduce motion" in OS settings, reload page, verify marquee is static
5. **Mobile**: Resize to mobile viewport, verify cards shrink and still scroll
6. **Focus states**: Tab to citation links, verify ring-2 focus indicator

---

## File Structure Summary

```
src/
├── hooks/
│   ├── index.ts              # NEW: Barrel export
│   └── useMediaQuery.ts      # NEW: Media query hook
├── components/
│   ├── stats/
│   │   ├── index.ts          # NEW: Barrel export
│   │   ├── stats-data.ts     # NEW: 11 verified stats
│   │   ├── StatCard.tsx      # NEW: Individual card
│   │   └── StatsMarquee.tsx  # NEW: Main component
│   └── sections/
│       └── Hero.tsx          # MODIFIED: Import and use StatsMarquee
```

---

## References

- Design document: `thoughts/designs/2025-01-24-stats-carousel.md`
- Existing marquee pattern: `src/components/MarqueeGrid.tsx`
- Utility functions: `src/lib/utils.ts`
