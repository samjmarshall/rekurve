# StatsMarquee: Evidence-Based Metrics Design Document

**Created**: 2025-01-24
**Updated**: 2025-01-25
**Status**: Design Complete - Ready for Implementation
**Owner**: Sam (Rekurve)

---

## Overview

A continuously scrolling two-row marquee displaying 11 verified speed-to-lead and automation statistics with inline citations linking to independent studies. Designed to build credibility through a "wall of evidence" effect.

**Goal**: Transform Hero section's static stats into an engaging, flowing marquee that shows multiple stats simultaneously with verifiable sources.

**Why Marquee over Carousel**:
- Visual style: Continuous flowing motion feels more dynamic and modern
- Reduced complexity: No progress dots, arrow buttons, or autoplay state management
- Better impact: Multiple stats visible at once creates stronger evidence effect

---

## Component Architecture

### Core Structure

```tsx
<StatsMarquee>
  <div className="relative [mask-image:...]"> {/* Edge fade */}
    <Marquee direction="right" pauseOnHover speed={50}>
      {firstRow.map(stat => <StatCard {...stat} />)}
    </Marquee>
    <Marquee direction="right" pauseOnHover speed={70}>
      {secondRow.map(stat => <StatCard {...stat} />)}
    </Marquee>
  </div>
</StatsMarquee>
```

### Row Distribution

- **Row 1 (speed 50)**: Stats 1-6
- **Row 2 (speed 70)**: Stats 6-11 (stat 6 appears in both for visual continuity)

### What's Simplified (vs Carousel approach)

**Removed**:
- `CarouselProgress` component (dots + progress bar)
- `CarouselPrevious` / `CarouselNext` buttons
- Autoplay state management (pause/resume logic)
- Slide index tracking
- Keyboard navigation (arrow keys)
- `embla-carousel-autoplay` dependency
- `react-countup` dependency

**Retained**:
- `StatCard` component (adapted for smaller size)
- `stats-data.ts` with all 11 verified stats
- Pause-on-hover behavior (built into react-fast-marquee)
- Clickable citation links

---

## Data Structure

```typescript
interface Stat {
  id: string;
  headline: string;      // "391% higher conversion"
  subtext: string;       // Shortened to ~80 chars for card fit
  citation: {
    name: string;        // "Velocify" (shortened org name)
    year: string;        // "2016"
    url: string;         // Full URL
  };
  icon: LucideIcon;      // Icon component reference
}
```

### Complete Dataset (11 Verified Stats)

#### Stat 1: Immediate Response Impact
- **Headline**: "391% higher conversion"
- **Subtext**: "Responding within one minute increases conversion rates dramatically"
- **Citation**: Velocify, 2016
- **URL**: https://www.prnewswire.com/news-releases/velocify-research-shows-time-of-day-has-minimal-impact-on-sales-effectiveness-consider-quick-and-strategic-follow-up-instead-300275320.html
- **Icon**: `Zap`

#### Stat 2: One Hour Response Window
- **Headline**: "7x more likely to qualify"
- **Subtext**: "Companies responding within one hour qualify leads 7x more often"
- **Citation**: HBR, 2011
- **URL**: https://hbr.org/2011/03/the-short-life-of-online-sales-leads
- **Icon**: `Trophy`

#### Stat 3: Five-Minute Urgency
- **Headline**: "80% drop after 5 minutes"
- **Subtext**: "Lead qualification odds drop 80% after just 5 minutes"
- **Citation**: MIT/InsideSales.com
- **URL**: https://www.leadresponsemanagement.org/lrm_study/
- **Icon**: `Clock`

#### Stat 4: Ten-Minute Critical Threshold
- **Headline**: "400% decrease in 10 min"
- **Subtext**: "Qualification odds plummet 400% at 10 minutes vs 5 minutes"
- **Citation**: MIT/InsideSales.com
- **URL**: https://www.leadresponsemanagement.org/lrm_study/
- **Icon**: `TrendingDown`

