---
name: ui-aesthetics
description: Design beautiful, distinctive UX for AI Sales Agent UI that avoids generic AI aesthetics
---

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. 

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!

# AI Sales Agent UI Design Aesthetics

When working on the AI Sales Agent UI, create a distinctive, professional interface that reflects the sophisticated nature of B2B enterprise software while avoiding generic "AI slop" aesthetics. This is a tool for sales teams and business owners managing service quotes - it should feel powerful, trustworthy, and efficient.

## Context: The Product

This is an AI-powered quote management platform for professional services teams. Users are:
- Pre-sales engineers (primary) - technically sophisticated, detail-oriented
- Sales operations managers - data-driven, efficiency-focused
- Sales leadership - strategic overview needs

The UI must convey: **Technical precision, operational confidence, and intelligent automation**

## Typography: Distinctive & Purposeful

**Avoid:** Inter, Roboto, Arial, system fonts, Space Grotesk (overused)

**Consider instead:**

For this B2B enterprise context, choose fonts that signal precision and modernity:

- **IBM Plex Sans** or **IBM Plex Mono** - Technical precision, excellent for data-heavy interfaces, distinctive personality
- **Manrope** - Geometric but warm, great for UI with rounded corners
- **DM Sans** - Clean, modern, slightly condensed for efficient space usage
- **Archivo** - Strong geometric forms, excellent for headings and data labels
- **JetBrains Mono** (for code/IDs) - Perfect for conversation IDs, technical identifiers

**Implementation:**
```typescript
// app/layout.tsx
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans'
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono'
})
```

**Typographic hierarchy:**
- Use font weight and size variation to create clear hierarchy
- Consider using tabular figures for numbers (font-variant-numeric: tabular-nums)
- Use monospace for IDs, timestamps, technical data
- Tighter letter-spacing (-0.02em) for headings to increase density

## Color & Theme: Beyond the Basics

**Current palette analysis:**
- Primary: `#071D33` (dark navy) - good foundation, signals trust
- Using oklch color space - excellent choice for perceptual uniformity

**Avoid:** Purple gradients on white, teal + purple combos, pastel everything

**Distinctive approaches for this project:**

### Option 1: Data Visualization Inspired
Draw from modern data viz tools (Observable, Grafana dark themes):
- Keep the dark navy primary
- Add distinctive accent: amber/gold (`oklch(0.75 0.15 75)`) for urgent items
- Electric cyan (`oklch(0.70 0.15 195)`) for active/in-progress states
- Coral (`oklch(0.65 0.18 25)`) for attention states
- Use subtle gradients in backgrounds, not buttons

### Option 2: Terminal Aesthetic
Professional developers appreciate terminal-inspired UIs:
- Rich dark backgrounds with subtle texture
- Green (`oklch(0.70 0.18 145)`) for success/completed
- Bright blue (`oklch(0.65 0.20 230)`) for information
- Matrix-style subtle scan lines or grid patterns
- Monospace for data-heavy sections

### Option 3: Sophisticated Neutral
High-end B2B SaaS (Linear, Stripe Dashboard):
- Sophisticated grays with subtle warm undertones
- Single powerful accent color (deep orange `oklch(0.60 0.18 40)` or saturated blue)
- Use of transparency and layering
- Dominant neutrals with strategic color deployment

**Implementation approach:**
```css
/* globals.css - extend existing theme */
:root {
  /* Keep existing vars, add distinctive accents */
  --accent-primary: oklch(0.75 0.15 75); /* Amber */
  --accent-active: oklch(0.70 0.15 195); /* Cyan */
  --accent-attention: oklch(0.65 0.18 25); /* Coral */

  /* Semantic state colors that aren't generic */
  --state-success: oklch(0.70 0.18 145);
  --state-warning: oklch(0.75 0.15 75);
  --state-error: oklch(0.58 0.22 25);
  --state-info: oklch(0.65 0.20 230);

  /* Subtle background gradients */
  --bg-gradient-subtle: linear-gradient(135deg,
    oklch(1 0 0) 0%,
    oklch(0.99 0.002 250) 100%);
}
```