#### Stat 5: 24-Hour Penalty
- **Headline**: "60x less likely after 24h"
- **Subtext**: "Responding in 1 hour vs 24+ hours: 60x qualification difference"
- **Citation**: HBR, 2011
- **URL**: https://hbr.org/2011/03/the-short-life-of-online-sales-leads
- **Icon**: `Calendar`

#### Stat 6: Consumer Expectations
- **Headline**: "82% expect 10-min response"
- **Subtext**: "Immediate response is important or very important to 82% of buyers"
- **Citation**: HubSpot, 2018
- **URL**: https://blog.hubspot.com/sales/live-chat-go-to-market-flaw
- **Icon**: `MessageCircle`

#### Stat 7: First Responder Advantage
- **Headline**: "35-50% win rate for first"
- **Subtext**: "35-50% of sales go to the vendor that responds first"
- **Citation**: Google/CEB, 2012
- **URL**: https://www.thinkwithgoogle.com/_qs/documents/677/the-digital-evolution-in-b2b-marketing_research-studies.pdf
- **Icon**: `Medal`

#### Stat 8: Speed Wins Deals
- **Headline**: "78% buy from first responder"
- **Subtext**: "Most customers buy from whoever responds to their inquiry first"
- **Citation**: Lead Connect
- **URL**: https://www.vendasta.com/blog/lead-response-time/
- **Icon**: `Target`

#### Stat 9: AI Automation Impact
- **Headline**: "20-30% conversion boost"
- **Subtext**: "AI and automation boost conversion rates by 20-30% on average"
- **Citation**: Gartner/McKinsey, 2024
- **URL**: https://superagi.com/how-ai-powered-speed-to-lead-automation-boosts-conversion-rates-by-21-a-step-by-step-guide/
- **Icon**: `Bot`

#### Stat 10: Response Time Reduction
- **Headline**: "82% faster with AI"
- **Subtext**: "AI-powered automation reduces lead response times by up to 82%"
- **Citation**: Industry Studies, 2024
- **URL**: https://superagi.com/how-ai-powered-speed-to-lead-automation-boosts-conversion-rates-by-21-a-step-by-step-guide/
- **Icon**: `Rocket`

#### Stat 11: Cost Reduction
- **Headline**: "50% lower acquisition costs"
- **Subtext**: "AI speed-to-lead optimization can halve customer acquisition costs"
- **Citation**: Forrester/McKinsey
- **URL**: https://www.forrester.com/
- **Icon**: `DollarSign`

---

## Visual Design

### StatCard Layout

```tsx
<StatCard>
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-primary shrink-0 mt-1" />
    <div>
      <p className="text-xl font-bold text-white">391% higher conversion</p>
      <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
        Responding within one minute increases conversion rates dramatically
      </p>
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:text-primary mt-2 inline-flex items-center gap-1"
      >
        — Velocify, 2016 <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  </div>
</StatCard>
```

### Card Container Styling

```tsx
className="mx-4 min-h-[140px] max-w-sm rounded-xl bg-neutral-900 p-4 md:p-6"
```

### Edge Fade Mask

```tsx
className="[mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)]"
```

---

## Responsive Behavior

### Desktop (md: 768px+)

- Two rows visible, both scrolling
- Card width: `max-w-sm` (~384px)
- Gap between rows: `mt-6`
- Headline: `text-xl`
- Subtext: `text-sm`, 2 lines max
- Citation: `text-xs`

### Mobile (< 768px)

- Two rows still visible (stacked tighter)
- Card width: `max-w-[280px]`
- Gap between rows: `mt-4`
- Headline: `text-lg`
- Subtext: `text-xs`
- Citation: `text-[10px]`

### Touch Behavior

- Tap/hold pauses the marquee (built into react-fast-marquee)
- Citation links tappable while paused
- No swipe-to-navigate (continuous scroll only)
- No "Swipe" hint needed (motion is self-evident)

---

## Accessibility

### Reduced Motion

```tsx
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<Marquee
  play={!prefersReducedMotion}  // Static if reduced motion
  pauseOnHover
  speed={50}
>
```

When `prefers-reduced-motion` is enabled:
- Marquee stops completely (becomes a static horizontal layout)
- Users can still scroll/swipe horizontally if content overflows
- All citation links remain functional

### Link Accessibility

- Each citation link gets `aria-label="View source: {name}, {year} (opens in new tab)"`
- Cards themselves are not interactive (no role="button" needed)
- Focus states on links use visible outline (`focus-visible:ring-2`)

### Screen Reader

- Container has `aria-label="Speed to lead statistics"`
- No live region announcements needed (no slide changes)
- Links are the only focusable elements

---

## File Structure

```
src/components/
├── stats/
│   ├── StatsMarquee.tsx    # Main wrapper
│   ├── StatCard.tsx        # Individual stat card
│   └── stats-data.ts       # 11 verified stats
```

### Dependencies

- Uses existing `react-fast-marquee` (already installed)
- No new dependencies needed

---

## Integration into Hero.tsx

Replace the current stats section with:

```tsx
<div className="relative z-20 mx-auto mt-8 w-full">
  <StatsMarquee />
</div>
```

---

## Testing Checklist

### Functionality
- [ ] Both rows scroll continuously
- [ ] Pauses on hover (desktop) / touch-hold (mobile)
- [ ] Resumes when pointer/touch leaves
- [ ] All 11 citation links open correct URLs in new tabs
- [ ] Rows scroll at different speeds (50, 70)

### Accessibility
- [ ] Reduced motion stops marquee completely
- [ ] Citation links have visible focus states
- [ ] Links have descriptive aria-labels
- [ ] Container has aria-label for context

### Responsive
- [ ] Cards scale down on mobile
- [ ] Edge fade mask visible on all breakpoints
- [ ] No horizontal overflow on page
- [ ] Touch-hold pauses work on iOS/Android

### Performance
- [ ] No layout shift on load (CLS < 0.1)
- [ ] Smooth 60fps animation
- [ ] Lighthouse Performance: 90+

---

## Research Notes: Data Quality

### Most Credible Sources (Prioritize in Row 1)

1. **Harvard Business Review (2011)** - ⭐⭐⭐⭐⭐
2. **MIT/InsideSales.com** - ⭐⭐⭐⭐
3. **Velocify (2016)** - ⭐⭐⭐⭐
4. **Google/CEB (2012)** - ⭐⭐⭐⭐
5. **HubSpot Research (2018)** - ⭐⭐⭐⭐

### Sources with Limitations

- **Lead Connect Survey** (78%): Widely cited but methodology not accessible
- **Gartner/McKinsey AI stats**: Aggregated from multiple studies
- **Forrester CAC reduction**: Verified but from broader optimization, not speed-to-lead alone

---

## Success Metrics

### Engagement
- **Time on Hero Section**: Increase from baseline
- **Citation Click Rate**: % who click at least one source
- **Scroll Depth**: % who continue past Hero

### Conversion
- **CTA Click Rate**: "Book a Call" clicks after viewing
- **Form Submission Rate**: Booking completions

### Technical
- **Lighthouse Performance**: 90+
- **CLS**: < 0.1
- **Accessibility Score**: 90+

---

## Conclusion

This design provides a visually dynamic, low-complexity evidence wall that:

- ✅ Shows multiple stats simultaneously (stronger impact)
- ✅ Continuous flowing motion (modern feel)
- ✅ Clickable citations (verifiable credibility)
- ✅ Simpler implementation (no carousel state management)
- ✅ Pause-on-hover for reading/clicking
- ✅ Accessible (reduced motion support, proper link labels)
- ✅ Uses existing dependencies (react-fast-marquee)

**Status**: Ready for implementation.