**Critical rule:** Use color strategically, not uniformly. A single amber badge on a neutral card is more powerful than rainbow soup.

## Motion: High-Impact Moments

**Available tools:**
- tw-animate-css (already installed)
- CSS animations
- Consider adding framer-motion for complex orchestrations

**Performance:** Prefer transform and opacity. Avoid animating width, height, or color.

## Backgrounds: Depth & Atmosphere

**Avoid:** Solid white/gray backgrounds everywhere

**Distinctive approaches:**

### 1. Subtle Geometric Patterns
```css
.dashboard-bg {
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      oklch(0.98 0 0) 10px,
      oklch(0.98 0 0) 11px
    );
}
```

### 2. Layered Gradient Depth
```css
.card-bg {
  background:
    radial-gradient(circle at 20% 10%, oklch(0.99 0.01 250) 0%, transparent 50%),
    radial-gradient(circle at 80% 90%, oklch(0.99 0.01 200) 0%, transparent 50%),
    oklch(1 0 0);
}
```

### 3. Contextual Effects
- Email conversation panel: Paper texture (subtle noise)
- Quote details panel: Subtle grid suggesting data/structure
- Dashboard swimlanes: Different tint per column (barely perceptible, aids wayfinding)

### 4. Dark Mode Sophistication
For dark mode, go beyond just inverting:
```css
.dark .dashboard-bg {
  background:
    linear-gradient(180deg, oklch(0.15 0 0) 0%, oklch(0.12 0 0) 100%),
    url('data:image/svg+xml,...'); /* Subtle noise texture */
}
```

## Technical Implementation Checklist

When implementing UI components:

- [ ] Choose distinctive font (not Inter/Roboto/Arial)
- [ ] Define custom color accents (not just default Tailwind palette)
- [ ] Add CSS variables for all custom colors
- [ ] Implement at least one page-load orchestration
- [ ] Add hover states with transform (not just opacity)
- [ ] Create atmospheric background (not solid color)
- [ ] Use semantic HTML for accessibility
- [ ] Test with reduced motion preference
- [ ] Ensure 4.5:1 contrast ratios minimum
- [ ] Add loading states with skeleton screens or progressive reveal

Comprehensive design checklist: [design-checklist](./design-checklist.md)

## Anti-Patterns to Avoid

1. **Generic Tailwind Defaults:** Don't use blue-500, gray-100 directly without customization
2. **Uniform Roundness:** Vary border-radius (sharp data tables, rounded cards, pill badges)
3. **Single Shadow Depth:** Use multiple shadow layers for depth
4. **Color Overload:** Restrain palette, deploy color strategically
5. **Same Font Everywhere:** Mix sans for UI, mono for data/code
6. **Static Everything:** Add subtle motion to guide attention
7. **White Backgrounds:** Layer gradients, textures, or tints
8. **Default Icons:** Customize icon stroke-width and sizes per context

## Inspiration Sources (Specific to This Project)

Look to these for reference (but don't copy):
- **Linear** - Sophisticated B2B SaaS, excellent use of grays
- **Grafana** - Data visualization, dark themes, status colors
- **Superhuman** - Email interface, keyboard shortcuts, speed
- **Observable** - Data notebooks, code + visualization aesthetics
- **Railway** - Developer tools, terminal aesthetic, motion design
- **Stripe Dashboard** - Enterprise SaaS, trust signals, clean data presentation

## Measuring Success

You've achieved distinctive design when:
- A pre-sales engineer says "this feels purpose-built for us"
- The UI is recognizable from a screenshot (not generic)
- Color is used strategically, not uniformly
- Motion guides attention without distracting
- Typography creates clear hierarchy and rhythm
- The product feels intelligent and trustworthy
- **Critical:** It doesn't look like every other Next.js + Tailwind + shadcn project

## Final Principle

**Context-specific character over generic polish.** This is not a consumer app, not a marketing site, not a dashboard for everyone. It's a specialized tool for professionals managing service quotes. Every design decision should serve that purpose with distinction and personality.

